import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authServiceMocks = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
}));

vi.mock("../../../src/modules/auth/auth.service", () => ({
  authService: authServiceMocks,
}));

import { createApp } from "../../../src/app";

describe("auth routes", () => {
  beforeEach(() => {
    authServiceMocks.register.mockReset();
    authServiceMocks.login.mockReset();
  });

  it("POST /api/auth/register returns a success envelope from the Express app", async () => {
    authServiceMocks.register.mockResolvedValue({
      user: {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: "VIEWER",
        status: "ACTIVE",
        createdAt: "2026-04-02T12:00:00.000Z",
      },
      token: "token:user-1:VIEWER",
    });

    const app = createApp();

    const response = await request(app).post("/api/auth/register").send({
      email: "test@example.com",
      name: "Test User",
      password: "Admin@123",
    });

    expect(response.status).toBe(201);
    expect(authServiceMocks.register).toHaveBeenCalledWith({
      email: "test@example.com",
      name: "Test User",
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
        token: "token:user-1:VIEWER",
      },
    });
  });

  it("POST /api/auth/register returns validation errors before the service layer runs", async () => {
    const app = createApp();

    const response = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      name: "A",
      password: "short",
    });

    expect(response.status).toBe(422);
    expect(authServiceMocks.register).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      status: "error",
      message: "Validation failed",
      errors: [
        { field: "email", message: "Invalid email format" },
        { field: "name", message: "Name must be at least 2 characters" },
        { field: "password", message: "Password must be at least 8 characters" },
        { field: "password", message: "Password must contain at least one uppercase letter" },
        { field: "password", message: "Password must contain at least one number" },
      ],
    });
  });
});
