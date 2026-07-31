import { ACCOUNT_STATUSES, STATUS_DOT } from "@/lib/enums";

// Tick-all-that-apply account states. Renders as coloured pills; the hidden
// checkboxes post as repeated `statuses` form fields.
export function StatusPicker({ selected = [] }: { selected?: string[] }) {
  const set = new Set(selected.length ? selected : ["active"]);
  return (
    <div className="flex flex-wrap gap-2">
      {ACCOUNT_STATUSES.map((s) => (
        <label
          key={s.value}
          className="inline-flex cursor-pointer select-none items-center gap-2 rounded-lg border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--text-muted)] transition-colors has-[:checked]:border-amber-600 has-[:checked]:bg-[var(--accent-soft)] has-[:checked]:text-[var(--text)]"
        >
          <input
            type="checkbox"
            name="statuses"
            value={s.value}
            defaultChecked={set.has(s.value)}
            className="sr-only"
          />
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: STATUS_DOT[s.value] ?? "#71717a" }}
          />
          {s.label}
        </label>
      ))}
    </div>
  );
}
