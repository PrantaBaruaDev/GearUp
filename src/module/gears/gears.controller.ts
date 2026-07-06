import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import GearService from "./gears.service";

const getAllGearsDetails = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const query = req.query;
        const gears = await GearService.getGearDetails(query);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Gears fetched successfully",
            data: gears,
        });
    }
);

const getAllOwnProviderGearDetailsById = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user?.id as string;
        const gears = await GearService.getAllOwnProviderGearDetailsById(userId);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Gears fetched successfully",
            data: gears,
        });
    }
);

const getSingleGearById = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const gear = await GearService.getSinglePropertyById(id as string);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Gear fetched successfully",
            data: gear,
        });
    }
);

const createGearItem = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const payload = req.body;
        const userId = req.user?.id as string;
        const gear = await GearService.createGearDetails(userId, payload);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.CREATED,
            message: "Gear created successfully",
            data: gear,
        });
    }
);

const updateGearItem = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const userId = req.user?.id as string;
        const payload = req.body;
        const gear = await GearService.updateGearDetails(id as string, userId, payload);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Gear updated successfully",
            data: gear,
        });
    }
);

const deleteGearItem = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const userId = req.user?.id as string;
        const result = await GearService.deleteGearDetails(id as string, userId);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Gear deleted successfully",
            data: result,
        });
    }
);

export const GearsController = {
    getAllGearsDetails,
    getAllOwnProviderGearDetailsById,
    getSingleGearById,
    createGearItem,
    updateGearItem,
    deleteGearItem,
};