import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";
import { PaymentsController } from "./payments.controller";

const router = Router();

router.post("/create", auth(Role.CUSTOMER, Role.PROVIDER), PaymentsController.createPayments);
router.post("/confirm", auth(Role.CUSTOMER, Role.PROVIDER), PaymentsController.confirmPayment);
router.get("/", auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN), PaymentsController.getOwnUserPaymentsHistory);
router.get("/:id", auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN), PaymentsController.getSinglePaymentsByID);

export const PaymentsRoute = router;
