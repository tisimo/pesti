/**
 * Status API Integration Tests
 *
 * REQUIRES: Backend running with `npm run start`
 * BASE_URL: http://localhost:4000
 */

import request from "supertest";

describe("Status API Integration Tests", () => {
  const BASE_URL = process.env.TEST_API_URL || "http://localhost:4000";

  it("should return ok status", async () => {
    const response = await request(BASE_URL).get("/api/status");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status");
  });
});
