import type { HabitSchedule } from "./types";

/** Map day names (as stored in schedule.days) to ICS BYDAY abbreviations */
const DAY_TO_ICS: Record<string, string> = {
  monday: "MO",
  tuesday: "TU",
  wednesday: "WE",
  thursday: "TH",
  friday: "FR",
  saturday: "SA",
  sunday: "SU",
  // Handle abbreviated forms too
  mon: "MO",
  tue: "TU",
  wed: "WE",
  thu: "TH",
  fri: "FR",
  sat: "SA",
  sun: "SU",
};

/** Escape special characters for ICS text fields */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Format a Date to ICS DTSTART/DTEND format: YYYYMMDDTHHMMSS */
function formatIcsDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${h}${min}${s}`;
}

/** Format a Date to ICS DTSTAMP format in UTC: YYYYMMDDTHHMMSSZ */
function formatIcsTimestamp(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

/**
 * Parse a time string like "07:00" or "7:00 AM" into hours and minutes.
 */
function parseTime(time: unknown): { hours: number; minutes: number } {
  // Ensure time is a string
  if (typeof time !== "string" || !time) {
    return { hours: 9, minutes: 0 }; // Default to 9:00 AM
  }

  // Handle "HH:MM" format
  const match24 = time.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return { hours: parseInt(match24[1]), minutes: parseInt(match24[2]) };
  }

  // Handle "H:MM AM/PM" format
  const match12 = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1]);
    const minutes = parseInt(match12[2]);
    const period = match12[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return { hours, minutes };
  }

  // Default fallback
  return { hours: 9, minutes: 0 };
}

export interface GenerateIcsParams {
  habitId: string;
  habitDescription: string;
  habitRationale: string;
  schedule: HabitSchedule;
  appUrl: string;
}

/**
 * Generate an .ics file string containing two recurring events:
 * 1. The habit itself (with duration and description)
 * 2. A 5-minute check-in immediately after (with link to Scaffold)
 *
 * Events recur weekly on the scheduled days, capped at 3 months (~13 weeks).
 */
export function generateHabitIcs(params: GenerateIcsParams): string {
  const { habitId, habitDescription, habitRationale, schedule, appUrl } =
    params;

  const now = new Date();
  const dtstamp = formatIcsTimestamp(now);

  // Parse schedule
  const { hours, minutes } = parseTime(schedule.time);
  const durationMinutes = schedule.duration_minutes || 30;
  const daysPerWeek = schedule.days.length || 1;

  // Calculate COUNT for ~3 months (13 weeks)
  const totalOccurrences = daysPerWeek * 13;

  // Build BYDAY string
  const byDay = schedule.days
    .map((d) => DAY_TO_ICS[d.toLowerCase()])
    .filter(Boolean)
    .join(",");

  // Build start date: next occurrence from today
  const habitStart = new Date(now);
  habitStart.setHours(hours, minutes, 0, 0);
  // If today's time already passed, move to tomorrow
  if (habitStart <= now) {
    habitStart.setDate(habitStart.getDate() + 1);
  }

  // Habit end = start + duration
  const habitEnd = new Date(habitStart);
  habitEnd.setMinutes(habitEnd.getMinutes() + durationMinutes);

  // Check-in start = habit end
  const checkInStart = new Date(habitEnd);
  const checkInEnd = new Date(checkInStart);
  checkInEnd.setMinutes(checkInEnd.getMinutes() + 5);

  const habitUid = crypto.randomUUID();
  const checkInUid = crypto.randomUUID();

  const rrule = `RRULE:FREQ=WEEKLY;BYDAY=${byDay};COUNT=${totalOccurrences}`;

  const checkInUrl = `${appUrl}/habit/${habitId}/check-in`;

  const habitDescriptionEscaped = escapeIcsText(
    `${habitDescription}\n\n${habitRationale}`
  );
  const checkInDescriptionEscaped = escapeIcsText(
    `Time to log your habit in Scaffold!\n\n${checkInUrl}`
  );

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Scaffold//Habit Coach//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",

    // Event 1: The Habit
    "BEGIN:VEVENT",
    `UID:${habitUid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatIcsDateTime(habitStart)}`,
    `DTEND:${formatIcsDateTime(habitEnd)}`,
    rrule,
    `SUMMARY:${escapeIcsText(habitDescription)}`,
    `DESCRIPTION:${habitDescriptionEscaped}`,
    // 10-minute reminder
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Time for your habit!",
    "END:VALARM",
    "END:VEVENT",

    // Event 2: The Check-in
    "BEGIN:VEVENT",
    `UID:${checkInUid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatIcsDateTime(checkInStart)}`,
    `DTEND:${formatIcsDateTime(checkInEnd)}`,
    rrule,
    `SUMMARY:${escapeIcsText(`Scaffold Check-in: ${habitDescription}`)}`,
    `DESCRIPTION:${checkInDescriptionEscaped}`,
    `URL:${checkInUrl}`,
    // Reminder at the start
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Log your habit in Scaffold!",
    "END:VALARM",
    "END:VEVENT",

    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

export interface GenerateFinalCheckInIcsParams {
  habitId: string;
  habitDescription: string;
  scheduleTime: string; // e.g. "07:00" — the habit's usual time
  appUrl: string;
}

/**
 * Generate a one-off .ics file for a single 5-minute final check-in,
 * scheduled 1 week from now at the habit's usual time.
 */
export function generateFinalCheckInIcs(
  params: GenerateFinalCheckInIcsParams
): string {
  const { habitId, habitDescription, scheduleTime, appUrl } = params;

  const now = new Date();
  const dtstamp = formatIcsTimestamp(now);

  const { hours, minutes } = parseTime(scheduleTime);

  // Schedule 1 week from now at the habit's usual time
  const checkInStart = new Date(now);
  checkInStart.setDate(checkInStart.getDate() + 7);
  checkInStart.setHours(hours, minutes, 0, 0);

  const checkInEnd = new Date(checkInStart);
  checkInEnd.setMinutes(checkInEnd.getMinutes() + 5);

  const uid = crypto.randomUUID();
  const checkInUrl = `${appUrl}/habit/${habitId}/check-in`;

  const descriptionEscaped = escapeIcsText(
    `Time for your final Scaffold check-in!\n\nComplete your final check-in to wrap up your coaching journey: ${checkInUrl}`
  );

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Scaffold//Habit Coach//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",

    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatIcsDateTime(checkInStart)}`,
    `DTEND:${formatIcsDateTime(checkInEnd)}`,
    `SUMMARY:${escapeIcsText(`Scaffold Final Check-in: ${habitDescription}`)}`,
    `DESCRIPTION:${descriptionEscaped}`,
    `URL:${checkInUrl}`,
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Time for your final Scaffold check-in!",
    "END:VALARM",
    "END:VEVENT",

    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}
