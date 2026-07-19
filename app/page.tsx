import Link from "next/link";
import { Nav } from "@/components/nav";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { STAGES, stageLabel } from "@/lib/enums";
import { setFollowUpDone } from "@/app/leads/actions";

export const dynamic = "force-dynamic";

type FollowUpRow = {
  id: string;
  due_date: string;
  note: string;
  lead: { id: string; handle: string } | null;
  agent: { full_name: string } | null;
};

export default async function Dashboard() {
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);

  const today = new Date().toISOString().slice(0, 10);

  const { data: followUps } = await supabase
    .from("follow_ups")
    .select(
      "id, due_date, note, lead:leads(id, handle), agent:users(full_name)"
    )
    .eq("done", false)
    .lte("due_date", today)
    .order("due_date");

  const { data: leadRows } = await supabase.from("leads").select("stage");

  const rows = (followUps ?? []) as unknown as FollowUpRow[];
  const overdue = rows.filter((f) => f.due_date < today);
  const dueToday = rows.filter((f) => f.due_date === today);

  const counts: Record<string, number> = {};
  for (const lead of leadRows ?? []) {
    counts[lead.stage] = (counts[lead.stage] ?? 0) + 1;
  }

  function FollowUpList({
    items,
    empty,
  }: {
    items: FollowUpRow[];
    empty: string;
  }) {
    if (items.length === 0)
      return <p className="text-sm text-zinc-500 dark:text-zinc-400">{empty}</p>;
    return (
      <ul className="flex flex-col gap-2">
        {items.map((f) => {
          const markDone = setFollowUpDone.bind(null, f.id, true, "/");
          return (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="min-w-0">
                <Link
                  href={f.lead ? `/leads/${f.lead.id}` : "/leads"}
                  className="font-medium text-black hover:underline dark:text-zinc-50"
                >
                  {f.lead?.handle ?? "(lead)"}
                </Link>
                <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {f.due_date}
                  {floor && f.agent ? ` · ${f.agent.full_name}` : ""}
                </span>
                {f.note && (
                  <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                    {f.note}
                  </p>
                )}
              </div>
              <form action={markDone}>
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Done
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Nav profile={profile} />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            {floor ? "Sales floor" : "My dashboard"}
          </h1>
          <Link
            href="/leads/new"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            + Add lead
          </Link>
        </div>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STAGES.map((s) => (
            <Link
              key={s.value}
              href={`/leads?stage=${s.value}`}
              className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
            >
              <p className="text-2xl font-semibold text-black dark:text-zinc-50">
                {counts[s.value] ?? 0}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {stageLabel(s.value)}
              </p>
            </Link>
          ))}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-medium text-black dark:text-zinc-50">
            Overdue follow-ups{" "}
            {overdue.length > 0 && (
              <span className="ml-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-900 dark:bg-red-900 dark:text-red-100">
                {overdue.length}
              </span>
            )}
          </h2>
          <FollowUpList items={overdue} empty="Nothing overdue. Clean slate." />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-medium text-black dark:text-zinc-50">
            Due today{" "}
            {dueToday.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                {dueToday.length}
              </span>
            )}
          </h2>
          <FollowUpList items={dueToday} empty="No follow-ups due today." />
        </section>

        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          {floor
            ? "You are seeing every agent's leads and follow-ups."
            : "You are seeing your own leads and follow-ups only."}
        </p>
      </main>
    </div>
  );
}
