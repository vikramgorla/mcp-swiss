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
      featureId: 1234,
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
      featureId: 5678,
      id: 5678,
      attributes: {
        building_id: 3155346,
        klasse: 1,
        klasse_text: "sehr gut geeignet",
        flaeche: 45.2,
        ausrichtung: "S",
        neigung: 30,
        stromertrag: 12500,
        stromertrag_winterhalbjahr: 3500,
        stromertrag_sommerhalbjahr: 9000,
        finanzertrag: 2800,
        gstrahlung: 1200,
        gwr_egid: 1234567,
        df_nummer: 1,
        label: "Roof surface 1",
      },
    },
    {
      layerBodId: "ch.bfe.solarenergie-eignung-daecher",
      layerName: "Solarenergie Eignung Dächer",
      featureId: 5679,
      id: 5679,
      attributes: {
        building_id: 3155346,
        klasse: 2,
        klasse_text: "gut geeignet",
        flaeche: 30.0,
        ausrichtung: "W",
        neigung: 25,
        stromertrag: 7500,
        stromertrag_winterhalbjahr: 2000,
        stromertrag_sommerhalbjahr: 5500,
        finanzertrag: 1600,
        gstrahlung: 1000,
        gwr_egid: 1234567,
        df_nummer: 2,
        label: "Roof surface 2",
      },
    },
  ],
};

export const mockEmptyResults = {
  results: [],
};
