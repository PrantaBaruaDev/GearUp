import { NextFunction, Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import httpStatus from 'http-status';
import RentalItemsService from './rentalItems.service';
import { IUserJWTPayload } from '../users/users.interface';
import { IRentalItemsPayload } from './rentalItems.interface';

const getAllRentalItems = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const rentalItems = await RentalItemsService.getAllRentalItems(user);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Rental items retrieved successfully.',
        data: rentalItems
    });
});

const getSingleRentalItemsByID = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const { id } = req.params;
    const rentalItem = await RentalItemsService.getSingleRentalItemsByID(user, id as string);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Rental item retrieved successfully.',
        data: rentalItem
    });
});

const createRentalItems = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const payload = req.body as IRentalItemsPayload;
    const rentalItem = await RentalItemsService.createRentalItems(user, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: 'Rental item created successfully.',
        data: rentalItem
    });
});

const updateRentalItem = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const { id } = req.params;
    const payload = req.body as Partial<IRentalItemsPayload>;
    const rentalItem = await RentalItemsService.updateRentalItem(user, id as string, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Rental item updated successfully.',
        data: rentalItem
    });
});

const deleteRentalItem = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const { id } = req.params;
    const rentalItem = await RentalItemsService.deleteRentalItem(user, id as string);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Rental item deleted successfully.',
        data: rentalItem
    });
});

export const RentalItemsController = {
    createRentalItems,
    getAllRentalItems,
    getSingleRentalItemsByID,
    updateRentalItem,
    deleteRentalItem
};