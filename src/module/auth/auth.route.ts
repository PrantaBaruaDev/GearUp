import { Router } from "express";
import { AuthController } from "./auth.controller";
import { UserController } from "../users/user.controller";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middlewares/auth";

const router = Router();

router.post("/register", UserController.registerUser);
router.get("/me", auth(Role.ADMIN, Role.PROVIDER, Role.CUSTOMER), UserController.getMyProfile);
router.post("/login", AuthController.loginUser);
router.post("/logout", AuthController.logoutUser);
router.post("/refresh-token", AuthController.refreshToken)



export const AuthRouter = router;