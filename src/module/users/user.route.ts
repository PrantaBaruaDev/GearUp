import { Router } from "express";
import { UserController } from "./user.controller";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.patch("/profile", auth(Role.ADMIN, Role.CUSTOMER, Role.PROVIDER), UserController.updateMyProfile);

export const UserRouter = router;

