// Shapes copied from the live ZefixREST endpoints (www.zefix.admin.ch/ZefixREST/api/v1).

/** GET /legalForm.json — trimmed to the ids the tests use. */
export const mockLegalForms = [
  { id: 1, name: { de: "Einzelunternehmen", fr: "Entreprise individuelle", it: "Ditta individuale", en: "Sole proprietorship" }, sort: 100, kurzform: { de: "EIU", fr: "EI", it: "IPI", en: "SP" } },
  { id: 3, name: { de: "Aktiengesellschaft", fr: "Société anonyme", it: "Società anonima", en: "Corporation" }, sort: 300, kurzform: { de: "AG", fr: "SA", it: "SA", en: "Ltd" } },
  { id: 4, name: { de: "Gesellschaft mit beschränkter Haftung", fr: "Société à responsabilité limitée", it: "Società a garanzia limitata", en: "Limited Liability Company" }, sort: 400, kurzform: { de: "GmbH", fr: "Sàrl", it: "Sagl", en: "LLC" } },
  { id: 5, name: { de: "Genossenschaft", fr: "Société coopérative", it: "Società cooperativa", en: "Cooperative" }, sort: 500, kurzform: { de: "Gen", fr: "SC", it: "SC", en: "Coop" } },
  { id: 0, name: { de: "(unbekannt)", fr: "(inconnu)", it: "(sconosciuto)", en: "(unknown)" }, sort: 9999, kurzform: { de: "-", fr: "-", it: "-", en: "-" } },
];

/** GET /registerOffice.json — one office per canton, Valais has three. */
export const mockRegisterOffices = [
  { id: 20, canton: "ZH", address1: "Handelsregisteramt des Kantons Zürich" },
  { id: 36, canton: "BE", address1: "Handelsregisteramt des Kantons Bern" },
  { id: 170, canton: "ZG", address1: "Handelsregisteramt des Kantons Zug" },
  { id: 550, canton: "VD", address1: "Registre du commerce du canton de Vaud" },
  { id: 600, canton: "VS", address1: "Registre du commerce du Valais" },
  { id: 626, canton: "VS", address1: "Registre du commerce du Valais central" },
  { id: 621, canton: "VS", address1: "Registre du commerce du Bas-Valais" },
];

/** GET /community.json — political communes, used to resolve a locality to legalSeats. */
export const mockCommunities = [
  { id: 248, bfsId: 261, canton: "ZH", name: "Zürich", registryOfficeId: 20, replacedById: null, alternateNames: ["Zurich", "Zurigo"] },
  { id: 2264, bfsId: 5586, canton: "VD", name: "Lausanne", registryOfficeId: 550, replacedById: null, alternateNames: ["Losanna"] },
  { id: 1362, bfsId: 1711, canton: "ZG", name: "Zug", registryOfficeId: 170, replacedById: null, alternateNames: null },
  { id: 1500, bfsId: 2457, canton: "BE", name: "Genève", registryOfficeId: 36, replacedById: null, alternateNames: null },
];

/** POST /firm/search.json */
export const mockSearchResponse = {
  list: [
    {
      name: "Migros-Genossenschafts-Bund",
      ehraid: 119283,
      uid: "CHE105829940",
      uidFormatted: "CHE-105.829.940",
      legalSeat: "Zürich",
      legalSeatId: 248,
      registerOfficeId: 20,
      legalFormId: 5,
      status: "EXISTIEREND",
      shabDate: "2024-01-15",
      deleteDate: null,
      cantonalExcerptWeb: "https://zh.chregister.ch/cr-portal/auszug/auszug.xhtml?uid=CHE-105.829.940",
    },
  ],
  hasMoreResults: false,
};

export const mockSearchByLocalityResponse = {
  list: [
    {
      name: "Test AG",
      ehraid: 999001,
      uid: "CHE999001001",
      uidFormatted: "CHE-999.001.001",
      legalSeat: "Lausanne",
      legalSeatId: 2264,
      registerOfficeId: 550,
      legalFormId: 3,
      status: "EXISTIEREND",
      shabDate: "2023-06-01",
      deleteDate: null,
      cantonalExcerptWeb: "https://vd.chregister.ch/cr-portal/auszug/auszug.xhtml?uid=CHE-999.001.001",
    },
  ],
  hasMoreResults: false,
};

/** ZEFIX answers "nothing found" with HTTP 200 and an error envelope. */
export const mockNoResultResponse = {
  error: {
    code: "API.ZFR.SEARCH.NORESULT",
    title: "API.SEARCH.TITLE.NORESULT",
    message: null,
    suggestion: "API.HINT.SEARCH.SUGGESTION.CHANGEFILTER",
  },
};

/** GET /firm/{ehraid}.json */
export const mockCompanyDetail = {
  name: "Migros-Genossenschafts-Bund",
  ehraid: 119283,
  uid: "CHE105829940",
  uidFormatted: "CHE-105.829.940",
  legalSeat: "Zürich",
  legalSeatId: 248,
  registerOfficeId: 20,
  legalFormId: 5,
  status: "EXISTIEREND",
  address: {
    organisation: "Migros-Genossenschafts-Bund",
    street: "Limmatstrasse",
    houseNumber: "152",
    swissZipCode: "8005",
    town: "Zürich",
    country: "CH",
  },
  purpose: "Führung eines Unternehmens des Detailhandels",
  shabPub: Array.from({ length: 25 }, (_, i) => ({
    shabDate: "2026-09-07",
    shabId: 1006749275 - i,
    registryOfficeCanton: "ZH",
    message: `journal entry ${i}`,
  })),
};
