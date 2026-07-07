import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { OrderStatus, Role } from "../../../generated/prisma/enums";
import { ApiError } from "../../errors/ApiError";
import { prisma } from "../../lib/prisma";
import { IUserJWTPayload } from "../users/users.interface";
import { IRentalOrderPayload, IRentalOrderQuery } from "./rentalOrders.interface";

const standardOrderInclude = {
    rentalItems: {
        include: { gearItem: true }
    },
    payment: true,
    customer: true
};

class RentalOrdersService {
    private rentDayCalculation(rentalOrder: { startDate: Date | string; endDate: Date | string }): number {
        const start = new Date(rentalOrder.startDate).getTime();
        const end = new Date(rentalOrder.endDate).getTime();
        const millisecondsPerDay = 1000 * 60 * 60 * 24;
        return Math.max(1, Math.ceil((end - start) / millisecondsPerDay));
    }

    private calculateOrderPrice(
        requestedItems: Array<{ gearItemId: string; quantity?: number }>,
        gearItemsFromDb: Array<{ id: string; pricePerDay: Prisma.Decimal | number }>,
        rentalDays: number
    ): number {
        const gearItemsMap = new Map(gearItemsFromDb.map((item) => [item.id, item]));

        return requestedItems.reduce((sum, item) => {
            const gearItem = gearItemsMap.get(item.gearItemId);
            if (!gearItem) return sum;

            const quantity = item.quantity ?? 1;
            const pricePerDay = Number(gearItem.pricePerDay.toString());
            
            return sum + (pricePerDay * rentalDays * quantity);
        }, 0);
    }

    private async getRentalOrder(id: string) {
        const rentalOrder = await prisma.rentalOrders.findUnique({
            where: { id },
            include: standardOrderInclude
        });

        if (!rentalOrder) {
            throw new ApiError(httpStatus.NOT_FOUND, "Rental order not found.");
        }

        return {
            ...rentalOrder,
            totalRentDays: this.rentDayCalculation(rentalOrder)
        };
    }

    private async verifyProviderOwnsOrder(providerId: string, orderId: string) {
        const rentalItem = await prisma.rentalItems.findFirst({
            where: {
                rentalOrderId: orderId,
                gearItem: { providerId }
            }
        });
        if (!rentalItem) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: You do not own this rental order.");
        }
    }

    private async verifyCustomerOwnsOrder(customerId: string, orderId: string) {
        const rentalOrder = await prisma.rentalOrders.findUnique({ where: { id: orderId } });
        if (!rentalOrder) throw new ApiError(httpStatus.NOT_FOUND, "Rental order not found.");
        
        if (rentalOrder.customerId !== customerId) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: You do not own this rental order.");
        }
    }

    async getAllRentalOrders(user: IUserJWTPayload) {
        let orders: any[] = [];

        if (user.role === Role.ADMIN) {
            orders = await prisma.rentalOrders.findMany({ include: standardOrderInclude });
        } else if (user.role === Role.PROVIDER) {
            orders = await prisma.rentalOrders.findMany({
                where: {
                    rentalItems: { 
                        some: { 
                            gearItem: { 
                                providerId: user.id 
                            } 
                        } 
                    }
                },
                include: standardOrderInclude,
                orderBy: { createdAt: "desc" }
            });
        } else {
            orders = await prisma.rentalOrders.findMany({
                where: { customerId: user.id },
                include: standardOrderInclude,
                orderBy: { createdAt: "desc" }
            });
        }

        return orders.map((order) => ({
            ...order,
            totalRentDays: this.rentDayCalculation(order)
        }));
    }

    async getSingleRentalOrdersByID(user: IUserJWTPayload, id: IRentalOrderQuery["id"]) {
        const rentalOrder = await this.getRentalOrder(id as string);

        if (user.role === Role.ADMIN) return rentalOrder;
        if (user.role === Role.PROVIDER) {
            await this.verifyProviderOwnsOrder(user.id, rentalOrder.id);
            return rentalOrder;
        }

        await this.verifyCustomerOwnsOrder(user.id, rentalOrder.id);
        return rentalOrder;
    }

    async createRentalOrders(user: IUserJWTPayload, payload: IRentalOrderPayload) {
        if (user.role !== Role.CUSTOMER && user.role !== Role.PROVIDER) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: Only customers and providers can create rental orders.");
        }

        const startDate = payload.startDate ? new Date(payload.startDate) : undefined;
        const endDate = payload.endDate ? new Date(payload.endDate) : undefined;

        if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Valid startDate and endDate fields are required.");
        }
        if (startDate >= endDate) {
            throw new ApiError(httpStatus.BAD_REQUEST, "endDate must be after startDate.");
        }

        const customerId = user.role === Role.CUSTOMER ? user.id : payload.customerId;
        if (!customerId) throw new ApiError(httpStatus.BAD_REQUEST, "customerId is required.");

        const customer = await prisma.users.findUnique({ where: { id: customerId } });
        if (!customer) throw new ApiError(httpStatus.NOT_FOUND, "Customer not found.");

        const requestedItems = payload.rentalItems?.length
            ? payload.rentalItems
            : payload.gearItemsIds?.map((gearItemId) => ({ gearItemId, quantity: 1 })) ?? [];

        if (requestedItems.length === 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "At least one gear item is required.");
        }

        const existingGearItems = await prisma.gearItems.findMany({
            where: { id: { in: requestedItems.map((item) => item.gearItemId) } }
        });

        if (existingGearItems.length !== requestedItems.length) {
            throw new ApiError(httpStatus.NOT_FOUND, "One or more selected gear items could not be validated.");
        }

        const rentalDays = this.rentDayCalculation({ startDate, endDate });
        
        const gearItemsMap = new Map(existingGearItems.map(item => [item.id, item]));
        for (const item of requestedItems) {
            const gear = gearItemsMap.get(item.gearItemId);
            if (gear && gear.availableStock < (item.quantity ?? 1)) {
                throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient available stock for item: ${gear.id}`);
            }
        }

        const calculatedTotalPrice = this.calculateOrderPrice(requestedItems, existingGearItems, rentalDays);

        return prisma.rentalOrders.create({
            data: {
                customerId,
                startDate,
                endDate,
                totalPrice: new Prisma.Decimal(calculatedTotalPrice),
                status: OrderStatus.PENDING,
                rentalItems: {
                    create: requestedItems.map((item) => ({
                        gearItemId: item.gearItemId,
                        quantity: item.quantity ?? 1
                    }))
                }
            },
            include: standardOrderInclude
        });
    }

    async updateRentalOrder(user: IUserJWTPayload, id: IRentalOrderQuery["id"], payload: Partial<IRentalOrderPayload>) {
        if (user.role !== Role.PROVIDER && user.role !== Role.ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: Only providers and admins can update rental orders.");
        }

        const rentalOrder = await this.getRentalOrder(id as string);
        if (user.role === Role.PROVIDER) {
            await this.verifyProviderOwnsOrder(user.id, rentalOrder.id);
        }

        return await prisma.$transaction(async (tx) => {
            const updates: Record<string, unknown> = {};

            const startDate = payload.startDate ? new Date(payload.startDate) : new Date(rentalOrder.startDate);
            const endDate = payload.endDate ? new Date(payload.endDate) : new Date(rentalOrder.endDate);

            if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Invalid timeline date configuration values provided.");
            }

            if (payload.startDate !== undefined) updates.startDate = startDate;
            if (payload.endDate !== undefined) updates.endDate = endDate;
            if (payload.status !== undefined) updates.status = payload.status;

            const rentDays = this.rentDayCalculation({ startDate, endDate });

            if (payload.rentalItems && payload.rentalItems.length > 0) {
                await tx.rentalItems.deleteMany({ where: { rentalOrderId: rentalOrder.id } });

                const gearItemsFromDb = await tx.gearItems.findMany({
                    where: { id: { in: payload.rentalItems.map((i) => i.gearItemId) } }
                });

                if (gearItemsFromDb.length !== payload.rentalItems.length) {
                    throw new ApiError(httpStatus.NOT_FOUND, "Some requested gear items were missing from stock.");
                }

                const updatedTotalPrice = this.calculateOrderPrice(payload.rentalItems, gearItemsFromDb, rentDays);
                updates.totalPrice = new Prisma.Decimal(updatedTotalPrice);

                updates.rentalItems = {
                    create: payload.rentalItems.map((item) => ({
                        gearItemId: item.gearItemId,
                        quantity: item.quantity ?? 1
                    }))
                };
            } else if (payload.startDate !== undefined || payload.endDate !== undefined) {
                const formattedExistingItems = rentalOrder.rentalItems.map((item: any) => ({
                    gearItemId: item.gearItemId,
                    quantity: item.quantity
                }));
                const gearItemsFromDb = rentalOrder.rentalItems.map((item: any) => item.gearItem);

                const updatedTotalPrice = this.calculateOrderPrice(formattedExistingItems, gearItemsFromDb, rentDays);
                updates.totalPrice = new Prisma.Decimal(updatedTotalPrice);
            }

            if (payload.totalPrice !== undefined && !updates.totalPrice) {
                updates.totalPrice = new Prisma.Decimal(Number(payload.totalPrice));
            }

            return tx.rentalOrders.update({
                where: { id: id as string },
                data: updates,
                include: standardOrderInclude
            });
        });
    }

    async deleteRentalOrder(user: IUserJWTPayload, id: IRentalOrderQuery["id"]) {
        if (user.role !== Role.PROVIDER && user.role !== Role.ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: Only providers and admins can delete rental orders.");
        }

        const rentalOrder = await this.getRentalOrder(id as string);
        if (user.role === Role.PROVIDER) {
            await this.verifyProviderOwnsOrder(user.id, rentalOrder.id);
        }

        return await prisma.$transaction(async (tx) => {
            await tx.rentalItems.deleteMany({ where: { rentalOrderId: rentalOrder.id } });
            return tx.rentalOrders.delete({ where: { id: rentalOrder.id } });
        });
    }
}

export default new RentalOrdersService();