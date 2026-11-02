/**
 * Calendar date in Switzerland as YYYY-MM-DD. `toISOString()` gives the UTC
 * date, which is one day behind between midnight and 01:00 (CET) or 02:00
 * (CEST) local time.
 */
export function swissToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
