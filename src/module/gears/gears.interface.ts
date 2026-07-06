export interface IGearItemsQuery {
    title?: string;
    brand?: string;
    categoryId?: string;
    minPrice?: string | number;
    maxPrice?: string | number;
    availableOnly?: string;
}

export interface ICreateGearItemsPayload {
    title: string;
    description?: string;
    brand: string;
    pricePerDay: number;
    stock?: number;
    availableStock?: number;
    categoryId: string;
}

export type IUpdateGearItemsPayload = Partial<ICreateGearItemsPayload>

