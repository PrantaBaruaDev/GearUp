import { NextFunction, Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import httpStatus from 'http-status';
import { sendResponse } from "../../utils/sendResponse";
import UserService from "./users.service";

const registerUser = catchAsync( async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;
    console.log("user controller: ", payload);
    const user = await UserService.registerUserIntoDB(payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "User registered successfully",
        data: user 
    })
})

const getMyProfile = catchAsync( async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.user?.id as string;

    const response = await UserService.getMyProfileFromDB(payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "User Profile Retrieved successfully",
        data: response 
    })
})

const updateMyProfile = catchAsync( async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user?.id as string;
    const payload = req.body;

    const response = await UserService.updateMyProfileInDB(user, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "User Profile details update successfully",
        data: response 
    })
})

const updateUserStatusPatchByAdmin = catchAsync( async(req: Request, res: Response, next: NextFunction) => {
    const user = req.user?.id as string;
    const userUpdateProfileId = req.params.id as string;
    const payload = req.body;

    const response = await UserService.updateUserStatusPatchByAdmin(user, userUpdateProfileId, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "User Profile details update successfully",
        data: response 
    })
})

const getAllUsers = catchAsync( async (req: Request, res: Response, next: NextFunction) => {
    const response = await UserService.getAllProfileFromDB();

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Users Details Retrieved successfully",
        data: response 
    })
})

export const UserController = {
    registerUser, getMyProfile, updateMyProfile, updateUserStatusPatchByAdmin, getAllUsers
}