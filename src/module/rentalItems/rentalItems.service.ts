
import { IUserJWTPayload } from '../users/users.interface';
import UserService from '../users/users.service';
import { IRentalItemsQuery, IRentalItemsPayload } from './rentalItems.interface';
import { Role } from '../../../generated/prisma/enums';
import { ApiError } from '../../errors/ApiError';
import httpStatus from 'http-status';
import { prisma } from '../../lib/prisma';

class RentalItemsService {
    private async verifyProviderOwnsGear(providerId: string, gearItemId: string) {
        const gearItem = await prisma.gearItems.findUnique({
            where: { id: gearItemId }
        });

        if (!gearItem) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Gear item not found.');
        }

        if (gearItem.providerId !== providerId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You do not own this gear item.');
        }

        return gearItem;
    }

    private async verifyCustomerOwnsOrder(customerId: string, rentalOrderId: string) {
        const rentalOrder = await prisma.rentalOrders.findUnique({
            where: { id: rentalOrderId }
        });

        if (!rentalOrder) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Rental order not found.');
        }

        if (rentalOrder.customerId !== customerId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You do not own this rental order.');
        }

        return rentalOrder;
    }

    private async getRentalItem(id: string) {
        const rentalItem = await prisma.rentalItems.findUnique({
            where: { id },
            include: {
                gearItem: true,
                rentalOrder: true
            }
        });

        if (!rentalItem) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Rental item not found.');
        }

        return rentalItem;
    }

    async getAllRentalItems(user: IUserJWTPayload) {
        if (user.role === Role.ADMIN) {
            return prisma.rentalItems.findMany({
                include: {
                    gearItem: true,
                    rentalOrder: true
                }
            });
        }

        if (user.role === Role.PROVIDER) {
            return prisma.rentalItems.findMany({
                where: {
                    gearItem: {
                        providerId: user.id
                    }
                },
                include: {
                    gearItem: true,
                    rentalOrder: true
                }
            });
        }

        return prisma.rentalItems.findMany({
            where: {
                rentalOrder: {
                    customerId: user.id
                }
            },
            include: {
                gearItem: true,
                rentalOrder: true
            }
        });
    }

    async getSingleRentalItemsByID(user: IUserJWTPayload, id: IRentalItemsQuery['id']) {
        const rentalItem = await this.getRentalItem(id as string);

        if (user.role === Role.ADMIN) {
            return rentalItem;
        }

        if (user.role === Role.PROVIDER) {
            if (rentalItem.gearItem.providerId !== user.id) {
                throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You do not own this rental item.');
            }
            return rentalItem;
        }

        if (rentalItem.rentalOrder.customerId !== user.id) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You do not own this rental item.');
        }

        return rentalItem;
    }

    async createRentalItems(user: IUserJWTPayload, payload: IRentalItemsPayload) {
        const { rentalOrderId, gearItemId, quantity } = payload;
        const normalizedQuantity = Number(quantity);

        if (!rentalOrderId || !gearItemId) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'rentalOrderId and gearItemId are required.');
        }

        if (!Number.isInteger(normalizedQuantity) || normalizedQuantity <= 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'quantity must be a positive integer.');
        }

        if (user.role === Role.CUSTOMER) {
            await this.verifyCustomerOwnsOrder(user.id, rentalOrderId);
        }

        const gearItem = await prisma.gearItems.findUnique({
            where: { id: gearItemId }
        });

        if (!gearItem) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Gear item not found.');
        }

        if (user.role === Role.PROVIDER) {
            await this.verifyProviderOwnsGear(user.id, gearItemId);
        }

        return prisma.rentalItems.create({
            data: {
                rentalOrderId,
                gearItemId,
                quantity: normalizedQuantity
            },
            include: {
                gearItem: true,
                rentalOrder: true
            }
        });
    }

    async updateRentalItem(
        user: IUserJWTPayload,
        id: IRentalItemsQuery['id'],
        payload: Partial<IRentalItemsPayload>
    ) {
        if (user.role !== Role.PROVIDER && user.role !== Role.ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: Only provider or admin can update rental items.');
        }

        const rentalItem = await this.getRentalItem(id as string);

        if (user.role === Role.PROVIDER && rentalItem.gearItem.providerId !== user.id) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You do not own this rental item.');
        }

        const updates: Record<string, unknown> = {};

        if (payload.quantity !== undefined) {
            const quantity = Number(payload.quantity);
            if (!Number.isInteger(quantity) || quantity <= 0) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'quantity must be a positive integer.');
            }
            updates.quantity = quantity;
        }

        if (Object.keys(updates).length === 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'No valid fields were provided for update.');
        }

        return prisma.rentalItems.update({
            where: { id: id as string },
            data: updates,
            include: {
                gearItem: true,
                rentalOrder: true
            }
        });
    }

    async deleteRentalItem(user: IUserJWTPayload, id: IRentalItemsQuery['id']) {
        if (user.role !== Role.PROVIDER && user.role !== Role.ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: Only provider or admin can delete rental items.');
        }

        const rentalItem = await this.getRentalItem(id as string);

        if (user.role === Role.PROVIDER && rentalItem.gearItem.providerId !== user.id) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You do not own this rental item.');
        }

        return prisma.rentalItems.delete({
            where: { id: id as string }
        });
    }
}

export default new RentalItemsService();