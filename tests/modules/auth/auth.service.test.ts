import { Role, UserStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { createAuthService } from "../../../src/modules/auth/auth.service";

const fixedDate = new Date("2026-04-02T12:00:00.000Z");

function buildAuthService(overrides?: {
  existingUserByEmail?: {
    id: string;
    email: string;
    name: string;
    password: string;
    role: Role;
    status: UserStatus;
    createdAt: Date;
  } | null;
}) {
  const createdUsers: Array<{
    email: string;
    name: string;
    password: string;
    role: Role;
    status: UserStatus;
  }> = [];

  const service = createAuthService({
    users: {
      findByEmail: async () => overrides?.existingUserByEmail ?? null,
      create: async (data) => {
        createdUsers.push(data);

        return {
          id: "new-user",
          email: data.email,
          name: data.name,
          password: "hashed-password",
          role: Role.VIEWER,
          status: UserStatus.ACTIVE,
          createdAt: fixedDate,
        };
      },
    },
    password: {
      hashPassword: async (value) => `hashed:${value}`,
      comparePassword: async (value, hash) => hash === `hashed:${value}`,
    },
    jwt: {
      signToken: ({ userId, role }) => `token:${userId}:${role}`,
    },
  });

  return { service, createdUsers };
}

describe("createAuthService", () => {
  it("register creates a viewer user with normalized email and returns a token", async () => {
    const { service, createdUsers } = buildAuthService();

    const result = await service.register({
      email: " TEST@EXAMPLE.COM ",
      name: "Test User",
      password: "Admin@123",
    });

    expect(createdUsers).toHaveLength(1);
    expect(createdUsers[0]).toEqual({
      email: "test@example.com",
      name: "Test User",
      password: "hashed:Admin@123",
      role: Role.VIEWER,
      status: UserStatus.ACTIVE,
    });
    expect(result.token).toBe("token:new-user:VIEWER");
    expect(result.user.email).toBe("test@example.com");
    expect(result.user.role).toBe(Role.VIEWER);
    expect(result.user.status).toBe(UserStatus.ACTIVE);
  });

  it("register rejects duplicate email addresses", async () => {
    const { service } = buildAuthService({
      existingUserByEmail: {
        id: "existing-user",
        email: "test@example.com",
        name: "Existing User",
        password: "hashed-password",
        role: Role.VIEWER,
        status: UserStatus.ACTIVE,
        createdAt: fixedDate,
      },
    });

    await expect(
      service.register({
        email: "test@example.com",
        name: "Test User",
        password: "Admin@123",
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Email is already registered.",
    });
  });

  it("login rejects invalid credentials when the user does not exist", async () => {
    const { service } = buildAuthService();

    await expect(
      service.login({
        email: "missing@example.com",
        password: "Admin@123",
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid credentials.",
    });
  });

  it("login rejects invalid credentials when the password does not match", async () => {
    const { service } = buildAuthService({
      existingUserByEmail: {
        id: "user-1",
        email: "user@example.com",
        name: "Valid User",
        password: "hashed:Different@123",
        role: Role.VIEWER,
        status: UserStatus.ACTIVE,
        createdAt: fixedDate,
      },
    });

    await expect(
      service.login({
        email: "user@example.com",
        password: "Admin@123",
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid credentials.",
    });
  });

  it("login returns a token and sanitized active user on valid credentials", async () => {
    const { service } = buildAuthService({
      existingUserByEmail: {
        id: "user-1",
        email: "user@example.com",
        name: "Valid User",
        password: "hashed:Admin@123",
        role: Role.ANALYST,
        status: UserStatus.ACTIVE,
        createdAt: fixedDate,
      },
    });

    const result = await service.login({
      email: " USER@EXAMPLE.COM ",
      password: "Admin@123",
    });

    expect(result).toEqual({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Valid User",
        role: Role.ANALYST,
        status: UserStatus.ACTIVE,
        createdAt: fixedDate.toISOString(),
      },
      token: "token:user-1:ANALYST",
    });
  });

  it("login rejects inactive users after password verification", async () => {
    const { service } = buildAuthService({
      existingUserByEmail: {
        id: "inactive-user",
        email: "inactive@example.com",
        name: "Inactive User",
        password: "hashed:Admin@123",
        role: Role.ANALYST,
        status: UserStatus.INACTIVE,
        createdAt: fixedDate,
      },
    });

    await expect(
      service.login({
        email: "inactive@example.com",
        password: "Admin@123",
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "User account is inactive.",
    });
  });
});
