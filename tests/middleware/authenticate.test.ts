import { describe, expect, it } from "vitest";
import { Role, UserStatus } from "@prisma/client";

import { AppError } from "../../src/utils/AppError";
import { createAuthenticateMiddleware } from "../../src/middleware/authenticate";

describe("authenticate", () => {
  it("rejects requests without a bearer token", async () => {
    const middleware = createAuthenticateMiddleware({
      jwt: {
        verifyToken: () => ({ userId: "user-1", role: Role.VIEWER }),
      },
      users: {
        findAuthUserById: async () => null,
      },
    });

    await expect(
      middleware(
        { headers: {} } as never,
        {} as never,
        (() => undefined) as never,
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejects tokens for missing users", async () => {
    const middleware = createAuthenticateMiddleware({
      jwt: {
        verifyToken: () => ({ userId: "missing-user", role: Role.VIEWER }),
      },
      users: {
        findAuthUserById: async () => null,
      },
    });

    await expect(
      middleware(
        { headers: { authorization: "Bearer token" } } as never,
        {} as never,
        (() => undefined) as never,
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejects inactive users", async () => {
    const middleware = createAuthenticateMiddleware({
      jwt: {
        verifyToken: () => ({ userId: "user-1", role: Role.VIEWER }),
      },
      users: {
        findAuthUserById: async () => ({
          id: "user-1",
          role: Role.VIEWER,
          status: UserStatus.INACTIVE,
        }),
      },
    });

    await expect(
      middleware(
        { headers: { authorization: "Bearer token" } } as never,
        {} as never,
        (() => undefined) as never,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("attaches the current user context to the request", async () => {
    const middleware = createAuthenticateMiddleware({
      jwt: {
        verifyToken: () => ({ userId: "user-1", role: Role.VIEWER }),
      },
      users: {
        findAuthUserById: async () => ({
          id: "user-1",
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
        }),
      },
    });

    const req = {
      headers: { authorization: "Bearer token" },
    };

    let nextCalled = false;

    await middleware(
      req as never,
      {} as never,
      (() => {
        nextCalled = true;
      }) as never,
    );

    expect(nextCalled).toBe(true);
    expect((req as { user?: unknown }).user).toEqual({
      userId: "user-1",
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    });
  });
});
