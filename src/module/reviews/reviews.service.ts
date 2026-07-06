import httpStatus from "http-status";
import { Role } from "../../../generated/prisma/enums";
import { ApiError } from "../../errors/ApiError";
import { prisma } from "../../lib/prisma";
import { IUserJWTPayload } from "../users/users.interface";
import { ICreateReviewPayload, IReviewQuery, IUpdateReviewPayload } from "./reviews.interface";

class ReviewsService {
    private async getReview(id: string) {
        const review = await prisma.reviews.findUnique({
            where: { id },
            include: {
                gearItem: true,
                customer: true
            }
        });

        if (!review) {
            throw new ApiError(httpStatus.NOT_FOUND, "Review not found.");
        }

        return review;
    }

    private validateRating(rating: number) {
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            throw new ApiError(httpStatus.BAD_REQUEST, "rating must be an integer between 1 and 5.");
        }
    }

    private validateComment(comment?: string) {
        if (comment === undefined) {
            return;
        }

        const trimmedComment = comment.trim();

        if (!trimmedComment) {
            return null;
        }

        if (trimmedComment.length > 500) {
            throw new ApiError(httpStatus.BAD_REQUEST, "comment must be 500 characters or fewer.");
        }

        return trimmedComment;
    }

    async getAllReviews(user: IUserJWTPayload) {
        const include = {
            gearItem: true,
            customer: true
        };

        if (user.role === Role.ADMIN) {
            return prisma.reviews.findMany({ include });
        }

        if (user.role === Role.PROVIDER) {
            return prisma.reviews.findMany({
                where: {
                    gearItem: {
                        providerId: user.id
                    }
                },
                include
            });
        }

        return prisma.reviews.findMany({
            where: {
                customerId: user.id
            },
            include
        });
    }

    async getSingleReview(user: IUserJWTPayload, id: IReviewQuery["id"]) {
        const review = await this.getReview(id as string);

        if (user.role === Role.ADMIN) {
            return review;
        }

        if (user.role === Role.PROVIDER && review.gearItem.providerId === user.id) {
            return review;
        }

        if (user.role === Role.CUSTOMER && review.customerId === user.id) {
            return review;
        }

        throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: You do not have access to this review.");
    }

    async createReview(user: IUserJWTPayload, payload: ICreateReviewPayload) {
        const { gearItemId, rating, comment } = payload;

        if (!gearItemId) {
            throw new ApiError(httpStatus.BAD_REQUEST, "gearItemId is required.");
        }

        this.validateRating(Number(rating));

        const normalizedComment = this.validateComment(comment);

        const gearItem = await prisma.gearItems.findUnique({
            where: { id: gearItemId }
        });

        if (!gearItem) {
            throw new ApiError(httpStatus.NOT_FOUND, "Gear item not found.");
        }

        const existingReview = await prisma.reviews.findFirst({
            where: {
                customerId: user.id,
                gearItemId
            }
        });

        if (existingReview) {
            throw new ApiError(httpStatus.BAD_REQUEST, "You have already reviewed this gear item.");
        }

        return prisma.reviews.create({
            data: {
                customerId: user.id,
                gearItemId,
                rating: Number(rating),
                comment: normalizedComment ?? null
            },
            include: {
                gearItem: true,
                customer: true
            }
        });
    }

    async updateReview(user: IUserJWTPayload, id: IReviewQuery["id"], payload: IUpdateReviewPayload) {
        if (user.role !== Role.ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: Only admins can update reviews.");
        }

        const review = await this.getReview(id as string);
        const updates: Record<string, unknown> = {};

        if (payload.rating !== undefined) {
            this.validateRating(Number(payload.rating));
            updates.rating = Number(payload.rating);
        }

        if (payload.comment !== undefined) {
            const normalizedComment = this.validateComment(payload.comment);
            updates.comment = normalizedComment ?? null;
        }

        if (Object.keys(updates).length === 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "No valid fields were provided for update.");
        }

        return prisma.reviews.update({
            where: { id: review.id },
            data: updates,
            include: {
                gearItem: true,
                customer: true
            }
        });
    }

    async deleteReview(user: IUserJWTPayload, id: IReviewQuery["id"]) {
        if (user.role !== Role.PROVIDER && user.role !== Role.ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: Only providers and admins can delete reviews.");
        }

        const review = await this.getReview(id as string);

        if (user.role === Role.PROVIDER && review.gearItem.providerId !== user.id) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: You do not own the gear item for this review.");
        }

        return prisma.reviews.delete({
            where: { id: review.id }
        });
    }
}

export default new ReviewsService();