import { describe, expect, it } from "vitest";
import { Role, UserStatus } from "@prisma/client";

import { AppError } from "../../../src/utils/AppError";
import { createUsersService } from "../../../src/modules/users/users.service";

const fixedDate = new Date("2026-04-02T12:00:00.000Z");

function buildUsersService(overrides?: {
  meUser?: {
    id: string;
    email: string;
    name: string;
    role: Role;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  targetUser?: {
    id: string;
    email: string;
    name: string;
    role: Role;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  adminCount?: number;
}) {
  return createUsersService({
    users: {
      findById: async (id) => {
        if (id === "me") {
          return overrides?.meUser ?? null;
        }

        return overrides?.targetUser ?? null;
      },
      list: async () => ({
        users: [
          {
            id: "user-1",
            email: "user1@example.com",
            name: "User One",
            role: Role.VIEWER,
            status: UserStatus.ACTIVE,
            createdAt: fixedDate,
            updatedAt: fixedDate,
          },
        ],
        total: 1,
      }),
      countActiveAdmins: async () => overrides?.adminCount ?? 2,
      updateRole: async (id, role) => ({
        id,
        email: "target@example.com",
        name: "Target User",
        role,
        status: UserStatus.ACTIVE,
        createdAt: fixedDate,
        updatedAt: fixedDate,
      }),
      updateStatus: async (id, status) => ({
        id,
        email: "target@example.com",
        name: "Target User",
        role: Role.ADMIN,
        status,
        createdAt: fixedDate,
        updatedAt: fixedDate,
      }),
    },
  });
}

describe("usersService", () => {
  it("returns a sanitized current user profile", async () => {
    const service = buildUsersService({
      meUser: {
        id: "me",
        email: "me@example.com",
        name: "Current User",
        role: Role.ANALYST,
        status: UserStatus.ACTIVE,
        createdAt: fixedDate,
        updatedAt: fixedDate,
      },
    });

    const result = await service.getMe("me");

    expect(result.user.email).toBe("me@example.com");
    expect(result.user.role).toBe(Role.ANALYST);
    expect(result.user.createdAt).toBe(fixedDate.toISOString());
  });

  it("returns 404 when the current user record is missing", async () => {
    const service = buildUsersService();

    await expect(service.getMe("me")).rejects.toMatchObject({
      statusCode: 404,
      message: "User not found.",
    });
  });

  it("returns sanitized users with pagination metadata", async () => {
    const service = buildUsersService();
    const result = await service.listUsers({ page: 1, limit: 10 });

    expect(result.users.length).toBe(1);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.totalPages).toBe(1);
  });

  it("blocks demoting the last remaining admin", async () => {
    const service = buildUsersService({
      targetUser: {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin User",
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        createdAt: fixedDate,
        updatedAt: fixedDate,
      },
      adminCount: 1,
    });

    await expect(service.updateRole("admin-1", Role.VIEWER)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("updates a user's role when the change is allowed", async () => {
    const service = buildUsersService({
      targetUser: {
        id: "user-2",
        email: "user2@example.com",
        name: "Target User",
        role: Role.VIEWER,
        status: UserStatus.ACTIVE,
        createdAt: fixedDate,
        updatedAt: fixedDate,
      },
    });

    const result = await service.updateRole("user-2", Role.ANALYST);

    expect(result.user).toEqual({
      id: "user-2",
      email: "target@example.com",
      name: "Target User",
      role: Role.ANALYST,
      status: UserStatus.ACTIVE,
      createdAt: fixedDate.toISOString(),
      updatedAt: fixedDate.toISOString(),
    });
  });

  it("blocks deactivating the last active admin", async () => {
    const service = buildUsersService({
      targetUser: {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin User",
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        createdAt: fixedDate,
        updatedAt: fixedDate,
      },
      adminCount: 1,
    });

    await expect(service.updateStatus("admin-1", UserStatus.INACTIVE)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("updates a user's status when the change is allowed", async () => {
    const service = buildUsersService({
      targetUser: {
        id: "user-2",
        email: "user2@example.com",
        name: "Target User",
        role: Role.ANALYST,
        status: UserStatus.ACTIVE,
        createdAt: fixedDate,
        updatedAt: fixedDate,
      },
    });

    const result = await service.updateStatus("user-2", UserStatus.INACTIVE);

    expect(result.user).toEqual({
      id: "user-2",
      email: "target@example.com",
      name: "Target User",
      role: Role.ADMIN,
      status: UserStatus.INACTIVE,
      createdAt: fixedDate.toISOString(),
      updatedAt: fixedDate.toISOString(),
    });
  });
});
