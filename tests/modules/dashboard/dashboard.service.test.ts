import { describe, expect, it, vi } from "vitest";
import { RecordCategory, RecordType, Role, UserStatus } from "@prisma/client";

import {
  createDashboardRepository,
  createDashboardService,
} from "../../../src/modules/dashboard/dashboard.service";
import { recentActivityQuerySchema } from "../../../src/modules/dashboard/dashboard.schema";

function createCurrentUser(role: Role, userId = "user-1") {
  return {
    userId,
    role,
    status: UserStatus.ACTIVE,
  };
}

describe("dashboardService", () => {
  it("returns totals and computed net balance", async () => {
    const service = createDashboardService({
      dashboard: {
        getSummary: async () => ({
          totalIncome: 2500,
          totalExpense: 1000,
          recordCount: 4,
        }),
        getCategoryBreakdown: async () => [],
        getTrends: async () => [],
        getRecentRecords: async () => [],
      },
    });

    const result = await service.getSummary(createCurrentUser(Role.VIEWER), {});

    expect(result).toEqual({
      totalIncome: 2500,
      totalExpense: 1000,
      netBalance: 1500,
      recordCount: 4,
    });
  });

  it("computes percentages from totals", async () => {
    const service = createDashboardService({
      dashboard: {
        getSummary: async () => ({
          totalIncome: 0,
          totalExpense: 0,
          recordCount: 0,
        }),
        getCategoryBreakdown: async () => [
          {
            category: RecordCategory.FOOD,
            type: RecordType.EXPENSE,
            totalAmount: 300,
            recordCount: 3,
          },
          {
            category: RecordCategory.RENT,
            type: RecordType.EXPENSE,
            totalAmount: 700,
            recordCount: 1,
          },
        ],
        getTrends: async () => [],
        getRecentRecords: async () => [],
      },
    });

    const result = await service.getCategoryBreakdown(createCurrentUser(Role.ADMIN), {});

    expect(result.breakdown.length).toBe(2);
    expect(result.breakdown[0].percentage).toBe(30);
    expect(result.breakdown[1].percentage).toBe(70);
  });

  it("returns normalized records", async () => {
    const service = createDashboardService({
      dashboard: {
        getSummary: async () => ({
          totalIncome: 0,
          totalExpense: 0,
          recordCount: 0,
        }),
        getCategoryBreakdown: async () => [],
        getTrends: async () => [],
        getRecentRecords: async () => [
          {
            id: "record-1",
            userId: "user-1",
            type: RecordType.EXPENSE,
            category: RecordCategory.FOOD,
            amount: "125.50",
            description: "Lunch",
            date: new Date("2026-04-01"),
            createdAt: new Date("2026-04-02T10:00:00.000Z"),
            updatedAt: new Date("2026-04-02T10:00:00.000Z"),
            deletedAt: null,
          },
        ],
      },
    });

    const result = await service.getRecent(createCurrentUser(Role.ANALYST), { limit: 5 });

    expect(result.records.length).toBe(1);
    expect(result.records[0].amount).toBe(125.5);
  });

  it("accepts date filters for recent activity queries", () => {
    const result = recentActivityQuerySchema.safeParse({
      query: {
        limit: "10",
        startDate: "2026-04-01",
        endDate: "2026-04-30",
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.query).toEqual({
      limit: 10,
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });
  });

  it("applies date filters when loading recent activity", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = createDashboardRepository({
      $queryRaw: vi.fn(),
      financialRecord: {
        findMany,
      },
    } as never);

    await repository.getRecentRecords(createCurrentUser(Role.ANALYST), {
      limit: 3,
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          userId: "user-1",
          date: {
            gte: new Date("2026-04-01"),
            lte: new Date("2026-04-30"),
          },
        },
        take: 3,
      }),
    );
  });
});
