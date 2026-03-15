// Live API integration tests — hit real OpenParlData.ch endpoints
// Run with: npx vitest run tests/integration/parliament.integration.test.ts
// Data source: OpenParlData.ch (CC BY 4.0)

import { describe, it, expect } from "vitest";
import { handleParliament } from "../../src/modules/parliament.js";

const MAX_BYTES = 50_000;

describe("Parliament API (live — OpenParlData.ch)", () => {
  // ── search_parliament_business ───────────────────────────────────────────

  describe("search_parliament_business", () => {
    it('returns results for "Klimaschutz"', async () => {
      const raw = await handleParliament("search_parliament_business", {
        query: "Klimaschutz",
        limit: 5,
      });
      expect(raw.length).toBeLessThan(MAX_BYTES);

      const result = JSON.parse(raw);
      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("affairs");
      expect(Array.isArray(result.affairs)).toBe(true);
      expect(result.affairs.length).toBeGreaterThan(0);
    }, 60_000);

    it("affair entries have required fields", async () => {
      const raw = await handleParliament("search_parliament_business", {
        query: "AHV",
        limit: 3,
      });
      const result = JSON.parse(raw);
      for (const a of result.affairs) {
        expect(a).toHaveProperty("id");
        expect(a).toHaveProperty("number");
        expect(a).toHaveProperty("title");
        expect(a).toHaveProperty("type");
        expect(a).toHaveProperty("status");
        expect(typeof a.id).toBe("number");
      }
    }, 60_000);

    it("response is under 50K chars", async () => {
      const raw = await handleParliament("search_parliament_business", {
        query: "Schweiz",
        limit: 20,
      });
      expect(raw.length).toBeLessThan(MAX_BYTES);
    }, 60_000);
  });

  // ── get_parliament_members ───────────────────────────────────────────────

  describe("get_parliament_members", () => {
    it("returns active parliament members", async () => {
      const raw = await handleParliament("get_parliament_members", {
        limit: 5,
      });
      expect(raw.length).toBeLessThan(MAX_BYTES);

      const result = JSON.parse(raw);
      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("members");
      expect(Array.isArray(result.members)).toBe(true);
      expect(result.members.length).toBeGreaterThan(0);
    }, 60_000);

    it("member entries have required fields", async () => {
      const raw = await handleParliament("get_parliament_members", {
        limit: 3,
      });
      const result = JSON.parse(raw);
      for (const m of result.members) {
        expect(m).toHaveProperty("id");
        expect(m).toHaveProperty("name");
        expect(m).toHaveProperty("party");
        expect(m).toHaveProperty("canton");
        expect(m).toHaveProperty("council");
        expect(m).toHaveProperty("url");
        expect(typeof m.id).toBe("number");
      }
    }, 60_000);

    it("response is under 50K chars", async () => {
      const raw = await handleParliament("get_parliament_members", {
        limit: 50,
      });
      expect(raw.length).toBeLessThan(MAX_BYTES);
    }, 60_000);
  });

  // ── get_session_schedule ─────────────────────────────────────────────────

  describe("get_session_schedule", () => {
    it("returns recent sessions", async () => {
      const raw = await handleParliament("get_session_schedule", { limit: 5 });
      expect(raw.length).toBeLessThan(MAX_BYTES);

      const result = JSON.parse(raw);
      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("sessions");
      expect(Array.isArray(result.sessions)).toBe(true);
      expect(result.sessions.length).toBeGreaterThan(0);
    }, 60_000);

    it("session entries have required fields", async () => {
      const raw = await handleParliament("get_session_schedule", { limit: 3 });
      const result = JSON.parse(raw);
      for (const s of result.sessions) {
        expect(s).toHaveProperty("id");
        expect(s).toHaveProperty("name");
        expect(s).toHaveProperty("startDate");
        expect(typeof s.id).toBe("number");
      }
    }, 60_000);

    it("response is under 50K chars", async () => {
      const raw = await handleParliament("get_session_schedule", {
        limit: 20,
      });
      expect(raw.length).toBeLessThan(MAX_BYTES);
    }, 60_000);
  });

  // ── search_cantonal_affairs ──────────────────────────────────────────────

  describe("search_cantonal_affairs", () => {
    it("returns Zurich cantonal affairs", async () => {
      const raw = await handleParliament("search_cantonal_affairs", {
        canton: "ZH",
        limit: 3,
      });
      expect(raw.length).toBeLessThan(MAX_BYTES);

      const result = JSON.parse(raw);
      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("canton", "ZH");
      expect(result).toHaveProperty("affairs");
      expect(Array.isArray(result.affairs)).toBe(true);
      expect(result.affairs.length).toBeGreaterThan(0);
    }, 60_000);

    it("response is under 50K chars", async () => {
      const raw = await handleParliament("search_cantonal_affairs", {
        canton: "BE",
        limit: 20,
      });
      expect(raw.length).toBeLessThan(MAX_BYTES);
    }, 60_000);
  });

  // ── get_committee_meetings ───────────────────────────────────────────────

  describe("get_committee_meetings", () => {
    it("returns committee meetings", async () => {
      const raw = await handleParliament("get_committee_meetings", {
        limit: 5,
      });
      expect(raw.length).toBeLessThan(MAX_BYTES);

      const result = JSON.parse(raw);
      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("meetings");
      expect(Array.isArray(result.meetings)).toBe(true);
      expect(result.meetings.length).toBeGreaterThan(0);
    }, 60_000);

    it("response is under 50K chars", async () => {
      const raw = await handleParliament("get_committee_meetings", {
        limit: 20,
      });
      expect(raw.length).toBeLessThan(MAX_BYTES);
    }, 60_000);
  });
});
