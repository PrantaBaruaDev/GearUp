import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";
import { ReviewsController } from "./reviews.controller";

const router = Router();

router.get("/", auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN), ReviewsController.getAllReviews);
router.get("/:id", auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN), ReviewsController.getSingleReview);
router.post("/", auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN), ReviewsController.createReview);
router.patch("/:id", auth(Role.ADMIN), ReviewsController.updateReview);

export const ReviewsRoute = router;
