import { describe, it, expect } from "vitest";
import { api } from "./helpers";

describe("GET /api/analytics", () => {
  it("returns analytics data with statsDistribution", async () => {
    const { status, body } = await api("/api/analytics");
    expect(status).toBe(200);
    expect(body).toHaveProperty("statsDistribution");
    expect(Array.isArray(body.statsDistribution)).toBe(true);
    if (body.statsDistribution.length > 0) {
      const item = body.statsDistribution[0];
      expect(item).toHaveProperty("statType");
      expect(item).toHaveProperty("range");
      expect(item).toHaveProperty("count");
      expect(item).toHaveProperty("percentage");
    }
  });

  it("has expected top-level keys", async () => {
    const { body } = await api("/api/analytics");
    expect(body).toHaveProperty("paceAnalysis");
    expect(body).toHaveProperty("foulAnalysis");
    expect(body).toHaveProperty("scoringEfficiency");
  });
});
