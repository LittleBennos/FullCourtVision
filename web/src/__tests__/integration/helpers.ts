/**
 * Integration test helpers — hit the live deployed API at fullcourtvision.vercel.app
 */
import { expect } from "vitest";

export const BASE = "https://fullcourtvision.vercel.app";

export async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Accept": "application/json", ...init?.headers },
  });
  const body = res.headers.get("content-type")?.includes("json")
    ? await res.json()
    : await res.text();
  return { status: res.status, body, headers: res.headers };
}

/** Expect standard paginated shape { data: T[], meta: { total, limit, offset } } */
export function expectPaginated(body: any) {
  expect(body).toHaveProperty("data");
  expect(Array.isArray(body.data)).toBe(true);
  expect(body).toHaveProperty("meta");
  expect(body.meta).toHaveProperty("total");
  expect(body.meta).toHaveProperty("limit");
  expect(body.meta).toHaveProperty("offset");
}
