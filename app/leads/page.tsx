import Link from "next/link";
import { Nav } from "@/components/nav";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { STAGES, stageLabel, serviceLabel, STAGE_BADGE } from "@/lib/enums";

export const dynamic = "force-dynamic";

type LeadRow = {
  id: string;
  handle: string;
  name: string | null;
  service_interest: string | null;
  source: string | null;
  stage: string;
  date_added: string;
  agent: { full_name: string } | null;
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);
  const { stage } = await searchParams;

  let query = supabase
    .from("leads")
    .select(
      "id, handle, name, service_interest, source, stage, date_added, agent:users(full_name)"
    )
    .order("created_at", { ascending: false });

  if (stage && STAGES.some((s) => s.value === stage)) {
    query = query.eq("stage", stage);
  }

  const { data } = await query;
  const leads = (data ?? []) as unknown as LeadRow[];

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Nav profile={profile} />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            {floor ? "All leads" : "My leads"}
          </h1>
          <Link
            href="/leads/new"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            + Add lead
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/leads"
            className={
              "rounded-full border px-3 py-1 " +
              (!stage
                ? "border-black bg-black text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900")
            }
          >
            All
          </Link>
          {STAGES.map((s) => (
            <Link
              key={s.value}
              href={`/leads?stage=${s.value}`}
              className={
                "rounded-full border px-3 py-1 " +
                (stage === s.value
                  ? "border-black bg-black text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                  : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900")
              }
            >
              {s.label}
            </Link>
          ))}
        </div>

        {leads.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No leads here yet. Click “Add lead” to create the first one.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Handle</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                  {floor && <th className="px-4 py-3 font-medium">Agent</th>}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium text-black hover:underline dark:text-zinc-50"
                      >
                        {lead.handle}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {lead.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {serviceLabel(lead.service_interest)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {lead.source ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "rounded-full px-2.5 py-0.5 text-xs font-medium " +
                          (STAGE_BADGE[lead.stage] ?? "")
                        }
                      >
                        {stageLabel(lead.stage)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {lead.date_added}
                    </td>
                    {floor && (
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {lead.agent?.full_name ?? "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
