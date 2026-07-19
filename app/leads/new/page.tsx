import { Nav } from "@/components/nav";
import { requireProfile } from "@/lib/profile";
import { STAGES, SERVICES } from "@/lib/enums";
import { createLead } from "@/app/leads/actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
const labelClass =
  "mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default async function NewLeadPage() {
  const { supabase, profile } = await requireProfile();

  // Owner can assign the lead to any active teammate.
  let teammates: { id: string; full_name: string }[] = [];
  if (profile.role === "owner") {
    const { data } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("active", true)
      .order("full_name");
    teammates = data ?? [];
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Nav profile={profile} />
      <main className="mx-auto max-w-xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Add lead
        </h1>

        <form
          action={createLead}
          className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div>
            <label className={labelClass}>Handle *</label>
            <input
              name="handle"
              required
              placeholder="@prospect"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Name</label>
            <input name="name" className={inputClass} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Service interest</label>
              <select
                name="service_interest"
                defaultValue=""
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
              <input name="source" placeholder="X" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Stage</label>
            <select name="stage" defaultValue="new" className={inputClass}>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {profile.role === "owner" && teammates.length > 0 && (
            <div>
              <label className={labelClass}>Assign to</label>
              <select
                name="agent_id"
                defaultValue={profile.id}
                className={inputClass}
              >
                {teammates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>Notes</label>
            <textarea name="notes" rows={4} className={inputClass} />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-black py-2 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Save lead
          </button>
        </form>
      </main>
    </div>
  );
}
