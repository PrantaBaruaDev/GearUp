import { Router } from "express";
import { GearsController } from "./gears.controller";

const router = Router();

// Public routes
router.get("/", GearsController.getAllGearsDetails);
router.get("/:id", GearsController.getSingleGearById);


export const GearsRouter = router;
