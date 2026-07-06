import httpStatus from "http-status";
import { OrderStatus, Role } from "../../../generated/prisma/enums";
import { ApiError } from "../../errors/ApiError";
import { prisma } from "../../lib/prisma";
import { IUserJWTPayload } from "../users/users.interface";
import { IRentalOrderPayload, IRentalOrderQuery } from "./rentalOrders.interface";

class RentalOrdersService {
    private async getRentalOrder(id: string) {
        const rentalOrder = await prisma.rentalOrders.findUnique({
            where: { id },
            include: {
                rentalItems: {
                    include: {
                        gearItem: true
                    }
                },
                payment: true,
                customer: true
            }
        });

        if (!rentalOrder) {
            throw new ApiError(httpStatus.NOT_FOUND, "Rental order not found.");
        }

        return rentalOrder;
    }

    private async verifyProviderOwnsOrder(providerId: string, orderId: string) {
        const rentalItem = await prisma.rentalItems.findFirst({
            where: {
                rentalOrderId: orderId,
                gearItem: {
                    providerId
                }
            }
        });

        if (!rentalItem) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: You do not own this rental order.");
        }
    }

    private async verifyCustomerOwnsOrder(customerId: string, orderId: string) {
        const rentalOrder = await prisma.rentalOrders.findUnique({
            where: { id: orderId }
        });

        if (!rentalOrder) {
            throw new ApiError(httpStatus.NOT_FOUND, "Rental order not found.");
        }

        if (rentalOrder.customerId !== customerId) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: You do not own this rental order.");
        }
    }

    async getAllRentalOrders(user: IUserJWTPayload) {
        const include = {
            rentalItems: {
                include: {
                    gearItem: true
                }
            },
            payment: true,
            customer: true
        };

        if (user.role === Role.ADMIN) {
            return prisma.rentalOrders.findMany({ include });
        }

        if (user.role === Role.PROVIDER) {
            return prisma.rentalOrders.findMany({
                where: {
                    rentalItems: {
                        some: {
                            gearItem: {
                                providerId: user.id
                            }
                        }
                    }
                },
                include
            });
        }

        return prisma.rentalOrders.findMany({
            where: {
                customerId: user.id
            },
            include
        });
    }

    async getSingleRentalOrdersByID(user: IUserJWTPayload, id: IRentalOrderQuery["id"]) {
        const rentalOrder = await this.getRentalOrder(id as string);

        if (user.role === Role.ADMIN) {
            return rentalOrder;
        }

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

        if (!startDate || !endDate) {
            throw new ApiError(httpStatus.BAD_REQUEST, "startDate and endDate are required.");
        }

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            throw new ApiError(httpStatus.BAD_REQUEST, "startDate and endDate must be valid dates.");
        }

        if (startDate >= endDate) {
            throw new ApiError(httpStatus.BAD_REQUEST, "endDate must be after startDate.");
        }

        const totalPrice = payload.totalPrice === undefined ? 0 : Number(payload.totalPrice);

        if (Number.isNaN(totalPrice) || totalPrice < 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "totalPrice must be a non-negative number.");
        }

        const customerId = user.role === Role.CUSTOMER ? user.id : payload.customerId;

        if (!customerId) {
            throw new ApiError(httpStatus.BAD_REQUEST, "customerId is required when a provider creates an order.");
        }

        const customer = await prisma.users.findUnique({
            where: { id: customerId }
        });

        if (!customer) {
            throw new ApiError(httpStatus.NOT_FOUND, "Customer not found.");
        }

        return prisma.rentalOrders.create({
            data: {
                customerId,
                startDate,
                endDate,
                totalPrice,
                status: payload.status ?? OrderStatus.PENDING
            },
            include: {
                rentalItems: true,
                payment: true,
                customer: true
            }
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

        const updates: Record<string, unknown> = {};

        if (payload.startDate !== undefined) {
            const startDate = new Date(payload.startDate);
            if (Number.isNaN(startDate.getTime())) {
                throw new ApiError(httpStatus.BAD_REQUEST, "startDate must be a valid date.");
            }
            updates.startDate = startDate;
        }

        if (payload.endDate !== undefined) {
            const endDate = new Date(payload.endDate);
            if (Number.isNaN(endDate.getTime())) {
                throw new ApiError(httpStatus.BAD_REQUEST, "endDate must be a valid date.");
            }
            updates.endDate = endDate;
        }

        if (payload.totalPrice !== undefined) {
            const totalPrice = Number(payload.totalPrice);
            if (Number.isNaN(totalPrice) || totalPrice < 0) {
                throw new ApiError(httpStatus.BAD_REQUEST, "totalPrice must be a non-negative number.");
            }
            updates.totalPrice = totalPrice;
        }

        if (payload.status !== undefined) {
            updates.status = payload.status;
        }

        if (Object.keys(updates).length === 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "No valid fields were provided for update.");
        }

        return prisma.rentalOrders.update({
            where: { id: id as string },
            data: updates,
            include: {
                rentalItems: true,
                payment: true,
                customer: true
            }
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

        return prisma.rentalOrders.delete({
            where: { id: id as string }
        });
    }
}

export default new RentalOrdersService();