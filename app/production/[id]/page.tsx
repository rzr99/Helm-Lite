import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, btnGhost } from "@/components/ui";
import { ProdHeader } from "@/components/production-shell";
import { requireProfile } from "@/lib/profile";
import { STATUSES, jobTypeLabel, stationByKey } from "@/lib/production";
import { todayStr } from "@/lib/dates";
import { toggleStep, setJobStatus, deleteJob } from "@/app/production/actions";

export const dynamic = "force-dynamic";

type Step = {
  id: string;
  station_key: string;
  label: string;
  is_gate: boolean;
  sort: number;
  done: boolean;
};

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { data: job } = await supabase
    .from("production_jobs")
    .select("id, client_name, job_type, designer, status, deadline, notes")
    .eq("id", id)
    .single();
  if (!job) notFound();

  const { data: stepData } = await supabase
    .from("production_steps")
    .select("id, station_key, label, is_gate, sort, done")
    .eq("job_id", id)
    .order("sort");
  const steps = (stepData ?? []) as Step[];

  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  const allDone = total > 0 && done === total;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const today = todayStr();
  const overdue =
    job.deadline &&
    job.deadline < today &&
    job.status !== "delivered" &&
    job.status !== "paid";

  return (
    <>
      <ProdHeader
        title={job.client_name}
        subtitle={`${jobTypeLabel(job.job_type)}${job.designer ? " · " + job.designer : ""}`}
        back={{ href: "/production", label: "Jobs" }}
      />

      <div className="flex flex-col gap-6">
        {/* Progress + status */}
        <Card padded>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text)]/40">
                Progress
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--text)]">
                {done}
                <span className="text-[var(--text)]/40">/{total}</span>{" "}
                <span className="text-sm font-normal text-[var(--text)]/50">
                  stations
                </span>
              </p>
            </div>
            {job.deadline && (
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-[var(--text)]/40">
                  Deadline
                </p>
                <p
                  className={
                    "mt-1 text-sm font-medium " +
                    (overdue ? "text-red-400" : "text-[var(--text)]")
                  }
                >
                  {overdue ? "⚠ " : ""}
                  {job.deadline}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--hover)]">
            <div
              className="h-full rounded-full bg-amber-600 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {STATUSES.map((st) => {
              const isCurrent = st.value === job.status;
              const locked =
                (st.value === "delivered" || st.value === "paid") && !allDone;
              return (
                <form
                  key={st.value}
                  action={setJobStatus.bind(null, job.id, st.value)}
                >
                  <button
                    type="submit"
                    disabled={isCurrent || locked}
                    title={
                      locked
                        ? "Finish every station before delivery"
                        : undefined
                    }
                    className={
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed " +
                      (isCurrent
                        ? "bg-amber-600 text-[#0e0e0d]"
                        : locked
                          ? "border border-[var(--border)] text-[var(--text)]/25"
                          : "border border-[var(--border-strong)] text-[var(--text)] hover:bg-[var(--hover)]")
                    }
                  >
                    {locked ? "🔒 " : ""}
                    {st.label}
                  </button>
                </form>
              );
            })}
          </div>
          {!allDone && (
            <p className="mt-2 text-xs text-[var(--text)]/40">
              Delivery unlocks once every station is checked.
            </p>
          )}
        </Card>

        {/* The line */}
        <Card
          title="The line"
          description="Tick a station when it passes its gate. Open the full how-to for the detailed SOP."
          padded={false}
        >
          <ul className="divide-y divide-[var(--border)]">
            {steps.map((step) => {
              const station = stationByKey(step.station_key);
              return (
                <li key={step.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <form
                      action={toggleStep.bind(null, step.id, !step.done, job.id)}
                      className="pt-0.5"
                    >
                      <button
                        type="submit"
                        aria-label={step.done ? "Mark not done" : "Mark done"}
                        className={
                          "grid h-5 w-5 place-items-center rounded border transition-colors " +
                          (step.done
                            ? "border-amber-600 bg-amber-600 text-[#0e0e0d]"
                            : "border-[var(--border-strong)] hover:border-amber-600/70")
                        }
                      >
                        {step.done && (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </button>
                    </form>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={
                            "font-medium " +
                            (step.done
                              ? "text-[var(--text)]/45 line-through"
                              : "text-[var(--text)]")
                          }
                        >
                          {step.label}
                        </span>
                        {station?.tool && (
                          <span className="rounded border border-amber-600/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-500/90">
                            {station.tool}
                          </span>
                        )}
                        {station?.isGate && (
                          <span className="text-[10px] uppercase tracking-wide text-amber-500/80">
                            QC gate
                          </span>
                        )}
                      </div>

                      {station && (
                        <>
                          <p className="mt-1 text-sm text-[var(--text)]/60">
                            <span className="font-medium text-amber-500/90">
                              Gate:{" "}
                            </span>
                            {station.gate}
                          </p>
                          <Link
                            href={`/production/playbook/${station.key}`}
                            className="mt-2 inline-block text-xs font-medium text-amber-500/90 hover:text-amber-400"
                          >
                            Open the full how-to →
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {job.notes && (
          <Card title="Notes" padded>
            <p className="whitespace-pre-wrap text-sm text-[var(--text)]/70">
              {job.notes}
            </p>
          </Card>
        )}

        <form action={deleteJob.bind(null, job.id)}>
          <button
            type="submit"
            className={btnGhost + " text-red-400/70 hover:text-red-400"}
          >
            Delete this job
          </button>
        </form>
      </div>
    </>
  );
}
