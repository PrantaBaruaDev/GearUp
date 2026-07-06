import express, { Request, Response, type Application } from "express";
import { AuthRouter } from "./module/auth/auth.route";
import { UserRouter } from "./module/users/user.route";
import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "./config";
import { notFound } from "./middlewares/notFound";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";
import { GearsRouter } from "./module/gears/gears.route";
import { CategoriesRoute } from "./module/categories/categories.route";
import { RentalItemsRoute } from "./module/rentalItems/rentalItems.route";
import { RentalOrdersRoute } from "./module/rentalOrders/rentalOrders.route";
import { ProviderManagementRouter } from "./module/provider_management/provider.route";
import { PaymentsRoute } from "./module/payments/payments.route";
import { ReviewsRoute } from "./module/reviews/reviews.route";
import { AdminManagementRouter } from "./module/admin_management/admin.route";

const app: Application = express();

app.use(cors({
    origin : config.app_url,
    credentials : true,
}))

app.use(express.json());
app.use(express.urlencoded({ extended : true }));
app.use(cookieParser());

const routeList = [
    // Category Routes
    "Category Route",
    "POST /api/admin/categories",
    "GET /api/categories",
    "GET /api/categories/:ID",
    "PATCH /api/admin/categories/:id",
    "DELETE /api/admin/categories/:id",
    "",
    "",

    // Gear Item Routes
    "Gear Routes",
    "GET /api/gear",
    "GET /api/gear/:id",
    "GET /api/provider/gear/:id",
    "POST /api/provider/gear",
    "PATCH /api/provider/gear/:id",
    "DELETE /api/provider/gear/:id",
    "GET /api/admin/gear",
    "GET /api/admin/gear/:id",
    "POST /api/admin/gear",
    "PATCH /api/admin/gear/:id",
    "DELETE /api/admin/gear/:id",


]

app.get("/", (req: Request, res: Response) => {
    const routeItems = routeList.map((value, key) => `<li key=${key}>${value}</li>`).join("");

    res.send(`
        <h1>Hello, Welcome To The GearUp!</h1>
        <ul>
            ${routeItems}
        </ul>
    `);
});

app.use("/api/auth", AuthRouter);
app.use("/api/admin", AdminManagementRouter);
app.use("/api/users", UserRouter);
app.use("/api/provider", ProviderManagementRouter);
app.use("/api/gear", GearsRouter);
app.use("/api/categories", CategoriesRoute);
app.use("/api/rental/items", RentalItemsRoute);
app.use("/api/rentals", RentalOrdersRoute);
app.use("/api/payments", PaymentsRoute);
app.use("/api/reviews", ReviewsRoute);


app.use(notFound)

app.use(globalErrorHandler)

export default app;
