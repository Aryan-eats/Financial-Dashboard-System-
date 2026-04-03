import { describe, expect, it } from "vitest";
import { Role, UserStatus } from "@prisma/client";

import { AppError } from "../../src/utils/AppError";
import { authorize } from "../../src/middleware/authorize";

describe("authorize", () => {
  it("rejects requests without an authenticated user", () => {
    const middleware = authorize(Role.ADMIN);

    try {
      middleware({} as never, {} as never, (() => undefined) as never);
      throw new Error("Expected authorize to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(401);
    }
  });

  it("rejects users with insufficient roles", () => {
    const middleware = authorize(Role.ADMIN);

    try {
      middleware(
        {
          user: {
            userId: "user-1",
            role: Role.VIEWER,
            status: UserStatus.ACTIVE,
          },
        } as never,
        {} as never,
        (() => undefined) as never,
      );
      throw new Error("Expected authorize to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(403);
    }
  });

  it("allows requests with an allowed role", () => {
    const middleware = authorize(Role.ANALYST, Role.ADMIN);
    let nextCalled = false;

    middleware(
      {
        user: {
          userId: "user-1",
          role: Role.ANALYST,
          status: UserStatus.ACTIVE,
        },
      } as never,
      {} as never,
      (() => {
        nextCalled = true;
      }) as never,
    );

    expect(nextCalled).toBe(true);
  });
});
