/**
 * Mock CSV responses for pollen module tests.
 * MeteoSwiss pollen data uses semicolon-separated CSV.
 */

// ── Station metadata CSV ────────────────────────────────────────────────────

export const mockStationsCSV = [
  "station_abbr;station_name;station_canton;station_wigos_id;station_type_de;station_type_fr;station_type_it;station_type_en;station_dataowner;station_data_since;station_height_masl;station_height_barometer_masl;station_coordinates_lv95_east;station_coordinates_lv95_north;station_coordinates_wgs84_lat;station_coordinates_wgs84_lon;station_exposition_de;station_exposition_fr;station_exposition_it;station_exposition_en;station_url_de;station_url_fr;station_url_it;station_url_en",
  "PBE;Bern;BE;;Pollenstationen;Stations pollen;Stazioni pollini;Pollen stations;MeteoSchweiz;01.01.1990;546.0;;2598936.0;1199918.0;46.950342;7.424661;;;;;;;;",
  "PBS;Basel;BS;;Pollenstationen;Stations pollen;Stazioni pollini;Pollen stations;MeteoSchweiz;01.01.1969;256.0;;2610935.0;1267909.0;47.5618;7.583931;;;;;;;;",
  "PZH;Zürich;ZH;;Pollenstationen;Stations pollen;Stazioni pollini;Pollen stations;MeteoSchweiz;01.01.1982;556.0;;2683472.0;1248088.0;47.378233;8.566069;;;;;;;;",
  "PGE;Genève;GE;;Pollenstationen;Stations pollen;Stazioni pollini;Pollen stations;MeteoSchweiz;01.01.1979;379.0;;2500330.0;1116432.0;46.191969;6.147544;;;;;;;;",
  "PLU;Lugano;TI;;Pollenstationen;Stations pollen;Stazioni pollini;Pollen stations;MeteoSchweiz;01.01.1992;273.0;;2717880.0;1095710.0;46.004;8.946;;;;;;;;",
].join("\n");

// ── Hourly recent CSV ───────────────────────────────────────────────────────

export const mockHourlyCSV = [
  "station_abbr;reference_timestamp;kabetuh0;khpoach0;kaalnuh0;kacoryh0;kafaguh0;kafraxh0;kaquerh0",
  "PZH;27.03.2026 18:00;52;0;0;0;0;22;0",
  "PZH;27.03.2026 19:00;40;0;0;0;0;16;0",
  "PZH;27.03.2026 20:00;27;0;0;0;0;11;0",
  "PZH;27.03.2026 21:00;27;0;0;0;0;9;0",
  "PZH;27.03.2026 22:00;21;0;0;0;0;16;0",
  "PZH;27.03.2026 23:00;32;0;0;0;0;5;0",
].join("\n");

// ── Hourly CSV with empty values ────────────────────────────────────────────

export const mockHourlyCSVWithEmpty = [
  "station_abbr;reference_timestamp;kabetuh0;khpoach0;kaalnuh0;kacoryh0;kafaguh0;kafraxh0;kaquerh0",
  "PBE;27.03.2026 22:00;;;0;;0;8;",
  "PBE;27.03.2026 23:00;15;;0;0;;4;0",
].join("\n");

// ── Daily recent CSV ────────────────────────────────────────────────────────

export const mockDailyCSV = [
  "station_abbr;reference_timestamp;kaalnud0;kabetud0;kacoryd0;kafagud0;kafraxd0;kaquerd0;khpoacd0;kaalnud1;kabetud1;kacoryd1;kafagud1;kafraxd1;kaquerd1;khpoacd1",
  "PBE;21.03.2026 00:00;0;5;0;0;20;0;0;0;6;0;0;22;0;0",
  "PBE;22.03.2026 00:00;0;12;0;0;35;0;0;0;13;0;0;37;0;0",
  "PBE;23.03.2026 00:00;0;19;0;0;49;0;0;0;20;0;0;50;0;0",
  "PBE;24.03.2026 00:00;0;20;0;0;92;0;0;0;18;0;0;70;0;0",
  "PBE;25.03.2026 00:00;0;71;0;0;75;0;0;0;73;0;0;98;0;0",
  "PBE;26.03.2026 00:00;0;7;0;0;8;0;0;0;8;0;0;9;0;0",
  "PBE;27.03.2026 00:00;;;;;;;;0;9;0;0;18;0;0",
].join("\n");

// ── Daily CSV with all empty d0 values ──────────────────────────────────────

export const mockDailyCSVAllEmpty = [
  "station_abbr;reference_timestamp;kaalnud0;kabetud0;kacoryd0;kafagud0;kafraxd0;kaquerd0;khpoacd0;kaalnud1;kabetud1;kacoryd1;kafagud1;kafraxd1;kaquerd1;khpoacd1",
  "PDS;25.03.2026 00:00;;;;;;;;0;0;0;0;0;0;0",
].join("\n");

// ── Empty CSV (header only) ─────────────────────────────────────────────────

export const mockEmptyCSV =
  "station_abbr;reference_timestamp;kabetuh0;khpoach0;kaalnuh0;kacoryh0;kafaguh0;kafraxh0;kaquerh0";

// ── Minimal CSV for canton filter testing ───────────────────────────────────

export const mockStationsMultiCantonCSV = [
  "station_abbr;station_name;station_canton;station_wigos_id;station_type_de;station_type_fr;station_type_it;station_type_en;station_dataowner;station_data_since;station_height_masl;station_height_barometer_masl;station_coordinates_lv95_east;station_coordinates_lv95_north;station_coordinates_wgs84_lat;station_coordinates_wgs84_lon;station_exposition_de;station_exposition_fr;station_exposition_it;station_exposition_en;station_url_de;station_url_fr;station_url_it;station_url_en",
  "PBE;Bern;BE;;Pollenstationen;Stations pollen;Stazioni pollini;Pollen stations;MeteoSchweiz;01.01.1990;546.0;;2598936.0;1199918.0;46.950342;7.424661;;;;;;;;",
  "PLO;Locarno / Monti;TI;;Pollenstationen;Stations pollen;Stazioni pollini;Pollen stations;MeteoSchweiz;01.01.1989;376.0;;2704158.0;1114348.0;46.172547;8.787389;;;;;;;;",
  "PLU;Lugano;TI;;Pollenstationen;Stations pollen;Stazioni pollini;Pollen stations;MeteoSchweiz;01.01.1992;273.0;;2717880.0;1095710.0;46.004;8.946;;;;;;;;",
  "PGE;Genève;GE;;Pollenstationen;Stations pollen;Stazioni pollini;Pollen stations;MeteoSchweiz;01.01.1979;379.0;;2500330.0;1116432.0;46.191969;6.147544;;;;;;;;",
].join("\n");
