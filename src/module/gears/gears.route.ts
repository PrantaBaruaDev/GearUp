import { Router } from "express";
import { GearsController } from "./gears.controller";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

// Public routes
router.get("/", GearsController.getAllGearsDetails);
router.get("/:id", GearsController.getSingleGearById);



export const GearsRouter = router;
