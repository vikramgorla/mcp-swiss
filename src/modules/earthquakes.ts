/**
 * Swiss Earthquake module
 *
 * Data source: Swiss Seismological Service (SED) at ETH Zürich
 * API: FDSN Event Web Service — https://eida.ethz.ch/fdsnws/event/1/
 * Format: Pipe-delimited text (format=text)
 * Auth: None required
 *
 * This module provides:
 *   - get_recent_earthquakes: recent seismic events in/near Switzerland
 *   - get_earthquake_details: details of a specific event by SED event ID
 *   - search_earthquakes_by_location: earthquakes near given coordinates
 */

import { buildUrl, fetchBody } from "../utils/http.js";

// SED's EIDA node serves the same catalog as arclink.ethz.ch, which is
// plain HTTP only (nothing listens on 443).
const BASE = "https://eida.ethz.ch/fdsnws/event/1/query";

// The SED catalogue is regional already — a year of events at M>=0 spans
// 45.4–48.3 N and 5.7–11.0 E — but the service is a generic FDSN endpoint, so
// the box is sent explicitly rather than assumed.
const CH_BOX = {
  minlatitude: 45.0,
  maxlatitude: 48.5,
  minlongitude: 5.5,
  maxlongitude: 11.5,
};

// Same ceiling as search_earthquakes_by_location. Uncapped, a year at M>=0 is
// ~2200 events and half a megabyte of text.
const MAX_LIMIT = 100;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EarthquakeEvent {
  event_id: string;
  time: string;
  latitude: number;
  longitude: number;
  depth_km: number;
  magnitude: number;
  magnitude_type: string;
  location: string;
  event_type: string;
  author: string;
}

export interface EarthquakeTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ── Tool definitions ──────────────────────────────────────────────────────────

export const earthquakeTools: EarthquakeTool[] = [
  {
    name: "get_recent_earthquakes",
    description:
      "Recent earthquakes in and around Switzerland (SED, ETH Zürich)",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Past days, max 365",
          default: 30,
        },
        min_magnitude: {
          type: "number",
          default: 0.5,
        },
        limit: {
          type: "number",
          description: "max 100",
          default: 20,
        },
        include_blasts: {
          type: "boolean",
          description: "Include quarry blasts",
          default: false,
        },
      },
    },
  },
  {
    name: "get_earthquake_details",
    description:
      "Full details of one seismic event by SED event ID",
    inputSchema: {
      type: "object",
      required: ["event_id"],
      properties: {
        event_id: {
          type: "string",
          description:
            "From the other earthquake tools, e.g. smi:ch.ethz.sed/sc25a/Event/2026errxzt",
        },
      },
    },
  },
  {
    name: "search_earthquakes_by_location",
    description:
      "Earthquakes within a radius of a WGS84 point (SED)",
    inputSchema: {
      type: "object",
      required: ["lat", "lon"],
      properties: {
        lat: {
          type: "number",
          description: "Latitude (WGS84)",
        },
        lon: {
          type: "number",
          description: "Longitude (WGS84)",
        },
        radius_km: {
          type: "number",
          description: "km, max 500",
          default: 50,
        },
        days: {
          type: "number",
          description: "Past days, max 365",
          default: 90,
        },
        min_magnitude: {
          type: "number",
          default: 0.5,
        },
        limit: {
          type: "number",
          description: "max 100",
          default: 20,
        },
      },
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Clamp a numeric argument, falling back to the default when it is not a number. */
function bounded(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}

/**
 * Build an ISO date string for `now - days`.
 */
function startTimeISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 19);
}

/**
 * Fetch pipe-delimited text from FDSN event service.
 * Returns the raw text body.
 */
async function fetchFdsnText(url: string): Promise<string> {
  return fetchBody(url, { headers: { "Accept": "text/plain" }, rawStatus: true }, async (response) => {
    // 204 No Content = no events found — not an error
    if (response.status === 204) return "";
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} — ${url}`);
    }
    return response.text();
  });
}

/**
 * Parse FDSN pipe-delimited text format.
 * Header line starts with '#'. Data lines follow.
 *
 * Fields (0-indexed):
 * 0:EventID | 1:Time | 2:Latitude | 3:Longitude | 4:Depth/km
 * 5:Author  | 6:Catalog | 7:Contributor | 8:ContributorID
 * 9:MagType | 10:Magnitude | 11:MagAuthor | 12:EventLocationName | 13:EventType
 */
function parseFdsnText(text: string): EarthquakeEvent[] {
  const lines = text.trim().split("\n");
  const events: EarthquakeEvent[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const fields = trimmed.split("|");
    if (fields.length < 14) continue;

    const depthRaw = parseFloat(fields[4]);
    const magRaw = parseFloat(fields[10]);

    // Skip rows with unparseable core numeric fields
    if (isNaN(depthRaw) || isNaN(magRaw)) continue;

    events.push({
      event_id: fields[0].trim(),
      time: fields[1].trim(),
      latitude: parseFloat(fields[2]),
      longitude: parseFloat(fields[3]),
      depth_km: depthRaw,
      author: fields[5].trim(),
      magnitude_type: fields[9].trim(),
      magnitude: magRaw,
      location: fields[12].trim(),
      event_type: fields[13].trim(),
    });
  }

  return events;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleGetRecentEarthquakes(
  args: Record<string, string | number | boolean>
): Promise<string> {
  const days = bounded(args.days, 30, 1, 365);
  const minMag = Number(args.min_magnitude ?? 0.5);
  const limit = bounded(args.limit, 20, 1, MAX_LIMIT);
  const includeBlasts = args.include_blasts === true || args.include_blasts === "true";

  // One row past the cap tells us the catalogue has more without downloading it.
  const url = buildUrl(BASE, {
    ...CH_BOX,
    starttime: startTimeISO(days),
    minmagnitude: minMag,
    limit: limit + 1,
    format: "text",
    orderby: "time",
  });

  const raw = await fetchFdsnText(url);

  if (!raw) {
    return JSON.stringify({
      count: 0,
      events: [],
      source: "Swiss Seismological Service (SED), ETH Zürich",
      note: "No events found for the given criteria.",
    });
  }

  const matched = parseFdsnText(raw);
  const more = matched.length > limit;
  let events = matched.slice(0, limit);

  // Filter out quarry blasts unless explicitly requested
  if (!includeBlasts) {
    events = events.filter((e) => e.event_type.toLowerCase() !== "quarry blast");
  }

  return JSON.stringify({
    count: events.length,
    limit,
    truncated: more,
    days_searched: days,
    min_magnitude: minMag,
    include_blasts: includeBlasts,
    area: "Switzerland and its immediate surroundings",
    source: "Swiss Seismological Service (SED), ETH Zürich",
    api: "FDSN Event Web Service — https://eida.ethz.ch/fdsnws/event/1/",
    ...(more
      ? { note: `More than ${limit} events match. Raise limit (max ${MAX_LIMIT}), or narrow days/min_magnitude.` }
      : {}),
    events,
  });
}

async function handleGetEarthquakeDetails(
  args: Record<string, string>
): Promise<string> {
  const eventId = args.event_id?.trim();
  if (!eventId) {
    throw new Error("event_id is required");
  }

  const url = buildUrl(BASE, {
    eventid: eventId,
    format: "text",
  });

  const raw = await fetchFdsnText(url);

  if (!raw) {
    throw new Error(
      `No earthquake with event_id "${eventId}". Get an id from get_recent_earthquakes or search_earthquakes_by_location.`
    );
  }

  const events = parseFdsnText(raw);

  if (events.length === 0) {
    throw new Error(
      `Event "${eventId}" returned no parsable record from the SED service. Check the id with get_recent_earthquakes.`
    );
  }

  return JSON.stringify({
    source: "Swiss Seismological Service (SED), ETH Zürich",
    api: "FDSN Event Web Service — https://eida.ethz.ch/fdsnws/event/1/",
    event: events[0],
  });
}

async function handleSearchEarthquakesByLocation(
  args: Record<string, string | number>
): Promise<string> {
  const lat = Number(args.lat);
  const lon = Number(args.lon);

  if (isNaN(lat) || isNaN(lon)) {
    throw new Error("lat and lon must be valid numbers");
  }

  const radiusKm = Math.min(Number(args.radius_km ?? 50), 500);
  const days = Math.min(Number(args.days ?? 90), 365);
  const minMag = Number(args.min_magnitude ?? 0.5);
  const limit = Math.min(Number(args.limit ?? 20), 100);

  // SED FDSN uses maxradius in degrees, not km. Convert: 1 degree ≈ 111.12 km
  const maxRadiusDeg = radiusKm / 111.12;

  const url = buildUrl(BASE, {
    latitude: lat,
    longitude: lon,
    maxradius: maxRadiusDeg,
    starttime: startTimeISO(days),
    minmagnitude: minMag,
    limit: limit,
    format: "text",
    orderby: "time",
  });

  const raw = await fetchFdsnText(url);

  if (!raw) {
    return JSON.stringify({
      count: 0,
      events: [],
      center: { lat, lon },
      radius_km: radiusKm,
      days_searched: days,
      min_magnitude: minMag,
      limit,
      source: "Swiss Seismological Service (SED), ETH Zürich",
      note: "No events found near the given location.",
    });
  }

  const events = parseFdsnText(raw);

  return JSON.stringify({
    count: events.length,
    center: { lat, lon },
    radius_km: radiusKm,
    days_searched: days,
    min_magnitude: minMag,
    limit,
    source: "Swiss Seismological Service (SED), ETH Zürich",
    api: "FDSN Event Web Service — https://eida.ethz.ch/fdsnws/event/1/",
    events,
  });
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function handleEarthquakes(
  name: string,
  args: Record<string, string | number | boolean>
): Promise<string> {
  switch (name) {
    case "get_recent_earthquakes":
      return handleGetRecentEarthquakes(args);
    case "get_earthquake_details":
      return handleGetEarthquakeDetails(args as Record<string, string>);
    case "search_earthquakes_by_location":
      return handleSearchEarthquakesByLocation(args as Record<string, string | number>);
    default:
      throw new Error(`Unknown earthquake tool: ${name}`);
  }
}
