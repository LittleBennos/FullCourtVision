import { describe, it, expect } from "vitest";
import { api } from "./helpers";

describe("Edge cases and error handling", () => {
  it("CORS headers are present", async () => {
    const { headers } = await api("/api/players?limit=1");
    expect(headers.get("access-control-allow-origin")).toBe("*");
  });

  it("non-existent API route returns 404", async () => {
    const { status } = await api("/api/does-not-exist");
    expect(status).toBe(404);
  });

  it("negative offset treated as 0", async () => {
    const { status, body } = await api("/api/players?offset=-5");
    expect(status).toBe(200);
    expect(body.meta.offset).toBe(0);
  });

  it("non-numeric limit falls back to default", async () => {
    const { status, body } = await api("/api/players?limit=abc");
    expect(status).toBe(200);
    expect(body.meta.limit).toBe(25); // default
  });

  it("special characters in search don't crash", async () => {
    const queries = [
      "O'Brien",
      "José",
      "McDonald's",
      "test%20test",
      "<script>alert(1)</script>",
      "'; DROP TABLE players; --",
    ];
    for (const q of queries) {
      const { status } = await api(`/api/players?search=${encodeURIComponent(q)}`);
      expect(status).toBe(200);
    }
  });

  it("empty search returns all players", async () => {
    const { status, body } = await api("/api/players?search=");
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("very large offset returns empty or error", async () => {
    const { status, body } = await api("/api/players?offset=99999");
    // Supabase may return 200 with empty data or 500 for extreme ranges
    if (status === 200) {
      expect(body.data.length).toBe(0);
    } else {
      expect(status).toBeGreaterThanOrEqual(400);
    }
  });

  it("teams search with no results", async () => {
    const { status, body } = await api("/api/teams?search=zzzznoexistzzz");
    expect(status).toBe(200);
    expect(body.data.length).toBe(0);
    expect(body.meta.total).toBe(0);
  });
});
