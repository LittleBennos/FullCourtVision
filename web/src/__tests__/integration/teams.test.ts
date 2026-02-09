import { describe, it, expect } from "vitest";
import { api, expectPaginated } from "./helpers";

describe("GET /api/teams", () => {
  it("returns paginated team list", async () => {
    const { status, body } = await api("/api/teams");
    expect(status).toBe(200);
    expectPaginated(body);
    expect(body.data.length).toBeGreaterThan(0);
    const t = body.data[0];
    expect(t).toHaveProperty("id");
    expect(t).toHaveProperty("name");
    expect(t).toHaveProperty("organisation_id");
    expect(t).toHaveProperty("season_id");
    expect(t).toHaveProperty("wins");
    expect(t).toHaveProperty("losses");
    expect(t).toHaveProperty("games_played");
  });

  it("supports search", async () => {
    const { body: all } = await api("/api/teams?limit=1");
    const name = all.data[0]?.name?.split(" ")[0];
    if (!name) return;
    const { body } = await api(`/api/teams?search=${encodeURIComponent(name)}`);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("supports pagination", async () => {
    const { body } = await api("/api/teams?limit=2&offset=0");
    expect(body.data.length).toBeLessThanOrEqual(2);
    expect(body.meta.limit).toBe(2);
  });
});

describe("GET /api/teams/[id]", () => {
  it("returns team detail with roster", async () => {
    const { body: list } = await api("/api/teams?limit=1");
    const id = list.data[0]?.id;
    expect(id).toBeTruthy();

    const { status, body } = await api(`/api/teams/${id}`);
    expect(status).toBe(200);
    expect(body.data).toHaveProperty("id", id);
    expect(body.data).toHaveProperty("name");
    expect(body.data).toHaveProperty("record");
    expect(body.data.record).toHaveProperty("wins");
    expect(body.data.record).toHaveProperty("losses");
    expect(body.data).toHaveProperty("roster");
    expect(Array.isArray(body.data.roster)).toBe(true);
  });

  it("returns 404 for non-existent team", async () => {
    const { status, body } = await api("/api/teams/00000000-0000-0000-0000-000000000000");
    expect(status).toBe(404);
    expect(body).toHaveProperty("error");
  });
});
