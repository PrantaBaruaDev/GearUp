import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import ReviewsService from "./reviews.service";
import { IUserJWTPayload } from "../users/users.interface";
import { ICreateReviewPayload, IUpdateReviewPayload } from "./reviews.interface";

const createReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const payload = req.body as ICreateReviewPayload;
    const review = await ReviewsService.createReview(user, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Review created successfully.",
        data: review
    });
});

const getAllReviews = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const reviews = await ReviewsService.getAllReviews(user);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Reviews retrieved successfully.",
        data: reviews
    });
});

const getSingleReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const { id } = req.params;
    const review = await ReviewsService.getSingleReview(user, id as string);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Review retrieved successfully.",
        data: review
    });
});

const updateReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const { id } = req.params;
    const payload = req.body as IUpdateReviewPayload;
    const review = await ReviewsService.updateReview(user, id as string, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Review updated successfully.",
        data: review
    });
});

const deleteReview = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const { id } = req.params;
    const review = await ReviewsService.deleteReview(user, id as string);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Review deleted successfully.",
        data: review
    });
});

export const ReviewsController = {
    createReview,
    getAllReviews,
    getSingleReview,
    updateReview,
    deleteReview
};