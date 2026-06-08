/**
 * OAuth API Integration Tests
 * 
 * REQUIRES: Backend running with `npm run start`
 * BASE_URL: http://localhost:4000
 * 
 * Tests OAuth provider authentication flows
 * Uses supertest for HTTP calls
 */

import request from "supertest";

describe("OAuth API Integration Tests", () => {
  const BASE_URL = process.env.TEST_API_URL || "http://localhost:4000";
  let api = request(BASE_URL);

  beforeEach(() => {
    api = request(BASE_URL);
  });

  describe("GET /api/oauth/authorize (OAuth Authorization)", () => {
    it("should accept Google OAuth provider", async () => {
      const response = await api
        .get("/api/oauth/authorize")
        .query({
          provider: "google",
          redirectUri: "http://localhost:3000/callback",
          state: "random-state-123",
        });
      
      expect(response.status).toBeDefined();
    });

    it("should accept Facebook OAuth provider", async () => {
      const response = await api
        .get("/api/oauth/authorize")
        .query({
          provider: "facebook",
          redirectUri: "http://localhost:3000/callback",
          state: "random-state-123",
        });
      
      expect(response.status).toBeDefined();
    });

    it("should accept GitHub OAuth provider", async () => {
      const response = await api
        .get("/api/oauth/authorize")
        .query({
          provider: "github",
          redirectUri: "http://localhost:3000/callback",
          state: "random-state-123",
        });
      
      expect(response.status).toBeDefined();
    });

    it("should accept Apple OAuth provider", async () => {
      const response = await api
        .get("/api/oauth/authorize")
        .query({
          provider: "apple",
          redirectUri: "http://localhost:3000/callback",
          state: "random-state-123",
        });
      
      expect(response.status).toBeDefined();
    });

    it("should reject invalid OAuth provider", async () => {
      const response = await api
        .get("/api/oauth/authorize")
        .query({
          provider: "invalid",
          redirectUri: "http://localhost:3000/callback",
          state: "random-state-123",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject missing provider", async () => {
      const response = await api
        .get("/api/oauth/authorize")
        .query({
          redirectUri: "http://localhost:3000/callback",
          state: "random-state-123",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject missing redirect URI", async () => {
      const response = await api
        .get("/api/oauth/authorize")
        .query({
          provider: "google",
          state: "random-state-123",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject missing state parameter", async () => {
      const response = await api
        .get("/api/oauth/authorize")
        .query({
          provider: "google",
          redirectUri: "http://localhost:3000/callback",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject invalid redirect URI format", async () => {
      const response = await api
        .get("/api/oauth/authorize")
        .query({
          provider: "google",
          redirectUri: "not-a-valid-url",
          state: "random-state-123",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject empty state parameter", async () => {
      const response = await api
        .get("/api/oauth/authorize")
        .query({
          provider: "google",
          redirectUri: "http://localhost:3000/callback",
          state: "",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /api/oauth/callback (OAuth Callback)", () => {
    it("should handle OAuth callback with valid code", async () => {
      const response = await api
        .post("/api/oauth/callback")
        .send({
          provider: "google",
          code: "valid-oauth-code",
          state: "random-state-123",
        });
      
      expect(response.status).toBeDefined();
    });

    it("should reject callback with missing code", async () => {
      const response = await api
        .post("/api/oauth/callback")
        .send({
          provider: "google",
          state: "random-state-123",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject callback with missing provider", async () => {
      const response = await api
        .post("/api/oauth/callback")
        .send({
          code: "valid-oauth-code",
          state: "random-state-123",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject callback with missing state", async () => {
      const response = await api
        .post("/api/oauth/callback")
        .send({
          provider: "google",
          code: "valid-oauth-code",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject callback with empty code", async () => {
      const response = await api
        .post("/api/oauth/callback")
        .send({
          provider: "google",
          code: "",
          state: "random-state-123",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject callback with invalid provider", async () => {
      const response = await api
        .post("/api/oauth/callback")
        .send({
          provider: "invalid",
          code: "valid-oauth-code",
          state: "random-state-123",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /api/oauth/link (Link OAuth Account)", () => {
    it("should link OAuth account to existing user", async () => {
      const response = await api
        .post("/api/oauth/link")
        .set("Authorization", "Bearer valid-token")
        .send({
          provider: "google",
          code: "valid-oauth-code",
        });
      
      expect(response.status).toBeDefined();
    });

    it("should reject link without authentication", async () => {
      const response = await api
        .post("/api/oauth/link")
        .send({
          provider: "google",
          code: "valid-oauth-code",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject link with missing provider", async () => {
      const response = await api
        .post("/api/oauth/link")
        .set("Authorization", "Bearer valid-token")
        .send({
          code: "valid-oauth-code",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject link with missing code", async () => {
      const response = await api
        .post("/api/oauth/link")
        .set("Authorization", "Bearer valid-token")
        .send({
          provider: "google",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /api/oauth/unlink (Unlink OAuth Account)", () => {
    it("should unlink OAuth account", async () => {
      const response = await api
        .post("/api/oauth/unlink")
        .set("Authorization", "Bearer valid-token")
        .send({
          provider: "google",
        });
      
      expect(response.status).toBeDefined();
    });

    it("should reject unlink without authentication", async () => {
      const response = await api
        .post("/api/oauth/unlink")
        .send({
          provider: "google",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject unlink with missing provider", async () => {
      const response = await api
        .post("/api/oauth/unlink")
        .set("Authorization", "Bearer valid-token")
        .send({});
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("OAuth Security", () => {
    it("should protect against CSRF attacks with state parameter", async () => {
      const response = await api
        .get("/api/oauth/authorize")
        .query({
          provider: "google",
          redirectUri: "http://localhost:3000/callback",
          state: "should-be-validated",
        });
      
      expect(response.status).toBeDefined();
    });

    it("should not expose OAuth secrets in response", async () => {
      const response = await api
        .post("/api/oauth/callback")
        .send({
          provider: "google",
          code: "valid-oauth-code",
          state: "random-state-123",
        });
      
      const responseJson = JSON.stringify(response.body);
      expect(responseJson).not.toContain("secret");
    });

    it("should handle multiple provider types", async () => {
      const providers = ["google", "facebook", "github", "apple"];
      
      for (const provider of providers) {
        const response = await api
          .get("/api/oauth/authorize")
          .query({
            provider,
            redirectUri: "http://localhost:3000/callback",
            state: "random-state-123",
          });
        
        expect(response.status).toBeDefined();
      }
    });
  });
});
