export interface IReviewQuery {
    id: string;
    rating: number;
    comment?: string | null;
    customerId: string;
    gearItemId: string;
    createdAt: Date;
}

export interface ICreateReviewPayload {
    rating: number;
    comment?: string;
    gearItemId: string;
}

export type IUpdateReviewPayload = Partial<ICreateReviewPayload>;
