// Test fixtures for SNB Exchange Rates module

/** Mock dimensions API response (JSON) */
export const mockDimensionsResponse = {
  cubeId: "devkum",
  dimensions: [
    {
      id: "D0",
      name: "Monthly average/End of month",
      dimensionItems: [
        { id: "M0", name: "Monthly average" },
        { id: "M1", name: "End of month" },
      ],
    },
    {
      id: "D1",
      name: "Currency",
      dimensionItems: [
        {
          id: "D1_0",
          name: "Europe",
          dimensionItems: [
            { id: "EUR1", name: "EUR 1" },
            { id: "GBP1", name: "United Kingdom – GBP 1" },
            { id: "SEK100", name: "Sweden – SEK 100" },
          ],
        },
        {
          id: "D1_1",
          name: "America",
          dimensionItems: [
            { id: "USD1", name: "United States – USD 1" },
            { id: "CAD1", name: "Canada – CAD 1" },
          ],
        },
        {
          id: "D1_3",
          name: "Asia and Australia",
          dimensionItems: [
            { id: "JPY100", name: "Japan – JPY 100" },
            { id: "AUD1", name: "Australia – AUD 1" },
          ],
        },
      ],
    },
  ],
};

/** Mock CSV data (semicolon-delimited SNB format) */
export const mockCsvResponse = `"CubeId";"devkum"
"PublishingDate";"2026-03-02 14:30"

"Date";"D0";"D1";"Value"
"2024-01";"M0";"EUR1";"1.08123"
"2024-01";"M1";"EUR1";"1.07500"
"2024-01";"M0";"GBP1";"1.26500"
"2024-01";"M1";"GBP1";"1.25800"
"2024-01";"M0";"SEK100";"9.12345"
"2024-01";"M0";"USD1";"0.90123"
"2024-01";"M0";"CAD1";"0.67890"
"2024-01";"M0";"JPY100";"0.61234"
"2024-01";"M0";"AUD1";"0.59876"
"2024-02";"M0";"EUR1";"1.07500"
"2024-02";"M1";"EUR1";"1.08000"
"2024-02";"M0";"GBP1";"1.27000"
"2024-02";"M0";"SEK100";"9.08765"
"2024-02";"M0";"USD1";"0.88765"
"2024-02";"M0";"CAD1";"0.66500"
"2024-02";"M0";"JPY100";"0.59876"
"2024-02";"M0";"AUD1";"0.60123"
"2025-01";"M0";"EUR1";"0.94500"
"2025-01";"M0";"GBP1";"1.12000"
"2025-01";"M0";"SEK100";"8.45678"
"2025-01";"M0";"USD1";"0.85000"
"2025-01";"M0";"CAD1";"0.59000"
"2025-01";"M0";"JPY100";"0.56000"
"2025-01";"M0";"AUD1";"0.54000"
"2026-01";"M0";"EUR1";"0.93882"
"2026-01";"M1";"EUR1";"0.94000"
"2026-01";"M0";"GBP1";"1.16000"
"2026-01";"M0";"SEK100";"8.12345"
"2026-01";"M0";"USD1";"0.90000"
"2026-01";"M0";"CAD1";"0.62500"
"2026-01";"M0";"JPY100";"0.59000"
"2026-01";"M0";"AUD1";"0.57500"
`;

/** CSV with empty values (some currencies have no data for a period) */
export const mockCsvWithMissingValues = `"CubeId";"devkum"
"PublishingDate";"2026-03-02 14:30"

"Date";"D0";"D1";"Value"
"2026-01";"M0";"EUR1";"0.93882"
"2026-01";"M0";"GBP1";
"2026-01";"M0";"USD1";"0.90000"
`;

/** Minimal CSV: only one currency, one period */
export const mockCsvSingleEntry = `"CubeId";"devkum"
"PublishingDate";"2026-03-02 14:30"

"Date";"D0";"D1";"Value"
"2026-01";"M0";"EUR1";"0.93882"
`;

/** Empty body / no data rows */
export const mockCsvEmpty = `"CubeId";"devkum"
"PublishingDate";"2026-03-02 14:30"

"Date";"D0";"D1";"Value"
`;
