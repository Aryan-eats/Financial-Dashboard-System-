import { describe, expect, it } from "vitest";
import { RecordType, Role } from "@prisma/client";

import { buildSeedRecords, demoUsers } from "../../prisma/seed-data";

describe("seed-data", () => {
  it("defines the three expected demo users", () => {
    expect(demoUsers).toEqual([
      {
        name: "Admin User",
        email: "admin@demo.com",
        password: "Admin@123",
        role: Role.ADMIN,
      },
      {
        name: "Analyst User",
        email: "analyst@demo.com",
        password: "Analyst@123",
        role: Role.ANALYST,
      },
      {
        name: "Viewer User",
        email: "viewer@demo.com",
        password: "Viewer@123",
        role: Role.VIEWER,
      },
    ]);
  });

  it("builds six months of mixed income and expense records for one user", () => {
    const records = buildSeedRecords("user-1", new Date("2026-04-02T00:00:00.000Z"));

    expect(records.length).toBeGreaterThanOrEqual(27);
    expect(records.filter((record) => record.type === RecordType.INCOME).length).toBe(15);
    expect(records.filter((record) => record.type === RecordType.EXPENSE).length).toBeGreaterThanOrEqual(18);
    expect(new Set(records.map((record) => record.userId))).toEqual(new Set(["user-1"]));
  });
});
