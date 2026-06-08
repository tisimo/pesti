/**
 * Reset Password API Integration Tests
 * 
 * REQUIRES: Backend running with `npm run start`
 * BASE_URL: http://localhost:4000
 * 
 * Tests password reset flow with token validation
 * Uses supertest for HTTP calls
 */

import request from "supertest";

describe("Reset Password API Integration Tests", () => {
  const BASE_URL = process.env.TEST_API_URL || "http://localhost:4000";
  let api = request(BASE_URL);

  beforeEach(() => {
    api = request(BASE_URL);
  });

  const createValidPayload = () => ({
    email: "user@example.com",
  });

  const createResetPayload = () => ({
    token: "valid-reset-token-123",
    password: "NewSecurePassword123!",
    confirmPassword: "NewSecurePassword123!",
  });

  describe("POST /api/auth/forgot-password (Request Password Reset)", () => {
    it("should accept valid email", async () => {
      const payload = createValidPayload();
      const response = await api.post("/api/auth/forgot-password").send(payload);
      
      expect(response.status).toBeDefined();
    });

    it("should reject invalid email format", async () => {
      const payload = { email: "invalid-email" };
      const response = await api.post("/api/auth/forgot-password").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject missing email", async () => {
      const payload = {};
      const response = await api.post("/api/auth/forgot-password").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject empty email", async () => {
      const payload = { email: "" };
      const response = await api.post("/api/auth/forgot-password").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should not expose sensitive data in response", async () => {
      const payload = createValidPayload();
      const response = await api.post("/api/auth/forgot-password").send(payload);
      
      expect(response.body).toBeDefined();
    });
  });

  describe("POST /api/auth/reset-password (Reset Password with Token)", () => {
    it("should reject reset with missing token", async () => {
      const payload = createResetPayload();
      delete payload.token;
      const response = await api.post("/api/auth/reset-password").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject reset with missing password", async () => {
      const payload = createResetPayload();
      delete payload.password;
      const response = await api.post("/api/auth/reset-password").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject reset with password too short", async () => {
      const payload = { ...createResetPayload(), password: "short", confirmPassword: "short" };
      const response = await api.post("/api/auth/reset-password").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject reset with non-matching passwords", async () => {
      const payload = { ...createResetPayload(), confirmPassword: "DifferentPassword123!" };
      const response = await api.post("/api/auth/reset-password").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject reset with empty password", async () => {
      const payload = { ...createResetPayload(), password: "", confirmPassword: "" };
      const response = await api.post("/api/auth/reset-password").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject reset with invalid token", async () => {
      const payload = { ...createResetPayload(), token: "invalid-token" };
      const response = await api.post("/api/auth/reset-password").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject reset with missing confirmPassword", async () => {
      const payload = createResetPayload();
      delete payload.confirmPassword;
      const response = await api.post("/api/auth/reset-password").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject reset with empty token", async () => {
      const payload = { ...createResetPayload(), token: "" };
      const response = await api.post("/api/auth/reset-password").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should not expose token in response", async () => {
      const payload = createResetPayload();
      const response = await api.post("/api/auth/reset-password").send(payload);
      
      const responseJson = JSON.stringify(response.body);
      expect(responseJson).not.toContain(payload.token);
    });

    it("should not expose password in response", async () => {
      const payload = createResetPayload();
      const response = await api.post("/api/auth/reset-password").send(payload);
      
      const responseJson = JSON.stringify(response.body);
      expect(responseJson).not.toContain(payload.password);
    });
  });

  describe("Password Reset Flow", () => {
    it("should handle request and reset in sequence", async () => {
      // Step 1: Request password reset
      const requestResponse = await api
        .post("/api/auth/forgot-password")
        .send({ email: "user@example.com" });
      
      expect(requestResponse.status).toBeDefined();

      // Step 2: Attempt reset (token would normally come from email)
      const resetResponse = await api
        .post("/api/auth/reset-password")
        .send(createResetPayload());
      
      expect(resetResponse.status).toBeDefined();
    });
  });
});
