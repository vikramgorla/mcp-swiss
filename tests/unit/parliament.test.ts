import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleParliament } from '../../src/modules/parliament.js';
import {
  mockBusinessResponse,
  mockVoteResponse,
  mockMemberCouncilResponse,
  mockSessionResponse,
  mockEmptyResponse,
} from '../fixtures/parliament.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Mock fetch helper ─────────────────────────────────────────────────────────

function mockFetch(payload: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(payload),
  }));
}

function capturedFetch(payload: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(payload),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// ── search_parliament_business ────────────────────────────────────────────────

describe('search_parliament_business', () => {
  it('returns business array with count', async () => {
    mockFetch(mockBusinessResponse);
    const result = JSON.parse(
      await handleParliament('search_parliament_business', { query: 'Neutralität' })
    );
    expect(result).toHaveProperty('count');
    expect(result).toHaveProperty('business');
    expect(result).toHaveProperty('query', 'Neutralität');
    expect(Array.isArray(result.business)).toBe(true);
    expect(result.business).toHaveLength(2);
  });

  it('strips __metadata and __deferred from results', async () => {
    mockFetch(mockBusinessResponse);
    const result = JSON.parse(
      await handleParliament('search_parliament_business', { query: 'test' })
    );
    for (const b of result.business) {
      expect(b).not.toHaveProperty('__metadata');
      expect(b).not.toHaveProperty('BusinessRoles');
      expect(b).not.toHaveProperty('Votes');
    }
  });

  it('business entry has expected fields', async () => {
    mockFetch(mockBusinessResponse);
    const result = JSON.parse(
      await handleParliament('search_parliament_business', { query: 'Neutralität' })
    );
    const b = result.business[0];
    expect(b.id).toBe(20240092);
    expect(b.shortNumber).toBe('24.092');
    expect(b.title).toContain('Neutralität');
    expect(b.type).toBe('Volksinitiative');
    expect(b.tags).toBeInstanceOf(Array);
    expect(b.url).toContain('parlament.ch');
    expect(b.url).toContain('20240092');
  });

  it('parses OData date timestamps correctly', async () => {
    mockFetch(mockBusinessResponse);
    const result = JSON.parse(
      await handleParliament('search_parliament_business', { query: 'test' })
    );
    const b = result.business[0];
    expect(b.submissionDate).toBeTruthy();
    expect(b.submissionDate).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
  });

  it('splits TagNames by pipe into array', async () => {
    mockFetch(mockBusinessResponse);
    const result = JSON.parse(
      await handleParliament('search_parliament_business', { query: 'Neutralität' })
    );
    const b = result.business[0];
    expect(b.tags).toContain('Internationale Politik');
    expect(b.tags).toContain('Sicherheitspolitik');
  });

  it('handles null TagNames gracefully', async () => {
    const noTags = {
      d: [{
        ...mockBusinessResponse.d[0],
        TagNames: null,
      }],
    };
    mockFetch(noTags);
    const result = JSON.parse(
      await handleParliament('search_parliament_business', { query: 'test' })
    );
    expect(result.business[0].tags).toEqual([]);
  });

  it('includes substringof filter in URL', async () => {
    const fetchMock = capturedFetch(mockBusinessResponse);
    await handleParliament('search_parliament_business', { query: 'Klimaschutz' });
    const calledUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl).toContain('substringof');
    expect(calledUrl).toContain('Klimaschutz');
  });

  it('includes Language filter in URL', async () => {
    const fetchMock = capturedFetch(mockBusinessResponse);
    await handleParliament('search_parliament_business', { query: 'test' });
    const calledUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl).toContain("Language eq 'DE'");
  });

  it('respects limit parameter', async () => {
    const fetchMock = capturedFetch(mockBusinessResponse);
    await handleParliament('search_parliament_business', { query: 'test', limit: 25 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('$top=25');
  });

  it('caps limit at 50', async () => {
    const fetchMock = capturedFetch(mockBusinessResponse);
    await handleParliament('search_parliament_business', { query: 'test', limit: 999 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('$top=50');
  });

  it('returns empty business array when no results', async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(
      await handleParliament('search_parliament_business', { query: 'XYZ_NOTHING' })
    );
    expect(result.business).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('filters by year post-fetch', async () => {
    mockFetch(mockBusinessResponse);
    // SubmissionDate for first item is /Date(1706745600000)/ = 2024-02-01
    const result = JSON.parse(
      await handleParliament('search_parliament_business', { query: 'Klimaschutz', year: 2024 })
    );
    // First item (2024) should pass, second item (2025) should be filtered out
    for (const b of result.business) {
      if (b.submissionDate) {
        const year = new Date(b.submissionDate).getFullYear();
        expect(year).toBe(2024);
      }
    }
  });

  it('throws on HTTP error', async () => {
    mockFetch({}, 500);
    await expect(
      handleParliament('search_parliament_business', { query: 'test' })
    ).rejects.toThrow('HTTP 500');
  });
});

// ── get_latest_votes ──────────────────────────────────────────────────────────

describe('get_latest_votes', () => {
  it('returns votes array with count', async () => {
    mockFetch(mockVoteResponse);
    const result = JSON.parse(
      await handleParliament('get_latest_votes', {})
    );
    expect(result).toHaveProperty('count', 2);
    expect(result).toHaveProperty('votes');
    expect(Array.isArray(result.votes)).toBe(true);
  });

  it('vote entry has expected fields', async () => {
    mockFetch(mockVoteResponse);
    const result = JSON.parse(
      await handleParliament('get_latest_votes', {})
    );
    const v = result.votes[0];
    expect(v.voteId).toBe(35669);
    expect(v.businessNumber).toBe('24.092');
    expect(v.session).toBe('Frühjahrssession 2026');
    expect(v.subject).toBeTruthy();
    expect(v.meaningYes).toBeTruthy();
    expect(v.meaningNo).toBeTruthy();
    expect(v.url).toContain('parlament.ch');
  });

  it('strips __metadata and __deferred', async () => {
    mockFetch(mockVoteResponse);
    const result = JSON.parse(
      await handleParliament('get_latest_votes', {})
    );
    for (const v of result.votes) {
      expect(v).not.toHaveProperty('__metadata');
      expect(v).not.toHaveProperty('Votings');
      expect(v).not.toHaveProperty('Businesses');
    }
  });

  it('parses VoteEnd timestamp to ISO', async () => {
    mockFetch(mockVoteResponse);
    const result = JSON.parse(
      await handleParliament('get_latest_votes', {})
    );
    expect(result.votes[0].voteEnd).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('respects limit parameter', async () => {
    const fetchMock = capturedFetch(mockVoteResponse);
    await handleParliament('get_latest_votes', { limit: 20 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('$top=20');
  });

  it('caps limit at 50', async () => {
    const fetchMock = capturedFetch(mockVoteResponse);
    await handleParliament('get_latest_votes', { limit: 100 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('$top=50');
  });

  it('uses Vote endpoint (not Voting)', async () => {
    const fetchMock = capturedFetch(mockVoteResponse);
    await handleParliament('get_latest_votes', {});
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/Vote?');
    expect(calledUrl).not.toContain('/Voting?');
  });

  it('orders by VoteEnd desc', async () => {
    const fetchMock = capturedFetch(mockVoteResponse);
    await handleParliament('get_latest_votes', {});
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('VoteEnd');
    expect(calledUrl).toContain('desc');
  });

  it('returns empty on no results', async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(await handleParliament('get_latest_votes', {}));
    expect(result.votes).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('throws on HTTP error', async () => {
    mockFetch({}, 503);
    await expect(handleParliament('get_latest_votes', {})).rejects.toThrow('HTTP 503');
  });
});

// ── search_councillors ────────────────────────────────────────────────────────

describe('search_councillors', () => {
  it('returns councillors array with count', async () => {
    mockFetch(mockMemberCouncilResponse);
    const result = JSON.parse(
      await handleParliament('search_councillors', { name: 'Maillard' })
    );
    expect(result).toHaveProperty('count', 2);
    expect(result).toHaveProperty('councillors');
    expect(Array.isArray(result.councillors)).toBe(true);
  });

  it('councillor entry has expected fields', async () => {
    mockFetch(mockMemberCouncilResponse);
    const result = JSON.parse(
      await handleParliament('search_councillors', { name: 'Maillard' })
    );
    const c = result.councillors[0];
    expect(c.id).toBe(491);
    expect(c.firstName).toBe('Pierre-Yves');
    expect(c.lastName).toBe('Maillard');
    expect(c.canton).toBe('VD');
    expect(c.council).toBe('SR');
    expect(c.party).toBe('SP');
    expect(c.url).toContain('parlament.ch');
    expect(c.url).toContain('491');
  });

  it('strips __metadata and __deferred', async () => {
    mockFetch(mockMemberCouncilResponse);
    const result = JSON.parse(
      await handleParliament('search_councillors', { name: 'test' })
    );
    for (const c of result.councillors) {
      expect(c).not.toHaveProperty('__metadata');
      expect(c).not.toHaveProperty('MembersParty');
      expect(c).not.toHaveProperty('Votings');
    }
  });

  it('includes name substringof filter', async () => {
    const fetchMock = capturedFetch(mockMemberCouncilResponse);
    await handleParliament('search_councillors', { name: 'Müller' });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('substringof');
    // Müller is URL-encoded as M%C3%BCller
    expect(decodeURIComponent(calledUrl)).toContain('Müller');
  });

  it('includes Active filter', async () => {
    const fetchMock = capturedFetch(mockMemberCouncilResponse);
    await handleParliament('search_councillors', { name: 'test' });
    const calledUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl).toContain('Active eq true');
  });

  it('adds canton filter when provided', async () => {
    const fetchMock = capturedFetch(mockMemberCouncilResponse);
    await handleParliament('search_councillors', { name: 'test', canton: 'ZH' });
    const calledUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl).toContain("CantonAbbreviation eq 'ZH'");
  });

  it('adds council filter NR → Council eq 1', async () => {
    const fetchMock = capturedFetch(mockMemberCouncilResponse);
    await handleParliament('search_councillors', { name: 'test', council: 'NR' });
    const calledUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl).toContain('Council eq 1');
  });

  it('adds council filter SR → Council eq 2', async () => {
    const fetchMock = capturedFetch(mockMemberCouncilResponse);
    await handleParliament('search_councillors', { name: 'test', council: 'SR' });
    const calledUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl).toContain('Council eq 2');
  });

  it('returns empty when no results', async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(
      await handleParliament('search_councillors', { name: 'XYZ_NOBODY' })
    );
    expect(result.councillors).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('throws on HTTP error', async () => {
    mockFetch({}, 500);
    await expect(
      handleParliament('search_councillors', { name: 'test' })
    ).rejects.toThrow('HTTP 500');
  });
});

// ── get_sessions ──────────────────────────────────────────────────────────────

describe('get_sessions', () => {
  it('returns sessions array with count', async () => {
    mockFetch(mockSessionResponse);
    const result = JSON.parse(await handleParliament('get_sessions', {}));
    expect(result).toHaveProperty('count', 2);
    expect(result).toHaveProperty('sessions');
    expect(Array.isArray(result.sessions)).toBe(true);
  });

  it('session entry has expected fields', async () => {
    mockFetch(mockSessionResponse);
    const result = JSON.parse(await handleParliament('get_sessions', {}));
    const s = result.sessions[0];
    expect(s.id).toBe(5212);
    expect(s.name).toBe('Frühjahrssession 2026');
    expect(s.abbreviation).toBe('FS 26');
    expect(s.type).toContain('Ordentliche');
    expect(s.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(s.endDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(s.legislativePeriod).toBe(52);
  });

  it('strips __metadata and __deferred', async () => {
    mockFetch(mockSessionResponse);
    const result = JSON.parse(await handleParliament('get_sessions', {}));
    for (const s of result.sessions) {
      expect(s).not.toHaveProperty('__metadata');
      expect(s).not.toHaveProperty('Meetings');
      expect(s).not.toHaveProperty('Votes');
    }
  });

  it('filters by year when provided', async () => {
    mockFetch(mockSessionResponse);
    // StartDate of first session = 2026, second = 2025
    const result = JSON.parse(await handleParliament('get_sessions', { year: 2026 }));
    for (const s of result.sessions) {
      const year = new Date(s.startDate).getFullYear();
      expect(year).toBe(2026);
    }
  });

  it('respects limit parameter', async () => {
    const fetchMock = capturedFetch(mockSessionResponse);
    await handleParliament('get_sessions', { limit: 5 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    // top = limit * 4 (over-fetch for language deduplication)
    expect(calledUrl).toContain('$top=20');
  });

  it('includes Language filter in URL', async () => {
    const fetchMock = capturedFetch(mockSessionResponse);
    await handleParliament('get_sessions', {});
    const calledUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl).toContain("Language eq 'DE'");
  });

  it('orders by StartDate desc', async () => {
    const fetchMock = capturedFetch(mockSessionResponse);
    await handleParliament('get_sessions', {});
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('StartDate');
    expect(calledUrl).toContain('desc');
  });

  it('returns empty when no sessions found', async () => {
    mockFetch(mockEmptyResponse);
    const result = JSON.parse(await handleParliament('get_sessions', {}));
    expect(result.sessions).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('throws on HTTP error', async () => {
    mockFetch({}, 500);
    await expect(handleParliament('get_sessions', {})).rejects.toThrow('HTTP 500');
  });
});

// ── get_sessions: null StartDate branch ──────────────────────────────────────

describe('get_sessions — null StartDate branch', () => {
  it('excludes sessions with null StartDate when year filter is active', async () => {
    const sessionWithNullDate = {
      d: [
        { ...mockSessionResponse.d[0], StartDate: null },
        { ...mockSessionResponse.d[1] },
      ],
    };
    mockFetch(sessionWithNullDate);
    // With year filter: null StartDate → returns false → excluded
    const result = JSON.parse(
      await handleParliament('get_sessions', { year: 2025 })
    );
    // Only the non-null one (if it matches year 2025) survives
    for (const s of result.sessions) {
      expect(s.startDate).not.toBeNull();
    }
  });
});

// ── search_parliament_business: year filter with null SubmissionDate ──────────

describe('search_parliament_business — year filter branches', () => {
  it('excludes items with null SubmissionDate when year filter is active', async () => {
    const mixedDates = {
      d: [
        { ...mockBusinessResponse.d[0], SubmissionDate: null }, // null → excluded
        { ...mockBusinessResponse.d[1] }, // valid date
      ],
    };
    mockFetch(mixedDates);
    const result = JSON.parse(
      await handleParliament('search_parliament_business', { query: 'test', year: 2026 })
    );
    // Null SubmissionDate items excluded; valid items passing year filter kept
    for (const b of result.business) {
      expect(b.submissionDate).not.toBeNull();
    }
  });
});

// ── search_councillors: no name (optional name branch) ───────────────────────

describe('search_councillors — no name filter', () => {
  it('works without a name filter (no substringof filter added)', async () => {
    const fetchMock = capturedFetch(mockMemberCouncilResponse);
    await handleParliament('search_councillors', {}); // no name
    const calledUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    // No substringof filter — just Language and Active
    expect(calledUrl).not.toContain('substringof');
    expect(calledUrl).toContain('Active eq true');
  });
});

// ── unknown tool ──────────────────────────────────────────────────────────────

describe('unknown parliament tool', () => {
  it('throws for unrecognized tool name', async () => {
    await expect(handleParliament('does_not_exist', {})).rejects.toThrow(
      'Unknown parliament tool: does_not_exist'
    );
  });
});

// ── search_parliament_business: type filter coverage ──────────────────────────

describe('search_parliament_business type filter', () => {
  it('adds server-side BusinessType filter when type given with no query', async () => {
    const fetchMock = capturedFetch(mockBusinessResponse);
    // type='initiative' with NO query → server-side OData filter
    await handleParliament('search_parliament_business', { query: '', type: 'initiative' });
    const calledUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl).toContain('BusinessType eq');
  });

  it('uses fetchLimit * 3 and post-filters when type AND query are both set', async () => {
    // Create a response where one item matches BusinessType 3 (initiative) and one does not
    const mixedResponse = {
      d: [
        { ...mockBusinessResponse.d[0], BusinessType: 3 },   // initiative → keep
        { ...mockBusinessResponse.d[1], BusinessType: 8 },   // interpellation → filtered out
      ],
    };
    const fetchMock = capturedFetch(mixedResponse);
    const result = JSON.parse(
      await handleParliament('search_parliament_business', { query: 'Neutralität', type: 'initiative' })
    );
    // Post-filter should keep only BusinessType 3 (initiative: [1, 3, 13])
    expect(result.business).toHaveLength(1);
    expect(result.business[0].type).toBe('Volksinitiative');
    // Should over-fetch: $top=30 (limit 10 * 3)
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('$top=30');
  });

  it('unknown type key → no typeIds → no type filter added', async () => {
    const fetchMock = capturedFetch(mockBusinessResponse);
    await handleParliament('search_parliament_business', { query: 'test', type: 'unknowntype' });
    const calledUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl).not.toContain('BusinessType eq');
  });
});

// ── search_councillors: party filter coverage ─────────────────────────────────

describe('search_councillors party filter', () => {
  it('adds party substringof filter when party is provided', async () => {
    const fetchMock = capturedFetch(mockMemberCouncilResponse);
    await handleParliament('search_councillors', { name: 'test', party: 'SP' });
    const calledUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl).toContain('PartyAbbreviation');
    expect(calledUrl).toContain('SP');
  });

  it('escapes single quotes in party name', async () => {
    const fetchMock = capturedFetch(mockMemberCouncilResponse);
    await handleParliament('search_councillors', { name: 'test', party: "L'Autre" });
    // Decoded URL — OData escapes ' → '' so L'Autre becomes L''''Autre in substringof
    const decodedUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(decodedUrl).toContain("L''''Autre");
  });

  it('council filter with unknown code adds nothing', async () => {
    const fetchMock = capturedFetch(mockMemberCouncilResponse);
    await handleParliament('search_councillors', { name: 'test', council: 'EU' });
    const calledUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl).not.toContain('Council eq');
  });
});

// ── truncate coverage: large response path ────────────────────────────────────

describe('parliament truncate — large response', () => {
  it('truncates oversized response to maxBytes + ellipsis', async () => {
    // Generate 500 vote records with large fields — serialised JSON will exceed 48KB
    const bigVotes = Array.from({ length: 500 }, (_, i) => ({
      ID: i,
      RegistrationNumber: `REG${i}`,
      BusinessShortNumber: `${i}.000`,
      BusinessTitle: 'X'.repeat(200),
      BillTitle: 'Y'.repeat(200),
      SessionName: 'Frühjahrssession 2026',
      Subject: 'Z'.repeat(200),
      MeaningYes: 'Ja',
      MeaningNo: 'Nein',
      VoteEnd: '/Date(1706745600000)/',
      Language: 'DE',
      __metadata: { type: 'SP.Data.Vote' },
    }));
    mockFetch({ d: bigVotes });
    const raw = await handleParliament('get_latest_votes', { limit: 50 });
    // Should be truncated and end with ellipsis
    expect(raw.endsWith('…')).toBe(true);
    expect(raw.length).toBeLessThanOrEqual(48001);
  });
});

// ── OData date parsing ────────────────────────────────────────────────────────

describe('OData date parsing edge cases', () => {
  it('handles null SubmissionDate gracefully', async () => {
    const withNullDate = {
      d: [{
        ...mockBusinessResponse.d[0],
        SubmissionDate: null,
      }],
    };
    mockFetch(withNullDate);
    const result = JSON.parse(
      await handleParliament('search_parliament_business', { query: 'test' })
    );
    expect(result.business[0].submissionDate).toBeNull();
  });

  it('handles null VoteEnd gracefully', async () => {
    const withNullDate = {
      d: [{
        ...mockVoteResponse.d[0],
        VoteEnd: null,
      }],
    };
    mockFetch(withNullDate);
    const result = JSON.parse(await handleParliament('get_latest_votes', {}));
    expect(result.votes[0].voteEnd).toBeNull();
  });

  it('returns raw string when date does not match OData format (line 111)', async () => {
    // Use a non-OData date string — parseODataDate returns the raw string
    const nonODataDate = {
      d: [{
        ...mockBusinessResponse.d[0],
        SubmissionDate: "2026-03-01T00:00:00Z", // ISO format, not /Date(...)/
      }],
    };
    mockFetch(nonODataDate);
    const result = JSON.parse(
      await handleParliament('search_parliament_business', { query: 'test' })
    );
    // Returns raw string when pattern doesn't match
    expect(result.business[0].submissionDate).toBe("2026-03-01T00:00:00Z");
  });

  it('returns false for year filter when date does not match OData format (line 296)', async () => {
    const malformedDate = {
      d: [{
        ...mockBusinessResponse.d[0],
        SubmissionDate: "not-a-date", // won't parse → d=null → returns false in year filter
      }],
    };
    mockFetch(malformedDate);
    // With year filter: malformed date → excluded
    const result = JSON.parse(
      await handleParliament('search_parliament_business', { query: 'test', year: 2026 })
    );
    // Item with malformed date excluded
    expect(result.business).toHaveLength(0);
  });

  it('returns false for session year filter when StartDate does not match OData format (line 420)', async () => {
    const malformedSession = {
      d: [{
        ...mockSessionResponse.d[0],
        StartDate: "invalid-date",
      }],
    };
    mockFetch(malformedSession);
    const result = JSON.parse(
      await handleParliament('get_sessions', { year: 2026 })
    );
    // Session with malformed StartDate excluded from year filter
    expect(result.sessions).toHaveLength(0);
  });
});

// ── odataFetch: missing or non-array d field ─────────────────────────────────

describe('odataFetch — invalid d field', () => {
  it('returns empty array when response has no d field (line 126)', async () => {
    mockFetch({ results: [] }); // no 'd' field
    const result = JSON.parse(
      await handleParliament('search_parliament_business', { query: 'test' })
    );
    expect(result.business).toHaveLength(0);
  });

  it('returns empty array when d field is not an array', async () => {
    mockFetch({ d: "not-an-array" }); // d is a string, not array
    const result = JSON.parse(
      await handleParliament('search_parliament_business', { query: 'test' })
    );
    expect(result.business).toHaveLength(0);
  });
});
