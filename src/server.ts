import app from "./app"
import { config } from "./config";
import { prisma } from "./lib/prisma";

const main = async () => {
    try {
        await prisma.$connect();
        console.log("Connection to the database successfully.")
        app.listen(config.port, () => {
            console.log(`Server listening on port ${config.port}`);
        })
    } catch (error) {
        console.error("Error Start the server: ", error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

main();