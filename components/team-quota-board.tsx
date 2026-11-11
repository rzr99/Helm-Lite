import { createClient } from "@/lib/supabase/server";
import { Card, Avatar } from "@/components/ui";
import { QuotaBar } from "@/components/quota-bar";
import { MonthNav } from "@/components/month-nav";
import { workingDaysInMonth } from "@/lib/dates";
import { monthMeta } from "@/lib/attendance";
import { DAILY_LEAD_QUOTA, MONTHLY_SALES_TARGET } from "@/lib/enums";
import { dailyTarget } from "@/lib/quota";

// Owner view: every agent's whole-month progress, with a long team bar on top.
// Leads quota = 30 x the month's working days (Mon–Sat), present or absent;
// the sales bar fills only from revenue received.
export async function TeamQuotaBoard({ month }: { month?: string }) {
  const supabase = await createClient();
  const M = monthMeta(month);
  const from = M.first;
  const to = M.last;
  const workingDays = workingDaysInMonth(from, to);

  const [{ data: users }, { data: leadDays }, { data: deals }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, avatar_url")
        .eq("active", true)
        .neq("role", "owner")
        .order("full_name"),
      supabase
        .from("activity_leads_added")
        .select("agent_id, day, n")
        .gte("day", from)
        .lte("day", to)
        .limit(100000),
      // Credit follows the money: payments in this month, whenever the sale closed.
      supabase
        .from("deal_payments")
        .select("agent_id, amount")
        .gte("paid_on", from)
        .lte("paid_on", to)
        .limit(100000),
    ]);

  const leadsBy = new Map<string, number>();
  const daysBy = new Map<string, Map<string, number>>();
  for (const r of (leadDays ?? []) as {
    agent_id: string;
    day: string;
    n: number;
  }[]) {
    leadsBy.set(r.agent_id, (leadsBy.get(r.agent_id) ?? 0) + (r.n ?? 0));
    const m = daysBy.get(r.agent_id) ?? new Map<string, number>();
    m.set(r.day, (m.get(r.day) ?? 0) + (r.n ?? 0));
    daysBy.set(r.agent_id, m);
  }

  const salesBy = new Map<string, number>();
  for (const r of (deals ?? []) as {
    agent_id: string;
    amount: number;
  }[])
    salesBy.set(
      r.agent_id,
      (salesBy.get(r.agent_id) ?? 0) + Number(r.amount ?? 0)
    );

  const rows = ((users ?? []) as {
    id: string;
    full_name: string;
    avatar_url: string | null;
  }[]).map((u) => {
    return {
      id: u.id,
      name: u.full_name,
      avatar: u.avatar_url,
      leadsDone: leadsBy.get(u.id) ?? 0,
      leadsTarget: DAILY_LEAD_QUOTA * workingDays,
      today: dailyTarget(
        DAILY_LEAD_QUOTA * workingDays,
        daysBy.get(u.id) ?? new Map(),
        from,
        to
      ),
      salesDone: salesBy.get(u.id) ?? 0,
    };
  });

  const teamLeadsDone = rows.reduce((s, r) => s + r.leadsDone, 0);
  const teamLeadsTarget = rows.reduce((s, r) => s + r.leadsTarget, 0);
  const teamSalesDone = rows.reduce((s, r) => s + r.salesDone, 0);
  const teamSalesTarget = MONTHLY_SALES_TARGET * rows.length;

  // Leaderboard: rank by leads attainment, then raw leads. Pure game energy.
  const ranked = [...rows].sort((a, b) => {
    const pa = a.leadsTarget > 0 ? a.leadsDone / a.leadsTarget : 0;
    const pb = b.leadsTarget > 0 ? b.leadsDone / b.leadsTarget : 0;
    return pb - pa || b.leadsDone - a.leadsDone;
  });
  const medal = (i: number) =>
    i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;

  const num = (n: number) => n.toLocaleString();
  const money = (n: number) => "$" + n.toLocaleString();

  return (
    <Card
      title={`Team targets · ${M.label}`}
      description={`Whole-month quota: ${DAILY_LEAD_QUOTA}/day × ${workingDays} working days (Mon–Sat), present or absent. "Today" = leads needed today to stay on track: missed days are added to the days left. Sales bar fills from revenue received.`}
      action={<MonthNav prev={M.prev} next={M.next} />}
    >
      {/* The long team bars. */}
      <div className="flex flex-col gap-4">
        <QuotaBar
          label="Team leads"
          current={teamLeadsDone}
          target={teamLeadsTarget}
          display={num}
          color="#d97706"
          big
        />
        <QuotaBar
          label="Team sales (received)"
          current={teamSalesDone}
          target={teamSalesTarget}
          display={money}
          color="#9333ea"
          big
        />
      </div>

      {ranked.length > 0 && (
        <details open className="group mt-5">
          <summary className="flex cursor-pointer select-none items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] hover:text-[var(--text)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
            Leaderboard · {ranked.length}
          </summary>
          <ol className="mt-3 flex flex-col divide-y divide-[var(--border-soft)]">
            {ranked.map((r, i) => {
              const leadsHit = r.leadsTarget > 0 && r.leadsDone >= r.leadsTarget;
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 py-2.5 first:pt-1"
                >
                  <span className="w-6 shrink-0 text-center text-sm font-bold text-[var(--text-muted)]">
                    {medal(i)}
                  </span>
                  <Avatar name={r.name} src={r.avatar} size={7} />
                  <span className="flex w-24 shrink-0 items-center gap-1 truncate text-sm font-medium text-[var(--text)]">
                    {r.name.split(" ")[0]}
                    {leadsHit && <span title="Quota smashed">🔥</span>}
                  </span>
                  <span
                    className="w-20 shrink-0 text-right font-mono text-[11px] tabular-nums"
                    title="Today's catch-up target: the month's remaining quota spread over the working days left"
                  >
                    {r.today ? (
                      <>
                        <span
                          className={
                            r.today.target > DAILY_LEAD_QUOTA
                              ? "font-semibold text-amber-600"
                              : "text-[var(--text)]"
                          }
                        >
                          {r.today.doneToday}/{r.today.target}
                        </span>
                        <span className="block text-[10px] text-[var(--text-faint)]">
                          {r.today.sunday ? "next day" : "today"}
                        </span>
                      </>
                    ) : null}
                  </span>
                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                    <QuotaBar
                      label="Leads"
                      current={r.leadsDone}
                      target={r.leadsTarget}
                      display={num}
                      color="#d97706"
                    />
                    <QuotaBar
                      label="Sales"
                      current={r.salesDone}
                      target={MONTHLY_SALES_TARGET}
                      display={money}
                      color="#9333ea"
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </details>
      )}
    </Card>
  );
}
