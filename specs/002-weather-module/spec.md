# Spec: Weather & Hydrology Module

**Spec ID:** 002  
**Status:** Implemented ✅  
**Module:** weather  
**Tools:** 6  
**Author:** Vikram Gorla  
**Last Updated:** 2026-03-07

---

## Problem Statement

AI assistants need real-time Swiss weather and river/lake data to answer questions like "what's the weather in Lugano vs Zürich?" or the quintessentially Swiss question: "is the Aare warm enough to swim in Bern today?". MeteoSwiss and BAFU data is official and high quality but requires knowing obscure station codes and API formats.

## Business Value

- Swiss weather culture is intense — MeteoSwiss is the authoritative source
- Aare swimming in Bern is a beloved local tradition; real-time water temperature is a genuine everyday need
- BAFU hydrology covers floods, navigation, recreation — highly relevant
- api.existenz.ch provides both MeteoSwiss + BAFU in a unified zero-auth API
- Historical data enables trend analysis (e.g. "how has Bern's summer temperature changed?")

## User Stories

### P0 — Must have (shipped in v0.1.0)

**US-001:** As a user, I can get current weather at a Swiss MeteoSwiss station.

*Acceptance Criteria:*
- `get_weather(station="BER")` returns current temperature, precipitation, wind
- Response includes all available parameters (tt, rr, ff, rh, ss, p0)
- Timestamp is within the last 30 minutes

**US-002:** As a user, I can check if the Aare is warm enough to swim.

*Acceptance Criteria:*
- `get_water_level(station="2135")` returns Wassertemperatur for Aare/Bern
- Response includes water level (Pegel) and discharge (AbflussMittelwert)

**US-003:** As a user, I can discover available weather stations by name/canton.

*Acceptance Criteria:*
- `list_weather_stations()` returns ≥100 stations
- Each station has code, name, coordinates, altitude, canton

### P1 — High value

**US-004:** Historical weather queries — "how cold was Bern last January?"

*Acceptance Criteria:*
- `get_weather_history(station="BER", start_date="2024-01-01", end_date="2024-01-31")` returns daily data
- Data covers all available parameters over the range

**US-005:** Find all hydro monitoring stations.

*Acceptance Criteria:*
- `list_hydro_stations()` returns ≥200 stations with code and coordinates

**US-006:** Historical hydrology — "what was the Aare level last summer?"

*Acceptance Criteria:*
- `get_water_history(station="2135", start_date, end_date)` returns daily level/temp data

### P2 — Nice to have

**US-007:** Multi-station weather comparison (e.g. "Lugano vs Zürich vs Bern").
**US-008:** Weather forecasts (not available in this API — future work).

### P3 — Future

**US-009:** MeteoSwiss radar images and precipitation forecast.
**US-010:** Avalanche bulletin integration.

## Tools

| Tool | Method | Endpoint |
|------|--------|----------|
| `get_weather` | GET | `/apiv1/smn/latest` |
| `list_weather_stations` | GET | `/apiv1/smn/locations` |
| `get_weather_history` | GET | `/apiv1/smn/daterange` |
| `get_water_level` | GET | `/apiv1/hydro/latest` |
| `list_hydro_stations` | GET | `/apiv1/hydro/locations` |
| `get_water_history` | GET | `/apiv1/hydro/daterange` |

## API Source

**Base URL:** `https://api.existenz.ch/apiv1`  
**Docs:** https://api.existenz.ch  
**Auth:** None (app + version params recommended as courtesy)  
**Rate limits:** No documented limit; use `app=mcp-swiss&version=0.1.0` params  
**Data source:** MeteoSwiss (SMN network) + BAFU (Federal Office for the Environment)

## Key Station Codes

### Weather (MeteoSwiss SMN)

| Code | Location |
|------|----------|
| BER | Bern / Zollikofen |
| SMA | Zürich / Fluntern |
| KLO | Zürich / Kloten |
| LUG | Lugano |
| GVE | Geneva |
| REH | Zürich / Affoltern |

### Hydrology (BAFU)

| Code | Location |
|------|----------|
| 2135 | Aare — Bern, Schönau |
| 2243 | Rhein — Basel, Rheinhalle |

## Parameter Codes

| Code | Meaning | Unit |
|------|---------|------|
| tt | Temperature | °C |
| rr | Precipitation | mm |
| ss | Sunshine duration | min/h |
| rh | Relative humidity | % |
| ff | Wind speed | km/h |
| fu | Wind gust | km/h |
| p0 | Pressure | hPa |

## Acceptance Criteria (Integration)

- [ ] `get_weather(station="BER")` returns temperature value within realistic range (-30 to +45°C)
- [ ] `list_weather_stations()` returns ≥100 stations
- [ ] `get_weather_history(station="BER", start_date="2024-01-01", end_date="2024-01-07")` returns 7 days of data
- [ ] `get_water_level(station="2135")` returns Wassertemperatur and Pegel
- [ ] `list_hydro_stations()` returns ≥200 stations
- [ ] `get_water_history(station="2135", start_date, end_date)` returns historical readings

## Integration Tests (Human Tester)

1. Ask Claude: *"What's the weather in Bern right now?"* — verify realistic temperature, humidity, wind
2. Ask Claude: *"Is it worth swimming in the Aare in Bern today?"* — verify water temp + level returned
3. Ask Claude: *"Compare weather in Lugano vs Zürich right now"* — verify both stations queried and compared
4. Ask Claude: *"How cold was Bern in January 2024?"* — verify historical temperature data

## Known Limitations

- No weather forecasts — api.existenz.ch provides current + historical only
- Station data is 10-minute intervals; history aggregated to daily
- `list_hydro_stations()` may be slow (400+ stations)
- Some parameters (e.g. `ss` sunshine) may be null overnight
- Station codes are not intuitive — LUG=Lugano but ZUE does NOT work; use SMA for Zürich
