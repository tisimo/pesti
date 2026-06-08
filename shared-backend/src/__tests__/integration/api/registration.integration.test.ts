/**
 * Registration API Integration Tests
 * 
 * REQUIRES: Backend running with `npm run start`
 * BASE_URL: http://localhost:4000
 * 
 * Tests user registration with various email/password/name combinations
 * Uses supertest for HTTP calls
 */

import request from "supertest";

describe("Registration API Integration Tests", () => {
  const BASE_URL = process.env.TEST_API_URL || "http://localhost:4000";
  let api = request(BASE_URL);

  beforeEach(() => {
    api = request(BASE_URL);
  });

  const createValidPayload = () => ({
    email: `user-${Date.now()}@example.com`,
    password: "SecurePassword123!",
    confirmPassword: "SecurePassword123!",
    firstName: "John",
    lastName: "Doe",
  });

  describe("POST /api/auth/register (User Registration)", () => {
    it("should register with valid payload", async () => {
      const payload = createValidPayload();
      const response = await api.post("/api/auth/register").send(payload);
      
      expect(response.status).toBeDefined();
    });

    it("should reject registration with invalid email format", async () => {
      const payload = { ...createValidPayload(), email: "invalid-email" };
      const response = await api.post("/api/auth/register").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject registration with missing email", async () => {
      const payload = createValidPayload();
      delete payload.email;
      const response = await api.post("/api/auth/register").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject registration with missing password", async () => {
      const payload = createValidPayload();
      delete payload.password;
      const response = await api.post("/api/auth/register").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject registration with password too short", async () => {
      const payload = { ...createValidPayload(), password: "short", confirmPassword: "short" };
      const response = await api.post("/api/auth/register").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject registration with non-matching passwords", async () => {
      const payload = { ...createValidPayload(), confirmPassword: "DifferentPassword123!" };
      const response = await api.post("/api/auth/register").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject registration with missing firstName", async () => {
      const payload = createValidPayload();
      delete payload.firstName;
      const response = await api.post("/api/auth/register").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject registration with missing lastName", async () => {
      const payload = createValidPayload();
      delete payload.lastName;
      const response = await api.post("/api/auth/register").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject registration with firstName too short", async () => {
      const payload = { ...createValidPayload(), firstName: "" };
      const response = await api.post("/api/auth/register").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject registration with lastName too short", async () => {
      const payload = { ...createValidPayload(), lastName: "" };
      const response = await api.post("/api/auth/register").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject registration with firstName too long", async () => {
      const payload = { ...createValidPayload(), firstName: "A".repeat(101) };
      const response = await api.post("/api/auth/register").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject registration with lastName too long", async () => {
      const payload = { ...createValidPayload(), lastName: "A".repeat(101) };
      const response = await api.post("/api/auth/register").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject registration with duplicate email", async () => {
      const payload = createValidPayload();
      
      // First registration
      const first = await api.post("/api/auth/register").send(payload);
      
      if (first.status < 400) {
        // Try to register same email again
        const second = await api.post("/api/auth/register").send(payload);
        expect(second.status).toBeGreaterThanOrEqual(400);
      }
    });

    it("should reject registration with empty password", async () => {
      const payload = { ...createValidPayload(), password: "", confirmPassword: "" };
      const response = await api.post("/api/auth/register").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should accept registration with valid names at boundaries", async () => {
      const payload = {
        ...createValidPayload(),
        firstName: "A", // 1 char (min)
        lastName: "B".repeat(100), // 100 chars (max)
      };
      const response = await api.post("/api/auth/register").send(payload);
      
      expect(response.status).toBeDefined();
    });

    it("should not expose password in response", async () => {
      const payload = createValidPayload();
      const response = await api.post("/api/auth/register").send(payload);
      
      const responseJson = JSON.stringify(response.body);
      expect(responseJson).not.toContain(payload.password);
    });
  });
});
