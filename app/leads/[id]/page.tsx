import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { requireProfile, isFloorRole } from "@/lib/profile";
import {
  STAGES,
  SERVICES,
  stageLabel,
  serviceLabel,
  STAGE_BADGE,
} from "@/lib/enums";
import {
  updateLead,
  addFollowUp,
  setFollowUpDone,
  setStage,
} from "@/app/leads/actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
const labelClass =
  "mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

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
  const today = new Date().toISOString().slice(0, 10);

  const saveLead = updateLead.bind(null, lead.id);
  const saveFollowUp = addFollowUp.bind(null, lead.id, lead.agent_id);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Nav profile={profile} />
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            {lead.handle}
          </h1>
          <span
            className={
              "rounded-full px-3 py-1 text-sm font-medium " +
              (STAGE_BADGE[lead.stage] ?? "")
            }
          >
            {stageLabel(lead.stage)}
          </span>
        </div>

        {floor && agentInfo && (
          <p className="-mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            Agent: {agentInfo.full_name}
            {!canEdit && " · read-only view"}
          </p>
        )}

        {canEdit && (
          <div className="-mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Move to:
            </span>
            {STAGES.map((s) => {
              const isCurrent = s.value === lead.stage;
              const move = setStage.bind(null, lead.id, s.value);
              return (
                <form key={s.value} action={move}>
                  <button
                    type="submit"
                    disabled={isCurrent}
                    className={
                      "rounded-full border px-3 py-1 text-sm font-medium transition-colors " +
                      (isCurrent
                        ? "border-black bg-black text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                        : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900")
                    }
                  >
                    {s.label}
                  </button>
                </form>
              );
            })}
          </div>
        )}

        {canEdit ? (
          <form
            action={saveLead}
            className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Handle *</label>
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
                  <option value="">—</option>
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
              <div>
                <label className={labelClass}>Date added</label>
                <input
                  disabled
                  value={lead.date_added}
                  className={inputClass + " opacity-60"}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Notes (running log)</label>
              <textarea
                name="notes"
                rows={6}
                defaultValue={lead.notes}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              className="self-start rounded-lg bg-black px-5 py-2 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              Save changes
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">Name: </span>
              <span className="text-black dark:text-zinc-50">
                {lead.name ?? "—"}
              </span>
            </p>
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">
                Service:{" "}
              </span>
              <span className="text-black dark:text-zinc-50">
                {serviceLabel(lead.service_interest)}
              </span>
            </p>
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">Source: </span>
              <span className="text-black dark:text-zinc-50">
                {lead.source ?? "—"}
              </span>
            </p>
            <p>
              <span className="text-zinc-500 dark:text-zinc-400">Added: </span>
              <span className="text-black dark:text-zinc-50">
                {lead.date_added}
              </span>
            </p>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Notes:</p>
              <p className="whitespace-pre-wrap text-black dark:text-zinc-50">
                {lead.notes || "—"}
              </p>
            </div>
          </div>
        )}

        <section>
          <h2 className="mb-3 text-lg font-medium text-black dark:text-zinc-50">
            Follow-ups
          </h2>

          {followUps.length === 0 ? (
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              No follow-ups yet.
            </p>
          ) : (
            <ul className="mb-4 flex flex-col gap-2">
              {followUps.map((f) => {
                const overdue = !f.done && f.due_date < today;
                const toggle = setFollowUpDone.bind(
                  null,
                  f.id,
                  !f.done,
                  `/leads/${lead.id}`
                );
                return (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="min-w-0">
                      <span
                        className={
                          "font-medium " +
                          (f.done
                            ? "text-zinc-400 line-through dark:text-zinc-600"
                            : overdue
                              ? "text-red-700 dark:text-red-400"
                              : "text-black dark:text-zinc-50")
                        }
                      >
                        {f.due_date}
                      </span>
                      {overdue && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900 dark:bg-red-900 dark:text-red-100">
                          overdue
                        </span>
                      )}
                      {f.note && (
                        <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                          {f.note}
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <form action={toggle}>
                        <button
                          type="submit"
                          className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                          {f.done ? "Reopen" : "Done"}
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {canEdit && (
            <form
              action={saveFollowUp}
              className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div>
                <label className={labelClass}>Due date *</label>
                <input
                  type="date"
                  name="due_date"
                  required
                  className={inputClass}
                />
              </div>
              <div className="min-w-48 flex-1">
                <label className={labelClass}>Note</label>
                <input
                  name="note"
                  placeholder="What's the next step?"
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
              >
                Add follow-up
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
