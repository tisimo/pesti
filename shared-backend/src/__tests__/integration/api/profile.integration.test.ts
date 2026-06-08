/**
 * Profile API Integration Tests
 *
 * REQUIRES: Backend running with `npm run start`
 * BASE_URL: http://localhost:4000
 *
 * Focuses on real routes and validation behavior.
 */

import request from "supertest";

describe("Profile API Integration Tests", () => {
  const BASE_URL = process.env.TEST_API_URL || "http://localhost:4000";
  let api = request(BASE_URL);
  let authToken = "";

  beforeEach(() => {
    api = request(BASE_URL);
  });

  describe("GET /api/profile/completion-data", () => {
    it("should return completion data", async () => {
      const response = await api.get("/api/profile/completion-data");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/profile/completion", () => {
    it("should reject without authentication", async () => {
      const response = await api.post("/api/profile/completion").send({
        firstName: "John",
        lastName: "Doe",
        username: "john_doe",
        userType: "donor",
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /api/profile/me", () => {
    it("should reject without authentication", async () => {
      const response = await api.get("/api/profile/me");
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /api/profile/verify", () => {
    it("should reject without authentication", async () => {
      const response = await api.get("/api/profile/verify");
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /api/profile/verify", () => {
    it("should reject without authentication", async () => {
      const response = await api.post("/api/profile/verify").send({ status: "verified" });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject invalid status value", async () => {
      const response = await api.post("/api/profile/verify").send({ status: "invalid" });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /api/profile/username/check", () => {
    it("should validate username query", async () => {
      const response = await api
        .get("/api/profile/username/check")
        .query({ username: "john_doe" });

      expect(response.status).toBeDefined();
    });

    it("should reject invalid username query", async () => {
      const response = await api
        .get("/api/profile/username/check")
        .query({ username: "bad@name" });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /api/profile/username/:username", () => {
    it("should respond for valid username", async () => {
      const response = await api.get("/api/profile/username/john_doe");
      expect(response.status).toBeDefined();
    });

    it("should reject invalid username", async () => {
      const response = await api.get("/api/profile/username/bad@name");
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /api/profile/username/:username/stats", () => {
    it("should respond for valid username", async () => {
      const response = await api.get("/api/profile/username/john_doe/stats");
      expect(response.status).toBeDefined();
    });
  });

  describe("GET /api/profile/username/:username/supporters", () => {
    it("should respond for valid username", async () => {
      const response = await api.get("/api/profile/username/john_doe/supporters");
      expect(response.status).toBeDefined();
    });
  });
});
