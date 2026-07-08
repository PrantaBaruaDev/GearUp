export interface IGearItemsQuery {
    title?: string;
    brand?: string;
    category?: string;
    minPrice?: string | number;
    maxPrice?: string | number;
    availableOnly?: string;
    providerId: string; 
    page: string | number; 
    limit: string | number;
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

