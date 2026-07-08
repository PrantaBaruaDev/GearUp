import Stripe from "stripe";
import { config } from "../config"; // adjust relative path as needed

const secretKey = process.env.STRIPE_SECRET_KEY || config.stripe_secret_key;

if (!secretKey) {
    console.error("STRIPE_SECRET_KEY is missing!");
}

export const stripe = new Stripe(secretKey || "", {
    apiVersion: "2026-06-24.dahlia" as any
});