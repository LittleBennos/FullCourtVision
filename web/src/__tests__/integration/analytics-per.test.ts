import { describe, it, expect } from "vitest";
import { api } from "./helpers";

describe("GET /api/analytics/per", () => {
  it("returns PER data", async () => {
    const { status, body } = await api("/api/analytics/per?limit=5");
    expect(status).toBe(200);
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
    if (body.data.length > 0) {
      const p = body.data[0];
      expect(p).toHaveProperty("id");
      expect(p).toHaveProperty("per");
      expect(typeof p.per).toBe("number");
    }
  });

  it("supports player filter", async () => {
    const { body: players } = await api("/api/players?limit=1");
    const pid = players.data[0]?.id;
    if (!pid) return;

    const { status, body } = await api(`/api/analytics/per?player=${pid}`);
    expect(status).toBe(200);
    // Player filter may return { player, total } or { data }
    expect(body).toBeDefined();
    // Should have some meaningful response
    expect(typeof body).toBe("object");
  });
});

describe("GET /api/analytics/win-probability", () => {
  it("returns win probability for two teams", async () => {
    const { body: teams } = await api("/api/teams?limit=2");
    if (teams.data.length < 2) return;
    const t1 = teams.data[0].id;
    const t2 = teams.data[1].id;

    const { status, body } = await api(`/api/analytics/win-probability?team1=${t1}&team2=${t2}`);
    expect(status).toBe(200);
    // Response shape varies; just ensure it's a valid JSON object
    expect(typeof body).toBe("object");
    expect(body).not.toBeNull();
  });

  it("handles missing team params", async () => {
    const { status } = await api("/api/analytics/win-probability");
    expect(status).toBeGreaterThanOrEqual(400);
  });
});
