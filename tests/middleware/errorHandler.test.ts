import { describe, expect, it } from "vitest";

import { errorHandler } from "../../src/middleware/errorHandler";
import { AppError } from "../../src/utils/AppError";

function createResponseDouble() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

describe("errorHandler", () => {
  it("returns the AppError envelope", () => {
    const res = createResponseDouble();

    errorHandler(
      new AppError(422, "Validation failed", [{ field: "email", message: "Invalid email" }]),
      {} as never,
      res as never,
      (() => undefined) as never,
    );

    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({
      status: "error",
      message: "Validation failed",
      errors: [{ field: "email", message: "Invalid email" }],
    });
  });

  it("maps malformed JSON errors to a 400 response", () => {
    const res = createResponseDouble();
    const malformedJsonError = new SyntaxError("Unexpected token");

    Object.assign(malformedJsonError, { body: "{invalid}" });

    errorHandler(
      malformedJsonError,
      {} as never,
      res as never,
      (() => undefined) as never,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      status: "error",
      message: "Invalid JSON in request body",
    });
  });

  it("maps Prisma unique constraint errors to a 409 response", () => {
    const res = createResponseDouble();

    errorHandler(
      { code: "P2002" } as never,
      {} as never,
      res as never,
      (() => undefined) as never,
    );

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({
      status: "error",
      message: "A resource with that value already exists.",
    });
  });
});
