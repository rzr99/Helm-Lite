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
