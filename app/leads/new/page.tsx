import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { STAGES, SERVICES } from "@/lib/enums";
import { createLead } from "@/app/leads/actions";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const { supabase, profile } = await requireProfile();

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
    <Shell
      profile={profile}
      active="leads"
      title="Add a lead"
      subtitle="A prospect you're talking to (or about to). You can update everything later."
    >
      <div className="max-w-xl">
        <Card padded>
          <form action={createLead} className="flex flex-col gap-5">
            <div>
              <label className={labelClass}>
                Handle <span className="text-red-500">*</span>
              </label>
              <input
                name="handle"
                required
                placeholder="@prospect"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Their X / social handle — how you'd recognize them.
              </p>
            </div>

            <div>
              <label className={labelClass}>Name</label>
              <input
                name="name"
                placeholder="Their real or business name"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Service interest</label>
                <select
                  name="service_interest"
                  defaultValue=""
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
                  placeholder="X, LinkedIn, email…"
                  className={inputClass}
                />
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
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Start it wherever the conversation actually is.
              </p>
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
              <textarea
                name="notes"
                rows={4}
                placeholder="Anything worth remembering about this one…"
                className={inputClass}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" className={btnPrimary}>
                Save lead
              </button>
              <Link href="/leads" className={btnSecondary}>
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
