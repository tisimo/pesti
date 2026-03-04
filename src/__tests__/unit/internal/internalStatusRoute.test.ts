import express, { Router } from "express";
import request from "supertest";
import statusRoutes from "../../../api/routes/status";

describe("Internal Status Route", () => {
  const originalInternalKey = process.env.INTERNAL_KEY;
  const internalKey = "test-internal-key";

  beforeAll(() => {
    process.env.INTERNAL_KEY = internalKey;
  });

  afterAll(() => {
    if (originalInternalKey === undefined) {
      delete process.env.INTERNAL_KEY;
      return;
    }

    process.env.INTERNAL_KEY = originalInternalKey;
  });

  const createApp = () => {
    const app = express();
    const apiRouter = Router();
    statusRoutes(apiRouter);
    app.use("/api", apiRouter);
    return app;
  };

  it("returns 200 on public status route", async () => {
    const app = createApp();
    const response = await request(app).get("/api/status");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns 401 when internal auth header is missing", async () => {
    const app = createApp();
    const response = await request(app).get("/api/status/internal");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "Missing internal service auth header",
    });
  });

  it("returns 403 when internal auth header is invalid", async () => {
    const app = createApp();
    const response = await request(app)
      .get("/api/status/internal")
      .set("x-service-auth", "wrong-key");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Invalid internal service secret",
    });
  });

  it("returns 200 when internal auth header is valid", async () => {
    const app = createApp();
    const response = await request(app)
      .get("/api/status/internal")
      .set("x-service-auth", internalKey);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", scope: "internal" });
  });
});
