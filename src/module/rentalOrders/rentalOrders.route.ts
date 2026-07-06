import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";
import { RentalOrdersController } from "./rentalOrders.controller";

const router = Router();

router.get("/", auth(Role.PROVIDER, Role.ADMIN), RentalOrdersController.getAllRentalOrders);
router.get("/:id", auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN), RentalOrdersController.getSingleRentalOrdersByID);

router.post("/:id", auth(Role.CUSTOMER, Role.PROVIDER), RentalOrdersController.createRentalOrders);
router.patch("/:id", auth(Role.PROVIDER), RentalOrdersController.updateRentalOrder);
router.delete("/:id", auth(Role.PROVIDER), RentalOrdersController.deleteRentalOrder);


export const RentalOrdersRoute = router;
