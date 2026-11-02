import { deflateRawSync } from "node:zlib";

// ── Fixtures for Swiss Post (PLZ) module tests ───────────────────────────────

/** Response from MapServer/find for PLZ 8001 */
export const mockPlzFindResponse = {
  results: [
    {
      featureId: "4385",
      id: "4385",
      layerBodId: "ch.swisstopo-vd.ortschaftenverzeichnis_plz",
      layerName: "Amtliches Ortschaftenverzeichnis",
      attributes: {
        plz: 8001,
        zusziff: "00",
        langtext: "Zürich",
        status: "REAL",
        modified: "28.02.2024",
        label: 8001,
        bgdi_created: "01.03.2026",
      },
    },
  ],
};

/** Response from SearchServer (origins=zipcode) for PLZ 8001 */
export const mockSearchZipcodeResponse = {
  results: [
    {
      id: 4385,
      weight: 100,
      attrs: {
        detail: "8001",
        featureId: "4385",
        geom_quadindex: "030003",
        geom_st_box2d: "BOX(8.528869 47.363094,8.553853 47.383059)",
        label: "<b>8001 - Zürich</b>",
        lat: 47.372947692871094,
        lon: 8.541608810424805,
        num: 1,
        objectclass: "",
        origin: "zipcode",
        rank: 1,
        x: 8.541608810424805,
        y: 47.372947692871094,
        zoomlevel: 4294967295,
      },
    },
  ],
};

/** Response from MapServer/identify for canton at Zürich coords */
export const mockCantonIdentifyResponse = {
  results: [
    {
      layerBodId: "ch.swisstopo.swissboundaries3d-kanton-flaeche.fill",
      layerName: "Kantonsgrenzen",
      featureId: 1,
      id: 1,
      attributes: {
        ak: "ZH",
        name: "Zürich",
        flaeche: 172894.0,
        label: "Zürich",
      },
    },
  ],
};

/** Response from MapServer/find for langtext=Zürich */
export const mockSearchByNameResponse = {
  results: [
    {
      featureId: "4385",
      id: "4385",
      layerBodId: "ch.swisstopo-vd.ortschaftenverzeichnis_plz",
      layerName: "Amtliches Ortschaftenverzeichnis",
      attributes: {
        plz: 8001,
        zusziff: "00",
        langtext: "Zürich",
        status: "REAL",
        modified: "28.02.2024",
        label: 8001,
      },
    },
    {
      featureId: "4386",
      id: "4386",
      layerBodId: "ch.swisstopo-vd.ortschaftenverzeichnis_plz",
      layerName: "Amtliches Ortschaftenverzeichnis",
      attributes: {
        plz: 8002,
        zusziff: "00",
        langtext: "Zürich",
        status: "REAL",
        modified: "28.02.2024",
        label: 8002,
      },
    },
    {
      featureId: "4387",
      id: "4387",
      layerBodId: "ch.swisstopo-vd.ortschaftenverzeichnis_plz",
      layerName: "Amtliches Ortschaftenverzeichnis",
      attributes: {
        plz: 8003,
        zusziff: "00",
        langtext: "Zürich",
        status: "REAL",
        modified: "28.02.2024",
        label: 8003,
      },
    },
  ],
};

/** Empty results fixture */
export const mockEmptyResults = {
  results: [],
};

// ── Amtliches Ortschaftenverzeichnis (PLZ register) ─────────────────────────

/**
 * A slice of the published register CSV, verbatim apart from the row selection.
 * One row per locality/municipality pair, with the canton and the share of the
 * locality's addresses that fall in it.
 */
export const mockPlzRegisterCsv = [
  "Ortschaftsname;PLZ4;Zusatzziffer;ZIP_ID;Gemeindename;BFS-Nr;Kantonskürzel;Adressenanteil;E;N;Sprache;Validity",
  "Zürich;8001;00;4385;Zürich;261;ZH;100 %;2683212.000;1247269.000;de;2008-07-01",
  "Zürich;8002;00;4386;Zürich;261;ZH;100 %;2682312.000;1246269.000;de;2008-07-01",
  "Winterthur;8400;00;4450;Winterthur;230;ZH;100 %;2697212.000;1261269.000;de;2008-07-01",
  "Zug;6300;00;3404;Zug;1711;ZG;99.519 %;2681312.000;1224669.000;de;2008-07-01",
  "Zug;6300;00;3404;Baar;1701;ZG;0.481 %;2681912.000;1226669.000;de;2008-07-01",
  "Zugerberg;6300;05;3423;Zug;1711;ZG;100 %;2683312.000;1222669.000;de;2008-07-01",
  "Sattel;6417;00;3462;Sattel;1372;SZ;97.184 %;2692312.000;1216669.000;de;2008-07-01",
  "Sattel;6417;00;3462;Oberägeri;1706;ZG;1.155 %;2691312.000;1217669.000;de;2008-07-01",
  "Mühlau;5642;00;2963;Mühlau;4083;AG;98.065 %;2669312.000;1235669.000;de;2008-07-01",
  "Mühlau;5642;00;2963;Hünenberg;1703;ZG;0.645 %;2670312.000;1234669.000;de;2008-07-01",
  "Vaduz;9490;00;5393;Vaduz;7001;;100 %;2757674.000;1223440.000;de;2008-07-01",
  "",
].join("\n");

/** Wrap a CSV in a one-entry ZIP, the way data.geo.admin.ch serves the register. */
export function buildRegisterZip(csv: string, fileName = "AMTOVZ_CSV_LV95.csv"): Buffer {
  const name = Buffer.from(fileName, "utf8");
  const content = Buffer.from("\ufeff" + csv, "utf8");
  const deflated = deflateRawSync(content);
  const crc = crc32(content);

  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(8, 8); // deflate
  localHeader.writeUInt32LE(crc, 14);
  localHeader.writeUInt32LE(deflated.length, 18);
  localHeader.writeUInt32LE(content.length, 22);
  localHeader.writeUInt16LE(name.length, 26);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(deflated.length, 20);
  central.writeUInt32LE(content.length, 24);
  central.writeUInt16LE(name.length, 28);

  const localSize = localHeader.length + name.length + deflated.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length + name.length, 12);
  eocd.writeUInt32LE(localSize, 16);

  return Buffer.concat([localHeader, name, deflated, central, name, eocd]);
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

/** The register archive as served by data.geo.admin.ch. */
export const mockPlzRegisterZip = (): Buffer => buildRegisterZip(mockPlzRegisterCsv);

/** Compresses to a few KB, inflates past the module's 32 MB cap. */
