import { describe, expect, it, vi } from "vitest";
import { Role, UserStatus } from "@prisma/client";

import { createDashboardRepository } from "../../../src/modules/dashboard/dashboard.service";

describe("createDashboardRepository", () => {
  it("uses a raw SQL trends query and returns numeric totals", async () => {
    const queryRaw = vi.fn().mockResolvedValue([
      {
        month: "2026-01",
        income: "2500.50",
        expense: "1200.25",
      },
    ]);

    const repository = createDashboardRepository({
      $queryRaw: queryRaw,
      financialRecord: {} as never,
    } as never);

    const result = await repository.getTrends(
      {
        userId: "user-1",
        role: Role.ANALYST,
        status: UserStatus.ACTIVE,
      },
      {
        startDate: "2026-01-01",
        endDate: "2026-03-31",
      },
    );

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        month: "2026-01",
        income: 2500.5,
        expense: 1200.25,
      },
    ]);
  });
});
