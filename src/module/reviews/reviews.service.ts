import httpStatus from "http-status";
import { Role } from "../../../generated/prisma/enums";
import { ApiError } from "../../errors/ApiError";
import { prisma } from "../../lib/prisma";
import { IUserJWTPayload } from "../users/users.interface";
import { ICreateReviewPayload, IReviewQuery, IUpdateReviewPayload } from "./reviews.interface";

const baseReviewInclude = {
    gearItem: true,
    customer: {
        omit: { password: true }
    }
};

class ReviewsService {
    private async getReview(id: string) {
        const review = await prisma.reviews.findUnique({
            where: { id },
            include: baseReviewInclude
        });
        if (!review) throw new ApiError(httpStatus.NOT_FOUND, "Review not found.");
        return review;
    }

    private validateRating(rating: number) {
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Rating must be an integer between 1 and 5.");
        }
    }

    private validateComment(comment?: string): string | null {
        if (comment === undefined) return null;
        
        const trimmedComment = comment.trim();
        if (!trimmedComment) return null;

        if (trimmedComment.length > 500) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Comment must be 500 characters or fewer.");
        }
        return trimmedComment;
    }

    async getAllReviews(user: IUserJWTPayload) {
        let whereCondition = {};

        if (user.role === Role.PROVIDER) {
            whereCondition = { gearItem: { providerId: user.id } };
        } else if (user.role === Role.CUSTOMER) {
            whereCondition = { customerId: user.id };
        }

        return prisma.reviews.findMany({
            where: whereCondition,
            include: baseReviewInclude
        });
    }

    async getSingleReview(user: IUserJWTPayload, id: IReviewQuery["id"]) {
        const review = await this.getReview(id as string);

        const hasAccess = 
            user.role === Role.ADMIN ||
            (user.role === Role.PROVIDER && review.gearItem.providerId === user.id) ||
            (user.role === Role.CUSTOMER && review.customerId === user.id);

        if (!hasAccess) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: You do not have access to this review.");
        }

        return review;
    }

    async createReview(user: IUserJWTPayload, payload: ICreateReviewPayload) {
        const { gearItemId, rating, comment } = payload;
        if (!gearItemId) throw new ApiError(httpStatus.BAD_REQUEST, "gearItemId is required.");

        this.validateRating(Number(rating));
        const normalizedComment = this.validateComment(comment);

        const gearItem = await Promise.all([
            prisma.gearItems.findUnique({ where: { id: gearItemId } })
        ]);

        if (!gearItem) throw new ApiError(httpStatus.NOT_FOUND, "Gear item not found.");
        
        return prisma.reviews.create({
            data: {
                customerId: user.id,
                gearItemId,
                rating: Number(rating),
                comment: normalizedComment
            },
            include: baseReviewInclude
        });
    }

    async updateReview(user: IUserJWTPayload, id: IReviewQuery["id"], payload: IUpdateReviewPayload) {
        const review = await this.getReview(id as string);
        const updates: Record<string, unknown> = {};

        if(user.id !== review.customerId) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: Only review owner can update this reviews.");
        }

        if (payload.rating !== undefined) {
            this.validateRating(Number(payload.rating));
            updates.rating = Number(payload.rating);
        }

        if (payload.comment !== undefined) {
            updates.comment = this.validateComment(payload.comment);
        }

        if (Object.keys(updates).length === 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "No valid fields were provided for update.");
        }

        return prisma.reviews.update({
            where: { id: review.id },
            data: updates,
            include: baseReviewInclude
        });
    }

    async deleteReview(user: IUserJWTPayload, id: IReviewQuery["id"]) {
        if (user.role !== Role.ADMIN) {
            throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: Only providers and admins can delete reviews.");
        }

        const review = await this.getReview(id as string);

        return prisma.reviews.delete({ where: { id: review.id } });
    }
}

export default new ReviewsService();