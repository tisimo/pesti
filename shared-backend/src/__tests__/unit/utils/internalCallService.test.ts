import fetch from "node-fetch";
import { callService } from "../../../utils/internalCallService";

jest.mock("node-fetch", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("internalCallService", () => {
  const originalInternalKey = process.env.INTERNAL_KEY;
  const mockedFetch = fetch as unknown as jest.Mock;

  beforeAll(() => {
    process.env.INTERNAL_KEY = "test-internal-key";
  });

  afterAll(() => {
    if (originalInternalKey === undefined) {
      delete process.env.INTERNAL_KEY;
      return;
    }

    process.env.INTERNAL_KEY = originalInternalKey;
  });

  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("sends internal auth header and returns response json", async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ status: "ok" }),
    });

    const response = await callService("http://localhost:4000/api", "/status/internal", {
      method: "GET",
      headers: {
        "x-trace-id": "trace-123",
      },
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/status/internal",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-service-auth": "test-internal-key",
          "x-trace-id": "trace-123",
        }),
      }),
    );
    expect(response).toEqual({ status: "ok" });
  });

  it("throws when response is not ok", async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 403,
    });

    await expect(callService("http://localhost:4000/api", "/status/internal")).rejects.toThrow(
      "Service request failed: 403",
    );
  });
});
