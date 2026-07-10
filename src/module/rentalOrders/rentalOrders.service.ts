import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { OrderStatus, Role } from "../../../generated/prisma/enums";
import { ApiError } from "../../errors/ApiError";
import { prisma } from "../../lib/prisma";
import { IUserJWTPayload } from "../users/users.interface";
import { IRentalOrderPayload, IRentalOrderQuery } from "./rentalOrders.interface";

const standardOrderInclude = {
    rentalItems: {
        include: { 
            gearItem: {
                include: {
                    provider: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    },
                },
                omit: {
                    createdAt: true,
                    updatedAt: true,
                }
            } 
        }
    },
    payment: {
        omit: {
            rentalOrderId: true,
            userId: true,
            createdAt: true,
            updatedAt: true
        }
    },
    customer: {
        omit: {
            role: true,
            password: true,
            created_at: true,
            updated_at: true,
            status: true,
        }
    }
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

    private async handlePickupOrderStatus(tx: any, rentalItems: any[]){
        for (const item of rentalItems) {
            const gear = await tx.gearItems.findUnique({ 
                where: { id: item.gearItemId } 
            });
            if (!gear) throw new ApiError(httpStatus.NOT_FOUND, "Gear item not found.");

            
            if (gear.availableStock - item.quantity < 0) {
                throw new ApiError(httpStatus.BAD_REQUEST, `Not enough available stock for ${gear.title}. Available: ${gear.availableStock}`);
            }

            await tx.gearItems.update({
                where: { id: gear.id },
                data: { 
                    availableStock: { 
                        decrement: item.quantity 
                    }
                }
            });
        }
    }

    private async handleOrderReturn(tx: any, rentalItems: any[]) {
        for (const item of rentalItems) {
            const gear = await tx.gearItems.findUnique({ 
                where: { id: item.gearItemId } 
            });
            if (!gear) throw new ApiError(httpStatus.NOT_FOUND, "Gear item not found.");

            const newAvailableStock = gear.availableStock + item.quantity;

            if (newAvailableStock > gear.stock) {
                throw new ApiError(
                    httpStatus.BAD_REQUEST, 
                    `Cannot return item. Available stock cannot exceed total base stock for ${gear.title}.`
                );
            }

            await tx.gearItems.update({
                where: { id: gear.id },
                data: { 
                    availableStock: { 
                        increment: item.quantity 
                    } 
                }
            });
        }
    }

    private async handleItemsUpdate(tx: any, rentalOrderId: string, payloadItems: any[], rentDays: number, updates: Record<string, unknown>) {
        await tx.rentalItems.deleteMany({ where: { rentalOrderId: rentalOrderId } });

        const gearItemsFromDb = await tx.gearItems.findMany({
            where: { id: { in: payloadItems.map((i) => i.gearItemId) } }
        });

        if (gearItemsFromDb.length !== payloadItems.length) {
            throw new ApiError(httpStatus.NOT_FOUND, "Some requested gear items were missing from stock.");
        }

        const updatedTotalPrice = this.calculateOrderPrice(payloadItems, gearItemsFromDb, rentDays);
        updates.totalPrice = new Prisma.Decimal(updatedTotalPrice);

        updates.rentalItems = {
            create: payloadItems.map((item) => ({
                gearItemId: item.gearItemId,
                quantity: item.quantity ?? 1
            }))
        };
    }

    private async handleDatesUpdate(rentalOrder: any, rentDays: number, updates: Record<string, unknown>) {
        const formattedExistingItems = rentalOrder.rentalItems.map((item: any) => ({
            gearItemId: item.gearItemId,
            quantity: item.quantity
        }));
        
        const gearItemsFromDb = rentalOrder.rentalItems.map((item: any) => item.gearItem);

        const updatedTotalPrice = this.calculateOrderPrice(formattedExistingItems, gearItemsFromDb, rentDays);
        updates.totalPrice = new Prisma.Decimal(updatedTotalPrice);
    }

    async getAllRentalOrders(user: IUserJWTPayload) {
        let orders: any[] = [];

        if (user.role === Role.ADMIN) {
            orders = await prisma.rentalOrders.findMany({ include: standardOrderInclude });
        } 
        else if (user.role === Role.PROVIDER) {
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
            throw new ApiError(httpStatus.BAD_REQUEST, "endDate must be grater then startDate.");
        }

        const customerId = user.role === Role.CUSTOMER ? user.id : payload.customerId;
        if (!customerId) throw new ApiError(httpStatus.BAD_REQUEST, "customerId is required.");

        const customer = await prisma.users.findUnique({ 
            where: { id: customerId } 
        });
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
        const { startDate, endDate, status, rentalItems }= payload;
        
        if (user.role !== Role.PROVIDER && user.role !== Role.ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: Only providers and admins can update rental orders.");
        }

        const rentalOrder = await this.getRentalOrder(id as string);
        if (user.role === Role.PROVIDER) {
            await this.verifyProviderOwnsOrder(user.id, rentalOrder.id);
        }

        return await prisma.$transaction(async (tx) => {
            const updates: Record<string, unknown> = {};

            const start_date = startDate ? new Date(startDate) : new Date(rentalOrder.startDate);
            const end_date = payload.endDate ? new Date(payload.endDate) : new Date(rentalOrder.endDate);

            if (Number.isNaN(start_date.getTime()) || Number.isNaN(end_date.getTime()) || start_date >= end_date) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Invalid timeline date configuration values provided.");
            }

            if (startDate !== undefined) updates.startDate = start_date;
            if (endDate !== undefined) updates.endDate = end_date;
            if (status !== undefined) updates.status = status;

            const rentDays = this.rentDayCalculation({ 
                startDate: start_date, 
                endDate: end_date 
            });

            if (rentalItems && rentalItems.length > 0) {
                await this.handleItemsUpdate(tx, rentalOrder.id, rentalItems, rentDays, updates);
            } 
            else if (payload.startDate !== undefined || payload.endDate !== undefined) {
                await this.handleDatesUpdate(rentalOrder, rentDays, updates)
            }

            if (payload.totalPrice !== undefined && !updates.totalPrice) {
                updates.totalPrice = new Prisma.Decimal(Number(payload.totalPrice));
            }

            if (payload.status !== undefined && payload.status !== rentalOrder.status) {
                if(payload.status === OrderStatus.PICKED_UP){
                    this.handlePickupOrderStatus(tx, rentalOrder.rentalItems);
                }
                
                if(payload.status === OrderStatus.RETURNED){
                    this.handleOrderReturn(tx, rentalOrder.rentalItems);
                }
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