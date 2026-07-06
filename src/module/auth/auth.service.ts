import bcrypt from "bcryptjs";
import { ILoginUser } from "./auth.interface";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import { config } from "../../config";
import { JwtPayload, SignOptions } from "jsonwebtoken";

class AuthService {
    async loginUser(payload : ILoginUser) {
        const { email, password } = payload;

        const user = await prisma.users.findUniqueOrThrow({
            where : { email }
        });

        const isPasswordMatched = await bcrypt.compare(password, user.password_hash);
        
        if(!isPasswordMatched)      throw new Error("Password is incorrect");

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
            throw new Error(verifiedRefreshToken.error)
        }

        const {id} = verifiedRefreshToken.data as JwtPayload;

        const user = await prisma.users.findUniqueOrThrow({
            where : {
                id
            }
        })

        if(user.status === "BLOCKED"){
            throw new Error("User is blocked!")
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