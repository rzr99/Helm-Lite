import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, Avatar, btnSecondary, btnPrimary, inputClass } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { todayStr } from "@/lib/dates";
import { markDay } from "@/app/attendance/actions";
import {
  ATT,
  ATT_ORDER,
  attendanceSummary,
  dayNum,
  monthMeta,
  type AttendanceStatus,
} from "@/lib/attendance";

export const dynamic = "force-dynamic";

type Person = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
};

// Segmented radio options for the owner's daily marking form.
const MARK_OPTIONS: { value: string; code: string; on: string }[] = [
  { value: "present", code: "P", on: "peer-checked:border-green-600 peer-checked:bg-green-600 peer-checked:text-white" },
  { value: "late", code: "L", on: "peer-checked:border-amber-600 peer-checked:bg-amber-600 peer-checked:text-white" },
  { value: "half_day", code: "HD", on: "peer-checked:border-purple-600 peer-checked:bg-purple-600 peer-checked:text-white" },
  { value: "absent", code: "A", on: "peer-checked:border-red-600 peer-checked:bg-red-600 peer-checked:text-white" },
  { value: "clear", code: "—", on: "peer-checked:border-zinc-500 peer-checked:bg-zinc-500 peer-checked:text-white" },
];

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const owner = profile.role === "owner";
  const today = todayStr();

  const { month: monthParam, date: dateParam } = await searchParams;
  const M = monthMeta(monthParam);
  const selDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

  // Who appears in the sheet.
  let people: Person[];
  if (owner) {
    const { data } = await supabase
      .from("users")
      .select("id, full_name, avatar_url, role")
      .eq("active", true)
      .neq("role", "owner")
      .order("full_name");
    people = (data ?? []) as Person[];
  } else {
    people = [
      {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: profile.role,
      },
    ];
  }

  // This month's marks. RLS scopes agents to their own rows automatically.
  const { data: rowsData } = await supabase
    .from("attendance")
    .select("user_id, date, status")
    .gte("date", M.first)
    .lte("date", M.last)
    .limit(100000);

  const byUser = new Map<string, Map<string, AttendanceStatus>>();
  for (const r of (rowsData ?? []) as {
    user_id: string;
    date: string;
    status: AttendanceStatus;
  }[]) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, new Map());
    byUser.get(r.user_id)!.set(r.date, r.status);
  }

  const summaryFor = (userId: string) =>
    attendanceSummary([...(byUser.get(userId)?.values() ?? [])]);

  const mySummary = owner ? null : summaryFor(profile.id);

  return (
    <Shell
      profile={profile}
      active="attendance"
      title="Attendance"
      subtitle={
        owner
          ? "Mark each person's day. Everyone sees only their own."
          : "Your attendance for the month."
      }
    >
      {/* ---------- Rules ---------- */}
      <Card
        title="The rules"
        description="Office starts at 4:00 PM — be in before 4:15."
      >
        <ul className="flex flex-col gap-2 text-sm text-[var(--text)]">
          <li className="flex gap-2">
            <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: ATT.present.tint, boxShadow: `inset 0 0 0 1.5px ${ATT.present.dot}` }} />
            <span>In <b>before 4:15 PM</b> → marked <b>Present (P)</b>.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: ATT.late.tint, boxShadow: `inset 0 0 0 1.5px ${ATT.late.dot}` }} />
            <span>After <b>4:15 PM</b> → marked <b>Late (L)</b>.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: ATT.half_day.tint, boxShadow: `inset 0 0 0 1.5px ${ATT.half_day.dot}` }} />
            <span>After <b>4:30 PM</b> → marked <b>Half day (HD)</b>.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: ATT.absent.tint, boxShadow: `inset 0 0 0 1.5px ${ATT.absent.dot}` }} />
            <span>No show → marked <b>Absent (A)</b>.</span>
          </li>
        </ul>
        <div className="mt-4 flex flex-col gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--sunken)] p-4 text-sm text-[var(--text-muted)]">
          <p><b className="text-[var(--text)]">3 lates</b> → your attendance allowance is removed from salary.</p>
          <p>After that, every <b className="text-[var(--text)]">2 lates</b> = <b className="text-[var(--text)]">1 half day</b>.</p>
          <p>Every <b className="text-[var(--text)]">2 half days</b> = <b className="text-[var(--text)]">1 absent</b> — salary is deducted accordingly.</p>
        </div>
      </Card>

      {/* ---------- Agent's own summary ---------- */}
      {!owner && mySummary && (
        <Card title={`Your ${M.label}`}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ATT_ORDER.map((s) => {
              const n =
                s === "present"
                  ? mySummary.present
                  : s === "late"
                    ? mySummary.late
                    : s === "half_day"
                      ? mySummary.halfMarked
                      : mySummary.absentMarked;
              return (
                <div
                  key={s}
                  className="rounded-xl border border-[var(--border)] p-3"
                  style={{ backgroundColor: ATT[s].tint }}
                >
                  <div className="text-2xl font-bold" style={{ color: ATT[s].dot }}>
                    {n}
                  </div>
                  <div className="text-xs font-medium text-[var(--text-muted)]">
                    {ATT[s].label}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span
              className={
                "rounded-full px-3 py-1 text-xs font-semibold " +
                (mySummary.allowanceLost
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300")
              }
            >
              Allowance {mySummary.allowanceLost ? "lost" : "intact"}
            </span>
            {mySummary.halfFromLates > 0 && (
              <span className="text-[var(--text-muted)]">
                +{mySummary.halfFromLates} half-day{mySummary.halfFromLates > 1 ? "s" : ""} from extra lates
              </span>
            )}
            {mySummary.absentsFromHalf > 0 && (
              <span className="text-[var(--text-muted)]">
                · +{mySummary.absentsFromHalf} absent{mySummary.absentsFromHalf > 1 ? "s" : ""} from half-days
              </span>
            )}
          </div>
        </Card>
      )}

      {/* ---------- Owner: mark a day ---------- */}
      {owner && (
        <Card
          title="Mark a day"
          description="Pick a date, set each person, and save. Leave someone blank to not change them."
        >
          <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="month" value={M.month} />
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                Date
              </label>
              <input
                type="date"
                name="date"
                defaultValue={selDate}
                className={inputClass + " max-w-48"}
              />
            </div>
            <button type="submit" className={btnSecondary}>
              Load day
            </button>
          </form>

          {people.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              No team members to mark yet.
            </p>
          ) : (
            <form action={markDay} className="flex flex-col gap-2">
              <input type="hidden" name="date" value={selDate} />
              <p className="text-sm font-semibold text-[var(--text)]">
                {selDate === today ? "Today · " : ""}
                {selDate}
              </p>
              {people.map((p) => {
                const sel = byUser.get(p.id)?.get(selDate) ?? null;
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2"
                  >
                    <input type="hidden" name="user_ids" value={p.id} />
                    <span className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                      <Avatar name={p.full_name} src={p.avatar_url} size={7} />
                      {p.full_name}
                    </span>
                    <div className="flex gap-1">
                      {MARK_OPTIONS.map((o) => (
                        <label key={o.value} className="cursor-pointer">
                          <input
                            type="radio"
                            name={`status_${p.id}`}
                            value={o.value}
                            defaultChecked={sel === o.value}
                            className="peer sr-only"
                          />
                          <span
                            className={
                              "inline-flex h-8 w-9 items-center justify-center rounded-md border border-[var(--border-strong)] text-xs font-bold text-[var(--text-muted)] transition-colors hover:text-[var(--text)] " +
                              o.on
                            }
                          >
                            {o.code}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button type="submit" className={btnPrimary + " mt-2 self-start"}>
                Save {selDate === today ? "today" : "day"}
              </button>
            </form>
          )}
        </Card>
      )}

      {/* ---------- Month sheet ---------- */}
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--text)]">{M.label}</h2>
          <div className="flex items-center gap-1">
            <Link href={`/attendance?month=${M.prev}`} className={btnSecondary + " px-3"}>
              ←
            </Link>
            <Link href="/attendance" className={btnSecondary + " px-3"}>
              This month
            </Link>
            <Link href={`/attendance?month=${M.next}`} className={btnSecondary + " px-3"}>
              →
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] text-[var(--text-faint)]">
              <tr>
                <th className="sticky left-0 z-10 bg-[var(--surface)] px-4 py-2 font-semibold">
                  Person
                </th>
                {M.days.map((d) => (
                  <th
                    key={d}
                    className={
                      "px-0 py-2 text-center font-mono text-[10px] font-semibold " +
                      (d === today ? "text-amber-600" : "")
                    }
                  >
                    {dayNum(d)}
                  </th>
                ))}
                {ATT_ORDER.map((s) => (
                  <th key={s} className="px-1.5 py-2 text-center font-mono text-[10px] font-semibold" title={ATT[s].label}>
                    {ATT[s].code}
                  </th>
                ))}
                <th className="px-3 py-2 font-semibold">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {people.map((p) => {
                const marks = byUser.get(p.id);
                const s = summaryFor(p.id);
                return (
                  <tr key={p.id}>
                    <td className="sticky left-0 z-10 bg-[var(--surface)] px-4 py-2">
                      <span className="flex items-center gap-2 font-medium text-[var(--text)]">
                        <Avatar name={p.full_name} src={p.avatar_url} size={7} />
                        <span className="whitespace-nowrap">{p.full_name}</span>
                      </span>
                    </td>
                    {M.days.map((d) => {
                      const st = marks?.get(d);
                      return (
                        <td
                          key={d}
                          className={
                            "p-0.5 text-center " +
                            (d === today ? "bg-amber-500/5" : "")
                          }
                        >
                          {st ? (
                            <span
                              title={`${d} — ${ATT[st].label}`}
                              className="mx-auto flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold"
                              style={{ backgroundColor: ATT[st].tint, color: ATT[st].dot }}
                            >
                              {ATT[st].code}
                            </span>
                          ) : (
                            <span className="text-[var(--text-faint)]">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-1.5 py-2 text-center font-semibold" style={{ color: ATT.present.dot }}>{s.present || ""}</td>
                    <td className="px-1.5 py-2 text-center font-semibold" style={{ color: ATT.late.dot }}>{s.late || ""}</td>
                    <td className="px-1.5 py-2 text-center font-semibold" style={{ color: ATT.half_day.dot }}>{s.halfMarked || ""}</td>
                    <td className="px-1.5 py-2 text-center font-semibold" style={{ color: ATT.absent.dot }}>{s.absentMarked || ""}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        {s.allowanceLost && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                            allowance lost
                          </span>
                        )}
                        {s.halfFromLates > 0 && (
                          <span className="text-[var(--text-muted)]">+{s.halfFromLates} HD</span>
                        )}
                        {s.absentsFromHalf > 0 && (
                          <span className="text-[var(--text-muted)]">+{s.absentsFromHalf} A</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </Shell>
  );
}
