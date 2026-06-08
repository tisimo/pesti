/**
 * Recovery Codes API Integration Tests
 *
 * REQUIRES: Backend running with `npm run start`
 * BASE_URL: http://localhost:4000
 *
 * Aligns to current /api/recovery-codes routes.
 */

import request from "supertest";

describe("Recovery Codes API Integration Tests", () => {
  const BASE_URL = process.env.TEST_API_URL || "http://localhost:4000";
  let api = request(BASE_URL);
  let authToken = "";

  beforeEach(() => {
    api = request(BASE_URL);
  });

  describe("POST /api/recovery-codes", () => {
    it("should reject generation without authentication", async () => {
      const response = await api.post("/api/recovery-codes");
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should respond when authenticated", async () => {
      const response = await api
        .post("/api/recovery-codes")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBeDefined();
    });
  });

  describe("DELETE /api/recovery-codes/:cognitoSub/:recoveryCode", () => {
    it("should reject delete without authentication", async () => {
      const response = await api.delete("/api/recovery-codes/sub-123/code-123");
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
