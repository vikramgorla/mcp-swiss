export const mockStations = {
  stations: [
    {
      id: "8507000",
      name: "Bern",
      score: null,
      coordinate: { type: "WGS84", x: 46.948825, y: 7.439122 },
      distance: null,
    },
    {
      id: "8507100",
      name: "Bern Bahnhof",
      score: null,
      coordinate: { type: "WGS84", x: 46.948825, y: 7.439122 },
      distance: null,
    },
  ],
};

export const mockConnections = {
  connections: [
    {
      from: {
        station: { id: "8507000", name: "Bern" },
        departure: "2026-03-07T10:00:00+0100",
        platform: "3",
      },
      to: {
        station: { id: "8503000", name: "Zürich HB" },
        arrival: "2026-03-07T10:58:00+0100",
        platform: "4",
      },
      duration: "00d00:58:00",
      products: ["IC"],
      sections: [],
    },
  ],
};

export const mockStationboard = {
  station: { id: "8507000", name: "Bern" },
  stationboard: [
    {
      name: "IC 1",
      category: "IC",
      number: "1",
      to: "Zürich HB",
      stop: {
        departure: "2026-03-07T10:02:00+0100",
        platform: "3",
      },
    },
    {
      name: "S1 21",
      category: "S",
      number: "21",
      to: "Thun",
      stop: {
        departure: "2026-03-07T10:06:00+0100",
        platform: "7",
      },
    },
  ],
};
