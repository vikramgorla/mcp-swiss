import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleEnergy } from '../../src/modules/energy.js';
import {
  mockMunicipalitySearch,
  mockMunicipalitySearchEmpty,
  mockObservationsZurich,
  mockObservationsZurichTotal,
  mockObservationsMultiple,
  mockObservationsEmpty,
  mockObservationsMultipleOperators,
} from '../fixtures/energy.js';

function mockFetch(payload: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve({ data: payload }),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── search_municipality_energy ──────────────────────────────────────────────

describe('search_municipality_energy', () => {
  it('returns municipality list with ids and names', async () => {
    mockFetch(mockMunicipalitySearch);
    const result = JSON.parse(await handleEnergy('search_municipality_energy', { name: 'Zürich' }));
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results).toHaveLength(3);
    expect(result.results[0].id).toBe('261');
    expect(result.results[0].name).toBe('Zürich');
    expect(result.results[0].usage).toContain('261');
    expect(result.count).toBe(3);
  });

  it('includes source link', async () => {
    mockFetch(mockMunicipalitySearch);
    const result = JSON.parse(await handleEnergy('search_municipality_energy', { name: 'Zürich' }));
    expect(result.source).toContain('elcom.admin.ch');
  });

  it('returns helpful message when no results', async () => {
    mockFetch(mockMunicipalitySearchEmpty);
    const result = JSON.parse(await handleEnergy('search_municipality_energy', { name: 'Nonexistent' }));
    expect(result.results).toHaveLength(0);
    expect(result.message).toContain('No municipalities found');
    expect(result.message).toContain('Nonexistent');
  });

  it('throws when name is missing', async () => {
    await expect(handleEnergy('search_municipality_energy', {})).rejects.toThrow('name is required');
  });

  it('throws when name is empty string', async () => {
    await expect(handleEnergy('search_municipality_energy', { name: '' })).rejects.toThrow('name is required');
  });

  it('passes query param to GraphQL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: mockMunicipalitySearch }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleEnergy('search_municipality_energy', { name: 'Basel' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.variables.query).toBe('Basel');
  });
});

// ── get_electricity_tariff ──────────────────────────────────────────────────

describe('get_electricity_tariff', () => {
  it('returns tariff data with all components', async () => {
    mockFetch(mockObservationsZurich);
    const result = JSON.parse(await handleEnergy('get_electricity_tariff', { municipality: '261' }));
    expect(result.municipality).toBe('Zürich');
    expect(result.municipalityId).toBe('261');
    expect(result.tariff.total_rp_per_kwh).toBe(24.758);
    expect(result.tariff.components.energy_rp_per_kwh).toBe(11.5);
    expect(result.tariff.components.grid_usage_rp_per_kwh).toBe(8.3);
    expect(result.canton).toBe('Zürich');
    expect(result.operator).toBe('Elektrizitätswerk der Stadt Zürich');
  });

  it('includes category description', async () => {
    mockFetch(mockObservationsZurich);
    const result = JSON.parse(await handleEnergy('get_electricity_tariff', { municipality: '261' }));
    expect(result.categoryDescription).toContain('kWh');
    expect(result.category).toBe('H4');
  });

  it('includes source link per municipality', async () => {
    mockFetch(mockObservationsZurich);
    const result = JSON.parse(await handleEnergy('get_electricity_tariff', { municipality: '261' }));
    expect(result.source).toContain('261');
    expect(result.source).toContain('elcom.admin.ch');
  });

  it('includes price unit note', async () => {
    mockFetch(mockObservationsZurich);
    const result = JSON.parse(await handleEnergy('get_electricity_tariff', { municipality: '261' }));
    expect(result.note).toContain('Rappen');
  });

  it('uses default category H4 and year 2026', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: mockObservationsZurich }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleEnergy('get_electricity_tariff', { municipality: '261' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.variables.filters.category).toEqual(['H4']);
    expect(body.variables.filters.period).toEqual(['2026']);
  });

  it('accepts custom category and year', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: mockObservationsZurich }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleEnergy('get_electricity_tariff', { municipality: '261', category: 'H1', year: '2025' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.variables.filters.category).toEqual(['H1']);
    expect(body.variables.filters.period).toEqual(['2025']);
  });

  it('returns error message when no data found', async () => {
    mockFetch(mockObservationsEmpty);
    const result = JSON.parse(await handleEnergy('get_electricity_tariff', { municipality: '99999' }));
    expect(result.error).toContain('No tariff data found');
    expect(result.hint).toBeTruthy();
    expect(result.municipality).toBe('99999');
  });

  it('throws when municipality is missing', async () => {
    await expect(handleEnergy('get_electricity_tariff', {})).rejects.toThrow('municipality is required');
  });

  it('throws when municipality is empty string', async () => {
    await expect(handleEnergy('get_electricity_tariff', { municipality: '' })).rejects.toThrow('municipality is required');
  });

  it('returns array when multiple operators serve a municipality', async () => {
    mockFetch(mockObservationsMultipleOperators);
    const result = JSON.parse(await handleEnergy('get_electricity_tariff', { municipality: '261' }));
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].operator).toBeTruthy();
  });

  it('throws on HTTP error from API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 503, statusText: 'Service Unavailable',
      json: () => Promise.resolve({}),
    }));
    await expect(handleEnergy('get_electricity_tariff', { municipality: '261' })).rejects.toThrow('HTTP 503');
  });

  it('throws on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
    await expect(handleEnergy('get_electricity_tariff', { municipality: '261' })).rejects.toThrow('Network failure');
  });
});

// ── compare_electricity_tariffs ─────────────────────────────────────────────

describe('compare_electricity_tariffs', () => {
  it('returns sorted comparison with cheapest first', async () => {
    mockFetch(mockObservationsMultiple);
    const result = JSON.parse(await handleEnergy('compare_electricity_tariffs', {
      municipalities: ['261', '351', '6621'],
    }));
    expect(Array.isArray(result.comparison)).toBe(true);
    expect(result.comparison).toHaveLength(3);
    // Zürich (24.758) < Geneva (24.88) < Bern (33.06)
    expect(result.comparison[0].municipality).toBe('Zürich');
    expect(result.comparison[0].rank).toBe(1);
    expect(result.comparison[2].municipality).toBe('Bern');
    expect(result.comparison[2].rank).toBe(3);
  });

  it('includes summary with cheapest/most_expensive/spread', async () => {
    mockFetch(mockObservationsMultiple);
    const result = JSON.parse(await handleEnergy('compare_electricity_tariffs', {
      municipalities: ['261', '351', '6621'],
    }));
    expect(result.summary.cheapest).toBe('Zürich');
    expect(result.summary.most_expensive).toBe('Bern');
    expect(typeof result.summary.spread_rp_per_kwh).toBe('number');
    expect(result.summary.spread_rp_per_kwh).toBeGreaterThan(0);
  });

  it('includes category description in summary', async () => {
    mockFetch(mockObservationsMultiple);
    const result = JSON.parse(await handleEnergy('compare_electricity_tariffs', {
      municipalities: ['261', '351'],
    }));
    expect(result.summary.categoryDescription).toContain('kWh');
    expect(result.summary.category).toBe('H4');
  });

  it('includes source link', async () => {
    mockFetch(mockObservationsMultiple);
    const result = JSON.parse(await handleEnergy('compare_electricity_tariffs', {
      municipalities: ['261', '351'],
    }));
    expect(result.source).toContain('elcom.admin.ch');
  });

  it('uses default H4 category and 2026 year', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: mockObservationsMultiple }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleEnergy('compare_electricity_tariffs', { municipalities: ['261', '351'] });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.variables.filters.category).toEqual(['H4']);
    expect(body.variables.filters.period).toEqual(['2026']);
    expect(body.variables.filters.municipality).toEqual(['261', '351']);
  });

  it('accepts custom category', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: mockObservationsMultiple }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await handleEnergy('compare_electricity_tariffs', {
      municipalities: ['261', '351'],
      category: 'C2',
      year: '2024',
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.variables.filters.category).toEqual(['C2']);
    expect(body.variables.filters.period).toEqual(['2024']);
  });

  it('deduplicates when multiple operators serve same municipality', async () => {
    // mockObservationsMultipleOperators has 2 entries for municipality 261
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: mockObservationsMultipleOperators }),
    }));
    // Add a second municipality entry to mockObservationsMultipleOperators fixture
    const twoMuniData = {
      observations: [
        ...mockObservationsMultipleOperators.observations,
        {
          period: "2026",
          municipality: "351",
          municipalityLabel: "Bern",
          operator: "519",
          operatorLabel: "Energie Wasser Bern",
          canton: "2",
          cantonLabel: "Bern",
          category: "H4",
          value: 33.06,
          coverageRatio: 1,
        },
      ],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: twoMuniData }),
    }));
    const result = JSON.parse(await handleEnergy('compare_electricity_tariffs', {
      municipalities: ['261', '351'],
    }));
    // Should have 2 entries (261 deduplicated to cheapest operator)
    expect(result.comparison).toHaveLength(2);
    // Zürich (cheapest operator: 24.758) should come first
    expect(result.comparison[0].total_rp_per_kwh).toBe(24.758);
  });

  it('returns error when no data found', async () => {
    mockFetch(mockObservationsEmpty);
    const result = JSON.parse(await handleEnergy('compare_electricity_tariffs', {
      municipalities: ['99998', '99999'],
    }));
    expect(result.error).toContain('No tariff data found');
  });

  it('throws when fewer than 2 municipalities provided', async () => {
    await expect(handleEnergy('compare_electricity_tariffs', {
      municipalities: ['261'],
    })).rejects.toThrow('At least 2');
  });

  it('throws when municipalities is not an array', async () => {
    await expect(handleEnergy('compare_electricity_tariffs', {
      municipalities: '261',
    })).rejects.toThrow('At least 2');
  });

  it('throws when more than 20 municipalities provided', async () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => String(i + 100));
    await expect(handleEnergy('compare_electricity_tariffs', {
      municipalities: tooMany,
    })).rejects.toThrow('Maximum 20');
  });

  it('throws on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));
    await expect(handleEnergy('compare_electricity_tariffs', {
      municipalities: ['261', '351'],
    })).rejects.toThrow('Network failure');
  });
});

// ── unknown tool ─────────────────────────────────────────────────────────────

describe('unknown tool', () => {
  it('throws on unrecognised tool name', async () => {
    await expect(handleEnergy('nonexistent_tool', {})).rejects.toThrow('Unknown energy tool');
  });
});

// ── energyTools export ───────────────────────────────────────────────────────

describe('energyTools schema', () => {
  it('exports exactly 3 tools', async () => {
    const { energyTools } = await import('../../src/modules/energy.js');
    expect(energyTools).toHaveLength(3);
  });

  it('all tools have required fields', async () => {
    const { energyTools } = await import('../../src/modules/energy.js');
    for (const tool of energyTools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeTruthy();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeTruthy();
    }
  });

  it('tool names match handler cases', async () => {
    const { energyTools } = await import('../../src/modules/energy.js');
    const names = energyTools.map((t) => t.name);
    expect(names).toContain('get_electricity_tariff');
    expect(names).toContain('compare_electricity_tariffs');
    expect(names).toContain('search_municipality_energy');
  });

  it('get_electricity_tariff requires municipality', async () => {
    const { energyTools } = await import('../../src/modules/energy.js');
    const tool = energyTools.find((t) => t.name === 'get_electricity_tariff');
    expect(tool?.inputSchema.required).toContain('municipality');
  });

  it('compare_electricity_tariffs requires municipalities array', async () => {
    const { energyTools } = await import('../../src/modules/energy.js');
    const tool = energyTools.find((t) => t.name === 'compare_electricity_tariffs');
    expect(tool?.inputSchema.required).toContain('municipalities');
    expect(tool?.inputSchema.properties.municipalities.type).toBe('array');
  });
});
