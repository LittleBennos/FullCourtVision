import { describe, it, expect } from "vitest";
import { api } from "./helpers";

describe("GET /api/analytics/draft-board", () => {
  it("returns ranked player list", async () => {
    const { status, body } = await api("/api/analytics/draft-board?limit=10");
    expect(status).toBe(200);
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("meta");
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 0) {
      const p = body.data[0];
      expect(p).toHaveProperty("rank");
      expect(p).toHaveProperty("id");
      expect(p).toHaveProperty("first_name");
      expect(p).toHaveProperty("last_name");
      expect(p).toHaveProperty("composite");
      expect(p).toHaveProperty("per");
      expect(p).toHaveProperty("ppg");
      expect(p).toHaveProperty("tier");
      expect(p).toHaveProperty("games");
      // Rank should be 1 for first entry
      expect(p.rank).toBe(1);
      // Tier should be one of the defined tiers
      expect(["Elite", "Star", "Starter", "Rotation", "Bench"]).toContain(p.tier);
    }
  });

  it("respects limit parameter", async () => {
    const { body } = await api("/api/analytics/draft-board?limit=5");
    expect(body.data.length).toBeLessThanOrEqual(5);
  });

  it("ranks are in descending composite order", async () => {
    const { body } = await api("/api/analytics/draft-board?limit=20");
    for (let i = 1; i < body.data.length; i++) {
      expect(body.data[i].composite).toBeLessThanOrEqual(body.data[i - 1].composite);
    }
  });
});
