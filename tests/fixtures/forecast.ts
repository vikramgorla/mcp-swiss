// Trimmed copies of real MeteoSwiss local-forecast files (run 2026-11-23 15:00 UTC).

export const mockPointsCsv = [
  "point_id;point_type_id;station_abbr;postal_code;point_name;point_type_de;point_type_fr;point_type_it;point_type_en;point_height_masl;point_coordinates_lv95_east;point_coordinates_lv95_north;point_coordinates_wgs84_lat;point_coordinates_wgs84_lon",
  "37;1;AIG;;Aigle;Station;Station;Stazione;Station;381.0;2560404.0;1130713.0;46.326647;6.924472",
  "186000;2;;1860;Aigle;Zentrum Postleitzahl;Centre code postal;Centro codice postale;Postal code center;402.0;2563255.0;1129701.0;46.317703;6.961572",
  "120400;2;;1204;Genève;Zentrum Postleitzahl;Centre code postal;Centro codice postale;Postal code center;378.0;2500266.0;1117874.0;46.200861;6.146583",
  "66;1;SAE;;Säntis;Station;Station;Stazione;Station;2501.0;2744200.0;1234920.0;47.249447;9.343469",
  "900001;3;;;Matterhorn;Berggipfel;Sommet;Vetta;Mountain peak;4478.0;2617480.0;1091670.0;45.976590;7.658450",
  "",
].join("\n");

const run = "202611231500";
const older = "202611231400";
const base = "https://data.geo.admin.ch/ch.meteoschweiz.ogd-local-forecasting/20261123-ch";

const asset = (r: string, p: string) => [`vnut12.lssw.${r}.${p}.csv`, { href: `${base}/vnut12.lssw.${r}.${p}.csv` }];

// The 15:00 run is still uploading (no symbol file yet), so 14:00 must be used.
export const mockItem = {
  id: "20261123-ch",
  assets: Object.fromEntries([
    asset(older, "tre200px"),
    asset(older, "tre200pn"),
    asset(older, "rka150p0"),
    asset(older, "jp2000d0"),
    asset(older, "tre200h0"),
    asset(run, "tre200px"),
    asset(run, "tre200pn"),
    asset(run, "rka150p0"),
  ]),
};

const rows = (param: string, values: Record<string, string[]>) =>
  [
    `point_id;point_type_id;Date;${param}`,
    ...Object.entries(values).flatMap(([id, vals]) =>
      vals.map((v, i) => `${id};${id.length > 3 ? 2 : 1};2026112${3 + i}0000;${v}`)
    ),
    "",
  ].join("\n");

export const mockParamCsv: Record<string, string> = {
  tre200px: rows("tre200px", { "186000": ["8.5", "7.8", "6.3"], "120400": ["8.0", "7.1", "5.9"], "66": ["-7.2", "-9.0", "-10.4"] }),
  tre200pn: rows("tre200pn", { "186000": ["4.1", "3.2", "1.0"], "120400": ["4.7", "3.9", "2.2"], "66": ["-8.1", "-12.5", "-13.0"] }),
  rka150p0: rows("rka150p0", { "186000": ["16.0", "2.4", "0.0"], "120400": ["5.9", "1.1", "0.0"], "66": ["17.9", "6.0", "0.2"] }),
  jp2000d0: rows("jp2000d0", { "186000": ["17", "6", "1"], "120400": ["17", "3", "2"], "66": ["19", "8", "4"] }),
};

export const FORECAST_RUN = older;
