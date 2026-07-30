import Link from "next/link";

// Amber is the single charged accent — primary actions only.
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-[#140d05] transition-colors hover:bg-amber-500 active:translate-y-px disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--hover)] active:translate-y-px";

export const btnGhost =
  "inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)]";

export const inputClass =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--field)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20";

export const labelClass =
  "mb-1.5 block text-sm font-medium text-[var(--text-muted)]";

// Mono, tracked micro-label — the brand's editorial eyebrow.
export const eyebrowClass =
  "font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[var(--text-faint)]";

// Mono, tracked table header cell.
export const thClass =
  "px-5 py-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] font-medium";

// Filter pills (Daily/Weekly, health filters, …).
export const pillClass =
  "inline-flex items-center gap-2 rounded-lg border border-[var(--border-strong)] px-3.5 py-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]";
export const pillActiveClass =
  "inline-flex items-center gap-2 rounded-lg border border-amber-600 bg-amber-600 px-3.5 py-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#140d05]";

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
        "inline-block h-1.5 w-1.5 rotate-45 " +
        (amber ? "bg-amber-600" : "bg-[var(--text-faint)]") +
        " " +
        className
      }
    />
  );
}

// A bordered, hairline-divided row of metric readouts.
export function Readouts({
  cols = 4,
  children,
}: {
  cols?: 2 | 3 | 4;
  children: React.ReactNode;
}) {
  const c = cols === 2 ? "sm:grid-cols-2" : cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4";
  return (
    <div
      className={
        "grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] " +
        c
      }
    >
      {children}
    </div>
  );
}

export function Readout({
  label,
  value,
  note,
  negative = false,
  amber = false,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  negative?: boolean;
  amber?: boolean;
}) {
  return (
    <div className="bg-[var(--surface)] px-5 py-[18px]">
      <p className={eyebrowClass}>{label}</p>
      <p
        className={
          "mt-3 font-mono text-[25px] font-medium tabular-nums tracking-tight " +
          (negative
            ? "text-[var(--negative)]"
            : amber
              ? "text-amber-600"
              : "text-[var(--text)]")
        }
      >
        {value}
      </p>
      {note && (
        <p className="mt-2 font-mono text-[9.5px] tracking-[0.08em] text-[var(--text-faint)]">
          {note}
        </p>
      )}
    </div>
  );
}

// A flat, hairline-bordered panel with an optional header.
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
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            {title && <Diamond amber />}
            <div>
              {title && (
                <h2 className="text-[13px] font-semibold tracking-tight text-[var(--text)]">
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
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      <span className="text-2xl opacity-70">{emoji}</span>
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
        className={`inline-block ${sizeClass} shrink-0 rounded-full border border-[var(--border-strong)] object-cover`}
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
      className={`inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--hover)] font-mono font-medium text-[var(--text-muted)]`}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
