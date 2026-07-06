import { Role } from "../../../generated/prisma/enums";

export interface IRegisterUserPayload {
    name: string;
    email: string;
    password: string;
    role?: Role;
    profilePhoto?: string;
    address: string; 
    phone: string;
}

export type  UserProfilePayload = Omit<IRegisterUserPayload, "password">;

export interface IUserProfilePayload extends UserProfilePayload {
    status: string;
}