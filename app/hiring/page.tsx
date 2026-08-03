import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, EmptyState, btnPrimary } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import {
  HIRING_STATUSES,
  HIRING_BADGE,
  hiringStatusLabel,
  ratingStars,
} from "@/lib/enums";

export const dynamic = "force-dynamic";

type Candidate = {
  id: string;
  full_name: string;
  role_applied: string;
  interview_date: string | null;
  status: string;
  rating: number;
  cv_path: string | null;
};

export default async function HiringPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { status } = await searchParams;
  const activeStatus =
    status && HIRING_STATUSES.some((s) => s.value === status) ? status : null;

  const { data } = await supabase
    .from("candidates")
    .select("id, full_name, role_applied, interview_date, status, rating, cv_path")
    .order("created_at", { ascending: false });

  const all = (data ?? []) as Candidate[];
  const counts: Record<string, number> = {};
  for (const c of all) counts[c.status] = (counts[c.status] ?? 0) + 1;
  const rows = activeStatus
    ? all.filter((c) => c.status === activeStatus)
    : all;

  return (
    <Shell
      profile={profile}
      active="hiring"
      title="Hiring"
      subtitle="Owner-only. Log every candidate you interview and keep their CV on file."
      action={
        <Link href="/hiring/new" className={btnPrimary}>
          + New candidate
        </Link>
      }
    >
      <Card padded={false}>
        {/* Status filter */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-5 py-4">
          <Link
            href="/hiring"
            className={
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors " +
              (!activeStatus
                ? "bg-amber-600 text-[#140d05]"
                : "border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)]")
            }
          >
            All ({all.length})
          </Link>
          {HIRING_STATUSES.filter((s) => counts[s.value]).map((s) => (
            <Link
              key={s.value}
              href={`/hiring?status=${s.value}`}
              className={
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors " +
                (activeStatus === s.value
                  ? "bg-amber-600 text-[#140d05]"
                  : "border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)]")
              }
            >
              {s.label} ({counts[s.value]})
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            emoji="🧑‍💼"
            title={activeStatus ? "None in this stage" : "No candidates yet"}
            hint={
              activeStatus
                ? "Nothing here right now — try another filter."
                : "Log your first interview candidate and attach their CV."
            }
            actionHref={activeStatus ? undefined : "/hiring/new"}
            actionLabel={activeStatus ? undefined : "+ New candidate"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] font-mono text-[10.5px] uppercase tracking-[0.13em] text-[var(--text-faint)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Candidate</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Interview</th>
                  <th className="px-5 py-3 font-semibold">Rating</th>
                  <th className="px-5 py-3 font-semibold">CV</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-[var(--sunken)]"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/hiring/${c.id}`}
                        className="font-semibold text-[var(--text)] hover:underline"
                      >
                        {c.full_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)]">
                      {c.role_applied || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)]">
                      {c.interview_date ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-amber-600">
                      {c.rating > 0 ? ratingStars(c.rating) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)]">
                      {c.cv_path ? "📎" : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={
                          "rounded-full px-2.5 py-1 text-xs font-semibold " +
                          (HIRING_BADGE[c.status] ?? "")
                        }
                      >
                        {hiringStatusLabel(c.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Shell>
  );
}
