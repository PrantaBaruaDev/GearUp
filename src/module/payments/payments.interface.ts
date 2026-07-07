import { PaymentStatus } from "../../../generated/prisma/enums";
import { Decimal } from "../../../generated/prisma/internal/prismaNamespace";

export interface IPaymentsQuery {
    id?: string;
    userId?: string;
    rentalOrderId?: string;
    stripeCustomerId?: string;
    stripeTransactionId?: string;
    amount?: Decimal;
    paidAt?: Date;
    status?: PaymentStatus;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICreatePaymentPayload {
    rentalOrderId: string;
}

export interface IConfirmPaymentPayload {
    paymentId?: string;
    rentalOrderId?: string;
}