import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import RentalOrdersService from "./rentalOrders.service";
import { IUserJWTPayload } from "../users/users.interface";
import { IRentalOrderPayload } from "./rentalOrders.interface";

const createRentalOrders = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const payload = req.body as IRentalOrderPayload;
    const rentalOrder = await RentalOrdersService.createRentalOrders(user, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Rental order created successfully.",
        data: rentalOrder
    });
});

const getAllRentalOrders = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const rentalOrders = await RentalOrdersService.getAllRentalOrders(user);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Rental orders retrieved successfully.",
        data: rentalOrders
    });
});

const getSingleRentalOrdersByID = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const { id } = req.params;
    const rentalOrder = await RentalOrdersService.getSingleRentalOrdersByID(user, id as string);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Rental order retrieved successfully.",
        data: rentalOrder
    });
});

const updateRentalOrder = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const { id } = req.params;
    const payload = req.body as Partial<IRentalOrderPayload>;
    const rentalOrder = await RentalOrdersService.updateRentalOrder(user, id as string, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Rental order updated successfully.",
        data: rentalOrder
    });
});

const deleteRentalOrder = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const { id } = req.params;
    const rentalOrder = await RentalOrdersService.deleteRentalOrder(user, id as string);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Rental order deleted successfully.",
        data: rentalOrder
    });
});

export const RentalOrdersController = {
    createRentalOrders,
    getAllRentalOrders,
    getSingleRentalOrdersByID,
    updateRentalOrder,
    deleteRentalOrder
};