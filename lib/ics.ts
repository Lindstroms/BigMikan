import type { Activity } from "./types";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toIcsDate(dateStr: string): string {
  return dateStr.replaceAll("-", "");
}

// ICS all-day events use an exclusive DTEND, i.e. the day after the event
// actually ends, or the calendar app shows a one-day-short range.
function dayAfter(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildIcsCalendar(activities: Activity[]): string {
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(
    now.getUTCDate(),
  )}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(
    now.getUTCSeconds(),
  )}Z`;

  const events = activities.map((a) =>
    [
      "BEGIN:VEVENT",
      `UID:${a.id}@bigmikan.app`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${toIcsDate(a.start_date)}`,
      `DTEND;VALUE=DATE:${dayAfter(a.end_date ?? a.start_date)}`,
      `SUMMARY:${icsEscape(a.name)}`,
      `DESCRIPTION:${icsEscape("Big Mikan - sejlads")}`,
      "END:VEVENT",
    ].join("\r\n"),
  );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Big Mikan//Tilmelding//DA",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
