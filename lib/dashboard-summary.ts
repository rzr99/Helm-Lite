import type { SupabaseClient } from "@supabase/supabase-js";
import { daysAgoStr } from "@/lib/dates";
import { fmtMoney, fmtPKR, STATUS_DOT, statusLabel } from "@/lib/enums";

const SPAN: Record<string, number> = { day: 1, week: 7, month: 30 };

function eachDay(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  let cur = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  const out: string[] = [];
  let guard = 0;
  while (cur <= end && guard < 400) {
    out.push(new Date(cur).toISOString().slice(0, 10));
    cur += 86400000;
    guard++;
  }
  return out;
}

type SR = { agent_id: string; day: string; n: number };
type Key = "leads" | "fu" | "deals" | "rev";

// Everything the dashboard Summary needs — momentum (with deltas + sparklines),
// agent leaderboard, money, account health — for the chosen window + agent.
export async function getDashboardSummary(
  supabase: SupabaseClient,
  opts: { win: string; agent?: string; floor: boolean; owner: boolean; today: string }
) {
  const { win, agent, floor, owner, today } = opts;
  const n = SPAN[win] ?? 30;
  const cur0 = daysAgoStr(n - 1);
  const prev0 = daysAgoStr(2 * n - 1);
  const prev1 = daysAgoStr(n);
  const range0 = daysAgoStr(59);
  const cmpLabel =
    win === "day" ? "vs yesterday" : win === "week" ? "vs last week" : "vs prev 30d";

  const sq = (t: string) => {
    let q = supabase.from(t).select("agent_id, day, n").gte("day", range0);
    if (agent) q = q.eq("agent_id", agent);
    return q;
  };
  let dealsQ = supabase
    .from("deals")
    .select("agent_id, date_closed, revenue_received")
    .gte("date_closed", range0);
  if (agent) dealsQ = dealsQ.eq("agent_id", agent);

  const empty = Promise.resolve({ data: [] as unknown[] });
  const [leadsR, fuR, dealCntR, dealsRev, usersR, expR, acctR] = await Promise.all([
    sq("activity_leads_added"),
    sq("activity_followups"),
    sq("activity_deals"),
    dealsQ,
    floor
      ? supabase.from("users").select("id, full_name").eq("active", true).order("full_name")
      : empty,
    owner
      ? supabase.from("expenses").select("amount").gte("date", `${today.slice(0, 7)}-01`)
      : empty,
    owner ? supabase.from("accounts").select("status") : empty,
  ]);

  const dayMap = new Map<string, { leads: number; fu: number; deals: number; rev: number }>();
  const dget = (d: string) => {
    let x = dayMap.get(d);
    if (!x) {
      x = { leads: 0, fu: 0, deals: 0, rev: 0 };
      dayMap.set(d, x);
    }
    return x;
  };
  for (const r of (leadsR.data ?? []) as SR[]) dget(r.day).leads += r.n;
  for (const r of (fuR.data ?? []) as SR[]) dget(r.day).fu += r.n;
  for (const r of (dealCntR.data ?? []) as SR[]) dget(r.day).deals += r.n;
  for (const r of (dealsRev.data ?? []) as { date_closed: string; revenue_received: number }[])
    dget(r.date_closed).rev += Number(r.revenue_received);

  const sumRange = (from: string, to: string, key: Key) => {
    let s = 0;
    for (const [d, v] of dayMap) if (d >= from && d <= to) s += v[key];
    return s;
  };
  const sparkDays = eachDay(daysAgoStr(13), today);
  const sparkOf = (key: Key) => sparkDays.map((d) => dayMap.get(d)?.[key] ?? 0);

  const mkMetric = (label: string, key: Key, money = false) => {
    const cur = sumRange(cur0, today, key);
    const prev = sumRange(prev0, prev1, key);
    const diff = cur - prev;
    const dir = (diff > 0 ? "up" : diff < 0 ? "down" : "flat") as
      | "up"
      | "down"
      | "flat";
    const mag = money ? fmtMoney(Math.abs(diff)) : String(Math.abs(diff));
    const delta = dir === "flat" ? "no change" : `${dir === "up" ? "▲" : "▼"} ${mag}`;
    return {
      key,
      label,
      value: money ? fmtMoney(cur) : String(cur),
      delta,
      dir,
      spark: sparkOf(key),
    };
  };

  const metrics = [
    mkMetric("Leads added", "leads"),
    mkMetric("Follow-ups", "fu"),
    mkMetric("Deals closed", "deals"),
    mkMetric("Revenue", "rev", true),
  ];

  // Agent leaderboard for the current window.
  const agLeads = new Map<string, number>();
  const agDeals = new Map<string, number>();
  for (const r of (leadsR.data ?? []) as SR[])
    if (r.day >= cur0 && r.day <= today)
      agLeads.set(r.agent_id, (agLeads.get(r.agent_id) ?? 0) + r.n);
  for (const r of (dealCntR.data ?? []) as SR[])
    if (r.day >= cur0 && r.day <= today)
      agDeals.set(r.agent_id, (agDeals.get(r.agent_id) ?? 0) + r.n);
  const usersList = (usersR.data ?? []) as { id: string; full_name: string }[];
  const leaderboard = usersList
    .map((u) => ({
      id: u.id,
      name: u.full_name,
      leads: agLeads.get(u.id) ?? 0,
      deals: agDeals.get(u.id) ?? 0,
    }))
    .filter((a) => a.leads > 0 || a.deals > 0)
    .sort((a, b) => b.leads - a.leads || b.deals - a.deals);

  const expenses = owner
    ? fmtPKR(
        ((expR.data ?? []) as { amount: number }[]).reduce(
          (s, e) => s + Number(e.amount),
          0
        )
      )
    : null;
  const money = {
    revenue: fmtMoney(sumRange(cur0, today, "rev")),
    deals: sumRange(cur0, today, "deals"),
    expenses,
  };

  const statusCount = new Map<string, number>();
  for (const a of (acctR.data ?? []) as { status: string }[])
    statusCount.set(a.status, (statusCount.get(a.status) ?? 0) + 1);
  const health = [...statusCount.entries()].map(([s, c]) => ({
    label: statusLabel(s),
    count: c,
    color: STATUS_DOT[s] ?? "#71717a",
  }));

  return {
    win,
    agent,
    floor,
    owner,
    cmpLabel,
    agents: usersList,
    metrics,
    leaderboard,
    money,
    health,
  };
}
