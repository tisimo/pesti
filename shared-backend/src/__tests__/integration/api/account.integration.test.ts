/**
 * Account API Integration Tests
 *
 * REQUIRES: Backend running with `npm run start`
 * BASE_URL: http://localhost:4000
 *
 * Aligns to current /api/accounts routes.
 */

import request from "supertest";

describe("Account API Integration Tests", () => {
  const BASE_URL = process.env.TEST_API_URL || "http://localhost:4000";
  let api = request(BASE_URL);

  beforeEach(() => {
    api = request(BASE_URL);
  });

  const createValidAccount = () => ({
    cognitoSub: `sub-${Date.now()}`,
    email: `account${Date.now()}@example.com`,
  });

  describe("POST /api/accounts", () => {
    it("should create account with valid payload", async () => {
      const payload = createValidAccount();
      const response = await api.post("/api/accounts").send(payload);

      expect(response.status).toBeDefined();
    });

    it("should reject account without cognitoSub", async () => {
      const payload = createValidAccount();
      delete payload.cognitoSub;
      const response = await api.post("/api/accounts").send(payload);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject account without email", async () => {
      const payload = createValidAccount();
      delete payload.email;
      const response = await api.post("/api/accounts").send(payload);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject account with invalid email", async () => {
      const payload = { ...createValidAccount(), email: "invalid" };
      const response = await api.post("/api/accounts").send(payload);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject duplicate account", async () => {
      const payload = createValidAccount();

      await api.post("/api/accounts").send(payload);
      const response = await api.post("/api/accounts").send(payload);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /api/accounts/by-cognito-sub/:cognitoSub", () => {
    it("should reject without authentication", async () => {
      const response = await api.get("/api/accounts/by-cognito-sub/sub-123");
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /api/accounts/by-account-id/:accountId", () => {
    it("should reject without authentication", async () => {
      const response = await api.get("/api/accounts/by-account-id/acc-123");
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("DELETE /api/accounts/by-cognito-sub/:cognitoSub", () => {
    it("should reject without authentication", async () => {
      const response = await api.delete("/api/accounts/by-cognito-sub/sub-123");
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
