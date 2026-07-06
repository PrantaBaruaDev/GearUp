
export interface IRentalItemsQuery {
    id: string;
    rentalOrderId: string;
    gearItemId: string;
    quantity: number;
}

export interface IRentalItemsPayload {
    rentalOrderId: string;
    gearItemId: string;
    quantity: number;
}