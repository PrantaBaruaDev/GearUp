import { OrderStatus } from "../../../generated/prisma/enums";
import { Decimal } from "../../../generated/prisma/internal/prismaNamespace";
import { IRentalItemsQuery } from "../rentalItems/rentalItems.interface";
import { IPaymentsQuery } from "../payments/payments.interface";

export interface IRentalOrderQuery {
    id: string;
    customerId: string;
    startDate: Date;
    endDate: Date;
    totalPrice: Decimal;
    status: OrderStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface IRentalItemsCreatePayload {
    gearItemId: string;
    quantity?: number;
}

export interface IRentalOrderPayload {
    customerId?: string;
    startDate: Date | string;
    endDate: Date | string;
    totalPrice?: number | string;
    status?: OrderStatus;
    gearItemsIds?: string[];
    rentalItems?: IRentalItemsCreatePayload[];
}

export interface RentalOrders extends IRentalOrderQuery {
    rentalItems?: IRentalItemsQuery[];
    payment?: IPaymentsQuery;
}
