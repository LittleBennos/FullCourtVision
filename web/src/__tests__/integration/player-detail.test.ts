import { describe, it, expect } from "vitest";
import { api } from "./helpers";

describe("GET /api/players/[id]", () => {
  it("returns player detail for valid ID", async () => {
    // Get a real player ID first
    const { body: list } = await api("/api/players?limit=1");
    const id = list.data[0]?.id;
    expect(id).toBeTruthy();

    const { status, body } = await api(`/api/players/${id}`);
    expect(status).toBe(200);
    expect(body.data).toHaveProperty("id", id);
    expect(body.data).toHaveProperty("first_name");
    expect(body.data).toHaveProperty("last_name");
    expect(body.data).toHaveProperty("updated_at");
    expect(body.data).toHaveProperty("career_stats");
    if (body.data.career_stats) {
      expect(body.data.career_stats).toHaveProperty("total_games");
      expect(body.data.career_stats).toHaveProperty("total_points");
      expect(body.data.career_stats).toHaveProperty("ppg");
    }
  });

  it("returns 404 for non-existent UUID", async () => {
    const { status, body } = await api("/api/players/00000000-0000-0000-0000-000000000000");
    expect(status).toBe(404);
    expect(body).toHaveProperty("error");
  });

  it("returns 404 for invalid ID format", async () => {
    const { status, body } = await api("/api/players/not-a-valid-id");
    expect(status).toBe(404);
    expect(body).toHaveProperty("error");
  });
});
