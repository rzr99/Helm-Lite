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
