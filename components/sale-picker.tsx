"use client";

import { useState } from "react";
import { inputClass, labelClass } from "@/components/ui";
import { fmtMoney } from "@/lib/enums";
import type { OpenSale } from "@/lib/sales";

// Top of the Log deal form: a new sale, or the next payment on a sale that
// still has money owed. Picking an existing sale fills the form in from it, so
// the agent only types what the client paid now — and the same entry updates.
export function SalePicker({ sales }: { sales: OpenSale[] }) {
  const [picked, setPicked] = useState<OpenSale | null>(null);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const sale = sales.find((s) => s.id === e.target.value) ?? null;
    setPicked(sale);
    const form = e.target.form;
    if (!form) return;
    const set = (name: string, value: string) => {
      const el = form.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLSelectElement
        | null;
      if (el && "value" in el) el.value = value;
    };
    if (sale) {
      set("client_name", sale.client_name);
      set("deal_size", String(sale.deal_size));
      set("service", sale.service ?? "");
      set("service_category", sale.service_category ?? "");
      set("payment_method", sale.payment_method ?? "");
      set("merchant_name", sale.merchant_name ?? "");
      set("social_platform", sale.social_platform ?? "");
      set("conversation", sale.conversation ?? "");
      set("revenue_received", "");
      (form.elements.namedItem("revenue_received") as HTMLInputElement | null)?.focus();
    } else {
      for (const n of [
        "client_name",
        "deal_size",
        "service",
        "service_category",
        "payment_method",
        "merchant_name",
        "social_platform",
        "conversation",
        "revenue_received",
      ])
        set(n, "");
    }
  }

  return (
    <div className="rounded-xl border border-amber-600/40 bg-[var(--accent-soft)] p-4">
      <label className={labelClass}>Which sale is this for?</label>
      <select
        name="existing_deal_id"
        defaultValue=""
        onChange={onChange}
        className={inputClass}
      >
        <option value="">New sale</option>
        {sales.length > 0 && (
          <optgroup label="Next payment on a sale with money still owed">
            {sales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.client_name} · {fmtMoney(Number(s.deal_size))} sale ·{" "}
                {fmtMoney(Number(s.balance))} owed
                {s.agent_name ? ` · ${s.agent_name}` : ""}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        {picked ? (
          <>
            Updating <span className="font-medium text-[var(--text)]">{picked.client_name}</span>{" "}
            — already received {fmtMoney(Number(picked.revenue_received))}, still owed{" "}
            {fmtMoney(Number(picked.balance))}. Enter what the client paid now in{" "}
            <span className="font-medium text-[var(--text)]">Paid now</span>, and
            the date they paid. It stays one sale.
          </>
        ) : (
          "Client paying the next part of a sale already logged? Pick it here instead of making a new one."
        )}
      </p>
    </div>
  );
}
