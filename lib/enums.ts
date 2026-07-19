export const STAGES = [
  { value: "new", label: "New" },
  { value: "in_conversation", label: "In conversation" },
  { value: "qualified", label: "Qualified" },
  { value: "closed", label: "Closed" },
  { value: "lost", label: "Lost" },
] as const;

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

export const ACCOUNT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "warming", label: "Warming" },
  { value: "recovery", label: "Recovery" },
  { value: "banned", label: "Banned" },
  { value: "reserve", label: "Reserve" },
] as const;

export const STATUS_BADGE: Record<string, string> = {
  active:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  warming: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  recovery: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  banned: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  reserve: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

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
  lost: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};
