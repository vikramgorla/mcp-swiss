// Mock data matching real openholidaysapi.org API structure

export const mockPublicHolidaysAll = [
  {
    id: "adbbd6a7-365b-441f-bd45-1750624026bd",
    startDate: "2026-01-01",
    endDate: "2026-01-01",
    type: "Public",
    name: [{ language: "EN", text: "New Year's Day" }],
    regionalScope: "Regional",
    temporalScope: "FullDay",
    nationwide: true,
  },
  {
    id: "241f2d63-900c-42eb-b2a0-14864f9e36e5",
    startDate: "2026-01-02",
    endDate: "2026-01-02",
    type: "Public",
    name: [{ language: "EN", text: "Berchtold's Day" }],
    regionalScope: "Regional",
    temporalScope: "FullDay",
    nationwide: false,
    subdivisions: [
      { code: "CH-BE", shortName: "BE" },
      { code: "CH-ZG", shortName: "ZG" },
      { code: "CH-VD", shortName: "VD" },
    ],
  },
  {
    id: "637e6673-4e30-4855-8b16-91d6b56d3ad6",
    startDate: "2026-04-03",
    endDate: "2026-04-03",
    type: "Public",
    name: [{ language: "EN", text: "Good Friday" }],
    regionalScope: "Regional",
    temporalScope: "FullDay",
    nationwide: false,
    subdivisions: [
      { code: "CH-ZH", shortName: "ZH" },
      { code: "CH-BE", shortName: "BE" },
      { code: "CH-GE", shortName: "GE" },
    ],
  },
  {
    id: "bfd37d9a-0c43-4f2d-9b31-41b5df6a6c5c",
    startDate: "2026-08-01",
    endDate: "2026-08-01",
    type: "Public",
    name: [{ language: "EN", text: "Independence Day" }],
    regionalScope: "National",
    temporalScope: "FullDay",
    nationwide: true,
  },
  {
    id: "d6f89201-1a3b-4c5d-8e7f-9a0b1c2d3e4f",
    startDate: "2026-12-25",
    endDate: "2026-12-25",
    type: "Public",
    name: [{ language: "EN", text: "Christmas Day" }],
    regionalScope: "National",
    temporalScope: "FullDay",
    nationwide: true,
  },
];

export const mockPublicHolidaysZH = [
  {
    id: "adbbd6a7-365b-441f-bd45-1750624026bd",
    startDate: "2026-01-01",
    endDate: "2026-01-01",
    type: "Public",
    name: [{ language: "EN", text: "New Year's Day" }],
    regionalScope: "Regional",
    temporalScope: "FullDay",
    nationwide: true,
  },
  {
    id: "6178d158-6706-42a7-b4c1-11b4574cb361",
    startDate: "2026-01-02",
    endDate: "2026-01-02",
    type: "Optional",
    name: [{ language: "EN", text: "Berchtold's Day" }],
    regionalScope: "Regional",
    temporalScope: "FullDay",
    nationwide: false,
    subdivisions: [{ code: "CH-ZH", shortName: "ZH" }],
  },
  {
    id: "637e6673-4e30-4855-8b16-91d6b56d3ad6",
    startDate: "2026-04-03",
    endDate: "2026-04-03",
    type: "Public",
    name: [{ language: "EN", text: "Good Friday" }],
    regionalScope: "Regional",
    temporalScope: "FullDay",
    nationwide: false,
    subdivisions: [{ code: "CH-ZH", shortName: "ZH" }],
  },
];

export const mockSchoolHolidaysAll = [
  {
    id: "0428f89b-8389-4bea-a225-50d90b83150a",
    startDate: "2025-12-20",
    endDate: "2026-01-04",
    type: "School",
    name: [{ language: "EN", text: "Winter holidays" }],
    regionalScope: "Regional",
    temporalScope: "FullDay",
    nationwide: false,
    subdivisions: [{ code: "CH-ZG", shortName: "ZG" }],
  },
  {
    id: "0dae29f9-1292-418a-ab9f-22d933053ceb",
    startDate: "2025-12-20",
    endDate: "2026-01-04",
    type: "School",
    name: [{ language: "EN", text: "Christmas" }],
    regionalScope: "Regional",
    temporalScope: "FullDay",
    nationwide: false,
    subdivisions: [{ code: "CH-VD", shortName: "VD" }],
  },
  {
    id: "19143f74-1e56-4a96-a168-e2842c46fc8b",
    startDate: "2026-04-04",
    endDate: "2026-04-19",
    type: "School",
    name: [{ language: "EN", text: "Spring holidays" }],
    regionalScope: "Regional",
    temporalScope: "FullDay",
    nationwide: false,
    subdivisions: [
      { code: "CH-ZH", shortName: "ZH" },
      { code: "CH-BE", shortName: "BE" },
    ],
  },
  {
    id: "7a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    startDate: "2026-07-04",
    endDate: "2026-08-16",
    type: "School",
    name: [{ language: "EN", text: "Summer holidays" }],
    regionalScope: "Regional",
    temporalScope: "FullDay",
    nationwide: false,
    subdivisions: [{ code: "CH-ZH", shortName: "ZH" }],
  },
];

export const mockSchoolHolidaysZH = [
  {
    id: "19143f74-1e56-4a96-a168-e2842c46fc8b",
    startDate: "2026-04-04",
    endDate: "2026-04-19",
    type: "School",
    name: [{ language: "EN", text: "Spring holidays" }],
    regionalScope: "Regional",
    temporalScope: "FullDay",
    nationwide: false,
    subdivisions: [{ code: "CH-ZH", shortName: "ZH" }],
  },
  {
    id: "7a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    startDate: "2026-07-04",
    endDate: "2026-08-16",
    type: "School",
    name: [{ language: "EN", text: "Summer holidays" }],
    regionalScope: "Regional",
    temporalScope: "FullDay",
    nationwide: false,
    subdivisions: [{ code: "CH-ZH", shortName: "ZH" }],
  },
];

export const mockHolidayTodayNational = [
  {
    id: "bfd37d9a-0c43-4f2d-9b31-41b5df6a6c5c",
    startDate: "2026-08-01",
    endDate: "2026-08-01",
    type: "Public",
    name: [{ language: "EN", text: "Independence Day" }],
    regionalScope: "National",
    temporalScope: "FullDay",
    nationwide: true,
  },
];

export const mockHolidayTodayRegional = [
  {
    id: "637e6673-4e30-4855-8b16-91d6b56d3ad6",
    startDate: "2026-04-03",
    endDate: "2026-04-03",
    type: "Public",
    name: [{ language: "EN", text: "Good Friday" }],
    regionalScope: "Regional",
    temporalScope: "FullDay",
    nationwide: false,
    subdivisions: [{ code: "CH-ZH", shortName: "ZH" }],
  },
];

export const mockHolidayTodayEmpty: never[] = [];
