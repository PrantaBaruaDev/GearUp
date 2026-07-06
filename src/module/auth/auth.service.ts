import bcrypt from "bcryptjs";
import { ILoginUser } from "./auth.interface";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import { config } from "../../config";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import { ApiError } from "../../errors/ApiError";
import httpStatus from 'http-status';
import { Role } from "../../../generated/prisma/enums";

class AuthService {
    private AuthValidation = {
        user: (payload: ILoginUser) => {
            if(!payload)
                throw new ApiError( httpStatus.NOT_FOUND, "Forbidden! your are not permission to create this role.");
        },
        userRolePermission: (role: Role) => {
            if (role === Role.ADMIN)    
                throw new ApiError( httpStatus.FORBIDDEN, "Forbidden! your are not permission to create this role.");
        },
        email: (payload: ILoginUser["email"]) => {
            if(!payload)
                throw new ApiError( httpStatus.BAD_REQUEST, "Email Must be provided.");
        },
        password: (payload: ILoginUser["password"]) => {
            if(!payload)
                throw new ApiError( httpStatus.BAD_REQUEST, "Password Must be provided.");
        },
        password_hash: (payload: boolean) => {
            if(!payload)
                throw new ApiError( httpStatus.UNAUTHORIZED,"Password is incorrect");
        },
    }

    async loginUser(payload : ILoginUser) {
        const { email, password } = payload;

        if (!email || !password) {
            this.AuthValidation.email(email);
            this.AuthValidation.password(password);
        }

        const user = await prisma.users.findUniqueOrThrow({
            where : { email }
        });

        if(!user) {
            this.AuthValidation.user(user)
        }

        const isPasswordMatched = await bcrypt.compare(password, user.password);
        
        if(!isPasswordMatched) {
            this.AuthValidation.password_hash(isPasswordMatched)
        }

        const jwtPayload = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }

        const accessToken = jwtUtils.createToken(
            jwtPayload,
            config.jwt_access_secret,
            config.jwt_access_expires_in as SignOptions
        );

        const refreshToken = jwtUtils.createToken(
            jwtPayload,
            config.jwt_refresh_secret,
            config.jwt_refresh_expires_in as SignOptions
        );

        return {
            accessToken,
            refreshToken
        };
    }

    async refreshToken(refreshToken : string) {
        const verifiedRefreshToken = jwtUtils.verifyToken(refreshToken, config.jwt_refresh_secret);

        if(!verifiedRefreshToken.success){
            throw new ApiError( httpStatus.UNAUTHORIZED, verifiedRefreshToken.error)
        }

        const {id} = verifiedRefreshToken.data as JwtPayload;

        const user = await prisma.users.findUniqueOrThrow({
            where : {
                id
            }
        })

        if(user.status === "SUSPEND"){
            throw new Error("User is Suspend! Pleas contact on support.")
        }

        const jwtPayload = {
            id,
            name : user.name,
            email : user.email,
            role : user.role
        }

        const accessToken = jwtUtils.createToken(
            jwtPayload,
            config.jwt_access_secret,
            config.jwt_access_expires_in as SignOptions
        );

        return { accessToken }
    }
}

export default new AuthService();