

import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";
import { GearsController } from "../gears/gears.controller";
import { PaymentsController } from "../payments/payments.controller";
import { RentalOrdersController } from "../rentalOrders/rentalOrders.controller";
import { ReviewsController } from "../reviews/reviews.controller";

const router = Router();

router.get("/gear", auth(Role.PROVIDER), GearsController.getAllOwnProviderGearDetailsById);
router.post("/gear", auth(Role.PROVIDER), GearsController.createGearItem);
router.patch("/gear/:id", auth(Role.PROVIDER), GearsController.updateGearItem);
router.delete("/gear/:id", auth(Role.PROVIDER), GearsController.deleteGearItem);


router.get("/orders", auth(Role.PROVIDER), RentalOrdersController.getAllRentalOrders);
router.get("/orders/:id", auth(Role.PROVIDER), RentalOrdersController.getSingleRentalOrdersByID);
router.patch("/orders/:id", auth(Role.PROVIDER), RentalOrdersController.updateRentalOrder);
router.delete("/orders/:id", auth(Role.PROVIDER), RentalOrdersController.deleteRentalOrder);

router.get("/payments/:id", auth(Role.PROVIDER), PaymentsController.getSinglePaymentsByID);

export const ProviderManagementRouter = router;


