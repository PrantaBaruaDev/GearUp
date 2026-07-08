import httpStatus from "http-status";
import Stripe from "stripe";
import { OrderStatus, PaymentStatus, Role } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import { ApiError } from "../../errors/ApiError";
import { config } from "../../config";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe"; 
import { IUserJWTPayload } from "../users/users.interface";
import { IConfirmPaymentPayload, ICreatePaymentPayload } from "./payments.interface";

const basePaymentInclude = {
    user: { 
        select: { 
            id: true, 
            name: true, 
            email: true, 
            role: true 
        } 
    },
    rentalOrder: true
};

const adminDeepHistoryInclude = {
    user: { 
        omit: { 
            password: true 
        } 
    },
    rentalOrder: {
        include: {
            customer: true,
            rentalItems: {
                include: {
                    gearItem: {
                        include: {
                            provider: { 
                                select: { 
                                    id: true, 
                                    name: true, 
                                    email: true, 
                                    role: true 
                                } 
                            }
                        }
                    }
                }
            }
        }
    }
};

class PaymentsService {
    private async getPayment(id: string) {
        const payment = await prisma.payments.findUnique({
            where: { id },
            include: basePaymentInclude
        });
        if (!payment) throw new ApiError(httpStatus.NOT_FOUND, "Payment record not found.");
        return payment;
    }

    private async verifyOrderAccess(user: IUserJWTPayload, rentalOrderId: string) {
        const rentalOrder = await prisma.rentalOrders.findUnique({ 
            where: { id: rentalOrderId }
        });

        if (!rentalOrder) throw new ApiError(httpStatus.NOT_FOUND, "Rental order not found.");

        if (user.role === Role.ADMIN || (user.role === Role.CUSTOMER && rentalOrder.customerId === user.id)) {
            return rentalOrder;
        }

        if (user.role === Role.PROVIDER) {
            const hasOwnership = await prisma.rentalItems.findFirst({
                where: { 
                    rentalOrderId, 
                    gearItem: { 
                        providerId: user.id 
                    } 
                }
            });
            if (hasOwnership) return rentalOrder;
        }

        throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: Access denied for this order resource.");
    }

    async getOwnUserPaymentsHistory(user: IUserJWTPayload) {
        if (user.role === Role.ADMIN) {
            return prisma.payments.findMany({
                include: adminDeepHistoryInclude,
                orderBy: { createdAt: "desc" }
            });
        }

        const condition = user.role === Role.PROVIDER
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
            : { userId: user.id };

        return prisma.payments.findMany({
            where: condition,
            include: basePaymentInclude,
            orderBy: { createdAt: "desc" }
        });
    }

    async getSinglePaymentsByID(user: IUserJWTPayload, id: string) {
        const payment = await this.getPayment(id);
        
        if (user.role === Role.ADMIN || (user.role === Role.CUSTOMER && payment.userId === user.id)) {
            return payment;
        }

        if (user.role === Role.PROVIDER) {
            const hasOwnership = await prisma.rentalItems.findFirst({
                where: { 
                    rentalOrderId: payment.rentalOrderId, 
                    gearItem: { providerId: user.id } 
                }
            });
            if (hasOwnership) return payment;
        }

        throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: Access denied for this payment statement.");
    }

    async createPaymentCheckout(user: IUserJWTPayload, payload: ICreatePaymentPayload) {
        const rentalOrder = await this.verifyOrderAccess(user, payload.rentalOrderId);

        if (rentalOrder.status !== OrderStatus.CONFIRMED) {
            throw new ApiError(
                httpStatus.BAD_REQUEST, 
                `Payment rejected. Order is ${rentalOrder.status} but must be CONFIRMED by the provider first.`
            );
        }

        return await prisma.$transaction(async (tx) => {
            
            const existingPayment = await tx.payments.findUnique({
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

            const userFetch = await tx.users.findFirstOrThrow({
                where: { id: rentalOrder.customerId },
                include: { profiles: true } 
            });

            let stripeCustomerId = existingPayment?.stripeCustomerId;

            if (!stripeCustomerId) {
                const customer = await stripe.customers.create({
                    email: userFetch.email,
                    name: userFetch.name,
                    metadata: { userId: user.id }
                });
                stripeCustomerId = customer.id;
            }

            const payment = existingPayment ?? await tx.payments.create({
                data: {
                    userId: user.id,
                    rentalOrderId: rentalOrder.id,
                    amount: new Prisma.Decimal(amount),
                    status: PaymentStatus.PENDING,
                    stripeCustomerId: stripeCustomerId
                }
            });

            const checkoutSession = await stripe.checkout.sessions.create({
                mode: "payment",
                payment_method_types: ["card"],
                customer: stripeCustomerId,
                line_items: [{
                    price_data: {
                        currency: "bdt",
                        product_data: { name: `GearUp rental order ${rentalOrder.id}` },
                        unit_amount: Math.round(amount * 100)
                    },
                    quantity: 1
                }],
                success_url: `${config.app_url}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${config.app_url}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
                metadata: {
                    rentalOrderId: rentalOrder.id,
                    userId: user.id,
                    paymentId: payment.id
                }
            });

            const updatedPayment = await tx.payments.update({
                where: { id: payment.id },
                data: {
                    stripeTransactionId: checkoutSession.id,
                    stripeCustomerId: stripeCustomerId
                },
                include: basePaymentInclude
            });

            return {
                payment: updatedPayment,
                checkoutUrl: checkoutSession.url,
                message: "Stripe checkout session created successfully."
            };
        });
    }

    async confirmPayment(user: IUserJWTPayload, payload: IConfirmPaymentPayload) {
        const payment = payload.paymentId
            ? await this.getPayment(payload.paymentId)
            : await prisma.payments.findFirst({ where: { rentalOrderId: payload.rentalOrderId } });

        if (!payment) throw new ApiError(httpStatus.NOT_FOUND, "Payment statement not located.");
        await this.verifyOrderAccess(user, payment.rentalOrderId);

        return prisma.payments.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.COMPLETED, paidAt: new Date() },
            include: basePaymentInclude
        });
    }

    async deletePayment(user: IUserJWTPayload, id: string) {
        const payment = await this.getPayment(id);
        await this.verifyOrderAccess(user, payment.rentalOrderId);
        return prisma.payments.delete({ where: { id } });
    }

    async handleStripeWebhook(body: Buffer, signature: string) {
        if (!config.stripe_webhook_secret || !body || !signature) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Stripe webhook parameters missing.");
        }

        const event = stripe.webhooks.constructEvent(body, signature, config.stripe_webhook_secret);

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            const { rentalOrderId, paymentId } = session.metadata || {};
            const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
            const stripeTransactionId = typeof session.payment_intent === "string" ? session.payment_intent : session.id;

            if (!rentalOrderId) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Missing required operational context tracking metadata.");
            }

            const payment = await prisma.payments.findFirst({
                where: { OR: [{ id: paymentId ?? "" }, { rentalOrderId }] }
            });
            if (!payment) throw new ApiError(httpStatus.NOT_FOUND, "Payment record not found for webhook processing.");

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
                    data: { status: OrderStatus.CONFIRMED } 
                })
            ]);

            return "Stripe payment process parsed successfully.";
        }

        return `Unhandled event wrapper: ${event.type}`;
    }
}

export default new PaymentsService();