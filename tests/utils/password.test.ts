import { describe, expect, it } from "vitest";

import { comparePassword, hashPassword } from "../../src/utils/password";

describe("password utilities", () => {
  it("hashPassword hashes a plain text password and comparePassword accepts it", async () => {
    const password = "Admin@123";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    await expect(comparePassword(password, hash)).resolves.toBe(true);
  });

  it("comparePassword rejects a non-matching password", async () => {
    const hash = await hashPassword("Admin@123");

    await expect(comparePassword("Wrong@123", hash)).resolves.toBe(false);
  });
});
