import { todayStr } from "@/lib/dates";

export type AttendanceStatus = "present" | "late" | "half_day" | "absent";

export type AttMeta = {
  code: string;
  label: string;
  dot: string; // letter / marker colour (works on light + dark)
  tint: string; // low-alpha cell background (works on light + dark)
};

// Order matters: it's the column/segmented-control order everywhere.
export const ATT_ORDER: AttendanceStatus[] = [
  "present",
  "late",
  "half_day",
  "absent",
];

export const ATT: Record<AttendanceStatus, AttMeta> = {
  present: { code: "P", label: "Present", dot: "#16a34a", tint: "rgba(34,197,94,0.14)" },
  late: { code: "L", label: "Late", dot: "#d97706", tint: "rgba(217,119,6,0.16)" },
  half_day: { code: "HD", label: "Half day", dot: "#9333ea", tint: "rgba(168,85,247,0.16)" },
  absent: { code: "A", label: "Absent", dot: "#dc2626", tint: "rgba(220,38,38,0.15)" },
};

export function isAttStatus(v: string): v is AttendanceStatus {
  return (ATT_ORDER as string[]).includes(v);
}

// ---------- Month helpers ----------

export type MonthMeta = {
  month: string; // YYYY-MM
  first: string; // YYYY-MM-DD
  last: string; // YYYY-MM-DD
  days: string[]; // every YYYY-MM-DD in the month
  prev: string; // YYYY-MM
  next: string; // YYYY-MM
  label: string; // e.g. "October 2026"
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Resolve a ?month=YYYY-MM param (or today) into everything the grid needs.
export function monthMeta(monthParam?: string): MonthMeta {
  const base =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : todayStr().slice(0, 7);
  const [y, m] = base.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days: string[] = [];
  for (let d = 1; d <= lastDay; d++) days.push(`${base}-${pad(d)}`);

  const pd = new Date(Date.UTC(y, m - 2, 1));
  const nd = new Date(Date.UTC(y, m, 1));

  return {
    month: base,
    first: `${base}-01`,
    last: `${base}-${pad(lastDay)}`,
    days,
    prev: `${pd.getUTCFullYear()}-${pad(pd.getUTCMonth() + 1)}`,
    next: `${nd.getUTCFullYear()}-${pad(nd.getUTCMonth() + 1)}`,
    label: new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    }),
  };
}

// The day number ("1".."31") from a YYYY-MM-DD string, for compact column heads.
export function dayNum(dateStr: string) {
  return String(Number(dateStr.slice(8, 10)));
}

// ---------- Salary-impact rule ----------
// Rules (as set by the owner):
//   • 3 lates  → the attendance allowance is forfeited from salary.
//   • Beyond that, every 2 further lates  → counts as 1 half day.
//   • Every 2 half days (marked + from lates) → counts as 1 absent.
export type AttSummary = {
  present: number;
  late: number;
  halfMarked: number;
  absentMarked: number;
  allowanceLost: boolean;
  halfFromLates: number; // half-days produced by excess lates
  totalHalf: number; // marked half-days + half-days from lates
  absentsFromHalf: number; // absents produced by half-days
  leftoverHalf: number; // half-days remaining after pairing into absents
  totalAbsent: number; // marked absents + absents from half-days
};

export function attendanceSummary(statuses: AttendanceStatus[]): AttSummary {
  let present = 0;
  let late = 0;
  let halfMarked = 0;
  let absentMarked = 0;
  for (const s of statuses) {
    if (s === "present") present++;
    else if (s === "late") late++;
    else if (s === "half_day") halfMarked++;
    else if (s === "absent") absentMarked++;
  }

  const allowanceLost = late >= 3;
  const excessLates = Math.max(0, late - 3);
  const halfFromLates = Math.floor(excessLates / 2);
  const totalHalf = halfMarked + halfFromLates;
  const absentsFromHalf = Math.floor(totalHalf / 2);
  const leftoverHalf = totalHalf % 2;
  const totalAbsent = absentMarked + absentsFromHalf;

  return {
    present,
    late,
    halfMarked,
    absentMarked,
    allowanceLost,
    halfFromLates,
    totalHalf,
    absentsFromHalf,
    leftoverHalf,
    totalAbsent,
  };
}
