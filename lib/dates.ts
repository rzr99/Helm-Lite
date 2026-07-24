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

// This month, 1st → last day, based on the Karachi calendar date.
export function monthRange() {
  const [y, m] = todayStr().split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0)); // day 0 of next month = last of this
  return { from: iso(first), to: iso(last) };
}
