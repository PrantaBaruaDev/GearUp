
import { IUserJWTPayload } from '../users/users.interface';
import UserService from '../users/users.service';
import { IRentalItemsQuery, IRentalItemsPayload } from './rentalItems.interface';
import { Role } from '../../../generated/prisma/enums';
import { ApiError } from '../../errors/ApiError';
import httpStatus from 'http-status';
import { prisma } from '../../lib/prisma';

class RentalItemsService {
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
}

export default new RentalItemsService();