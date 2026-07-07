import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";
import { RentalItemsController } from "./rentalItems.controller";

const router = Router();

router.get("/", auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN), RentalItemsController.getAllRentalItems);
router.get("/:id", auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN), RentalItemsController.getSingleRentalItemsByID);

export const RentalItemsRoute = router;
