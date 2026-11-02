export const mockPassengers = {
  total_count: 3,
  results: [
    {
      bahnhof_gare_stazione: "Bern",
      uic: 8507000,
      code_codice: "BN",
      kt_ct_cantone: "BE",
      jahr_annee_anno: "2025",
      dtv_tjm_tgm: 177000,
      dwv_tmjo_tfm: 191700,
      dnwv_tmjno_tmgnl: 144300,
      evu_ef_itf: "SBB",
    },
    {
      bahnhof_gare_stazione: "Bern Weissenbühl",
      uic: 8507079,
      code_codice: "BNWE",
      kt_ct_cantone: "BE",
      jahr_annee_anno: "2025",
      dtv_tjm_tgm: 1300,
      dwv_tmjo_tfm: 1600,
      dnwv_tmjno_tmgnl: 680,
      evu_ef_itf: "SBB",
    },
    {
      bahnhof_gare_stazione: "Bern",
      uic: 8507000,
      code_codice: "BN",
      kt_ct_cantone: "BE",
      jahr_annee_anno: "2024",
      dtv_tjm_tgm: 170000,
      dwv_tmjo_tfm: 184000,
      dnwv_tmjno_tmgnl: 140000,
      evu_ef_itf: "SBB",
    },
  ],
};

export const mockStops = {
  total_count: 294,
  results: [{ betriebstag: "2026-11-01", haltestellen_name: "Bern" }],
};

export const mockLateArrivals = {
  total_count: 11,
  results: [
    {
      betriebstag: "2026-11-01",
      haltestellen_name: "Bern",
      linien_text: "IR15",
      verkehrsmittel_text: "IR",
      ankunftszeit: "2026-11-01T12:00:00",
      an_prognose: "2026-11-01T12:04:18",
      ankunftsverspatung: "true",
      abfahrtszeit: "2026-11-01T12:02:00",
      ab_prognose: "2026-11-01T12:05:00",
      abfahrtsverspatung: "true",
      faellt_aus_tf: false,
    },
  ],
};

export const mockLateDepartures = { total_count: 12, results: [{ betriebstag: "2026-11-01" }] };
export const mockCancelled = { total_count: 43, results: [{ betriebstag: "2026-11-01" }] };
export const mockEmptyStops = { total_count: 0, results: [] };

export const mockPlatforms = {
  total_count: 3,
  results: [
    { bps: "BN", bps_name: "Bern", p_nr: "3/4", p_lange: 510, z_schienenfrei: "ja", perrontyp: "Mittelperron" },
    { bps: "BN", bps_name: "Bern", p_nr: "1", p_lange: 320, z_schienenfrei: "nein", perrontyp: "Aussenperron" },
    { bps: "BNWE", bps_name: "Bern Weissenbühl", p_nr: "1", p_lange: 180, z_schienenfrei: "ja", perrontyp: "Aussenperron" },
  ],
};
