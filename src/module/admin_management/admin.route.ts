

import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";
import { GearsController } from "../gears/gears.controller";
import { UserController } from "../users/user.controller";
import { RentalOrdersController } from "../rentalOrders/rentalOrders.controller";
import { PaymentsController } from "../payments/payments.controller";
import { CategoriesController } from "../categories/categories.controller";
import { RentalItemsController } from "../rentalItems/rentalItems.controller";
import { ReviewsController } from "../reviews/reviews.controller";

const router = Router();

router.get("/users", auth(Role.ADMIN), UserController.getAllUsers);
router.patch("/users/:id", auth(Role.ADMIN), UserController.updateUserStatusPatchByAdmin);


router.get("/gear", auth(Role.ADMIN), GearsController.getGearDetailsForAdmin);
router.get("/gear/:id", auth(Role.ADMIN), GearsController.getSingleGearById);
router.post("/gear", auth(Role.ADMIN), GearsController.createGearItem);
router.patch("/gear/:id", auth(Role.ADMIN), GearsController.updateGearItem);
router.delete("/gear/:id", auth(Role.ADMIN), GearsController.deleteGearItem);

router.get("/rentals", auth(Role.ADMIN), RentalOrdersController.getAllRentalOrders);
router.get("/rentals/:id", auth(Role.ADMIN), RentalOrdersController.getSingleRentalOrdersByID);
router.patch("/rentals/:id", auth(Role.ADMIN), RentalOrdersController.updateRentalOrder);
router.delete("/rentals/:id", auth(Role.ADMIN), RentalOrdersController.deleteRentalOrder);

router.get("/rentals/items", auth(Role.ADMIN), RentalItemsController.getAllRentalItems);

router.post("/categories/", auth(Role.ADMIN), CategoriesController.createCategory);
router.patch("/categories/:id", auth(Role.ADMIN), CategoriesController.updateCategory);
router.delete("/categories/:id", auth(Role.ADMIN), CategoriesController.deleteCategory);

router.delete("/payments/:id", auth(Role.ADMIN), PaymentsController.deletePayments);

router.delete("/review/:id", auth( Role.ADMIN), ReviewsController.deleteReview);

export const AdminManagementRouter = router;


