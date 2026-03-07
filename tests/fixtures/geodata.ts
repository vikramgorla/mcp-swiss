export const mockGeocodeResponse = {
  results: [
    {
      id: 1234567,
      weight: 1,
      attrs: {
        label: "Bundesplatz 3 <b>3011 Bern</b>",
        detail: "bundesplatz 3 3011 bern",
        featureId: "3011_Bern_Bundesplatz_3",
        lat: 46.946774,
        lon: 7.444192,
        x: 2600667.0,
        y: 1199657.0,
        rank: 7,
        origin: "address",
        zoomlevel: 10,
      },
    },
  ],
};

export const mockIdentifyResponse = {
  results: [
    {
      layerBodId: "ch.swisstopo.swissnames3d",
      layerName: "SwissNAMES3D",
      featureId: "1234",
      id: 1234,
      attributes: {
        label: "Bern",
        objektart: "Grossstadt",
        sprachcode: "de",
      },
    },
  ],
};

export const mockSolarResponse = {
  results: [
    {
      layerBodId: "ch.bfe.solarenergie-eignung-daecher",
      layerName: "Solarenergie Eignung Dächer",
      featureId: "5678",
      id: 5678,
      attributes: {
        label: "Roof 5678",
        klasse: "sehr gut geeignet",
        stromertrag: 12500,
        waermeertrag: 8200,
      },
    },
  ],
};

export const mockEmptyResults = {
  results: [],
};
