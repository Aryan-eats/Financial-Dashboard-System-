import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { getEnv } from "./env";

declare global {
  var __prisma__: PrismaClient | undefined;
  var __pgPool__: Pool | undefined;
}

export function getPrismaClient() {
  if (!globalThis.__prisma__) {
    try {
      const env = getEnv();
      globalThis.__pgPool__ ??= new Pool({
        connectionString: env.DATABASE_URL,
      });
      const adapter = new PrismaPg(globalThis.__pgPool__);

      globalThis.__prisma__ = new PrismaClient({ adapter });
    } catch (error) {
      console.error("Prisma client initialization failed:", error);
      throw error;
    }
  }

  return globalThis.__prisma__;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getPrismaClient(), property, receiver);
  },
});
