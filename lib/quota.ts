import { todayStr, isSunday, workingDaysBetween } from "@/lib/dates";

export type DailyTarget = {
  target: number; // leads needed today to stay on track for the month
  doneToday: number;
  sunday: boolean; // today is a day off — `target` is for the next working day
};

// Catch-up daily target. The month's quota is fixed (30 x working days); each
// day's target is whatever is still missing, spread over the working days left
// (today included). Miss a day or be absent and the shortfall lifts the coming
// days (e.g. 35); get ahead and it drops. Null outside the current month or
// once the month's quota is met.
export function dailyTarget(
  monthTarget: number,
  leadsByDay: Map<string, number>,
  monthFirst: string,
  monthLast: string
): DailyTarget | null {
  const today = todayStr();
  if (today < monthFirst || today > monthLast) return null;

  const sunday = isSunday(today);
  let doneBefore = 0;
  for (const [day, n] of leadsByDay)
    if (day < today || (sunday && day === today)) doneBefore += n;

  const daysLeft = workingDaysBetween(today, monthLast);
  if (daysLeft === 0) return null;

  const missing = monthTarget - doneBefore;
  if (missing <= 0) return null;

  return {
    target: Math.ceil(missing / daysLeft),
    doneToday: sunday ? 0 : (leadsByDay.get(today) ?? 0),
    sunday,
  };
}
