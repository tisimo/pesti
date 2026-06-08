import Logger from "../../loaders/logger";

export class InternalApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async post<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      Logger.error(
        { url, status: response.status, body: text },
        "Internal API request failed",
      );
      throw new Error(`Internal API ${path} returned ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }
}
