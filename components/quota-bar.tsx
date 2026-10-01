// Presentational progress bar for quota / target tracking. Pure + theme-aware,
// so it works in both the agent self-view and the owner's team board.
export function QuotaBar({
  label,
  hint,
  current,
  target,
  display,
  color,
  big = false,
}: {
  label: string;
  hint?: string;
  current: number;
  target: number;
  display: (n: number) => string;
  color: string;
  big?: boolean;
}) {
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  const width = Math.min(100, Math.max(current > 0 ? 2 : 0, pct));
  const done = target > 0 && current >= target;
  const fill = done ? "#16a34a" : color;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span
          className={
            (big ? "text-sm" : "text-[13px]") + " font-semibold text-[var(--text)]"
          }
        >
          {label}
        </span>
        <span className="text-[13px] text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text)]">
            {display(current)}
          </span>{" "}
          / {target > 0 ? display(target) : "—"}
          {target > 0 && (
            <span className="ml-1.5 font-semibold" style={{ color: fill }}>
              {pct}%
            </span>
          )}
        </span>
      </div>
      <div
        className={
          (big ? "h-4" : "h-2.5") +
          " mt-1.5 overflow-hidden rounded-full bg-[var(--sunken)] ring-1 ring-inset ring-[var(--border-soft)]"
        }
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${width}%`, backgroundColor: fill }}
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-[var(--text-faint)]">{hint}</p>}
    </div>
  );
}
