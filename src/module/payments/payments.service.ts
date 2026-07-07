import httpStatus from "http-status";
import Stripe from "stripe";
import { OrderStatus, PaymentStatus, Role } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import { ApiError } from "../../errors/ApiError";
import { config } from "../../config";
import { prisma } from "../../lib/prisma";
import { IUserJWTPayload } from "../users/users.interface";
import { IConfirmPaymentPayload, ICreatePaymentPayload } from "./payments.interface";

const stripe = new Stripe(config.stripe_secret_key, {
    apiVersion: "2026-06-24.dahlia"
});

class PaymentsService {
    private async getPayment(id: string) {
        const payment = await prisma.payments.findUnique({
            where: { id },
            include: {
                user: true,
                rentalOrder: true
            }
        });

        if (!payment) {
            throw new ApiError(httpStatus.NOT_FOUND, "Payment not found.");
        }

        return payment;
    }

    private async verifyOrderAccess(user: IUserJWTPayload, rentalOrderId: string) {
        const rentalOrder = await prisma.rentalOrders.findUnique({
            where: { id: rentalOrderId }
        });

        if (!rentalOrder) {
            throw new ApiError(httpStatus.NOT_FOUND, "Rental order not found.");
        }

        if (user.role === Role.ADMIN) {
            return rentalOrder;
        }

        if (user.role === Role.CUSTOMER && rentalOrder.customerId === user.id) {
            return rentalOrder;
        }

        if (user.role === Role.PROVIDER) {
            const providerOwnsOrder = await prisma.rentalItems.findFirst({
                where: {
                    rentalOrderId,
                    gearItem: {
                        providerId: user.id
                    }
                }
            });

            if (providerOwnsOrder) {
                return rentalOrder;
            }
        }

        throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: You do not have access to this order.");
    }

    async getOwnUserPaymentsHistory(user: IUserJWTPayload) {
        if (user.role === Role.ADMIN) {
            return prisma.payments.findMany({
                include: {
                    user: true,
                    rentalOrder: true
                },
                orderBy: { createdAt: "desc" }
            });
        }

        return prisma.payments.findMany({
            where: user.role === Role.PROVIDER
                ? {
                    rentalOrder: {
                        rentalItems: {
                            some: {
                                gearItem: {
                                    providerId: user.id
                                }
                            }
                        }
                    }
                }
                : { userId: user.id },
            include: {
                user: true,
                rentalOrder: true
            },
            orderBy: { createdAt: "desc" }
        });
    }

    async getSinglePaymentsByID(user: IUserJWTPayload, id: string) {
        const payment = await this.getPayment(id);

        if (user.role === Role.ADMIN) {
            return payment;
        }

        if (user.role === Role.CUSTOMER && payment.userId === user.id) {
            return payment;
        }

        if (user.role === Role.PROVIDER) {
            const providerOwnsOrder = await prisma.rentalItems.findFirst({
                where: {
                    rentalOrderId: payment.rentalOrderId,
                    gearItem: {
                        providerId: user.id
                    }
                }
            });

            if (providerOwnsOrder) {
                return payment;
            }
        }

        throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: You do not have access to this payment.");
    }

    async createPaymentCheckout(user: IUserJWTPayload, payload: ICreatePaymentPayload) {
        const rentalOrder = await this.verifyOrderAccess(user, payload.rentalOrderId);

        const existingPayment = await prisma.payments.findUnique({
            where: { rentalOrderId: rentalOrder.id }
        });

        if (existingPayment?.status === PaymentStatus.COMPLETED) {
            return {
                payment: existingPayment,
                checkoutUrl: null,
                message: "Payment already completed."
            };
        }

        const amount = Number(rentalOrder.totalPrice);

        const payment = existingPayment ?? await prisma.payments.create({
            data: {
                userId: user.id,
                rentalOrderId: rentalOrder.id,
                amount: new Prisma.Decimal(amount),
                status: PaymentStatus.PENDING
            }
        });

        const checkoutSession = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            customer_email: rentalOrder.customerId ? undefined : undefined,
            line_items: [
                {
                    price_data: {
                        currency: "bdt",
                        product_data: {
                            name: `GearUp rental order ${rentalOrder.id}`
                        },
                        unit_amount: Math.round(amount * 100)
                    },
                    quantity: 1
                }
            ],
            success_url: `${config.app_url}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.app_url}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
            metadata: {
                rentalOrderId: rentalOrder.id,
                userId: user.id,
                paymentId: payment.id
            }
        });

        const updatedPayment = await prisma.payments.update({
            where: { id: payment.id },
            data: {
                stripeTransactionId: checkoutSession.id,
                stripeCustomerId: checkoutSession.customer as string | null || undefined,
                paidAt: payment.paidAt ?? undefined
            }
        });

        return {
            payment: updatedPayment,
            checkoutUrl: checkoutSession.url,
            message: "Stripe checkout session created successfully."
        };
    }

    async confirmPayment(user: IUserJWTPayload, payload: IConfirmPaymentPayload) {
        const payment = payload.paymentId
            ? await this.getPayment(payload.paymentId)
            : await prisma.payments.findFirst({
                where: { rentalOrderId: payload.rentalOrderId }
            });

        if (!payment) {
            throw new ApiError(httpStatus.NOT_FOUND, "Payment not found.");
        }

        await this.verifyOrderAccess(user, payment.rentalOrderId);

        return prisma.payments.update({
            where: { id: payment.id },
            data: {
                status: PaymentStatus.COMPLETED,
                paidAt: new Date()
            },
            include: {
                user: true,
                rentalOrder: true
            }
        });
    }

    async updatePayment(user: IUserJWTPayload, id: string, payload: Partial<ICreatePaymentPayload>) {
        const payment = await this.getPayment(id);
        await this.verifyOrderAccess(user, payment.rentalOrderId);

        return prisma.payments.update({
            where: { id },
            data: {
                rentalOrderId: payload.rentalOrderId ?? payment.rentalOrderId
            }
        });
    }

    async deletePayment(user: IUserJWTPayload, id: string) {
        const payment = await this.getPayment(id);
        await this.verifyOrderAccess(user, payment.rentalOrderId);

        return prisma.payments.delete({ where: { id } });
    }

    async handleStripeWebhook(body: Buffer, signature: string | undefined) {
        if (!config.stripe_webhook_secret || !body || !signature) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Stripe webhook signature missing.");
        }

        const event = stripe.webhooks.constructEvent(body, signature, config.stripe_webhook_secret);

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            const rentalOrderId = session.metadata?.rentalOrderId;
            const paymentId = session.metadata?.paymentId;
            const userId = session.metadata?.userId;
            const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
            const stripeTransactionId = typeof session.payment_intent === "string" ? session.payment_intent : session.id;

            if (!rentalOrderId || !userId) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Stripe checkout session is missing order metadata.");
            }

            const payment = await prisma.payments.findFirst({
                where: { OR: [{ id: paymentId ?? "" }, { rentalOrderId }] }
            });

            if (!payment) {
                throw new ApiError(httpStatus.NOT_FOUND, "Payment record not found for matching Stripe checkout session.");
            }

            await prisma.$transaction([
                prisma.payments.update({
                    where: { id: payment.id },
                    data: {
                        status: PaymentStatus.COMPLETED,
                        stripeCustomerId: stripeCustomerId ?? undefined,
                        stripeTransactionId,
                        paidAt: new Date()
                    }
                }),
                prisma.rentalOrders.update({
                    where: { id: rentalOrderId },
                    data: {
                        status: OrderStatus.CONFIRMED
                    }
                })
            ]);

            return "Stripe payment completed and your order was updated.";
        }

        return `Unhandled Stripe event: ${event.type}`;
    }
}

export default new PaymentsService();