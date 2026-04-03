import { describe, expect, it } from "vitest";

import { createJwtService } from "../../src/utils/jwt";

describe("createJwtService", () => {
  it("signs and verifies a minimal auth payload", () => {
    const jwtService = createJwtService({
      secret: "test-secret",
      expiresIn: "1h",
    });

    const token = jwtService.signToken({ userId: "user-1", role: "VIEWER" });
    const payload = jwtService.verifyToken(token);

    expect(payload.userId).toBe("user-1");
    expect(payload.role).toBe("VIEWER");
  });

  it("rejects an invalid token", () => {
    const jwtService = createJwtService({
      secret: "test-secret",
      expiresIn: "1h",
    });

    expect(() => jwtService.verifyToken("invalid-token")).toThrow(/token/i);
  });
});
