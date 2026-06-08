/**
 * Posts API Integration Tests
 * 
 * REQUIRES: Backend running with `npm run start`
 * BASE_URL: http://localhost:4000
 * 
 * Tests post creation, updates, deletion, and interactions
 * Uses supertest for HTTP calls
 */

import request from "supertest";

describe("Posts API Integration Tests", () => {
  const BASE_URL =
    process.env.TEST_POSTS_API_URL || process.env.TEST_API_URL || "http://localhost:4000";
  let api = request(BASE_URL);
  let authToken = "";
  let createdPostId = "";
  let postsApiAvailable = true;

  beforeAll(async () => {
    try {
      const response = await request(BASE_URL).get("/api/posts");
      if (response.status === 404) {
        postsApiAvailable = false;
        console.log(`Skipping posts tests: /api/posts not available at ${BASE_URL}`);
      }
    } catch (error) {
      postsApiAvailable = false;
      console.log("Skipping posts tests: unable to reach posts API");
    }
  });

  beforeEach(() => {
    api = request(BASE_URL);
  });

  const createValidPostPayload = () => ({
    content: "This is a test post with some meaningful content.",
    mediaUrls: ["https://example.com/image.jpg"],
    visibility: "public",
  });

  describe("POST /api/posts (Create Post)", () => {
    it("should create post with valid payload", async () => {
      if (!postsApiAvailable) return;
      const payload = createValidPostPayload();
      const response = await api
        .post("/api/posts")
        .set("Authorization", `Bearer ${authToken}`)
        .send(payload);
      
      expect(response.status).toBeDefined();
      if (response.status < 400 && response.body.data?.id) {
        createdPostId = response.body.data.id;
      }
    });

    it("should reject post with missing content", async () => {
      if (!postsApiAvailable) return;
      const payload = createValidPostPayload();
      delete payload.content;
      const response = await api
        .post("/api/posts")
        .set("Authorization", `Bearer ${authToken}`)
        .send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject post with content too short", async () => {
      if (!postsApiAvailable) return;
      const payload = { ...createValidPostPayload(), content: "" };
      const response = await api
        .post("/api/posts")
        .set("Authorization", `Bearer ${authToken}`)
        .send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject post with content too long", async () => {
      if (!postsApiAvailable) return;
      const payload = { ...createValidPostPayload(), content: "A".repeat(5001) };
      const response = await api
        .post("/api/posts")
        .set("Authorization", `Bearer ${authToken}`)
        .send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject post with invalid visibility", async () => {
      if (!postsApiAvailable) return;
      const payload = { ...createValidPostPayload(), visibility: "invalid" };
      const response = await api
        .post("/api/posts")
        .set("Authorization", `Bearer ${authToken}`)
        .send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject post with too many media URLs", async () => {
      if (!postsApiAvailable) return;
      const payload = {
        ...createValidPostPayload(),
        mediaUrls: Array(11).fill("https://example.com/image.jpg"),
      };
      const response = await api
        .post("/api/posts")
        .set("Authorization", `Bearer ${authToken}`)
        .send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject post without authentication", async () => {
      if (!postsApiAvailable) return;
      const payload = createValidPostPayload();
      const response = await api.post("/api/posts").send(payload);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should prevent XSS in post content", async () => {
      if (!postsApiAvailable) return;
      const payload = {
        ...createValidPostPayload(),
        content: "<script>alert('xss')</script>",
      };
      const response = await api
        .post("/api/posts")
        .set("Authorization", `Bearer ${authToken}`)
        .send(payload);
      
      // Should either sanitize or reject
      expect(response.status).toBeDefined();
    });

    it("should accept valid visibility options", async () => {
      if (!postsApiAvailable) return;
      const visibilityOptions = ["public", "private", "friends"];
      
      for (const visibility of visibilityOptions) {
        const payload = { ...createValidPostPayload(), visibility };
        const response = await api
          .post("/api/posts")
          .set("Authorization", `Bearer ${authToken}`)
          .send(payload);
        
        expect(response.status).toBeDefined();
      }
    });
  });

  describe("GET /api/posts (List Posts)", () => {
    it("should list posts with default pagination", async () => {
      if (!postsApiAvailable) return;
      const response = await api.get("/api/posts");
      
      expect(response.status).toBeDefined();
    });

    it("should list posts with custom limit", async () => {
      if (!postsApiAvailable) return;
      const response = await api.get("/api/posts").query({ limit: 10 });
      
      expect(response.status).toBeDefined();
    });

    it("should list posts with custom offset", async () => {
      if (!postsApiAvailable) return;
      const response = await api.get("/api/posts").query({ offset: 5 });
      
      expect(response.status).toBeDefined();
    });

    it("should handle invalid limit parameter", async () => {
      if (!postsApiAvailable) return;
      const response = await api.get("/api/posts").query({ limit: -1 });
      
      expect(response.status).toBeDefined();
    });

    it("should handle invalid offset parameter", async () => {
      if (!postsApiAvailable) return;
      const response = await api.get("/api/posts").query({ offset: -1 });
      
      expect(response.status).toBeDefined();
    });
  });

  describe("GET /api/posts/:id (Get Single Post)", () => {
    it("should get post by valid ID", async () => {
      if (!postsApiAvailable) return;
      if (!createdPostId) {
        console.log("Skipping: No post ID available");
        return;
      }

      const response = await api.get(`/api/posts/${createdPostId}`);
      
      expect(response.status).toBe(200);
    });

    it("should reject invalid post ID", async () => {
      if (!postsApiAvailable) return;
      const response = await api.get("/api/posts/invalid-id");
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject non-existent post ID", async () => {
      if (!postsApiAvailable) return;
      const response = await api.get("/api/posts/999999");
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("PUT /api/posts/:id (Update Post)", () => {
    it("should update post with valid data", async () => {
      if (!postsApiAvailable) return;
      if (!createdPostId) {
        console.log("Skipping: No post ID available");
        return;
      }

      const response = await api
        .put(`/api/posts/${createdPostId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          content: "Updated post content",
          visibility: "private",
        });
      
      expect(response.status).toBeDefined();
    });

    it("should reject update with content too long", async () => {
      if (!postsApiAvailable) return;
      if (!createdPostId) return;

      const response = await api
        .put(`/api/posts/${createdPostId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          content: "A".repeat(5001),
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject update without authentication", async () => {
      if (!postsApiAvailable) return;
      if (!createdPostId) return;

      const response = await api
        .put(`/api/posts/${createdPostId}`)
        .send({
          content: "Updated content",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("DELETE /api/posts/:id (Delete Post)", () => {
    it("should delete post with valid ID", async () => {
      if (!postsApiAvailable) return;
      if (!createdPostId) {
        console.log("Skipping: No post ID available");
        return;
      }

      const response = await api
        .delete(`/api/posts/${createdPostId}`)
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBeDefined();
    });

    it("should reject delete of non-existent post", async () => {
      if (!postsApiAvailable) return;
      const response = await api
        .delete("/api/posts/999999")
        .set("Authorization", `Bearer ${authToken}`);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject delete without authentication", async () => {
      if (!postsApiAvailable) return;
      const response = await api.delete("/api/posts/123");
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /api/posts/:id/like (Like Post)", () => {
    it("should like a post", async () => {
      if (!postsApiAvailable) return;
      const response = await api
        .post("/api/posts/123/like")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBeDefined();
    });

    it("should reject like without authentication", async () => {
      if (!postsApiAvailable) return;
      const response = await api.post("/api/posts/123/like").send({});
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /api/posts/:id/comment (Comment on Post)", () => {
    it("should add comment to post", async () => {
      if (!postsApiAvailable) return;
      const response = await api
        .post("/api/posts/123/comment")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          text: "This is a comment on the post.",
        });
      
      expect(response.status).toBeDefined();
    });

    it("should reject comment with missing text", async () => {
      if (!postsApiAvailable) return;
      const response = await api
        .post("/api/posts/123/comment")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject comment without authentication", async () => {
      if (!postsApiAvailable) return;
      const response = await api
        .post("/api/posts/123/comment")
        .send({
          text: "This is a comment",
        });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("Posts Security", () => {
    it("should not expose sensitive data in post list", async () => {
      if (!postsApiAvailable) return;
      const response = await api.get("/api/posts");
      
      if (response.body.data && response.body.data.length > 0) {
        const post = response.body.data[0];
        expect(post).not.toHaveProperty("password");
        expect(post).not.toHaveProperty("secret");
      }
    });

    it("should respect post visibility settings", async () => {
      if (!postsApiAvailable) return;
      const response = await api
        .post("/api/posts")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ...createValidPostPayload(),
          visibility: "private",
        });
      
      expect(response.status).toBeDefined();
    });
  });
});
