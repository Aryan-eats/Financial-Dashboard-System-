import { describe, expect, it } from "vitest";

import { createRecordSchema, updateRecordSchema } from "../../../src/modules/records/records.schema";

describe("records schemas", () => {
  it("rejects create payloads with more than two decimal places", () => {
    const result = createRecordSchema.safeParse({
      body: {
        type: "INCOME",
        category: "SALARY",
        amount: 10.123,
        date: "2026-04-01",
      },
    });

    expect(result.success).toBe(false);
  });

  it("accepts create payloads with two decimal places", () => {
    const result = createRecordSchema.safeParse({
      body: {
        type: "INCOME",
        category: "SALARY",
        amount: 10.12,
        date: "2026-04-01",
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects update payloads with more than two decimal places", () => {
    const result = updateRecordSchema.safeParse({
      body: {
        amount: 10.123,
      },
    });

    expect(result.success).toBe(false);
  });
});
