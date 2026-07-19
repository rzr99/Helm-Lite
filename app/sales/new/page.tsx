import Link from "next/link";
import { Shell } from "@/components/shell";
import {
  Card,
  btnPrimary,
  btnSecondary,
  inputClass,
  labelClass,
} from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { SERVICES } from "@/lib/enums";
import { todayStr } from "@/lib/dates";
import { createDeal } from "@/app/sales/actions";

export const dynamic = "force-dynamic";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const { lead: leadId } = await searchParams;

  // If we arrived from a lead, prefill from it.
  let lead: {
    id: string;
    handle: string;
    name: string | null;
    service_interest: string | null;
    agent_id: string;
  } | null = null;

  if (leadId) {
    const { data } = await supabase
      .from("leads")
      .select("id, handle, name, service_interest, agent_id")
      .eq("id", leadId)
      .single();
    lead = data;
  }

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
      active="sales"
      title="Log a deal"
      subtitle={
        lead
          ? `Closing out ${lead.handle} — details are prefilled, adjust as needed.`
          : "Record a closed sale so it counts toward revenue."
      }
    >
      <div className="max-w-xl">
        <Card padded>
          <form action={createDeal} className="flex flex-col gap-5">
            {lead && <input type="hidden" name="lead_id" value={lead.id} />}

            <div>
              <label className={labelClass}>
                Client name <span className="text-red-500">*</span>
              </label>
              <input
                name="client_name"
                required
                defaultValue={lead ? (lead.name ?? lead.handle) : ""}
                placeholder="Who's paying?"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Service sold</label>
                <select
                  name="service_type"
                  defaultValue={lead?.service_interest ?? "other"}
                  className={inputClass}
                >
                  {SERVICES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Date closed</label>
                <input
                  type="date"
                  name="date_closed"
                  defaultValue={todayStr()}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Deal size ($) <span className="text-red-500">*</span>
                </label>
                <input
                  name="deal_size"
                  required
                  inputMode="decimal"
                  placeholder="1500"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  The full agreed amount.
                </p>
              </div>
              <div>
                <label className={labelClass}>Revenue received ($)</label>
                <input
                  name="revenue_received"
                  inputMode="decimal"
                  placeholder="750"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  What's actually been paid so far.
                </p>
              </div>
            </div>

            {profile.role === "owner" && teammates.length > 0 && (
              <div>
                <label className={labelClass}>Credit to</label>
                <select
                  name="agent_id"
                  defaultValue={lead?.agent_id ?? profile.id}
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
            {profile.role !== "owner" && lead && (
              <input type="hidden" name="agent_id" value={lead.agent_id} />
            )}

            <div className="flex gap-3 pt-1">
              <button type="submit" className={btnPrimary}>
                Save deal
              </button>
              <Link href="/sales" className={btnSecondary}>
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
