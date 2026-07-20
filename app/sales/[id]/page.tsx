import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  Card,
  Avatar,
  btnPrimary,
  inputClass,
  labelClass,
} from "@/components/ui";
import { requireProfile, isFloorRole } from "@/lib/profile";
import { SERVICES, serviceLabel, fmtMoney } from "@/lib/enums";
import { updateDeal, deleteDeal } from "@/app/sales/actions";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);

  const { data: deal } = await supabase
    .from("deals")
    .select(
      "id, agent_id, client_name, service_type, deal_size, revenue_received, date_closed, agent:users(full_name, avatar_url), lead:leads(id, handle)"
    )
    .eq("id", id)
    .single();

  if (!deal) notFound();

  const agentInfo = deal.agent as unknown as {
    full_name: string;
    avatar_url: string | null;
  } | null;
  const leadInfo = deal.lead as unknown as {
    id: string;
    handle: string;
  } | null;
  const canEdit = profile.role === "owner" || deal.agent_id === profile.id;

  const saveDeal = updateDeal.bind(null, deal.id);
  const removeDeal = deleteDeal.bind(null, deal.id);

  return (
    <Shell
      profile={profile}
      active="sales"
      title={deal.client_name}
      subtitle={
        `Closed ${deal.date_closed}` +
        (floor && agentInfo ? ` · Agent: ${agentInfo.full_name}` : "") +
        (!canEdit ? " · read-only" : "")
      }
      action={
        <Link
          href="/sales"
          className="text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to sales
        </Link>
      }
    >
      {leadInfo && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This deal came from lead{" "}
          <Link
            href={`/leads/${leadInfo.id}`}
            className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            {leadInfo.handle}
          </Link>
          .
        </p>
      )}

      <Card
        title="Deal details"
        description={canEdit ? "Edit anything and hit Save." : undefined}
      >
        {canEdit ? (
          <form action={saveDeal} className="flex flex-col gap-5">
            <div>
              <label className={labelClass}>
                Client name <span className="text-red-500">*</span>
              </label>
              <input
                name="client_name"
                required
                defaultValue={deal.client_name}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Service sold</label>
                <select
                  name="service_type"
                  defaultValue={deal.service_type}
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
                  defaultValue={deal.date_closed}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Deal size ($)</label>
                <input
                  name="deal_size"
                  inputMode="decimal"
                  defaultValue={String(deal.deal_size)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Revenue received ($)</label>
                <input
                  name="revenue_received"
                  inputMode="decimal"
                  defaultValue={String(deal.revenue_received)}
                  className={inputClass}
                />
              </div>
            </div>

            <button type="submit" className={btnPrimary + " self-start"}>
              Save changes
            </button>
          </form>
        ) : (
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Service</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {serviceLabel(deal.service_type)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Closed</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {deal.date_closed}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Deal size</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {fmtMoney(Number(deal.deal_size))}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">
                Revenue received
              </dt>
              <dd className="font-medium text-emerald-700 dark:text-emerald-400">
                {fmtMoney(Number(deal.revenue_received))}
              </dd>
            </div>
          </dl>
        )}
      </Card>

      {profile.role === "owner" && (
        <Card
          title="Danger zone"
          description="Deleting a deal removes it from all revenue numbers. There is no undo."
        >
          <form action={removeDeal}>
            <button
              type="submit"
              className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Delete this deal
            </button>
          </form>
        </Card>
      )}

      {floor && agentInfo && (
        <p className="flex items-center justify-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
          <Avatar name={agentInfo.full_name} src={agentInfo.avatar_url} size={7} />
          This deal belongs to {agentInfo.full_name}
          {!canEdit && " — you can look, not touch"}
        </p>
      )}
    </Shell>
  );
}
