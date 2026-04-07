import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().min(1, "JWT_EXPIRES_IN is required"),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type AppEnv = z.infer<typeof envSchema>;

export function createEnv(source: Record<string, string | undefined>): AppEnv {
  return envSchema.parse(source);
}

export function getEnv(): AppEnv {
  try {
    return createEnv(process.env);
  } catch (error) {
    console.error("Failed to parse environment variables:", error);
    throw error;
  }
}
