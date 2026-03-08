// Test fixtures for Swiss energy (ElCom) module

export const mockMunicipalitySearch = {
  municipalities: [
    { id: "261", name: "Zürich" },
    { id: "9053", name: "Zürichsee (SG)" },
    { id: "9051", name: "Zürichsee (ZH)" },
  ],
};

export const mockMunicipalitySearchEmpty = {
  municipalities: [],
};

export const mockObservationsZurich = {
  observations: [
    {
      period: "2026",
      municipality: "261",
      municipalityLabel: "Zürich",
      operator: "565",
      operatorLabel: "Elektrizitätswerk der Stadt Zürich",
      canton: "1",
      cantonLabel: "Zürich",
      category: "H4",
      total: 24.758,
      energy: 11.5,
      gridusage: 8.3,
      charge: 2.1,
      aidfee: 2.3,
      fixcosts: 0.2,
      meteringrate: 0.3,
      annualmeteringcost: 0.06,
      coverageRatio: 1,
    },
  ],
};

export const mockObservationsZurichTotal = {
  observations: [
    {
      period: "2026",
      municipality: "261",
      municipalityLabel: "Zürich",
      operator: "565",
      operatorLabel: "Elektrizitätswerk der Stadt Zürich",
      canton: "1",
      cantonLabel: "Zürich",
      category: "H4",
      value: 24.758,
      coverageRatio: 1,
    },
  ],
};

export const mockObservationsMultiple = {
  observations: [
    {
      period: "2026",
      municipality: "261",
      municipalityLabel: "Zürich",
      operator: "565",
      operatorLabel: "Elektrizitätswerk der Stadt Zürich",
      canton: "1",
      cantonLabel: "Zürich",
      category: "H4",
      value: 24.758,
      coverageRatio: 1,
    },
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
    {
      period: "2026",
      municipality: "6621",
      municipalityLabel: "Genève",
      operator: "692",
      operatorLabel: "Services industriels de Genève",
      canton: "25",
      cantonLabel: "Genf",
      category: "H4",
      value: 24.88,
      coverageRatio: 1,
    },
  ],
};

export const mockObservationsEmpty = {
  observations: [],
};

export const mockObservationsMultipleOperators = {
  observations: [
    {
      period: "2026",
      municipality: "261",
      municipalityLabel: "Zürich",
      operator: "565",
      operatorLabel: "Elektrizitätswerk der Stadt Zürich",
      canton: "1",
      cantonLabel: "Zürich",
      category: "H4",
      value: 24.758,
      coverageRatio: 1,
    },
    {
      period: "2026",
      municipality: "261",
      municipalityLabel: "Zürich",
      operator: "566",
      operatorLabel: "EWZ Alternative",
      canton: "1",
      cantonLabel: "Zürich",
      category: "H4",
      value: 26.5,
      coverageRatio: 0.9,
    },
  ],
};
