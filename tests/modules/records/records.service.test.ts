import { describe, expect, it } from "vitest";
import { RecordCategory, RecordType, Role, UserStatus } from "@prisma/client";

import { AppError } from "../../../src/utils/AppError";
import { createRecordsService } from "../../../src/modules/records/records.service";

const fixedDate = new Date("2026-04-02T12:00:00.000Z");

function createCurrentUser(role: Role, userId = "user-1") {
  return {
    userId,
    role,
    status: UserStatus.ACTIVE,
  };
}

function createRecord(overrides?: Partial<{
  id: string;
  userId: string;
  type: RecordType;
  category: RecordCategory;
  amount: string;
  description: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}>) {
  return {
    id: overrides?.id ?? "record-1",
    userId: overrides?.userId ?? "user-1",
    type: overrides?.type ?? RecordType.EXPENSE,
    category: overrides?.category ?? RecordCategory.FOOD,
    amount: overrides?.amount ?? "125.50",
    description:
      overrides && Object.prototype.hasOwnProperty.call(overrides, "description")
        ? overrides.description ?? null
        : "Lunch",
    date: overrides?.date ?? new Date("2026-04-01"),
    createdAt: overrides?.createdAt ?? fixedDate,
    updatedAt: overrides?.updatedAt ?? fixedDate,
    deletedAt: overrides?.deletedAt ?? null,
  };
}

function buildRecordsService(overrides?: {
  record?: ReturnType<typeof createRecord> | null;
  total?: number;
}) {
  const createdPayloads: unknown[] = [];
  const deletedPayloads: unknown[] = [];

  const service = createRecordsService({
    records: {
      list: async () => ({
        records: [createRecord()],
        total: overrides?.total ?? 1,
      }),
      findActiveById: async () =>
        overrides && "record" in overrides ? (overrides.record ?? null) : createRecord(),
      create: async (data) => {
        createdPayloads.push(data);
        return createRecord({
          ...data,
          amount: data.amount.toFixed(2),
          date: data.date,
          description: data.description ?? null,
        });
      },
      update: async (id, data) =>
        createRecord({
          id,
          ...data,
          amount: data.amount ? data.amount.toFixed(2) : "125.50",
          date: data.date ?? new Date("2026-04-01"),
          description: Object.prototype.hasOwnProperty.call(data, "description")
            ? data.description ?? null
            : "Lunch",
        }),
      softDelete: async (id, deletedAt) => {
        deletedPayloads.push({ id, deletedAt });
      },
    },
  });

  return { service, createdPayloads, deletedPayloads };
}

describe("recordsService", () => {
  it("scopes analysts to their own records and returns pagination metadata", async () => {
    const { service } = buildRecordsService({ total: 1 });
    const result = await service.listRecords(createCurrentUser(Role.ANALYST), {
      page: 1,
      limit: 10,
      sortBy: "date",
      sortOrder: "desc",
    });

    expect(result.records.length).toBe(1);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.records[0].amount).toBe(125.5);
  });

  it("returns a normalized record when the current user can access it", async () => {
    const { service } = buildRecordsService({
      record: createRecord({ userId: "user-1", amount: "250.75" }),
    });

    const result = await service.getRecordById(createCurrentUser(Role.ANALYST, "user-1"), "record-1");

    expect(result.record).toEqual({
      id: "record-1",
      userId: "user-1",
      type: RecordType.EXPENSE,
      category: RecordCategory.FOOD,
      amount: 250.75,
      description: "Lunch",
      date: new Date("2026-04-01").toISOString(),
      createdAt: fixedDate.toISOString(),
      updatedAt: fixedDate.toISOString(),
    });
  });

  it("returns 404 when a non-admin requests another user's record", async () => {
    const { service } = buildRecordsService({
      record: createRecord({ userId: "user-2" }),
    });

    await expect(
      service.getRecordById(createCurrentUser(Role.ANALYST, "user-1"), "record-1"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("stores the current admin as owner and normalizes output", async () => {
    const { service, createdPayloads } = buildRecordsService();
    const result = await service.createRecord(createCurrentUser(Role.ADMIN, "admin-1"), {
      type: RecordType.INCOME,
      category: RecordCategory.SALARY,
      amount: 1000.25,
      description: "Salary",
      date: "2026-04-01",
    });

    expect(createdPayloads[0]).toEqual({
      userId: "admin-1",
      type: RecordType.INCOME,
      category: RecordCategory.SALARY,
      amount: 1000.25,
      description: "Salary",
      date: new Date("2026-04-01"),
    });
    expect(result.record.amount).toBe(1000.25);
  });

  it("rejects updates for missing active records", async () => {
    const { service } = buildRecordsService({ record: null });

    await expect(
      service.updateRecord(createCurrentUser(Role.ADMIN), "record-1", {
        amount: 45.2,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects updates when a non-admin targets another user's record", async () => {
    const { service } = buildRecordsService({
      record: createRecord({ userId: "user-2" }),
    });

    await expect(
      service.updateRecord(createCurrentUser(Role.ANALYST, "user-1"), "record-1", {
        amount: 45.2,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("updates an existing record and preserves explicit description clears", async () => {
    const { service } = buildRecordsService();

    const result = await service.updateRecord(createCurrentUser(Role.ADMIN), "record-1", {
      amount: 45.2,
      description: undefined,
      date: "2026-04-03",
    });

    expect(result.record).toEqual({
      id: "record-1",
      userId: "user-1",
      type: RecordType.EXPENSE,
      category: RecordCategory.FOOD,
      amount: 45.2,
      description: null,
      date: new Date("2026-04-03").toISOString(),
      createdAt: fixedDate.toISOString(),
      updatedAt: fixedDate.toISOString(),
    });
  });

  it("rejects deletes when a non-admin targets another user's record", async () => {
    const { service } = buildRecordsService({
      record: createRecord({ userId: "user-2" }),
    });

    await expect(
      service.deleteRecord(createCurrentUser(Role.ANALYST, "user-1"), "record-1"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("performs an explicit soft delete", async () => {
    const { service, deletedPayloads } = buildRecordsService();
    const result = await service.deleteRecord(createCurrentUser(Role.ADMIN), "record-1");

    expect(result.success).toBe(true);
    expect(deletedPayloads.length).toBe(1);
    expect((deletedPayloads[0] as { id: string }).id).toBe("record-1");
  });
});
