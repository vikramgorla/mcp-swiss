// Test fixtures for Swiss Voting module (Basel-Stadt dataset 100345)

export const mockVotingRows = [
  {
    abst_datum_text: "2024-11-24",
    abst_id: 1,
    abst_titel: "«Ausbau Nationalstrassen»",
    abst_art: "national",
    gemein_name: "Basel",
    wahllok_name: "Basel briefl. & elektr. Stimmende (Total)",
    stimmr_anz: 48572,
    ja_anz: 19490,
    nein_anz: 28053,
    anteil_ja_stimmen: 0.4099446817,
    result_art: "Schlussresultat",
  },
  {
    abst_datum_text: "2024-11-24",
    abst_id: 1,
    abst_titel: "«Ausbau Nationalstrassen»",
    abst_art: "national",
    gemein_name: "Riehen",
    wahllok_name: "Riehen briefl. & elektr. Stimmende (Total)",
    stimmr_anz: 7978,
    ja_anz: 4535,
    nein_anz: 3294,
    anteil_ja_stimmen: 0.57925661,
    result_art: "Schlussresultat",
  },
  {
    abst_datum_text: "2024-11-24",
    abst_id: 2,
    abst_titel: "«Mietrecht: Untermiete»",
    abst_art: "national",
    gemein_name: "Basel",
    wahllok_name: "Basel briefl. & elektr. Stimmende (Total)",
    stimmr_anz: 48572,
    ja_anz: 17052,
    nein_anz: 30080,
    anteil_ja_stimmen: 0.3617924128,
    result_art: "Schlussresultat",
  },
  {
    abst_datum_text: "2024-11-24",
    abst_id: 2,
    abst_titel: "«Mietrecht: Untermiete»",
    abst_art: "national",
    gemein_name: "Riehen",
    wahllok_name: "Riehen briefl. & elektr. Stimmende (Total)",
    stimmr_anz: 7978,
    ja_anz: 3888,
    nein_anz: 3776,
    anteil_ja_stimmen: 0.5073068894,
    result_art: "Schlussresultat",
  },
];

export const mockVotingRowsSingle = [
  {
    abst_datum_text: "2024-06-09",
    abst_id: 4,
    abst_titel: "«Stromversorgungsgesetz»",
    abst_art: "national",
    gemein_name: "Basel",
    wahllok_name: "Basel briefl. & elektr. Stimmende (Total)",
    stimmr_anz: 43934,
    ja_anz: 33653,
    nein_anz: 9629,
    anteil_ja_stimmen: 0.7775287648,
    result_art: "Schlussresultat",
  },
];

export const mockDetailsRows = [
  {
    abst_datum_text: "2024-11-24",
    abst_id: 1,
    abst_titel: "«Ausbau Nationalstrassen»",
    abst_art: "national",
    gemein_name: "Basel",
    wahllok_name: "Basel briefl. & elektr. Stimmende (Total)",
    stimmr_anz: 48572,
    ja_anz: 19490,
    nein_anz: 28053,
    anteil_ja_stimmen: 0.4099446817,
    result_art: "Schlussresultat",
  },
  {
    abst_datum_text: "2024-11-24",
    abst_id: 1,
    abst_titel: "«Ausbau Nationalstrassen»",
    abst_art: "national",
    gemein_name: "Riehen",
    wahllok_name: "Riehen briefl. & elektr. Stimmende (Total)",
    stimmr_anz: 7978,
    ja_anz: 4535,
    nein_anz: 3294,
    anteil_ja_stimmen: 0.57925661,
    result_art: "Schlussresultat",
  },
  {
    abst_datum_text: "2024-11-24",
    abst_id: 1,
    abst_titel: "«Ausbau Nationalstrassen»",
    abst_art: "national",
    gemein_name: "Bettingen",
    wahllok_name: "Bettingen briefl. & elektr. Stimmende (Total)",
    stimmr_anz: 498,
    ja_anz: 353,
    nein_anz: 135,
    anteil_ja_stimmen: 0.7233606557,
    result_art: "Schlussresultat",
  },
];

export const mockEmptyRows: never[] = [];

export const EXPECTED_NATIONALSTRASSEN = {
  title: "«Ausbau Nationalstrassen»",
  date: "2024-11-24",
  type: "national",
};

export const EXPECTED_MIETRECHT = {
  title: "«Mietrecht: Untermiete»",
  date: "2024-11-24",
  type: "national",
};
