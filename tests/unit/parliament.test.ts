import { describe, it, expect, vi, afterEach } from "vitest";
import { handleParliament } from "../../src/modules/parliament.js";
import {
  mockAffairsResponse,
  mockPersonsResponse,
  mockVotingsResponse,
  mockMeetingsResponse,
  mockSpeechesResponse,
  mockInterestsResponse,
  mockCantonalAffairsResponse,
  mockDocsResponse,
  mockCommitteeMeetingsResponse,
  mockEmptyResponse,
} from "../fixtures/parliament.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Mock fetch helper ─────────────────────────────────────────────────────────

function mockFetch(payload: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      json: () => Promise.resolve(payload),
    })
  );
}

function capturedFetch(payload: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(payload),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// ── search_parliament_business ────────────────────────────────────────────────

describe("search_parliament_business", () => {
  it("returns affairs array with count and total", async () => {
    mockFetch(mockAffairsResponse);
    const result = JSON.parse(
      await handleParliament("search_parliament_business", {
        query: "Klimaschutz",
      })
    );
    expect(result).toHaveProperty("count");
    expect(result).toHaveProperty("total", 96);
    expect(result).toHaveProperty("query", "Klimaschutz");
    expect(result).toHaveProperty("affairs");
    expect(Array.isArray(result.affairs)).toBe(true);
    expect(result.affairs).toHaveLength(2);
  });

  it("affair entry has expected fields", async () => {
    mockFetch(mockAffairsResponse);
    const result = JSON.parse(
      await handleParliament("search_parliament_business", {
        query: "Klimaschutz",
      })
    );
    const a = result.affairs[0];
    expect(a.id).toBe(296480);
    expect(a.number).toBe("26.7028");
    expect(a.title).toContain("Klimaschutz");
    expect(a.type).toBe("Fragestunde. Frage");
    expect(a.status).toBe("Eingereicht");
    expect(a.date).toBe("2026-03-03");
    expect(a.url).toContain("parlament.ch");
  });

  it("builds correct URL with query params", async () => {
    const fetchMock = capturedFetch(mockAffairsResponse);
    await handleParliament("search_parliament_business", {
      query: "AHV",
      limit: 3,
    });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("openparldata.ch");
    expect(calledUrl).toContain("search=AHV");
    expect(calledUrl).toContain("body_key=CHE");
    expect(calledUrl).toContain("lang=de");
    expect(calledUrl).toContain("lang_format=flat");
    expect(calledUrl).toContain("limit=3");
    expect(calledUrl).toContain("sort_by=-begin_date");
  });

  it("caps limit at 20", async () => {
    const fetchMock = capturedFetch(mockAffairsResponse);
    await handleParliament("search_parliament_business", {
      query: "test",
      limit: 999,
    });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("limit=20");
  });

  it("uses default limit of 5", async () => {
    const fetchMock = capturedFetch(mockAffairsResponse);
    await handleParliament("search_parliament_business", { query: "test" });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("limit=5");
  });

  it("returns empty affairs array when no results", async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(
      await handleParliament("search_parliament_business", {
        query: "XYZ_NOTHING",
      })
    );
    expect(result.affairs).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("handles null begin_date gracefully", async () => {
    const withNullDate = {
      ...mockAffairsResponse,
      data: [{ ...mockAffairsResponse.data[0], begin_date: null }],
    };
    mockFetch(withNullDate);
    const result = JSON.parse(
      await handleParliament("search_parliament_business", { query: "test" })
    );
    expect(result.affairs[0].date).toBeNull();
  });

  it("throws on HTTP error", async () => {
    mockFetch({}, 500);
    await expect(
      handleParliament("search_parliament_business", { query: "test" })
    ).rejects.toThrow("HTTP 500");
  });

  it("URL path has trailing slash for affairs", async () => {
    const fetchMock = capturedFetch(mockAffairsResponse);
    await handleParliament("search_parliament_business", { query: "test" });
    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.pathname).toContain("/affairs/");
  });
});

// ── get_parliament_members ────────────────────────────────────────────────────

describe("get_parliament_members", () => {
  it("returns members array with count and total", async () => {
    mockFetch(mockPersonsResponse);
    const result = JSON.parse(
      await handleParliament("get_parliament_members", {})
    );
    expect(result).toHaveProperty("count", 2);
    expect(result).toHaveProperty("total", 253);
    expect(result).toHaveProperty("members");
    expect(Array.isArray(result.members)).toBe(true);
  });

  it("member entry has expected fields", async () => {
    mockFetch(mockPersonsResponse);
    const result = JSON.parse(
      await handleParliament("get_parliament_members", {})
    );
    const m = result.members[0];
    expect(m.id).toBe(18579);
    expect(m.name).toBe("Cyril Aellen");
    expect(m.party).toBe("FDP-Liberale");
    expect(m.canton).toBe("Genf");
    expect(m.council).toBe("NR");
    expect(m.url).toContain("parlament.ch");
  });

  it("includes active=true by default", async () => {
    const fetchMock = capturedFetch(mockPersonsResponse);
    await handleParliament("get_parliament_members", {});
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("active=true");
  });

  it("passes active=false when specified", async () => {
    const fetchMock = capturedFetch(mockPersonsResponse);
    await handleParliament("get_parliament_members", { active: false });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("active=false");
  });

  it("adds electoral_district_de for canton filter", async () => {
    const fetchMock = capturedFetch(mockPersonsResponse);
    await handleParliament("get_parliament_members", { canton: "Zürich" });
    const calledUrl = decodeURIComponent(
      fetchMock.mock.calls[0][0] as string
    );
    expect(calledUrl).toContain("electoral_district_de=Zürich");
  });

  it("adds search param for party filter", async () => {
    const fetchMock = capturedFetch(mockPersonsResponse);
    await handleParliament("get_parliament_members", { party: "SVP" });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("search=SVP");
  });

  it("caps limit at 50", async () => {
    const fetchMock = capturedFetch(mockPersonsResponse);
    await handleParliament("get_parliament_members", { limit: 999 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("limit=50");
  });

  it("returns empty on no results", async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(
      await handleParliament("get_parliament_members", { canton: "XX" })
    );
    expect(result.members).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("throws on HTTP error", async () => {
    mockFetch({}, 503);
    await expect(
      handleParliament("get_parliament_members", {})
    ).rejects.toThrow("HTTP 503");
  });
});

// ── get_parliament_votes ──────────────────────────────────────────────────────

describe("get_parliament_votes", () => {
  it("returns votes array with count", async () => {
    mockFetch(mockVotingsResponse);
    const result = JSON.parse(
      await handleParliament("get_parliament_votes", { affair_id: 296480 })
    );
    expect(result).toHaveProperty("count", 2);
    expect(result).toHaveProperty("affairId", 296480);
    expect(result).toHaveProperty("votes");
    expect(Array.isArray(result.votes)).toBe(true);
  });

  it("vote entry has expected fields", async () => {
    mockFetch(mockVotingsResponse);
    const result = JSON.parse(
      await handleParliament("get_parliament_votes", { affair_id: 296480 })
    );
    const v = result.votes[0];
    expect(v.id).toBe(5001);
    expect(v.affairId).toBe(296480);
    expect(v.subject).toBe("Gesamtabstimmung");
    expect(v.meaningYes).toBe("Annahme der Motion");
    expect(v.meaningNo).toBe("Ablehnung der Motion");
    expect(v.yes).toBe(102);
    expect(v.no).toBe(88);
    expect(v.abstain).toBe(5);
    expect(v.date).toBe("2026-03-10");
  });

  it("builds correct URL with affair ID", async () => {
    const fetchMock = capturedFetch(mockVotingsResponse);
    await handleParliament("get_parliament_votes", { affair_id: 12345 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/affairs/12345/votings/");
  });

  it("returns empty when no votes exist", async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(
      await handleParliament("get_parliament_votes", { affair_id: 999 })
    );
    expect(result.votes).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("handles null vote_date", async () => {
    const withNullDate = {
      ...mockVotingsResponse,
      data: [{ ...mockVotingsResponse.data[0], vote_date: null }],
    };
    mockFetch(withNullDate);
    const result = JSON.parse(
      await handleParliament("get_parliament_votes", { affair_id: 296480 })
    );
    expect(result.votes[0].date).toBeNull();
  });

  it("throws on HTTP error", async () => {
    mockFetch({}, 404);
    await expect(
      handleParliament("get_parliament_votes", { affair_id: 999 })
    ).rejects.toThrow("HTTP 404");
  });
});

// ── get_session_schedule ──────────────────────────────────────────────────────

describe("get_session_schedule", () => {
  it("returns sessions array with count", async () => {
    mockFetch(mockMeetingsResponse);
    const result = JSON.parse(
      await handleParliament("get_session_schedule", {})
    );
    expect(result).toHaveProperty("count", 2);
    expect(result).toHaveProperty("sessions");
    expect(Array.isArray(result.sessions)).toBe(true);
  });

  it("session entry has expected fields", async () => {
    mockFetch(mockMeetingsResponse);
    const result = JSON.parse(
      await handleParliament("get_session_schedule", {})
    );
    const s = result.sessions[0];
    expect(s.id).toBe(30011);
    expect(s.name).toBe("Frühjahrssession 2026");
    expect(s.abbreviation).toBe("FS 26");
    expect(s.startDate).toBe("2026-03-02");
    expect(s.endDate).toBe("2026-03-20");
  });

  it("builds correct URL with type=session", async () => {
    const fetchMock = capturedFetch(mockMeetingsResponse);
    await handleParliament("get_session_schedule", { limit: 3 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("type=session");
    expect(calledUrl).toContain("body_key=CHE");
    expect(calledUrl).toContain("sort_by=-begin_date");
    expect(calledUrl).toContain("limit=3");
  });

  it("caps limit at 20", async () => {
    const fetchMock = capturedFetch(mockMeetingsResponse);
    await handleParliament("get_session_schedule", { limit: 100 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("limit=20");
  });

  it("returns empty when no sessions found", async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(
      await handleParliament("get_session_schedule", {})
    );
    expect(result.sessions).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("throws on HTTP error", async () => {
    mockFetch({}, 500);
    await expect(
      handleParliament("get_session_schedule", {})
    ).rejects.toThrow("HTTP 500");
  });
});

// ── search_parliament_speeches ────────────────────────────────────────────────

describe("search_parliament_speeches", () => {
  it("returns speeches array with count", async () => {
    mockFetch(mockSpeechesResponse);
    const result = JSON.parse(
      await handleParliament("search_parliament_speeches", {
        affair_id: 296480,
      })
    );
    expect(result).toHaveProperty("count", 2);
    expect(result).toHaveProperty("total", 3);
    expect(result).toHaveProperty("affairId", 296480);
    expect(result).toHaveProperty("speeches");
    expect(Array.isArray(result.speeches)).toBe(true);
  });

  it("speech entry has expected fields", async () => {
    mockFetch(mockSpeechesResponse);
    const result = JSON.parse(
      await handleParliament("search_parliament_speeches", {
        affair_id: 296480,
      })
    );
    const s = result.speeches[0];
    expect(s.id).toBe(90001);
    expect(s.speaker).toBe("Pierre-Yves Maillard");
    expect(s.personId).toBe(18600);
    expect(s.party).toBe("SP");
    expect(s.type).toBe("Debattenbeitrag");
    expect(s.text).toContain("volle Unterstützung");
    expect(s.durationSeconds).toBe(180);
  });

  it("truncates long speech text to 500 chars", async () => {
    const longSpeech = {
      ...mockSpeechesResponse,
      data: [
        { ...mockSpeechesResponse.data[0], text_de: "A".repeat(1000) },
      ],
    };
    mockFetch(longSpeech);
    const result = JSON.parse(
      await handleParliament("search_parliament_speeches", {
        affair_id: 296480,
      })
    );
    expect(result.speeches[0].text.length).toBeLessThanOrEqual(501); // 500 + …
    expect(result.speeches[0].text).toContain("…");
  });

  it("handles null text_de", async () => {
    const noText = {
      ...mockSpeechesResponse,
      data: [{ ...mockSpeechesResponse.data[0], text_de: null }],
    };
    mockFetch(noText);
    const result = JSON.parse(
      await handleParliament("search_parliament_speeches", {
        affair_id: 296480,
      })
    );
    expect(result.speeches[0].text).toBeNull();
  });

  it("builds correct URL", async () => {
    const fetchMock = capturedFetch(mockSpeechesResponse);
    await handleParliament("search_parliament_speeches", {
      affair_id: 12345,
      limit: 3,
    });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/affairs/12345/speeches/");
    expect(calledUrl).toContain("limit=3");
  });

  it("returns empty when no speeches", async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(
      await handleParliament("search_parliament_speeches", {
        affair_id: 999,
      })
    );
    expect(result.speeches).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("throws on HTTP error", async () => {
    mockFetch({}, 404);
    await expect(
      handleParliament("search_parliament_speeches", { affair_id: 999 })
    ).rejects.toThrow("HTTP 404");
  });
});

// ── get_politician_interests ──────────────────────────────────────────────────

describe("get_politician_interests", () => {
  it("returns interests array with count", async () => {
    mockFetch(mockInterestsResponse);
    const result = JSON.parse(
      await handleParliament("get_politician_interests", { person_id: 18579 })
    );
    expect(result).toHaveProperty("count", 2);
    expect(result).toHaveProperty("personId", 18579);
    expect(result).toHaveProperty("interests");
    expect(Array.isArray(result.interests)).toBe(true);
  });

  it("interest entry has expected fields", async () => {
    mockFetch(mockInterestsResponse);
    const result = JSON.parse(
      await handleParliament("get_politician_interests", { person_id: 18579 })
    );
    const i = result.interests[0];
    expect(i.id).toBe(17747);
    expect(i.name).toBe("Kalis Sàrl");
    expect(i.type).toBe("Gesellschaft mit beschränkter Haftung");
    expect(i.role).toBe("Gesellschafter(in)");
    expect(i.payment).toBe("Bezahlt");
    expect(i.category).toBe("Keine Angaben");
  });

  it("builds correct URL", async () => {
    const fetchMock = capturedFetch(mockInterestsResponse);
    await handleParliament("get_politician_interests", { person_id: 18579 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/persons/18579/interests/");
  });

  it("returns empty on no interests", async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(
      await handleParliament("get_politician_interests", { person_id: 999 })
    );
    expect(result.interests).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("throws on HTTP error", async () => {
    mockFetch({}, 404);
    await expect(
      handleParliament("get_politician_interests", { person_id: 999 })
    ).rejects.toThrow("HTTP 404");
  });
});

// ── search_cantonal_affairs ───────────────────────────────────────────────────

describe("search_cantonal_affairs", () => {
  it("returns cantonal affairs with canton field", async () => {
    mockFetch(mockCantonalAffairsResponse);
    const result = JSON.parse(
      await handleParliament("search_cantonal_affairs", { canton: "ZH" })
    );
    expect(result).toHaveProperty("count", 1);
    expect(result).toHaveProperty("canton", "ZH");
    expect(result).toHaveProperty("affairs");
    expect(result.affairs[0].canton).toBe("ZH");
  });

  it("uses body_key from canton param", async () => {
    const fetchMock = capturedFetch(mockCantonalAffairsResponse);
    await handleParliament("search_cantonal_affairs", {
      canton: "be",
      query: "Bildung",
    });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("body_key=BE");
    expect(calledUrl).toContain("search=Bildung");
  });

  it("works without query (lists recent affairs)", async () => {
    const fetchMock = capturedFetch(mockCantonalAffairsResponse);
    await handleParliament("search_cantonal_affairs", { canton: "GE" });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("body_key=GE");
    expect(calledUrl).not.toContain("search=");
  });

  it("returns null query when no query provided", async () => {
    mockFetch(mockCantonalAffairsResponse);
    const result = JSON.parse(
      await handleParliament("search_cantonal_affairs", { canton: "ZH" })
    );
    expect(result.query).toBeNull();
  });

  it("returns empty on no results", async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(
      await handleParliament("search_cantonal_affairs", {
        canton: "AI",
        query: "XYZ",
      })
    );
    expect(result.affairs).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("throws on HTTP error", async () => {
    mockFetch({}, 500);
    await expect(
      handleParliament("search_cantonal_affairs", { canton: "ZH" })
    ).rejects.toThrow("HTTP 500");
  });
});

// ── get_parliamentary_documents ───────────────────────────────────────────────

describe("get_parliamentary_documents", () => {
  it("returns documents array with count", async () => {
    mockFetch(mockDocsResponse);
    const result = JSON.parse(
      await handleParliament("get_parliamentary_documents", {
        affair_id: 296480,
      })
    );
    expect(result).toHaveProperty("count", 2);
    expect(result).toHaveProperty("affairId", 296480);
    expect(result).toHaveProperty("documents");
    expect(Array.isArray(result.documents)).toBe(true);
  });

  it("document entry has expected fields", async () => {
    mockFetch(mockDocsResponse);
    const result = JSON.parse(
      await handleParliament("get_parliamentary_documents", {
        affair_id: 296480,
      })
    );
    const d = result.documents[0];
    expect(d.id).toBe(80001);
    expect(d.title).toContain("Kommission");
    expect(d.type).toBe("Kommissionsbericht");
    expect(d.url).toContain("parlament.ch");
    expect(d.filename).toBe("report.pdf");
    expect(d.date).toBe("2026-02-28");
  });

  it("builds correct URL", async () => {
    const fetchMock = capturedFetch(mockDocsResponse);
    await handleParliament("get_parliamentary_documents", {
      affair_id: 12345,
      limit: 3,
    });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/affairs/12345/docs/");
    expect(calledUrl).toContain("limit=3");
  });

  it("handles null date", async () => {
    const nullDate = {
      ...mockDocsResponse,
      data: [{ ...mockDocsResponse.data[0], date: null }],
    };
    mockFetch(nullDate);
    const result = JSON.parse(
      await handleParliament("get_parliamentary_documents", {
        affair_id: 296480,
      })
    );
    expect(result.documents[0].date).toBeNull();
  });

  it("returns empty when no docs", async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(
      await handleParliament("get_parliamentary_documents", {
        affair_id: 999,
      })
    );
    expect(result.documents).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("throws on HTTP error", async () => {
    mockFetch({}, 404);
    await expect(
      handleParliament("get_parliamentary_documents", { affair_id: 999 })
    ).rejects.toThrow("HTTP 404");
  });
});

// ── get_committee_meetings ────────────────────────────────────────────────────

describe("get_committee_meetings", () => {
  it("returns meetings array with count", async () => {
    mockFetch(mockCommitteeMeetingsResponse);
    const result = JSON.parse(
      await handleParliament("get_committee_meetings", {})
    );
    expect(result).toHaveProperty("count", 2);
    expect(result).toHaveProperty("total", 3293);
    expect(result).toHaveProperty("meetings");
    expect(Array.isArray(result.meetings)).toBe(true);
  });

  it("meeting entry has expected fields", async () => {
    mockFetch(mockCommitteeMeetingsResponse);
    const result = JSON.parse(
      await handleParliament("get_committee_meetings", {})
    );
    const m = result.meetings[0];
    expect(m.id).toBe(30069);
    expect(m.name).toBe("Sechste Sitzung");
    expect(m.date).toBe("2026-03-10");
    expect(m.state).toBe("draft");
    expect(m.groupId).toBe(1664);
  });

  it("builds URL with type=meeting", async () => {
    const fetchMock = capturedFetch(mockCommitteeMeetingsResponse);
    await handleParliament("get_committee_meetings", { limit: 3 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("type=meeting");
    expect(calledUrl).toContain("body_key=CHE");
    expect(calledUrl).toContain("limit=3");
  });

  it("adds group_id when provided", async () => {
    const fetchMock = capturedFetch(mockCommitteeMeetingsResponse);
    await handleParliament("get_committee_meetings", { group_id: 1664 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("group_id=1664");
  });

  it("omits group_id when not provided", async () => {
    const fetchMock = capturedFetch(mockCommitteeMeetingsResponse);
    await handleParliament("get_committee_meetings", {});
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("group_id");
  });

  it("returns empty when no meetings", async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(
      await handleParliament("get_committee_meetings", {})
    );
    expect(result.meetings).toEqual([]);
    expect(result.count).toBe(0);
  });

  it("throws on HTTP error", async () => {
    mockFetch({}, 500);
    await expect(
      handleParliament("get_committee_meetings", {})
    ).rejects.toThrow("HTTP 500");
  });
});

// ── unknown tool ──────────────────────────────────────────────────────────────

describe("unknown parliament tool", () => {
  it("throws for unrecognized tool name", async () => {
    await expect(
      handleParliament("does_not_exist", {})
    ).rejects.toThrow("Unknown parliament tool: does_not_exist");
  });
});

// ── truncate coverage ─────────────────────────────────────────────────────────

describe("parliament truncate — large response", () => {
  it("truncates oversized response to maxBytes + ellipsis", async () => {
    // Generate many records to exceed 48KB
    const bigData = Array.from({ length: 200 }, (_, i) => ({
      id: i,
      fullname: "X".repeat(200),
      firstname: "Y".repeat(100),
      lastname: "Z".repeat(100),
      party_de: "Test Party",
      party_harmonized_de: "Test Party Full",
      electoral_district_de: "Zürich",
      parliament_sector: "NR",
      parliamentary_group_name_de: "Test Group",
      occupation_de: "Politician",
      active: true,
      gender: "m",
      image_url_external: null,
      website_parliament_url_de: null,
    }));
    mockFetch({ meta: { total_records: 200 }, data: bigData });
    const raw = await handleParliament("get_parliament_members", {
      limit: 50,
    });
    expect(raw.endsWith("…")).toBe(true);
    expect(raw.length).toBeLessThanOrEqual(48001);
  });
});

// ── URL trailing slash ────────────────────────────────────────────────────────

describe("URL trailing slash enforcement", () => {
  it("all endpoints include trailing slash in path", async () => {
    const fetchMock = capturedFetch(mockEmptyResponse);

    // Test various endpoints
    await handleParliament("get_committee_meetings", {});
    const url1 = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url1.pathname).toMatch(/\/$/);

    fetchMock.mockClear();
    await handleParliament("get_parliament_members", {});
    const url2 = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url2.pathname).toMatch(/\/$/);

    fetchMock.mockClear();
    await handleParliament("get_parliament_votes", { affair_id: 1 });
    const url3 = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url3.pathname).toMatch(/\/$/);

    fetchMock.mockClear();
    await handleParliament("get_politician_interests", { person_id: 1 });
    const url4 = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url4.pathname).toMatch(/\/$/);
  });
});
