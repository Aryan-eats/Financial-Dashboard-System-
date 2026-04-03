import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role, UserStatus } from "@prisma/client";

import { AppError } from "../../src/utils/AppError";

const routeMocks = vi.hoisted(() => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
  },
  usersService: {
    getMe: vi.fn(),
    listUsers: vi.fn(),
    updateRole: vi.fn(),
    updateStatus: vi.fn(),
  },
  recordsService: {
    listRecords: vi.fn(),
    getRecordById: vi.fn(),
    createRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
  },
  dashboardService: {
    getSummary: vi.fn(),
    getCategoryBreakdown: vi.fn(),
    getTrends: vi.fn(),
    getRecent: vi.fn(),
  },
  verifyToken: vi.fn(),
  findUniqueUser: vi.fn(),
}));

vi.mock("../../src/modules/auth/auth.service", () => ({
  authService: routeMocks.authService,
}));

vi.mock("../../src/modules/users/users.service", () => ({
  usersService: routeMocks.usersService,
}));

vi.mock("../../src/modules/records/records.service", () => ({
  recordsService: routeMocks.recordsService,
}));

vi.mock("../../src/modules/dashboard/dashboard.service", () => ({
  dashboardService: routeMocks.dashboardService,
}));

vi.mock("../../src/utils/jwt", () => ({
  verifyToken: routeMocks.verifyToken,
  signToken: vi.fn(),
}));

vi.mock("../../src/config/prisma", () => ({
  prisma: {
    user: {
      findUnique: routeMocks.findUniqueUser,
    },
  },
}));

import { createApp } from "../../src/app";

describe("high-risk app routes", () => {
  beforeEach(() => {
    routeMocks.authService.register.mockReset();
    routeMocks.authService.login.mockReset();
    routeMocks.usersService.getMe.mockReset();
    routeMocks.usersService.listUsers.mockReset();
    routeMocks.usersService.updateRole.mockReset();
    routeMocks.usersService.updateStatus.mockReset();
    routeMocks.recordsService.listRecords.mockReset();
    routeMocks.recordsService.getRecordById.mockReset();
    routeMocks.recordsService.createRecord.mockReset();
    routeMocks.recordsService.updateRecord.mockReset();
    routeMocks.recordsService.deleteRecord.mockReset();
    routeMocks.dashboardService.getSummary.mockReset();
    routeMocks.dashboardService.getCategoryBreakdown.mockReset();
    routeMocks.dashboardService.getTrends.mockReset();
    routeMocks.dashboardService.getRecent.mockReset();
    routeMocks.verifyToken.mockReset();
    routeMocks.findUniqueUser.mockReset();

    routeMocks.verifyToken.mockImplementation((token: string) => {
      if (token === "admin-token") {
        return { userId: "admin-id", role: Role.ADMIN };
      }

      if (token === "analyst-token") {
        return { userId: "analyst-id", role: Role.ANALYST };
      }

      if (token === "viewer-token") {
        return { userId: "viewer-id", role: Role.VIEWER };
      }

      throw new AppError(401, "Invalid or expired token.");
    });

    routeMocks.findUniqueUser.mockImplementation(
      async ({ where }: { where: { id: string } }) =>
        ({
          "admin-id": { id: "admin-id", role: Role.ADMIN, status: UserStatus.ACTIVE },
          "analyst-id": { id: "analyst-id", role: Role.ANALYST, status: UserStatus.ACTIVE },
          "viewer-id": { id: "viewer-id", role: Role.VIEWER, status: UserStatus.ACTIVE },
        })[where.id] ?? null,
    );
  });

  it("POST /api/auth/login returns a success envelope", async () => {
    routeMocks.authService.login.mockResolvedValue({
      user: {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: Role.VIEWER,
        status: UserStatus.ACTIVE,
        createdAt: "2026-04-02T12:00:00.000Z",
      },
      token: "jwt-token",
    });

    const response = await request(createApp()).post("/api/auth/login").send({
      email: "test@example.com",
      password: "Admin@123",
    });

    expect(response.status).toBe(200);
    expect(routeMocks.authService.login).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "Admin@123",
    });
    expect(response.body).toEqual({
      status: "success",
      data: {
        user: {
          id: "user-1",
          email: "test@example.com",
          name: "Test User",
          role: "VIEWER",
          status: "ACTIVE",
          createdAt: "2026-04-02T12:00:00.000Z",
        },
        token: "jwt-token",
      },
    });
  });

  it("GET /api/users/me requires authentication before reaching the service", async () => {
    const response = await request(createApp()).get("/api/users/me");

    expect(response.status).toBe(401);
    expect(routeMocks.usersService.getMe).not.toHaveBeenCalled();
  });

  it("GET /api/users allows admins through and passes normalized query values", async () => {
    routeMocks.usersService.listUsers.mockResolvedValue({
      users: [],
      pagination: {
        page: 2,
        limit: 5,
        total: 0,
        totalPages: 1,
      },
    });

    const response = await request(createApp())
      .get("/api/users?page=2&limit=5&role=VIEWER&status=ACTIVE")
      .set("Authorization", "Bearer admin-token");

    expect(response.status).toBe(200);
    expect(routeMocks.usersService.listUsers).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      role: "VIEWER",
      status: "ACTIVE",
    });
  });

  it("GET /api/users rejects authenticated users without the admin role", async () => {
    const response = await request(createApp())
      .get("/api/users")
      .set("Authorization", "Bearer analyst-token");

    expect(response.status).toBe(403);
    expect(routeMocks.usersService.listUsers).not.toHaveBeenCalled();
  });

  it("PATCH /api/users/:id/role validates the path parameter before the controller runs", async () => {
    const response = await request(createApp())
      .patch("/api/users/not-a-uuid/role")
      .set("Authorization", "Bearer admin-token")
      .send({ role: Role.ADMIN });

    expect(response.status).toBe(422);
    expect(routeMocks.usersService.updateRole).not.toHaveBeenCalled();
  });

  it("GET /api/records allows analysts to list records with normalized query values", async () => {
    routeMocks.recordsService.listRecords.mockResolvedValue({
      records: [],
      pagination: {
        page: 3,
        limit: 2,
        total: 0,
        totalPages: 1,
      },
    });

    const response = await request(createApp())
      .get("/api/records?page=3&limit=2&sortBy=amount&sortOrder=asc")
      .set("Authorization", "Bearer analyst-token");

    expect(response.status).toBe(200);
    expect(routeMocks.recordsService.listRecords).toHaveBeenCalledWith(
      {
        userId: "analyst-id",
        role: "ANALYST",
        status: "ACTIVE",
      },
      {
        page: 3,
        limit: 2,
        sortBy: "amount",
        sortOrder: "asc",
      },
    );
  });

  it("POST /api/records rejects non-admin users before the create service runs", async () => {
    const response = await request(createApp())
      .post("/api/records")
      .set("Authorization", "Bearer analyst-token")
      .send({
        type: "INCOME",
        category: "SALARY",
        amount: 2500,
        date: "2026-04-01",
      });

    expect(response.status).toBe(403);
    expect(routeMocks.recordsService.createRecord).not.toHaveBeenCalled();
  });

  it("PATCH /api/records/:id validates the record id before the update service runs", async () => {
    const response = await request(createApp())
      .patch("/api/records/not-a-uuid")
      .set("Authorization", "Bearer admin-token")
      .send({ amount: 42.5 });

    expect(response.status).toBe(422);
    expect(routeMocks.recordsService.updateRecord).not.toHaveBeenCalled();
  });

  it("GET /api/dashboard/summary allows viewers and passes the authenticated user context", async () => {
    routeMocks.dashboardService.getSummary.mockResolvedValue({
      totalIncome: 1000,
      totalExpense: 200,
      netBalance: 800,
      recordCount: 3,
    });

    const response = await request(createApp())
      .get("/api/dashboard/summary?startDate=2026-04-01&endDate=2026-04-30")
      .set("Authorization", "Bearer viewer-token");

    expect(response.status).toBe(200);
    expect(routeMocks.dashboardService.getSummary).toHaveBeenCalledWith(
      {
        userId: "viewer-id",
        role: "VIEWER",
        status: "ACTIVE",
      },
      {
        startDate: "2026-04-01",
        endDate: "2026-04-30",
      },
    );
  });

  it("GET /api/dashboard/recent validates query params before the service runs", async () => {
    const response = await request(createApp())
      .get("/api/dashboard/recent?limit=99")
      .set("Authorization", "Bearer viewer-token");

    expect(response.status).toBe(422);
    expect(routeMocks.dashboardService.getRecent).not.toHaveBeenCalled();
  });
});
