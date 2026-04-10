import { z } from "zod";

export const subscribeRequestSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase().trim()),
  repo: z
    .string()
    .regex(
      /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/,
      "Invalid format. Must be owner/repo",
    )
    .transform((v) => v.trim()),
});

export const tokenParamSchema = z.object({
  token: z.string().uuid("Invalid token format"),
});

export const emailQuerySchema = z.object({
  email: z
    .string()
    .min(1, "email is required")
    .email()
    .transform((v) => v.toLowerCase().trim()),
});

export type SubscribeRequestDTO = z.infer<typeof subscribeRequestSchema>;
