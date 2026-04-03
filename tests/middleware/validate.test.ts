import { z } from "zod";
import { describe, expect, it } from "vitest";

import { validate } from "../../src/middleware/validate";
import { AppError } from "../../src/utils/AppError";

describe("validate", () => {
  it("replaces request data with parsed values", () => {
    const middleware = validate(
      z.object({
        body: z.object({
          email: z.string().trim().toLowerCase().email(),
        }),
      }),
    );

    const req = {
      body: { email: " TEST@EXAMPLE.COM " },
      query: {},
      params: {},
    };

    let nextCalled = false;

    middleware(
      req as never,
      {} as never,
      (() => {
        nextCalled = true;
      }) as never,
    );

    expect(nextCalled).toBe(true);
    expect(req.body).toEqual({ email: "test@example.com" });
  });

  it("throws AppError with flattened field errors on invalid input", () => {
    const middleware = validate(
      z.object({
        body: z.object({
          amount: z.number().positive("Amount must be greater than 0"),
        }),
      }),
    );

    let thrownError: unknown;

    try {
      middleware(
        {
          body: { amount: 0 },
          query: {},
          params: {},
        } as never,
        {} as never,
        (() => undefined) as never,
      );
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(AppError);
    expect((thrownError as AppError).statusCode).toBe(422);
    expect((thrownError as AppError).errors).toEqual([
      { field: "amount", message: "Amount must be greater than 0" },
    ]);
  });
});
