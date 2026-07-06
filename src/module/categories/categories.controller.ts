import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync"
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from 'http-status';
import CategoriesService from "./categories.service";
import { ICategoriesQuery } from "./categories.interface";

const getAllCategory = catchAsync( async(req: Request, res: Response, next: NextFunction) => {
    const categories = await CategoriesService.getAllCategory();

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Property created successfully",
        data: categories,
    });
})
const getSingleCategoryByID = catchAsync( async(req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const categories = await CategoriesService.getSingleCategoryByID(id as ICategoriesQuery["id"]);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Property created successfully",
        data: categories,
    });
})
const createCategory = catchAsync( async(req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;
    const userId = req.user?.id as string;
    
    const categories = await CategoriesService.createCategory(
        userId,
        payload
    );

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Property created successfully",
        data: categories,
    });
})
const updateCategory = catchAsync( async(req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const payload = req.body;
    const userId = req.user?.id as string;

    const updated = await CategoriesService.updateCategory(
        userId,
        id as ICategoriesQuery["id"],
        payload
    );

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Category updated successfully",
        data: updated,
    });
})
const deleteCategory = catchAsync( async(req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user?.id as string;

    const deleted = await CategoriesService.deleteCategory(
        userId,
        id as ICategoriesQuery["id"]
    );

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Category deleted successfully",
        data: deleted,
    });
})

export const CategoriesController = {
    getAllCategory,
    getSingleCategoryByID,
    createCategory,
    updateCategory,
    deleteCategory
}