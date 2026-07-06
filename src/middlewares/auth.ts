import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { Role } from "../../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";
import { config } from "../config";

declare global {
    namespace Express {
        interface Request {
            user?: {
                email: string;
                name: string;
                id: string;
                role: Role;
            }
        }
    }
}

// auth(Role.CUSTOMER, Role.PROVIDER, Role.ADMIN)
// auth() => ...requiredRoles => [Role.CUSTOMER, Role.PROVIDER, Role.ADMIN]
export const auth = (...requiredRoles : Role[]) => {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const token = req.cookies.accessToken ?
            req.cookies.accessToken 
            :
            req.headers.authorization?.startsWith("Bearer ") ? 
            req.headers.authorization?.split(" ")[1] 
            : req.headers.authorization;

        if(!token){
            throw new Error("You are not logged in. Please log in to access this resource.");
        }

        const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

        if (!verifiedToken.success) {
            throw new Error(verifiedToken.error);
        }

        const { email, name, id, role } = verifiedToken.data as JwtPayload;

        if(requiredRoles.length && !requiredRoles.includes(role)){
            throw new Error("Forbidden. You don't have permission to access this resource.");
        }

        const user = await prisma.users.findUnique({
            where: {
                id,
                email,
                name,
                role
            }
        });

        if(!user){
            throw new Error("User not found. Please Register account.");
        }

        if(user.status === "SUSPEND"){
            throw new Error("Your account has been suspended. Please contact support.");
        }

        req.user = {
            email,
            name,
            id,
            role
        }

        next();
        
    }
)
}
