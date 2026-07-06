import { ActiveStatus, Role } from "../../../generated/prisma/enums";
import { config } from "../../config";
import { ApiError } from "../../errors/ApiError";
import { prisma } from "../../lib/prisma";
import { IRegisterUserPayload, IUserProfilePayload } from "./users.interface";
import bcrypt from "bcryptjs";
import httpStatus from 'http-status';


class UserService {

    private UserValidation = {
        user: (payload: IRegisterUserPayload) => {
            if(!payload)
                throw new ApiError( httpStatus.NOT_FOUND, "Forbidden! your are not permission to create this role.");
        },
        userRolePermission: (role: Role) => {
            if (role === Role.ADMIN)    
                throw new ApiError( httpStatus.FORBIDDEN, "Forbidden! your are not permission to create this role.");
        },
        email: (payload: IRegisterUserPayload["email"]) => {
            if(!payload)
                throw new ApiError( httpStatus.BAD_REQUEST, "Email Must be provided.");
        },
        password: (payload: IRegisterUserPayload["password"]) => {
            if(!payload)
                throw new ApiError( httpStatus.BAD_REQUEST, "Password Must be provided.");
        },
    }



    async registerUserIntoDB(payload: IRegisterUserPayload) {
        
        const { name, email, password, role, profilePhoto, address, phone } = payload;
        
        this.UserValidation.userRolePermission(role as Role)

        if (!email || !password)    {
            this.UserValidation.email(email)
            this.UserValidation.password(password)
        }
            
        const user = await prisma.users.findFirst({
            where: { email }
        });
        
        if(user)    throw new ApiError( httpStatus.CONFLICT, "User already exist.");

        const pwsHash = await bcrypt.hash(password, config.bcrypt_salt_rounds)

        const response = await prisma.users.create({
            data: {
                name,
                email,
                password: pwsHash,
                role,
                profiles: {
                    create: {
                        profilePhoto,
                        address,
                        phone,
                    }
                }
            },
            omit: {
                password: true
            },
            include: {
                profiles: true
            }
        });

        return response;
    }

    async getMyProfileFromDB (userId : string) {
        const user = await prisma.users.findUniqueOrThrow({
            where : {id : userId},
            omit : {
                password : true
            },
            include : {
                profiles : true
            }
        });

        return user;
    }

    async resetUserPassword ( payload: any) {
        const { email, password } = payload;
        const user = await prisma.users.findFirst({
            where: { email }
        });

        if(!user)   throw new Error("User not exist.");

        const pwsHash = await bcrypt.hash(password, config.bcrypt_salt_rounds)

        const resetUser = await prisma.users.update({
            where : {id : user.id},
            data : {
                password : pwsHash
            }
        });

        return resetUser;
    }

    async getAllProfileFromDB () {
        const user = await prisma.users.findMany({
            omit : {
                password : true
            },
            include : {
                profiles : true
            }
        });

        return user;
    }

    async updateMyProfileInDB(userId : string, payload : IUserProfilePayload) {
        const { name, profilePhoto, bio, address, phone } = payload;

        const updateProfile = await prisma.users.update({
            where : { id: userId },
            data : {
                name,
                profiles : {
                    update: {
                        profilePhoto, 
                        address, 
                        phone,
                    }
                }
            },
            include: {
                profiles: true,
            },
            omit: {
                password: true,
            }
        })

        return updateProfile;
    }
}

export default new UserService();