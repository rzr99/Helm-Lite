import Link from "next/link";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_8px_rgba(99,95,224,0.35)] transition-all duration-150 hover:bg-violet-500 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_4px_14px_rgba(99,95,224,0.45)] active:translate-y-px disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-all duration-150 hover:bg-white/[0.07] hover:text-white active:translate-y-px";

export const btnGhost =
  "inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100";

export const inputClass =
  "w-full rounded-xl border border-white/[0.09] bg-[#0d0d12] px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition-all duration-150 placeholder:text-zinc-500 focus:border-violet-500/70 focus:ring-4 focus:ring-violet-500/15";

export const labelClass = "mb-1.5 block text-sm font-medium text-zinc-300";

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
    <section className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#15151d] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.35)]">
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-5 py-4">
          <div>
            {title && (
              <h2 className="text-[15px] font-semibold tracking-tight text-zinc-50">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-zinc-400">{description}</p>
            )}
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
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="text-3xl">{emoji}</span>
      <p className="font-semibold text-zinc-200">{title}</p>
      {hint && <p className="max-w-sm text-sm text-zinc-400">{hint}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className={btnPrimary + " mt-2"}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

const avatarColors = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-fuchsia-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
];

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
        className={`inline-block ${sizeClass} shrink-0 rounded-full border border-[#2a2a37] object-cover`}
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w[0] ?? ""))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const color = avatarColors[hash % avatarColors.length];
  return (
    <span
      className={`inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-full ${color} font-semibold text-white`}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
