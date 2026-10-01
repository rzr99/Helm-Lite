import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import {
  ATT,
  ATT_ORDER,
  attendanceSummary,
  monthMeta,
  type AttendanceStatus,
} from "@/lib/attendance";

// Compact self-view for the dashboard: this month's P / L / HD / A counts for
// the signed-in person, plus their allowance status. Agents see only their own.
export async function AttendanceDashboardCard({ userId }: { userId: string }) {
  const supabase = await createClient();
  const M = monthMeta();

  const { data } = await supabase
    .from("attendance")
    .select("status")
    .eq("user_id", userId)
    .gte("date", M.first)
    .lte("date", M.last)
    .limit(100000);

  const statuses = (data ?? []).map((r) => r.status as AttendanceStatus);
  const s = attendanceSummary(statuses);
  const countOf = (st: AttendanceStatus) =>
    st === "present"
      ? s.present
      : st === "late"
        ? s.late
        : st === "half_day"
          ? s.halfMarked
          : s.absentMarked;

  return (
    <Card
      title={`Your attendance · ${M.label}`}
      action={
        <Link
          href="/attendance"
          className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          Open →
        </Link>
      }
    >
      {statuses.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Nothing marked yet this month.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {ATT_ORDER.map((st) => (
            <span
              key={st}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold"
              style={{ backgroundColor: ATT[st].tint, color: ATT[st].dot }}
              title={ATT[st].label}
            >
              {ATT[st].code}
              <span>{countOf(st)}</span>
            </span>
          ))}
          <span
            className={
              "ml-auto rounded-full px-3 py-1 text-xs font-semibold " +
              (s.allowanceLost
                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300")
            }
          >
            Allowance {s.allowanceLost ? "lost" : "intact"}
          </span>
        </div>
      )}
    </Card>
  );
}
