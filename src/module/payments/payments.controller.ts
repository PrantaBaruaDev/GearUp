import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import PaymentsService from "./payments.service";
import { IUserJWTPayload } from "../users/users.interface";
import { IConfirmPaymentPayload, ICreatePaymentPayload } from "./payments.interface";

const getOwnUserPaymentsHistory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const payments = await PaymentsService.getOwnUserPaymentsHistory(user);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Payment history retrieved successfully.",
        data: payments
    });
});

const getSinglePaymentsByID = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const { id } = req.params;
    const payment = await PaymentsService.getSinglePaymentsByID(user, id as string);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Payment retrieved successfully.",
        data: payment
    });
});

const confirmPayment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const payload = req.body as IConfirmPaymentPayload;
    const payment = await PaymentsService.confirmPayment(user, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Payment confirmed successfully.",
        data: payment
    });
});

const createPayments = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const payload = req.body as ICreatePaymentPayload;
    const data = await PaymentsService.createPaymentCheckout(user, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Stripe checkout session created successfully.",
        data
    });
});

const updatePayments = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const { id } = req.params;
    const payload = req.body as Partial<ICreatePaymentPayload>;
    const payment = await PaymentsService.updatePayment(user, id as string, payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Payment updated successfully.",
        data: payment
    });
});

const deletePayments = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUserJWTPayload;
    const { id } = req.params;
    const payment = await PaymentsService.deletePayment(user, id as string);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Payment deleted successfully.",
        data: payment
    });
});

const handleStripeWebhook = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers["stripe-signature"];
    const signatureValue = Array.isArray(signature) ? signature[0] : signature;

    const payment = await PaymentsService.handleStripeWebhook(req.body as Buffer, signatureValue);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: payment,
        data: {}
    });
});

export const PaymentsController = {
    getOwnUserPaymentsHistory,
    getSinglePaymentsByID,
    confirmPayment,
    createPayments,
    updatePayments,
    deletePayments,
    handleStripeWebhook
};