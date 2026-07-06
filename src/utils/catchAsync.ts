import type { NextFunction, Request, RequestHandler, Response } from "express";
import httpStatus from "http-status";
import { config } from "../config";

export const catchAsync = (fn: RequestHandler) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await fn(req, res, next);
        } catch (error: any) {
            next(error);
            // console.log(error);

            // res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            //     success: false,
            //     statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            //     message: error instanceof Error ? error.message : "Internal Server Error",
            //     error: config.node_env === "development" && error instanceof Error ? error.stack?.split("\n") : undefined,
            // })
        }
    }
}