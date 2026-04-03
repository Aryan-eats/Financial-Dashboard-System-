import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app";

describe("requestLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the method, path, status, and response time for completed requests", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const app = createApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy.mock.calls[0][0]).toMatch(/^GET \/health 200 \d+ms$/);
  });
});
