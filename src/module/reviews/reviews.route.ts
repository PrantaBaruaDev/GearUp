import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";
import { ReviewsController } from "./reviews.controller";

const router = Router();

router.post("/", auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN), ReviewsController.createReview);
router.patch("/:id", auth(Role.ADMIN), ReviewsController.updateReview);
router.delete("/:id", auth(Role.PROVIDER, Role.ADMIN), ReviewsController.deleteReview);


export const ReviewsRoute = router;
