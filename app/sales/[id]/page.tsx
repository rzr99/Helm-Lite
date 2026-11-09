import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  Card,
  Avatar,
  Readouts,
  Readout,
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
import { todayStr } from "@/lib/dates";
import {
  updateDeal,
  deleteDeal,
  addPayment,
  deletePayment,
  closeSale,
  reopenSale,
} from "@/app/sales/actions";

export const dynamic = "force-dynamic";

function monthLabel(date: string) {
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function DealDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string }>;
}) {
  const { id } = await params;
  const { updated } = await searchParams;
  const { supabase, profile } = await requireProfile();
  const floor = isFloorRole(profile.role);

  const { data: deal } = await supabase
    .from("deals")
    .select(
      "id, agent_id, client_name, service, service_category, deal_size, revenue_received, pay_status, lost_amount, closed_on, close_note, date_closed, payment_method, merchant_name, social_platform, conversation, designer, agent:users(full_name, avatar_url), lead:leads(id, handle)"
    )
    .eq("id", id)
    .single();

  if (!deal) notFound();

  const { data: paymentData } = await supabase
    .from("deal_payments")
    .select("id, amount, paid_on, payment_method, note")
    .eq("deal_id", deal.id)
    .order("paid_on")
    .order("created_at");
  const payments = (paymentData ?? []) as {
    id: string;
    amount: number;
    paid_on: string;
    payment_method: string | null;
    note: string | null;
  }[];

  const status = (deal.pay_status ?? "open") as "open" | "lost" | "settled";
  const remaining =
    status === "open"
      ? Math.max(0, Number(deal.deal_size) - Number(deal.revenue_received))
      : 0;

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
  const recordPayment = addPayment.bind(null, deal.id);
  const close = closeSale.bind(null, deal.id);
  const reopen = reopenSale.bind(null, deal.id);

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
      {updated && (
        <p className="rounded-xl border border-amber-600/40 bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--text)]">
          Updated this existing sale. The new payment is added below and the
          remaining balance is worked out. It still counts as one sale.
        </p>
      )}
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

      <Readouts cols={3}>
        <Readout label="Sale amount" value={fmtMoney(Number(deal.deal_size))} />
        <Readout
          label="Received"
          value={fmtMoney(Number(deal.revenue_received))}
        />
        <Readout
          label={
            status === "lost"
              ? "Payment lost"
              : remaining > 0
                ? "Still owed"
                : "Remaining"
          }
          value={
            status === "lost"
              ? fmtMoney(Number(deal.lost_amount))
              : status === "settled"
                ? "Closed"
                : remaining > 0
                  ? fmtMoney(remaining)
                  : "Paid in full"
          }
        />
      </Readouts>

      {status !== "open" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3.5 text-sm">
          <p className="text-[var(--text-muted)]">
            {status === "lost"
              ? `Closed as not paid on ${deal.closed_on ?? ""}: ${fmtMoney(Number(deal.lost_amount))} lost.`
              : `Closed on ${deal.closed_on ?? ""} as already paid (old double entry).`}
            {deal.close_note ? ` Note: ${deal.close_note}` : ""}
          </p>
          {canEdit && (
            <form action={reopen}>
              <button
                type="submit"
                className="text-sm font-medium text-amber-600 hover:underline"
              >
                Reopen
              </button>
            </form>
          )}
        </div>
      )}

      {status === "open" && remaining > 0 && canEdit && (
        <details className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] [&::-webkit-details-marker]:hidden">
            Client won&apos;t pay the rest? Close this sale ▾
          </summary>
          <form
            action={close}
            className="flex flex-col gap-3 border-t border-[var(--border)] px-5 py-4"
          >
            <label className="flex items-start gap-2 text-sm text-[var(--text)]">
              <input
                type="radio"
                name="reason"
                value="lost"
                defaultChecked
                className="mt-1 accent-amber-600"
              />
              <span>
                Not paid — {fmtMoney(remaining)} goes to{" "}
                <span className="font-medium">Payment lost</span>
              </span>
            </label>
            {profile.role === "owner" && (
              <label className="flex items-start gap-2 text-sm text-[var(--text)]">
                <input
                  type="radio"
                  name="reason"
                  value="settled"
                  className="mt-1 accent-amber-600"
                />
                <span>
                  Already paid — an old sale entered twice (nothing lost)
                </span>
              </label>
            )}
            <input
              name="note"
              placeholder="Note (optional), e.g. client stopped the project"
              className={inputClass}
            />
            <button type="submit" className={btnPrimary + " self-start"}>
              Close sale
            </button>
          </form>
        </details>
      )}

      <Card
        title="Payments"
        description="Every payment the client makes on this sale. Each one counts toward the month it was paid in."
        padded={false}
      >
        {payments.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[var(--text-muted)]">
            No payments recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] font-mono text-[10.5px] uppercase tracking-[0.13em] text-[var(--text-faint)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Paid on</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Method</th>
                  <th className="px-5 py-3 font-semibold">Note</th>
                  <th className="px-5 py-3 font-semibold">Counts toward</th>
                  {canEdit && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {payments.map((p) => {
                  const removePayment = deletePayment.bind(null, deal.id, p.id);
                  return (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-[13px] text-[var(--text-muted)]">
                        {p.paid_on}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-semibold tabular-nums text-[var(--text)]">
                        {fmtMoney(Number(p.amount))}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[var(--text-muted)]">
                        {p.payment_method ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-[var(--text-muted)]">
                        {p.note ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[var(--text-muted)]">
                        {monthLabel(p.paid_on)}
                      </td>
                      {canEdit && (
                        <td className="whitespace-nowrap px-5 py-3 text-right">
                          <form action={removePayment}>
                            <button
                              type="submit"
                              className="text-xs font-medium text-[var(--text-faint)] hover:text-[var(--negative)] hover:underline"
                            >
                              remove
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {canEdit && (
          <form
            action={recordPayment}
            className="flex flex-wrap items-end gap-3 border-t border-[var(--border)] bg-[var(--sunken)] px-5 py-4"
          >
            <div>
              <label className={labelClass}>Amount paid ($)</label>
              <input
                name="amount"
                required
                inputMode="decimal"
                placeholder={remaining > 0 ? String(remaining) : "0"}
                className={inputClass + " w-32"}
              />
            </div>
            <div>
              <label className={labelClass}>Paid on</label>
              <input
                type="date"
                name="paid_on"
                defaultValue={todayStr()}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Method</label>
              <input
                name="payment_method"
                list="payment-list"
                defaultValue={deal.payment_method ?? ""}
                className={inputClass + " w-40"}
              />
            </div>
            <div className="min-w-40 flex-1">
              <label className={labelClass}>Note</label>
              <input
                name="note"
                placeholder="e.g. 2nd milestone"
                className={inputClass}
              />
            </div>
            <button type="submit" className={btnPrimary}>
              Record payment
            </button>
          </form>
        )}
      </Card>

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
                <label className={labelClass}>Date closed</label>
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
                <label className={labelClass}>Lead source</label>
                <input
                  name="social_platform"
                  defaultValue={deal.social_platform ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Conversation</label>
                <input
                  name="conversation"
                  defaultValue={deal.conversation ?? ""}
                  placeholder="WhatsApp, Slack, X…"
                  className={inputClass}
                />
              </div>
              {profile.role === "owner" && (
                <div>
                  <label className={labelClass}>Designer / Editor</label>
                  <input
                    name="designer"
                    defaultValue={deal.designer ?? ""}
                    className={inputClass}
                  />
                </div>
              )}
            </div>


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
              <dd className="font-medium text-[var(--text)]">
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
              <dt className="text-zinc-500 dark:text-zinc-400">Lead source</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {deal.social_platform ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Conversation</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {deal.conversation ?? "—"}
              </dd>
            </div>
            {profile.role === "owner" && (
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Designer / Editor</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                  {deal.designer ?? "—"}
                </dd>
              </div>
            )}
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
