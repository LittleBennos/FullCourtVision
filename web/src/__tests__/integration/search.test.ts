import { describe, it, expect } from "vitest";
import { api } from "./helpers";

describe("GET /api/search", () => {
  it("returns players, teams, and organisations", async () => {
    // Get a real player name to use as query
    const { body: players } = await api("/api/players?limit=1");
    const q = players.data[0]?.last_name || "test";

    const { status, body } = await api(`/api/search?q=${encodeURIComponent(q)}`);
    expect(status).toBe(200);
    expect(body.data).toHaveProperty("players");
    expect(body.data).toHaveProperty("teams");
    expect(body.data).toHaveProperty("organisations");
    expect(Array.isArray(body.data.players)).toBe(true);
    expect(Array.isArray(body.data.teams)).toBe(true);
    expect(Array.isArray(body.data.organisations)).toBe(true);
  });

  it("player results have correct shape", async () => {
    const { body: players } = await api("/api/players?limit=1");
    const q = players.data[0]?.last_name;
    if (!q) return;

    const { body } = await api(`/api/search?q=${encodeURIComponent(q)}`);
    if (body.data.players.length > 0) {
      const p = body.data.players[0];
      expect(p).toHaveProperty("id");
      expect(p).toHaveProperty("name");
      expect(p).toHaveProperty("total_games");
      expect(p).toHaveProperty("ppg");
    }
  });

  it("rejects queries shorter than 2 chars", async () => {
    const { status, body } = await api("/api/search?q=a");
    expect(status).toBe(400);
    expect(body).toHaveProperty("error");
  });

  it("handles empty query", async () => {
    const { status, body } = await api("/api/search?q=");
    expect(status).toBe(400);
    expect(body).toHaveProperty("error");
  });

  it("handles special characters gracefully", async () => {
    const { status } = await api("/api/search?q=" + encodeURIComponent("O'Brien"));
    // Should not crash — either 200 with results or 200 with empty
    expect([200, 400]).toContain(status);
  });

  it("returns empty results for nonsense query", async () => {
    const { status, body } = await api("/api/search?q=zzzzxxxxxqqqq");
    expect(status).toBe(200);
    expect(body.data.players.length).toBe(0);
    expect(body.data.teams.length).toBe(0);
    expect(body.data.organisations.length).toBe(0);
  });
});
