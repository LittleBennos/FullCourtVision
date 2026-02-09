import { describe, it, expect } from "vitest";
import { api, expectPaginated } from "./helpers";

describe("GET /api/players", () => {
  it("returns paginated player list", async () => {
    const { status, body } = await api("/api/players");
    expect(status).toBe(200);
    expectPaginated(body);
    expect(body.data.length).toBeGreaterThan(0);
    // Shape check
    const p = body.data[0];
    expect(p).toHaveProperty("id");
    expect(p).toHaveProperty("first_name");
    expect(p).toHaveProperty("last_name");
    expect(p).toHaveProperty("total_games");
    expect(p).toHaveProperty("total_points");
    expect(p).toHaveProperty("ppg");
  });

  it("respects limit and offset", async () => {
    const { body: page1 } = await api("/api/players?limit=3&offset=0");
    const { body: page2 } = await api("/api/players?limit=3&offset=3");
    expect(page1.data.length).toBeLessThanOrEqual(3);
    expect(page2.data.length).toBeLessThanOrEqual(3);
    expect(page1.meta.limit).toBe(3);
    expect(page2.meta.offset).toBe(3);
    // Pages should differ (assuming >3 players)
    if (page1.data.length === 3 && page2.data.length > 0) {
      expect(page1.data[0].id).not.toBe(page2.data[0].id);
    }
  });

  it("supports search by name", async () => {
    // First get a player name to search for
    const { body: all } = await api("/api/players?limit=1");
    const name = all.data[0]?.last_name;
    if (!name) return;

    const { status, body } = await api(`/api/players?search=${encodeURIComponent(name)}`);
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.some((p: any) => p.last_name.toLowerCase().includes(name.toLowerCase()))).toBe(true);
  });

  it("supports sort parameter", async () => {
    const { body } = await api("/api/players?sort=last_name&dir=asc&limit=5");
    expect(body.data.length).toBeGreaterThan(0);
    // Should be alphabetically sorted
    for (let i = 1; i < body.data.length; i++) {
      expect(body.data[i].last_name.localeCompare(body.data[i - 1].last_name)).toBeGreaterThanOrEqual(0);
    }
  });

  it("caps limit at 100", async () => {
    const { body } = await api("/api/players?limit=999");
    expect(body.meta.limit).toBeLessThanOrEqual(100);
  });
});
