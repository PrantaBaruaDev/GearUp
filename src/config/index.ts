import dotenv from "dotenv";
import path from "path";

dotenv.config({ path:path.join(process.cwd(), ".env"), quiet: true });

export const config = {
    port : process.env.PORT,
    database_url : process.env.DATABASE_URL,
    app_url : process.env.APP_URL as string,
    node_env : process.env.NODE_ENV as string,
    bcrypt_salt_rounds : Number(process.env.BCRYPT_SALT_ROUNDS),
    jwt_access_secret : process.env.JWT_ACCESS_SECRET as string,
    jwt_refresh_secret : process.env.JWT_REFRESH_SECRET as string,
    jwt_access_expires_in : process.env.JWT_ACCESS_EXPIRES_IN as string,
    jwt_refresh_expires_in : process.env.JWT_REFRESH_EXPIRES_IN as string,
};
