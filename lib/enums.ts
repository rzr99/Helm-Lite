export const STAGES = [
  { value: "new", label: "New" },
  { value: "in_conversation", label: "In conversation" },
  { value: "qualified", label: "Qualified" },
  { value: "closed", label: "Closed" },
  { value: "ghosted", label: "Ghosted" },
  { value: "lost", label: "Lost" },
] as const;

// Freelancer rating criteria (each 0-5, 0 = not rated). Adjust anytime.
export const FREELANCER_RATINGS = [
  { key: "rating_quality", label: "Quality" },
  { key: "rating_price", label: "Value (price)" },
  { key: "rating_speed", label: "Speed" },
  { key: "rating_communication", label: "Communication" },
] as const;

// Average of the rated (non-zero) criteria, to one decimal; 0 if none rated.
export function freelancerAvg(f: Record<string, unknown>) {
  const vals = FREELANCER_RATINGS.map((r) => Number(f[r.key] ?? 0)).filter(
    (n) => n > 0
  );
  if (vals.length === 0) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export const SERVICES = [
  { value: "motion_graphics", label: "Motion graphics" },
  { value: "video_editing", label: "Video editing" },
  { value: "branding", label: "Branding" },
  { value: "other", label: "Other" },
] as const;

export function stageLabel(value: string) {
  return STAGES.find((s) => s.value === value)?.label ?? value;
}

export function serviceLabel(value: string | null) {
  if (!value) return "—";
  return SERVICES.find((s) => s.value === value)?.label ?? value;
}

// Higher-level buckets so you can see which KIND of work drives revenue.
export const SERVICE_CATEGORIES = [
  "Video Editing",
  "Motion Design",
  "Animation",
  "Branding",
  "Web",
  "Other",
];

// Free-text suggestions for the sales log (agents can type anything).
export const SERVICE_SUGGESTIONS = [
  "Podcast video editing",
  "Video editing",
  "Motion designing",
  "Short logo animation",
  "Website designing",
  "Reels / shorts editing",
  "Long-form editing",
  "Branding",
  "Other",
];

export const PAYMENT_METHODS = [
  "Bank transfer",
  "Stripe",
  "PayPal",
  "Wise",
  "Crypto",
  "Cash",
  "Other",
];

export const MERCHANTS = ["Linear Solutions", "H.Q Embroidery"];

// Sections mirror the owner's expense spreadsheet.
export const EXPENSE_CATEGORIES = [
  { value: "subscription", label: "Subscription" },
  { value: "others", label: "Others" },
  { value: "utilities", label: "Utilities" },
  { value: "production", label: "Production" },
  { value: "salary", label: "Salary" },
  { value: "extras", label: "Extras" },
] as const;

export function expenseCategoryLabel(value: string) {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function fmtPKR(value: number) {
  return (
    "Rs " +
    value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

// The real states the team faces, healthiest → worst. `restricted` = "DM
// restricted" (reuses the existing value so current data carries over).
// recovery/compromised remain valid DB values (fallback) but aren't offered.
export const ACCOUNT_STATUSES = [
  { value: "active", label: "Healthy" },
  { value: "warming", label: "Warming up" },
  { value: "ghost_banned", label: "Ghost banned" },
  { value: "restricted", label: "DM restricted" },
  { value: "red_label", label: "Red label" },
  { value: "banned", label: "Banned" },
  { value: "reserve", label: "Reserve" },
] as const;

export const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  warming: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  ghost_banned: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  restricted: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950 dark:text-fuchsia-200",
  red_label: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  recovery: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  compromised: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950 dark:text-fuchsia-200",
  banned: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  reserve: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

// Explicit hex so the health colors survive the brand's 3-colour remap and
// read like a real traffic-light signal (green healthy → red banned).
export const STATUS_DOT: Record<string, string> = {
  active: "#22c55e",
  warming: "#f59e0b",
  ghost_banned: "#f97316",
  restricted: "#c026d3",
  red_label: "#e11d48",
  recovery: "#38bdf8",
  compromised: "#c026d3",
  banned: "#ef4444",
  reserve: "#71717a",
};

// Whisper-soft row tints — just enough context so text stays crisp on the
// near-black canvas; the vivid left accent carries the actual signal.
export const STATUS_TINT: Record<string, string> = {
  active: "rgba(34,197,94,0.05)",
  warming: "rgba(245,158,11,0.06)",
  ghost_banned: "rgba(249,115,22,0.07)",
  restricted: "rgba(192,38,211,0.06)",
  red_label: "rgba(225,29,72,0.07)",
  recovery: "rgba(56,189,248,0.05)",
  compromised: "rgba(192,38,211,0.06)",
  banned: "rgba(239,68,68,0.07)",
  reserve: "rgba(113,113,122,0.04)",
};

// Worst-first, so a row takes the colour of its most attention-needing account.
export const STATUS_SEVERITY = [
  "banned",
  "red_label",
  "ghost_banned",
  "restricted",
  "compromised",
  "warming",
  "recovery",
  "active",
  "reserve",
];

export function statusLabel(value: string) {
  return ACCOUNT_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function fmtMoney(value: number) {
  return (
    "$" +
    value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

export const STAGE_BADGE: Record<string, string> = {
  new: "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
  in_conversation:
    "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  qualified:
    "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100",
  closed: "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100",
  ghosted: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  lost: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

// ----- Lead type (intent) -----
export const LEAD_INTENTS = [
  { value: "high_intent", label: "High intent" },
  { value: "cold_outreach", label: "Cold outreach" },
] as const;

export function leadIntentLabel(value: string) {
  return LEAD_INTENTS.find((i) => i.value === value)?.label ?? value;
}

export const LEAD_INTENT_BADGE: Record<string, string> = {
  high_intent:
    "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  cold_outreach:
    "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

// ----- Hiring -----
export const HIRING_STATUSES = [
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
] as const;

// emerald/red kept explicitly so "hired"/"rejected" stay green/red under the
// brand's colour remap (which collapses most families to amber/grey).
export const HIRING_BADGE: Record<string, string> = {
  applied: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  interviewing:
    "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  hired: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function hiringStatusLabel(value: string) {
  return HIRING_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function ratingStars(n: number) {
  const r = Math.max(0, Math.min(5, n));
  return "★".repeat(r) + "☆".repeat(5 - r);
}
