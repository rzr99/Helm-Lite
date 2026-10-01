import { createClient } from "@/lib/supabase/server";
import { Card, Avatar } from "@/components/ui";
import { QuotaBar } from "@/components/quota-bar";
import { monthRange } from "@/lib/dates";
import { DAILY_LEAD_QUOTA, MONTHLY_SALES_TARGET } from "@/lib/enums";

// Owner view: every agent's whole-month progress, with a long team bar on top.
// Leads quota = 30 x the month's days minus that agent's absences; the sales
// bar fills only from revenue received.
export async function TeamQuotaBoard() {
  const supabase = await createClient();
  const { from, to } = monthRange();
  const daysInMonth = Number(to.slice(8, 10));

  const [{ data: users }, { data: att }, { data: leadDays }, { data: deals }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, avatar_url")
        .eq("active", true)
        .neq("role", "owner")
        .order("full_name"),
      supabase
        .from("attendance")
        .select("user_id, status")
        .gte("date", from)
        .lte("date", to)
        .limit(100000),
      supabase
        .from("activity_leads_added")
        .select("agent_id, n")
        .gte("day", from)
        .lte("day", to)
        .limit(100000),
      supabase
        .from("deals")
        .select("agent_id, revenue_received")
        .gte("date_closed", from)
        .lte("date_closed", to)
        .limit(100000),
    ]);

  const absentBy = new Map<string, number>();
  for (const r of (att ?? []) as { user_id: string; status: string }[])
    if (r.status === "absent")
      absentBy.set(r.user_id, (absentBy.get(r.user_id) ?? 0) + 1);

  const leadsBy = new Map<string, number>();
  for (const r of (leadDays ?? []) as { agent_id: string; n: number }[])
    leadsBy.set(r.agent_id, (leadsBy.get(r.agent_id) ?? 0) + (r.n ?? 0));

  const salesBy = new Map<string, number>();
  for (const r of (deals ?? []) as {
    agent_id: string;
    revenue_received: number;
  }[])
    salesBy.set(
      r.agent_id,
      (salesBy.get(r.agent_id) ?? 0) + Number(r.revenue_received ?? 0)
    );

  const rows = ((users ?? []) as {
    id: string;
    full_name: string;
    avatar_url: string | null;
  }[]).map((u) => {
    const absent = absentBy.get(u.id) ?? 0;
    const quotaDays = Math.max(0, daysInMonth - absent);
    return {
      id: u.id,
      name: u.full_name,
      avatar: u.avatar_url,
      leadsDone: leadsBy.get(u.id) ?? 0,
      leadsTarget: DAILY_LEAD_QUOTA * quotaDays,
      salesDone: salesBy.get(u.id) ?? 0,
    };
  });

  const teamLeadsDone = rows.reduce((s, r) => s + r.leadsDone, 0);
  const teamLeadsTarget = rows.reduce((s, r) => s + r.leadsTarget, 0);
  const teamSalesDone = rows.reduce((s, r) => s + r.salesDone, 0);
  const teamSalesTarget = MONTHLY_SALES_TARGET * rows.length;

  const monthLabel = new Date(from + "T00:00:00").toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const num = (n: number) => n.toLocaleString();
  const money = (n: number) => "$" + n.toLocaleString();

  return (
    <Card
      title={`Team targets · ${monthLabel}`}
      description={`Whole-month quota: ${DAILY_LEAD_QUOTA}/day × ${daysInMonth} days, minus absences. Sales bar fills from revenue received.`}
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

      {rows.length > 0 && (
        <div className="mt-6 flex flex-col divide-y divide-[var(--border-soft)]">
          {rows.map((r) => (
            <div key={r.id} className="py-4 first:pt-0 last:pb-0">
              <div className="mb-2.5 flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                <Avatar name={r.name} src={r.avatar} size={7} />
                {r.name}
              </div>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
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
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
