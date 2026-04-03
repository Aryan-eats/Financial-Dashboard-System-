import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { getEnv } from "../src/config/env";
import { hashPassword } from "../src/utils/password";
import { buildSeedRecords, buildSeedUserCreateInput, demoUsers } from "./seed-data";

async function main() {
  const env = getEnv();
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 1,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.financialRecord.deleteMany({});
    await prisma.user.deleteMany({});

    const createdUsers = [];

    for (const user of demoUsers) {
      const hashedPassword = await hashPassword(user.password);
      const createdUser = await prisma.user.create({
        data: buildSeedUserCreateInput(user, hashedPassword),
      });

      createdUsers.push({ ...user, id: createdUser.id });
    }

    for (const user of createdUsers) {
      await prisma.financialRecord.createMany({
        data: buildSeedRecords(user.id),
      });
    }

    console.log("Demo credentials:");
    demoUsers.forEach((user) => {
      console.log(`${user.email} / ${user.password}`);
    });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
