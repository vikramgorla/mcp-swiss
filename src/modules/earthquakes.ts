/**
 * Swiss Earthquake module
 *
 * Data source: Swiss Seismological Service (SED) at ETH Zürich
 * API: FDSN Event Web Service — http://arclink.ethz.ch/fdsnws/event/1/
 * Format: Pipe-delimited text (format=text)
 * Auth: None required
 *
 * This module provides:
 *   - get_recent_earthquakes: recent seismic events in/near Switzerland
 *   - get_earthquake_details: details of a specific event by SED event ID
 *   - search_earthquakes_by_location: earthquakes near given coordinates
 */

import { buildUrl } from "../utils/http.js";

const BASE = "http://arclink.ethz.ch/fdsnws/event/1/query";

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
      "Get recent seismic events in and around Switzerland from the Swiss Seismological Service (SED) at ETH Zürich. " +
      "Returns earthquakes and optionally quarry blasts, sorted by most recent first.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of past days to search (default: 30, max: 365)",
        },
        min_magnitude: {
          type: "number",
          description: "Minimum magnitude filter (default: 0.5)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 20)",
        },
        include_blasts: {
          type: "boolean",
          description: "Include quarry blasts in results (default: false — earthquakes only)",
        },
      },
    },
  },
  {
    name: "get_earthquake_details",
    description:
      "Get full details for a specific seismic event by its SED (Swiss Seismological Service) event ID. " +
      "Use event IDs returned by get_recent_earthquakes or search_earthquakes_by_location.",
    inputSchema: {
      type: "object",
      required: ["event_id"],
      properties: {
        event_id: {
          type: "string",
          description:
            "The SED event ID (e.g. 'smi:ch.ethz.sed/sc25a/Event/2026errxzt'). " +
            "Obtain from get_recent_earthquakes or search_earthquakes_by_location.",
        },
      },
    },
  },
  {
    name: "search_earthquakes_by_location",
    description:
      "Search for earthquakes near a geographic location using the Swiss Seismological Service (SED) FDSN API. " +
      "Useful for finding seismic activity near a Swiss city, landmark, or custom coordinates.",
    inputSchema: {
      type: "object",
      required: ["lat", "lon"],
      properties: {
        lat: {
          type: "number",
          description: "Latitude of the center point (decimal degrees, e.g. 46.9 for Bern)",
        },
        lon: {
          type: "number",
          description: "Longitude of the center point (decimal degrees, e.g. 7.5 for Bern)",
        },
        radius_km: {
          type: "number",
          description: "Search radius in kilometres (default: 50, max: 500)",
        },
        days: {
          type: "number",
          description: "Number of past days to search (default: 90, max: 365)",
        },
        min_magnitude: {
          type: "number",
          description: "Minimum magnitude filter (default: 0.5)",
        },
      },
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  const response = await fetch(url, {
    headers: {
      "User-Agent": "mcp-swiss/1.0.0",
      "Accept": "text/plain",
    },
  });

  // 204 No Content = no events found — not an error
  if (response.status === 204) {
    return "";
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} — ${url}`);
  }

  return response.text();
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
  const days = Math.min(Number(args.days ?? 30), 365);
  const minMag = Number(args.min_magnitude ?? 0.5);
  const limit = Number(args.limit ?? 20);
  const includeBlasts = args.include_blasts === true || args.include_blasts === "true";

  const url = buildUrl(BASE, {
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
      source: "Swiss Seismological Service (SED), ETH Zürich",
      note: "No events found for the given criteria.",
    });
  }

  let events = parseFdsnText(raw);

  // Filter out quarry blasts unless explicitly requested
  if (!includeBlasts) {
    events = events.filter((e) => e.event_type.toLowerCase() !== "quarry blast");
  }

  const result = JSON.stringify({
    count: events.length,
    days_searched: days,
    min_magnitude: minMag,
    include_blasts: includeBlasts,
    source: "Swiss Seismological Service (SED), ETH Zürich",
    api: "FDSN Event Web Service — http://arclink.ethz.ch/fdsnws/event/1/",
    events,
  });

  if (result.length > 50000) {
    // Trim to stay under 50K
    const trimmed = events.slice(0, Math.max(1, Math.floor(events.length * 0.8)));
    return JSON.stringify({
      count: trimmed.length,
      truncated: true,
      days_searched: days,
      min_magnitude: minMag,
      include_blasts: includeBlasts,
      source: "Swiss Seismological Service (SED), ETH Zürich",
      api: "FDSN Event Web Service — http://arclink.ethz.ch/fdsnws/event/1/",
      events: trimmed,
    });
  }

  return result;
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
    return JSON.stringify({
      error: "Event not found",
      event_id: eventId,
      source: "Swiss Seismological Service (SED), ETH Zürich",
    });
  }

  const events = parseFdsnText(raw);

  if (events.length === 0) {
    return JSON.stringify({
      error: "Event not found or could not be parsed",
      event_id: eventId,
      source: "Swiss Seismological Service (SED), ETH Zürich",
    });
  }

  return JSON.stringify({
    source: "Swiss Seismological Service (SED), ETH Zürich",
    api: "FDSN Event Web Service — http://arclink.ethz.ch/fdsnws/event/1/",
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

  // SED FDSN uses maxradius in degrees, not km. Convert: 1 degree ≈ 111.12 km
  const maxRadiusDeg = radiusKm / 111.12;

  const url = buildUrl(BASE, {
    latitude: lat,
    longitude: lon,
    maxradius: maxRadiusDeg,
    starttime: startTimeISO(days),
    minmagnitude: minMag,
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
      source: "Swiss Seismological Service (SED), ETH Zürich",
      note: "No events found near the given location.",
    });
  }

  const events = parseFdsnText(raw);

  const result = JSON.stringify({
    count: events.length,
    center: { lat, lon },
    radius_km: radiusKm,
    days_searched: days,
    min_magnitude: minMag,
    source: "Swiss Seismological Service (SED), ETH Zürich",
    api: "FDSN Event Web Service — http://arclink.ethz.ch/fdsnws/event/1/",
    events,
  });

  if (result.length > 50000) {
    const trimmed = events.slice(0, Math.max(1, Math.floor(events.length * 0.8)));
    return JSON.stringify({
      count: trimmed.length,
      truncated: true,
      center: { lat, lon },
      radius_km: radiusKm,
      days_searched: days,
      min_magnitude: minMag,
      source: "Swiss Seismological Service (SED), ETH Zürich",
      api: "FDSN Event Web Service — http://arclink.ethz.ch/fdsnws/event/1/",
      events: trimmed,
    });
  }

  return result;
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
