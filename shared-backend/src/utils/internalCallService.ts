import fetch, { RequestInit } from "node-fetch";

export async function callService(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
) {
  const url = `${baseUrl}${path}`;

  const headers = {
    "Content-Type": "application/json",
    "x-service-auth": process.env.INTERNAL_KEY || "",
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Service request failed: ${response.status}`);
  }

  return response.json();
}