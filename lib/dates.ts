// The team works on Pakistan time, so all "what day is it" decisions
// use Asia/Karachi rather than the server's UTC clock.
const karachiFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Karachi",
});

export function todayStr() {
  return karachiFmt.format(new Date());
}

// Converts any timestamp to the Karachi calendar date it happened on.
export function toKarachiDate(timestamp: string | Date) {
  return karachiFmt.format(new Date(timestamp));
}

export function daysAgoStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return karachiFmt.format(d);
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

// This week, Monday → Sunday, based on the Karachi calendar date.
export function weekRange() {
  const [y, m, d] = todayStr().split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const backToMonday = (base.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() - backToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { from: iso(monday), to: iso(sunday) };
}

// Is this YYYY-MM-DD a Sunday? (Sundays are the team's day off.)
export function isSunday(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

// Count the working days (Mon–Sat, excluding Sundays) in the month that the
// `from` (YYYY-MM-01) → `to` (YYYY-MM-last) range spans.
export function workingDaysInMonth(from: string, to: string) {
  const [y, m] = from.split("-").map(Number);
  const last = Number(to.slice(8, 10));
  let count = 0;
  for (let d = 1; d <= last; d++) {
    if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() !== 0) count++;
  }
  return count;
}

// This month, 1st → last day, based on the Karachi calendar date.
export function monthRange() {
  const [y, m] = todayStr().split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0)); // day 0 of next month = last of this
  return { from: iso(first), to: iso(last) };
}
