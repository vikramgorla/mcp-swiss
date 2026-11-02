export const mockCollection = {
  id: "ch.meteoschweiz.ogd-smn",
  title: "Automatic weather stations - Measurement values",
  assets: {
    "ogd-smn_meta_stations.csv": { href: "https://data.geo.admin.ch/ogd-smn_meta_stations.csv", type: "text/csv" },
    "ogd-smn_meta_parameters.csv": { href: "https://data.geo.admin.ch/ogd-smn_meta_parameters.csv", type: "text/csv" },
  },
};

export const mockCollectionNoStations = {
  id: "ch.meteoschweiz.ogd-smn",
  title: "Automatic weather stations",
  assets: {},
};

export const mockStationsCsv = [
  "station_abbr;station_name;station_canton;station_height_masl;station_coordinates_wgs84_lat;station_coordinates_wgs84_lon;station_data_since",
  "BER;Bern / Zollikofen;BE;553.0;46.9907;7.464;01.01.1901",
  "BAS;Basel / Binningen;BS;316.0;47.541;7.583;01.01.1901",
  "SMA;Zürich / Fluntern;ZH;556.0;47.378;8.566;01.01.1901",
  "LUG;Lugano;TI;273.0;46.004;8.960;01.01.1901",
  "GUE;Güttingen;TG;440.0;47.600;9.283;01.01.1990",
].join("\n");

export const mockParametersCsv = [
  "parameter_shortname;parameter_description_de;parameter_description_fr;parameter_description_it;parameter_description_en;parameter_group_de;parameter_group_fr;parameter_group_it;parameter_group_en;parameter_granularity;parameter_decimals;parameter_datatype;parameter_unit",
  'tre200h0;"Lufttemperatur; Stundenmittel";fr;it;"Air temperature; hourly mean";Temp;Temp;Temp;Temperature;H;1;Float;°C',
  "rre150h0;Niederschlag;fr;it;Precipitation hourly total;Niederschlag;Precip;Precip;Precipitation;H;1;Float;mm",
  "tre200d0;Lufttemperatur Tagesmittel;fr;it;Air temperature daily mean;Temp;Temp;Temp;Temperature;D;1;Float;°C",
].join("\n");

export const mockRecentCsv = [
  "station_abbr;reference_timestamp;tre200h0;rre150h0;ure200h0",
  "BER;01.11.2026 22:00;3.4;0;84.2",
  "BER;01.11.2026 23:00;3.2;;80",
  "BER;02.11.2026 19:00;5.1;0.2;77.7",
].join("\n");

export const mockHistoryCsv = [
  "station_abbr;reference_timestamp;tre200d0;rre150d0",
  "BER;30.09.2026 00:00;12.0;1",
  "BER;01.10.2026 00:00;11.2;0",
  "BER;02.10.2026 00:00;10.4;4.5",
  "BER;03.10.2026 00:00;-;-",
  "BER;06.10.2026 00:00;9.0;0",
].join("\n");

export const mockMonthlyCsv = [
  "station_abbr;reference_timestamp;tre200m0",
  "BER;01.01.2024 00:00;1.2",
  "BER;01.06.2024 00:00;16.4",
].join("\n");

export const mockEmptyCsv = "station_abbr;reference_timestamp;tre200h0\n";

export const mockItem = {
  id: "ber",
  properties: { title: "Bern / Zollikofen (BER)" },
  assets: {
    "ogd-smn_ber_h_now.csv": { href: "https://data.geo.admin.ch/h_now.csv" },
    "ogd-smn_ber_h_recent.csv": { href: "https://data.geo.admin.ch/h_recent.csv" },
    "ogd-smn_ber_h_historical_2020-2029.csv": { href: "https://data.geo.admin.ch/h_historical_2020-2029.csv" },
    "ogd-smn_ber_d_recent.csv": { href: "https://data.geo.admin.ch/d_recent.csv" },
    "ogd-smn_ber_d_historical.csv": { href: "https://data.geo.admin.ch/d_historical.csv" },
    "ogd-smn_ber_m.csv": { href: "https://data.geo.admin.ch/m.csv" },
  },
};

export const mockItemNoHourly = {
  id: "aie",
  properties: { title: "Affoltern i. E. (AIE)" },
  assets: {
    "ogd-nbcn-precip_aie_m.csv": { href: "https://data.geo.admin.ch/only_m.csv" },
  },
};
