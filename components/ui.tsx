import Link from "next/link";

// Amber is the single accent — used for primary actions only.
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-[#0e0e0d] shadow-sm transition-colors hover:bg-amber-500 active:translate-y-px disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--hover)] active:translate-y-px";

export const btnGhost =
  "inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)]";

export const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--field)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-amber-600/70 focus:ring-2 focus:ring-amber-600/25";

export const labelClass =
  "mb-1.5 block text-sm font-medium text-[var(--text-muted)]";

// The keyframe diamond — the brand's core mark. Amber = key, muted = default.
export function Diamond({
  amber = false,
  className = "",
}: {
  amber?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={
        "inline-block h-2 w-2 rotate-45 " +
        (amber ? "bg-amber-600" : "bg-[var(--text-faint)]") +
        " " +
        className
      }
    />
  );
}

export function Card({
  title,
  description,
  action,
  children,
  padded = true,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <section
      className="overflow-hidden rounded-xl border border-[var(--border)]"
      style={{
        background: "var(--surface)",
        boxShadow: "var(--card-shadow), inset 0 1px 0 0 var(--card-top)",
      }}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] px-5 py-4">
          <div className="flex items-start gap-2.5">
            {title && <Diamond amber className="mt-[7px]" />}
            <div>
              {title && (
                <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  {description}
                </p>
              )}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function EmptyState({
  emoji,
  title,
  hint,
  actionHref,
  actionLabel,
}: {
  emoji: string;
  title: string;
  hint?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <span className="text-2xl opacity-80">{emoji}</span>
      <p className="font-medium text-[var(--text)]">{title}</p>
      {hint && <p className="max-w-sm text-sm text-[var(--text-muted)]">{hint}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className={btnPrimary + " mt-2"}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function Avatar({
  name,
  src,
  size = 8,
}: {
  name: string;
  src?: string | null;
  size?: 7 | 8 | 9 | 16;
}) {
  const sizeClass =
    size === 7
      ? "h-7 w-7 text-[10px]"
      : size === 9
        ? "h-9 w-9 text-sm"
        : size === 16
          ? "h-16 w-16 text-xl"
          : "h-8 w-8 text-xs";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`inline-block ${sizeClass} shrink-0 rounded-full border border-[var(--border)] object-cover`}
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w[0] ?? ""))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      className={`inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--hover)] font-medium text-[var(--text)]`}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
