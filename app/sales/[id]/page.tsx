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
import {
  SERVICE_CATEGORIES,
  SERVICE_SUGGESTIONS,
  PAYMENT_METHODS,
  MERCHANTS,
  fmtMoney,
} from "@/lib/enums";
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
      "id, agent_id, client_name, service, service_category, deal_size, revenue_received, date_closed, payment_method, merchant_name, social_platform, designer, agent:users(full_name, avatar_url), lead:leads(id, handle)"
    )
    .eq("id", id)
    .single();

  if (!deal) notFound();

  const remaining = Number(deal.deal_size) - Number(deal.revenue_received);

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
            className="font-semibold text-violet-400 hover:underline"
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

            <datalist id="service-list">
              {SERVICE_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <datalist id="payment-list">
              {PAYMENT_METHODS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <datalist id="merchant-list">
              {MERCHANTS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Service category</label>
                <select
                  name="service_category"
                  defaultValue={deal.service_category ?? ""}
                  className={inputClass}
                >
                  <option value="">— choose —</option>
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Product / Service</label>
                <input
                  name="service"
                  list="service-list"
                  defaultValue={deal.service ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Date</label>
                <input
                  type="date"
                  name="date_closed"
                  defaultValue={deal.date_closed}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Sale amount ($)</label>
                <input
                  name="deal_size"
                  inputMode="decimal"
                  defaultValue={String(deal.deal_size)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Received amount ($)</label>
                <input
                  name="revenue_received"
                  inputMode="decimal"
                  defaultValue={String(deal.revenue_received)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Payment method</label>
                <input
                  name="payment_method"
                  list="payment-list"
                  defaultValue={deal.payment_method ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Merchant name</label>
                <input
                  name="merchant_name"
                  list="merchant-list"
                  defaultValue={deal.merchant_name ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Social media platform</label>
                <input
                  name="social_platform"
                  defaultValue={deal.social_platform ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Designer / Editor</label>
                <input
                  name="designer"
                  defaultValue={deal.designer ?? ""}
                  className={inputClass}
                />
              </div>
            </div>

            <p className="text-sm text-[#f8f7f4]/60">
              Remaining:{" "}
              <span className="font-medium text-[#f8f7f4]">
                {fmtMoney(remaining)}
              </span>
            </p>

            <button type="submit" className={btnPrimary + " self-start"}>
              Save changes
            </button>
          </form>
        ) : (
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Category</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {deal.service_category ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Service</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {deal.service ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Date</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {deal.date_closed}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Sale amount</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {fmtMoney(Number(deal.deal_size))}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Received</dt>
              <dd className="font-medium text-green-500 dark:text-green-400">
                {fmtMoney(Number(deal.revenue_received))}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Remaining</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {fmtMoney(remaining)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Payment method</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {deal.payment_method ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Merchant</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {deal.merchant_name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Platform</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {deal.social_platform ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Designer / Editor</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {deal.designer ?? "—"}
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
