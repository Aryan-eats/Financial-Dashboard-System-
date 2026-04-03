import { describe, expect, it } from "vitest";

import { createEnv } from "../../src/config/env";

describe("createEnv", () => {
  it("returns parsed values with defaults", () => {
    const env = createEnv({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/finance_dashboard",
      JWT_SECRET: "super-secret",
      JWT_EXPIRES_IN: "1d",
    });

    expect(env.DATABASE_URL).toBe("postgresql://postgres:postgres@localhost:5432/finance_dashboard");
    expect(env.JWT_SECRET).toBe("super-secret");
    expect(env.JWT_EXPIRES_IN).toBe("1d");
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe("development");
  });

  it("throws when required values are missing", () => {
    expect(() =>
      createEnv({
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/finance_dashboard",
        JWT_SECRET: "",
        JWT_EXPIRES_IN: "1d",
      }),
    ).toThrow(/JWT_SECRET/i);
  });
});
