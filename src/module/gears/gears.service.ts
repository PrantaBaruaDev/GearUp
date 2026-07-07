import httpStatus from "http-status";
import { Role } from "../../../generated/prisma/enums";
import { ApiError } from "../../errors/ApiError";
import { prisma } from "../../lib/prisma";
import {
    ICreateGearItemsPayload,
    IUpdateGearItemsPayload,
    IGearItemsQuery,
} from "./gears.interface";
import usersService from "../users/users.service";

const standardGearInclude = {
    category: true,
    provider: {
        select: { 
            id: true, 
            name: true, 
            email: true 
        },
    },
};

class GearService {
    private buildWhereClause(query: IGearItemsQuery): Record<string, any> {
        const { title, brand, categoryId, minPrice, maxPrice, availableOnly, providerId } = query;
        const where: Record<string, any> = {};

        if (title?.trim())     
            where.title = { 
                contains: title.trim(), 
                mode: "insensitive" 
            };

        if (brand?.trim())     
            where.brand = { 
                contains: brand.trim(), 
                mode: "insensitive" 
            };

        if (categoryId?.trim()) where.categoryId = categoryId.trim();
        if (providerId?.trim()) where.providerId = providerId.trim();

        if (minPrice !== undefined || maxPrice !== undefined) {
            where.pricePerDay = {};
            if (minPrice !== undefined) where.pricePerDay.gte = Number(minPrice);
            if (maxPrice !== undefined) where.pricePerDay.lte = Number(maxPrice);
        }

        if (availableOnly === "false") {
            where.availableStock = { gte: 0 };
        } else if (availableOnly === "true" || availableOnly === undefined) {
            where.availableStock = { gt: 0 };
        }

        return where;
    }

    private async verifyOwnershipOrAdmin(id: string, userId: string) {
        if (!userId) throw new ApiError(httpStatus.UNAUTHORIZED, "User authentication required.");
        
        const [user, existingGear] = await Promise.all([
            usersService.getUserById(userId),
            prisma.gearItems.findUnique({ where: { id } })
        ]);

        if (!existingGear) throw new ApiError(httpStatus.NOT_FOUND, "Gear not found.");
        
        if (existingGear.providerId !== userId && user.role !== Role.ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to modify this gear.");
        }

        return existingGear;
    }

    async getGearDetails(query: IGearItemsQuery) {
        return prisma.gearItems.findMany({
            where: this.buildWhereClause(query),
            include: standardGearInclude,
        });
    }

    async getGearDetailsForAdmin(query: IGearItemsQuery) {
        const where = this.buildWhereClause(query);
        const parsedPage = Math.max(1, Number(query.page || 1));
        const parsedLimit = Math.max(1, Number(query.limit || 10));

        const [data, total] = await prisma.$transaction([
            prisma.gearItems.findMany({
                where,
                skip: (parsedPage - 1) * parsedLimit,
                take: parsedLimit,
                include: {
                    ...standardGearInclude,
                    _count: { select: { rentalItems: true, reviews: true } }
                },
                orderBy: { createdAt: "desc" }
            }),
            prisma.gearItems.count({ where })
        ]);

        return {
            meta: { page: parsedPage, limit: parsedLimit, total, totalPages: Math.ceil(total / parsedLimit) },
            data
        };
    }

    async getAllOwnProviderGearDetailsById(providerId: string) {
        return prisma.gearItems.findMany({
            where: { providerId },
            include: standardGearInclude,
        });
    }

    async getSinglePropertyById(id: string) {
        const gear = await prisma.gearItems.findUnique({
            where: { id },
            include: standardGearInclude,
        });
        if (!gear) throw new ApiError(httpStatus.NOT_FOUND, "Gear not found.");
        return gear;
    }

    async createGearDetails(userId: string, payload: ICreateGearItemsPayload) {
        if (!userId) throw new ApiError(httpStatus.UNAUTHORIZED, "User authentication required.");

        const title = payload.title?.trim();
        const brand = payload.brand?.trim();
        const categoryId = payload.categoryId?.trim();
        const pricePerDay = Number(payload.pricePerDay);
        const stock = payload.stock ?? 1;
        const availableStock = payload.availableStock ?? stock;

        if (!title || !brand || !categoryId) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Title, Brand, and Category fields are required.");
        }
        if (!Number.isFinite(pricePerDay) || pricePerDay <= 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Price per day must be a positive number.");
        }
        if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(availableStock) || availableStock < 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Stock levels must be non-negative integers.");
        }
        if (availableStock > stock) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Available stock cannot exceed total stock.");
        }

        return prisma.gearItems.create({
            data: {
                title,
                brand,
                categoryId,
                pricePerDay,
                stock,
                availableStock,
                description: payload.description?.trim() ?? "",
                providerId: userId,
            },
            include: standardGearInclude,
        });
    }

    async updateGearDetails(id: string, userId: string, payload: IUpdateGearItemsPayload) {
        const existingGear = await this.verifyOwnershipOrAdmin(id, userId);
        const updateData: Record<string, any> = {};

        // Clean mapping assignments loop pattern
        const textFields: Array<keyof IUpdateGearItemsPayload> = ['title', 'brand', 'description', 'categoryId'];
        textFields.forEach(field => {
            if (payload[field] !== undefined) {
                const normalized = String(payload[field]).trim();
                if (!normalized && field !== 'description') {
                    throw new ApiError(httpStatus.BAD_REQUEST, `${field} cannot be left empty.`);
                }
                updateData[field] = normalized;
            }
        });

        if (payload.pricePerDay !== undefined) {
            const price = Number(payload.pricePerDay);
            if (!Number.isFinite(price) || price <= 0) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Price per day must be a positive number.");
            }
            updateData.pricePerDay = price;
        }

        if (payload.stock !== undefined) {
            if (!Number.isInteger(payload.stock) || payload.stock < 0) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Stock must be a non-negative integer.");
            }
            updateData.stock = payload.stock;
        }

        if (payload.availableStock !== undefined) {
            if (!Number.isInteger(payload.availableStock) || payload.availableStock < 0) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Available stock must be a non-negative integer.");
            }
            updateData.availableStock = payload.availableStock;
        }

        if (Object.keys(updateData).length === 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "No valid fields were provided to update.");
        }

        const finalStock = updateData.stock ?? existingGear.stock;
        const finalAvailableStock = updateData.availableStock ?? existingGear.availableStock;

        if (finalAvailableStock > finalStock) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Available stock cannot exceed total stock.");
        }

        return prisma.gearItems.update({
            where: { id },
            data: updateData,
            include: standardGearInclude
        });
    }

    async deleteGearDetails(id: string, userId: string) {
        await this.verifyOwnershipOrAdmin(id, userId);

        const rentalItemsCount = await prisma.rentalItems.count({ where: { gearItemId: id } });
        if (rentalItemsCount > 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Cannot delete gear that has historical rental records.");
        }

        return prisma.gearItems.delete({ where: { id } });
    }
}

export default new GearService();