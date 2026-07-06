import { Role } from "../../../generated/prisma/enums";

export interface IUserProfileQuery {
    id: string;
    name: string;
    email: string;
    password: string;
    role?: Role;
    profilePhoto?: string;
    address: string; 
    phone: string;
}

export interface IRegisterUserPayload {
    name: string;
    email: string;
    password: string;
    role?: Role;
    profilePhoto?: string;
    address: string; 
    phone: string;
}

export interface IUserJWTPayload {
    email: string;
    name: string;
    id: string;
    role: Role;
}
export type  UserProfilePayload = Omit<IRegisterUserPayload, "password">;

export interface IUserProfilePayload extends UserProfilePayload {
    status: string;
}