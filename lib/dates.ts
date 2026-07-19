// The team works on Pakistan time, so all "what day is it" decisions
// use Asia/Karachi rather than the server's UTC clock.
export function todayStr() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
  }).format(new Date());
}
