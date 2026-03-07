export const mockSearchResponse = {
  list: [
    {
      name: "Migros-Genossenschafts-Bund",
      ehraid: 119283,
      uid: "CHE105829940",
      uidFormatted: "CHE-105.829.940",
      legalSeat: "Zürich",
      status: "EXISTIEREND",
      shabDate: "2024-01-15",
    },
  ],
  hasMoreResults: false,
};

export const mockCompanyDetail = {
  name: "Migros-Genossenschafts-Bund",
  ehraid: 119283,
  uid: "CHE105829940",
  uidFormatted: "CHE-105.829.940",
  legalSeat: "Zürich",
  legalSeatId: 261,
  registerOfficeId: 27,
  legalFormId: 7,
  status: "EXISTIEREND",
  address: {
    street: "Limmatstrasse",
    houseNumber: "152",
    swissZipCode: "8031",
    city: "Zürich",
  },
  purpose: "Führung eines Unternehmens des Detailhandels",
  shabPub: [],
};

export const mockSearchByAddressResponse = {
  list: [
    {
      name: "Test AG",
      ehraid: 999001,
      uid: "CHE999001001",
      uidFormatted: "CHE-999.001.001",
      legalSeat: "Bern",
      status: "EXISTIEREND",
      shabDate: "2023-06-01",
    },
  ],
  hasMoreResults: false,
};
