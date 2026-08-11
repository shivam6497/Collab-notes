import { z } from "zod";

export const authSchema = z.object({
    email: z.string()
        .trim()
        .email("Invalid email address")
        .toLowerCase(),
    password: z.string()
        .min(8, "Must be at least 8 characters long"),
});

