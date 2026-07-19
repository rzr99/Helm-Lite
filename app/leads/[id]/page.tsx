import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  Card,
  Avatar,
  btnPrimary,
  btnGhost,
  inputClass,
  labelClass,
} from "@/components/ui";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { STAGES, SERVICES, serviceLabel } from "@/lib/enums";
import {
  updateLead,
  addFollowUp,
  setFollowUpDone,
  setStage,
  deleteLead,
} from "@/app/leads/actions";
import { todayStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

type FollowUp = {
  id: string;
  due_date: string;
  done: boolean;
  note: string;
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);

  const { data: lead } = await supabase
    .from("leads")
    .select(
      "id, agent_id, handle, name, service_interest, source, stage, date_added, notes, agent:users(full_name)"
    )
    .eq("id", id)
    .single();

  if (!lead) notFound();

  const agentInfo = lead.agent as unknown as { full_name: string } | null;
  const canEdit = profile.role === "owner" || lead.agent_id === profile.id;

  const { data: fuData } = await supabase
    .from("follow_ups")
    .select("id, due_date, done, note")
    .eq("lead_id", id)
    .order("due_date");

  const followUps = (fuData ?? []) as FollowUp[];
  const openFollowUps = followUps.filter((f) => !f.done);
  const doneFollowUps = followUps.filter((f) => f.done);
  const today = todayStr();

  const saveLead = updateLead.bind(null, lead.id);
  const saveFollowUp = addFollowUp.bind(null, lead.id, lead.agent_id);

  return (
    <Shell
      profile={profile}
      active="leads"
      title={lead.handle}
      subtitle={
        (lead.name ? lead.name + " · " : "") +
        (floor && agentInfo ? `Agent: ${agentInfo.full_name}` : `Added ${lead.date_added}`) +
        (!canEdit ? " · read-only" : "")
      }
      action={
        <Link
          href="/leads"
          className="text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to leads
        </Link>
      }
    >
      <Card
        title="Stage"
        description={
          canEdit
            ? "Where this conversation stands. Click any stage to move it — it saves instantly."
            : "Where this conversation stands."
        }
        action={
          canEdit ? (
            <Link
              href={`/sales/new?lead=${lead.id}`}
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900"
            >
              💰 Log a deal
            </Link>
          ) : undefined
        }
      >
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => {
            const isCurrent = s.value === lead.stage;
            if (!canEdit) {
              return (
                <span
                  key={s.value}
                  className={
                    "rounded-full border px-4 py-2 text-sm font-semibold " +
                    (isCurrent
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-zinc-200 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500")
                  }
                >
                  {s.label}
                </span>
              );
            }
            const move = setStage.bind(null, lead.id, s.value);
            return (
              <form key={s.value} action={move}>
                <button
                  type="submit"
                  disabled={isCurrent}
                  className={
                    "rounded-full border px-4 py-2 text-sm font-semibold transition-colors " +
                    (isCurrent
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-zinc-300 bg-white text-zinc-600 hover:border-emerald-400 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-600 dark:hover:text-emerald-400")
                  }
                >
                  {s.label}
                </button>
              </form>
            );
          })}
        </div>
      </Card>

      <Card
        title="Details"
        description={canEdit ? "Edit anything and hit Save." : undefined}
      >
        {canEdit ? (
          <form action={saveLead} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Handle <span className="text-red-500">*</span>
                </label>
                <input
                  name="handle"
                  required
                  defaultValue={lead.handle}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Name</label>
                <input
                  name="name"
                  defaultValue={lead.name ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Service interest</label>
                <select
                  name="service_interest"
                  defaultValue={lead.service_interest ?? ""}
                  className={inputClass}
                >
                  <option value="">Not sure yet</option>
                  {SERVICES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Source</label>
                <input
                  name="source"
                  defaultValue={lead.source ?? ""}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Notes (running log)</label>
              <textarea
                name="notes"
                rows={6}
                defaultValue={lead.notes}
                placeholder="Keep the story of this lead here — every reply, every promise."
                className={inputClass}
              />
            </div>

            <button type="submit" className={btnPrimary + " self-start"}>
              Save changes
            </button>
          </form>
        ) : (
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Name</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {lead.name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Service</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {serviceLabel(lead.service_interest)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Source</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {lead.source ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Added</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {lead.date_added}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-zinc-500 dark:text-zinc-400">Notes</dt>
              <dd className="whitespace-pre-wrap font-medium text-zinc-900 dark:text-zinc-50">
                {lead.notes || "—"}
              </dd>
            </div>
          </dl>
        )}
      </Card>

      <Card
        title="Follow-ups"
        description={
          canEdit
            ? "Never let a lead go cold — set a date and it shows on the dashboard."
            : undefined
        }
        padded={false}
      >
        {openFollowUps.length === 0 && doneFollowUps.length === 0 && (
          <p className="px-5 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            No follow-ups yet{canEdit ? " — add the first one below." : "."}
          </p>
        )}

        {openFollowUps.length > 0 && (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {openFollowUps.map((f) => {
              const overdue = f.due_date < today;
              const toggle = setFollowUpDone.bind(
                null,
                f.id,
                true,
                `/leads/${lead.id}`
              );
              return (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={
                        "h-2.5 w-2.5 shrink-0 rounded-full " +
                        (overdue ? "bg-red-500" : "bg-amber-400")
                      }
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {f.due_date}
                        {overdue && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                            overdue
                          </span>
                        )}
                      </p>
                      {f.note && (
                        <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                          {f.note}
                        </p>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <form action={toggle}>
                      <button type="submit" className={btnGhost}>
                        ✓ Done
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {doneFollowUps.length > 0 && (
          <>
            <p className="border-b border-t border-zinc-100 px-5 py-2 text-xs font-bold uppercase tracking-wide text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
              Completed · {doneFollowUps.length}
            </p>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {doneFollowUps.map((f) => {
                const toggle = setFollowUpDone.bind(
                  null,
                  f.id,
                  false,
                  `/leads/${lead.id}`
                );
                return (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-400 line-through dark:text-zinc-500">
                        {f.due_date}
                      </p>
                      {f.note && (
                        <p className="truncate text-sm text-zinc-400 line-through dark:text-zinc-500">
                          {f.note}
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <form action={toggle}>
                        <button type="submit" className={btnGhost}>
                          Reopen
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {canEdit && (
          <form
            action={saveFollowUp}
            className="flex flex-wrap items-end gap-3 border-t border-zinc-100 bg-zinc-50/60 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-800/40"
          >
            <div>
              <label className={labelClass}>
                Due date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="due_date"
                required
                className={inputClass}
              />
            </div>
            <div className="min-w-52 flex-1">
              <label className={labelClass}>Note</label>
              <input
                name="note"
                placeholder="What's the next step?"
                className={inputClass}
              />
            </div>
            <button type="submit" className={btnPrimary}>
              Add follow-up
            </button>
          </form>
        )}
      </Card>

      {canEdit && (
        <Card
          title="Danger zone"
          description="Deleting removes this lead and its follow-ups. Any logged deals stay, but lose their link to it. There is no undo."
        >
          <form action={deleteLead.bind(null, lead.id)}>
            <button
              type="submit"
              className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Delete this lead
            </button>
          </form>
        </Card>
      )}

      {floor && agentInfo && (
        <p className="flex items-center justify-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
          <Avatar name={agentInfo.full_name} size={7} />
          This lead belongs to {agentInfo.full_name}
          {!canEdit && " — you can look, not touch"}
        </p>
      )}
    </Shell>
  );
}
