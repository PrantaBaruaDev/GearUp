import { Router } from "express";
import { CategoriesController } from "./categories.controller";

const router = Router();

// Public routes
router.get("/", CategoriesController.getAllCategory);
router.get("/:id", CategoriesController.getSingleCategoryByID);


export const CategoriesRoute = router;
