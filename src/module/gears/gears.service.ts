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

class GearService {
    async getGearDetails(query: IGearItemsQuery) {
        const { title, brand, categoryId, minPrice, maxPrice, availableOnly } = query;

        const where: Record<string, any> = {};

        if (title?.trim()) {
            where.title = { contains: title.trim(), mode: "insensitive" };
        }

        if (brand?.trim()) {
            where.brand = { contains: brand.trim(), mode: "insensitive" };
        }

        if (categoryId?.trim()) {
            where.categoryId = categoryId.trim();
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            where.pricePerDay = {};
            if (minPrice !== undefined) {
                where.pricePerDay.gte = Number(minPrice);
            }
            if (maxPrice !== undefined) {
                where.pricePerDay.lte = Number(maxPrice);
            }
        }

        if (availableOnly === "true") {
            where.availableStock = { gt: 0 };
        }

        return prisma.gearItems.findMany({
            where,
            include: {
                category: true,
                provider: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    }

    async getSinglePropertyById(id: string) {
        const gear = await prisma.gearItems.findUnique({
            where: { id },
            include: {
                category: true,
                provider: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        if (!gear) {
            throw new ApiError(httpStatus.NOT_FOUND, "Gear not found.");
        }

        return gear;
    }

    async createGearDetails(userId: string, payload: ICreateGearItemsPayload) {
        if (!userId) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "User authentication required.");
        }

        const title = payload.title?.trim();
        const description = payload.description?.trim() ?? "";
        const brand = payload.brand?.trim();
        const pricePerDay = Number(payload.pricePerDay);
        const stock = payload.stock ?? 1;
        const availableStock = payload.availableStock ?? stock;
        const categoryId = payload.categoryId?.trim();

        if (!title) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Title is required.");
        }

        if (!brand) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Brand is required.");
        }

        if (!categoryId) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Category is required.");
        }

        if (!Number.isFinite(pricePerDay) || pricePerDay <= 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Price per day must be a positive number.");
        }

        if (!Number.isInteger(stock) || stock < 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Stock must be a non-negative integer.");
        }

        if (!Number.isInteger(availableStock) || availableStock < 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Available stock must be a non-negative integer.");
        }

        if (availableStock > stock) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Available stock cannot exceed total stock.");
        }

        return prisma.gearItems.create({
            data: {
                title,
                description,
                brand,
                pricePerDay,
                stock,
                availableStock,
                categoryId,
                providerId: userId,
            },
            include: {
                category: true,
                provider: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    }

    async updateGearDetails(id: string, userId: string, payload: IUpdateGearItemsPayload) {
        if (!userId) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "User authentication required.");
        }
        
        const user = await usersService.getUserById(userId);

        const existingGear = await prisma.gearItems.findUnique({ where: { id } });

        if (!existingGear) {
            throw new ApiError(httpStatus.NOT_FOUND, "Gear not found.");
        }

        if (existingGear.providerId !== userId && user.role !== Role.ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, "You are not allowed to update this gear.");
        }

        const updateData: Record<string, any> = {};

        if (payload.title !== undefined) {
            const title = payload.title.trim();
            if (!title) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Title cannot be empty.");
            }
            updateData.title = title;
        }

        if (payload.description !== undefined) {
            updateData.description = payload.description.trim();
        }

        if (payload.brand !== undefined) {
            const brand = payload.brand.trim();
            if (!brand) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Brand cannot be empty.");
            }
            updateData.brand = brand;
        }

        if (payload.pricePerDay !== undefined) {
            const pricePerDay = Number(payload.pricePerDay);
            if (!Number.isFinite(pricePerDay) || pricePerDay <= 0) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Price per day must be a positive number.");
            }
            updateData.pricePerDay = pricePerDay;
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

        if (payload.categoryId !== undefined) {
            const categoryId = payload.categoryId.trim();
            if (!categoryId) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Category is required.");
            }
            updateData.categoryId = categoryId;
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
        });
    }

    async deleteGearDetails(id: string, userId: string) {
        if (!userId) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "User authentication required.");
        }
        const user = await usersService.getUserById(userId);

        const existingGear = await prisma.gearItems.findUnique({ where: { id } });

        if (!existingGear) {
            throw new ApiError(httpStatus.NOT_FOUND, "Gear not found.");
        }

        if (existingGear.providerId !== userId && user.role !== Role.ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, "You are not allowed to delete this gear.");
        }

        const rentalItemsCount = await prisma.rentalItems.count({ where: { gearItemId: id } });

        if (rentalItemsCount > 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Cannot delete gear that has rental records.");
        }

        return prisma.gearItems.delete({ where: { id } });
    }
}

export default new GearService();