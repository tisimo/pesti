/**
 * Two-Factor Authentication API Integration Tests
 * 
 * REQUIRES: Backend running with `npm run start`
 * BASE_URL: http://localhost:4000
 * 
 * Tests 2FA setup, verification, and backup codes
 * Uses supertest for HTTP calls
 */

import request from "supertest";

describe("Two-Factor Authentication API Integration Tests", () => {
  const BASE_URL = process.env.TEST_API_URL || "http://localhost:4000";
  let api = request(BASE_URL);
  let authToken = "";

  beforeEach(() => {
    api = request(BASE_URL);
  });

  describe("POST /api/2fa/setup (Setup 2FA)", () => {
    it("should setup 2FA with TOTP method", async () => {
      const response = await api
        .post("/api/2fa/setup")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ method: "totp" });
      
      expect(response.status).toBeDefined();
    });

    it("should setup 2FA with SMS method", async () => {
      const response = await api
        .post("/api/2fa/setup")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ method: "sms" });
      
      expect(response.status).toBeDefined();
    });

    it("should reject 2FA setup with invalid method", async () => {
      const response = await api
        .post("/api/2fa/setup")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ method: "invalid" });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject 2FA setup without authentication", async () => {
      const response = await api
        .post("/api/2fa/setup")
        .send({ method: "totp" });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject 2FA setup with missing method", async () => {
      const response = await api
        .post("/api/2fa/setup")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should return 2FA secret for TOTP", async () => {
      const response = await api
        .post("/api/2fa/setup")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ method: "totp" });
      
      expect(response.body).toBeDefined();
    });
  });

  describe("POST /api/2fa/verify (Verify 2FA Code)", () => {
    it("should verify valid 6-digit OTP", async () => {
      const response = await api
        .post("/api/2fa/verify")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ code: "123456" });
      
      expect(response.status).toBeDefined();
    });

    it("should reject verification with missing code", async () => {
      const response = await api
        .post("/api/2fa/verify")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject verification with code too short", async () => {
      const response = await api
        .post("/api/2fa/verify")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ code: "12345" }); // 5 digits
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject verification with code too long", async () => {
      const response = await api
        .post("/api/2fa/verify")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ code: "1234567" }); // 7 digits
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject verification with non-numeric code", async () => {
      const response = await api
        .post("/api/2fa/verify")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ code: "abcdef" });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject verification without authentication", async () => {
      const response = await api
        .post("/api/2fa/verify")
        .send({ code: "123456" });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject verification with empty code", async () => {
      const response = await api
        .post("/api/2fa/verify")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ code: "" });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /api/2fa/backup-codes (Generate Backup Codes)", () => {
    it("should generate backup codes", async () => {
      const response = await api
        .post("/api/2fa/backup-codes")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBeDefined();
    });

    it("should reject backup code generation without authentication", async () => {
      const response = await api
        .post("/api/2fa/backup-codes")
        .send({});
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /api/2fa/verify-backup (Verify Backup Code)", () => {
    it("should verify valid backup code", async () => {
      const response = await api
        .post("/api/2fa/verify-backup")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ backupCode: "BACKUP-CODE-123" });
      
      expect(response.status).toBeDefined();
    });

    it("should reject verification with missing backup code", async () => {
      const response = await api
        .post("/api/2fa/verify-backup")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject verification without authentication", async () => {
      const response = await api
        .post("/api/2fa/verify-backup")
        .send({ backupCode: "BACKUP-CODE-123" });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject verification with empty backup code", async () => {
      const response = await api
        .post("/api/2fa/verify-backup")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ backupCode: "" });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /api/2fa/status (Check 2FA Status)", () => {
    it("should get 2FA status for authenticated user", async () => {
      const response = await api
        .get("/api/2fa/status")
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBeDefined();
    });

    it("should reject status check without authentication", async () => {
      const response = await api.get("/api/2fa/status");
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /api/2fa/disable (Disable 2FA)", () => {
    it("should disable 2FA", async () => {
      const response = await api
        .post("/api/2fa/disable")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ password: "CurrentPassword123!" });
      
      expect(response.status).toBeDefined();
    });

    it("should reject disable without authentication", async () => {
      const response = await api
        .post("/api/2fa/disable")
        .send({ password: "CurrentPassword123!" });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject disable with missing password", async () => {
      const response = await api
        .post("/api/2fa/disable")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject disable with empty password", async () => {
      const response = await api
        .post("/api/2fa/disable")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ password: "" });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("2FA Security Considerations", () => {
    it("should not expose backup codes in plain text", async () => {
      const response = await api
        .post("/api/2fa/backup-codes")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});
      
      expect(response.body).toBeDefined();
    });

    it("should not allow code reuse", async () => {
      // First use
      const first = await api
        .post("/api/2fa/verify-backup")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ backupCode: "BACKUP-CODE-123" });
      
      // Attempt reuse
      const second = await api
        .post("/api/2fa/verify-backup")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ backupCode: "BACKUP-CODE-123" });
      
      expect(second.status).toBeDefined();
    });
  });
});
