

import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";
import { GearsController } from "../gears/gears.controller";
import { UserController } from "../users/user.controller";
import { RentalOrdersController } from "../rentalOrders/rentalOrders.controller";
import { PaymentsController } from "../payments/payments.controller";
import { CategoriesController } from "../categories/categories.controller";
import { RentalItemsController } from "../rentalItems/rentalItems.controller";

const router = Router();

router.get("/users", auth(Role.ADMIN), UserController.getAllUsers);
router.patch("/users/:id", auth(Role.ADMIN), UserController.updateUserStatusPatchByAdmin);


router.get("/gear", auth(Role.ADMIN), GearsController.getAllGearsDetails);
router.get("/gear/:id", auth(Role.ADMIN), GearsController.getSingleGearById);
router.post("/gear", auth(Role.ADMIN), GearsController.createGear);
router.patch("/gear/:id", auth(Role.ADMIN), GearsController.updateGear);
router.delete("/gear/:id", auth(Role.ADMIN), GearsController.deleteGear);


router.get("/rentals", auth(Role.ADMIN), RentalOrdersController.getAllRentalOrders);
router.delete("/rentals/:id", auth(Role.ADMIN), RentalOrdersController.deleteRentalOrder);


router.get("/rentals/items", auth(Role.ADMIN), RentalItemsController.getAllRentalItems);
router.delete("/rentals/items/:id", auth(Role.ADMIN), RentalItemsController.deleteRentalItem);


router.post("/categories/", auth(Role.ADMIN), CategoriesController.createCategory);
router.patch("/categories/:id", auth(Role.ADMIN), CategoriesController.updateCategory);
router.delete("/categories/:id", auth(Role.ADMIN), CategoriesController.deleteCategory);

router.patch("/payments/:id", auth(Role.ADMIN), PaymentsController.updatePayments);
router.delete("/payments/:id", auth(Role.ADMIN), PaymentsController.deletePayments);


export const AdminManagementRouter = router;


