// Integration tests for Swiss Voting module — hit real data.bs.ch API
// Run with: npm run test:integration

import { describe, it, expect } from "vitest";
import {
  handleGetVotingResults,
  handleSearchVotes,
  handleGetVoteDetails,
} from "../../src/modules/voting.js";

describe("get_voting_results (live API)", () => {
  it("returns at least 1 vote", async () => {
    const result = JSON.parse(await handleGetVotingResults({}));
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  it("returns votes array with data", async () => {
    const result = JSON.parse(await handleGetVotingResults({}));
    expect(Array.isArray(result.votes)).toBe(true);
    expect(result.votes.length).toBeGreaterThan(0);
  });

  it("each vote has title, date, type", async () => {
    const result = JSON.parse(await handleGetVotingResults({}));
    for (const vote of result.votes) {
      expect(typeof vote.title).toBe("string");
      expect(vote.title.length).toBeGreaterThan(0);
      expect(typeof vote.date).toBe("string");
      expect(vote.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof vote.type).toBe("string");
    }
  });

  it("each vote has numeric vote counts", async () => {
    const result = JSON.parse(await handleGetVotingResults({}));
    for (const vote of result.votes) {
      expect(typeof vote.yes_count).toBe("number");
      expect(typeof vote.no_count).toBe("number");
      expect(vote.yes_count).toBeGreaterThan(0);
      expect(vote.no_count).toBeGreaterThan(0);
    }
  });

  it("yes_percentage is between 0 and 100", async () => {
    const result = JSON.parse(await handleGetVotingResults({}));
    for (const vote of result.votes) {
      expect(vote.yes_percentage).toBeGreaterThanOrEqual(0);
      expect(vote.yes_percentage).toBeLessThanOrEqual(100);
    }
  });

  it("eligible_voters is a positive number", async () => {
    const result = JSON.parse(await handleGetVotingResults({}));
    for (const vote of result.votes) {
      expect(vote.eligible_voters).toBeGreaterThan(0);
    }
  });

  it("year filter works for 2024", async () => {
    const result = JSON.parse(await handleGetVotingResults({ year: 2024 }));
    expect(result.count).toBeGreaterThan(0);
    // All votes should be from 2024
    for (const vote of result.votes) {
      expect(vote.date).toMatch(/^2024/);
    }
  });

  it("includes source referencing Basel-Stadt", async () => {
    const result = JSON.parse(await handleGetVotingResults({}));
    expect(result.source).toContain("Basel");
  });

  it("includes data_url", async () => {
    const result = JSON.parse(await handleGetVotingResults({}));
    expect(result.data_url).toContain("data.bs.ch");
  });

  it("respects limit=3", async () => {
    const result = JSON.parse(await handleGetVotingResults({ limit: 3 }));
    expect(result.votes.length).toBeLessThanOrEqual(3);
  });

  it("response is under 50K chars", async () => {
    const result = await handleGetVotingResults({});
    expect(result.length).toBeLessThan(50000);
  });

  it("returns national vote type for known votes", async () => {
    // Get recent votes (no year filter to avoid API limitation)
    const result = JSON.parse(await handleGetVotingResults({ limit: 10 }));
    expect(result.count).toBeGreaterThan(0);
    // At least some votes should be national (most Swiss popular votes are national)
    const types = result.votes.map((v: { type: string }) => v.type);
    expect(types.some((t: string) => t === "national" || t === "kantonal")).toBe(true);
  });
});

describe("search_votes (live API)", () => {
  it("finds votes for 'Initiative'", async () => {
    const result = JSON.parse(await handleSearchVotes({ query: "Initiative" }));
    expect(result.count).toBeGreaterThan(0);
    expect(result.votes.length).toBeGreaterThan(0);
  });

  it("all returned votes contain the search keyword", async () => {
    const result = JSON.parse(await handleSearchVotes({ query: "Initiative" }));
    for (const vote of result.votes) {
      expect(vote.title.toLowerCase()).toContain("initiative");
    }
  });

  it("returns query field matching input", async () => {
    const result = JSON.parse(await handleSearchVotes({ query: "AHV" }));
    expect(result.query).toBe("AHV");
  });

  it("empty result for nonexistent keyword", async () => {
    const result = JSON.parse(
      await handleSearchVotes({ query: "ZuckersteuerXYZ123" }),
    );
    expect(result.count).toBe(0);
    expect(result.votes).toHaveLength(0);
  });

  it("respects limit", async () => {
    const result = JSON.parse(
      await handleSearchVotes({ query: "Initiative", limit: 2 }),
    );
    expect(result.votes.length).toBeLessThanOrEqual(2);
  });

  it("response is under 50K chars", async () => {
    const result = await handleSearchVotes({ query: "Initiative" });
    expect(result.length).toBeLessThan(50000);
  });

  it("finds Klima-Gesetz vote", async () => {
    const result = JSON.parse(await handleSearchVotes({ query: "Klima" }));
    expect(result.count).toBeGreaterThan(0);
    const klima = result.votes.find((v: { title: string }) =>
      v.title.includes("Klima"),
    );
    expect(klima).toBeDefined();
  });

  it("votes have yes_percentage and eligible_voters", async () => {
    const result = JSON.parse(await handleSearchVotes({ query: "Initiative" }));
    for (const vote of result.votes) {
      expect(typeof vote.yes_percentage).toBe("number");
      expect(typeof vote.eligible_voters).toBe("number");
    }
  });
});

describe("get_vote_details (live API)", () => {
  it("returns details for a known vote by title", async () => {
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    expect(result.title).toContain("Nationalstrassen");
    expect(result.breakdown).toBeDefined();
  });

  it("returns breakdown with at least 2 districts", async () => {
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    expect(result.breakdown.length).toBeGreaterThanOrEqual(2);
  });

  it("breakdown districts include Basel and Riehen", async () => {
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    const districts = result.breakdown.map((d: { district: string }) => d.district);
    expect(districts).toContain("Basel");
    expect(districts).toContain("Riehen");
  });

  it("returns totals object with all fields", async () => {
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    expect(typeof result.totals.yes_count).toBe("number");
    expect(typeof result.totals.no_count).toBe("number");
    expect(typeof result.totals.yes_percentage).toBe("number");
    expect(typeof result.totals.eligible_voters).toBe("number");
  });

  it("totals.yes_count equals sum of breakdown", async () => {
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    const sumYes = result.breakdown.reduce(
      (s: number, d: { yes_count: number }) => s + d.yes_count,
      0,
    );
    expect(result.totals.yes_count).toBe(sumYes);
  });

  it("returns error for completely unknown vote", async () => {
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "ZuckersteuerNonExistent99" }),
    );
    expect(result.error).toBeDefined();
  });

  it("accepts date parameter", async () => {
    const result = JSON.parse(
      await handleGetVoteDetails({ date: "2024-11-24" }),
    );
    expect(result.date).toBe("2024-11-24");
    expect(result.breakdown.length).toBeGreaterThan(0);
  });

  it("accepts both vote_title and date", async () => {
    const result = JSON.parse(
      await handleGetVoteDetails({
        vote_title: "Nationalstrassen",
        date: "2024-11-24",
      }),
    );
    expect(result.title).toContain("Nationalstrassen");
    expect(result.date).toBe("2024-11-24");
  });

  it("response is under 50K chars", async () => {
    const result = await handleGetVoteDetails({ vote_title: "Nationalstrassen" });
    expect(result.length).toBeLessThan(50000);
  });

  it("yes_percentage in totals is between 0 and 100", async () => {
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    expect(result.totals.yes_percentage).toBeGreaterThanOrEqual(0);
    expect(result.totals.yes_percentage).toBeLessThanOrEqual(100);
  });

  it("source contains data.bs.ch", async () => {
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    expect(result.source).toContain("data.bs.ch");
  });
});
