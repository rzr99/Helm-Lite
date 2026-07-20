import Link from "next/link";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export const btnGhost =
  "inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

export const inputClass =
  "w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-emerald-950";

export const labelClass =
  "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

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
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
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
      <p className="font-medium text-zinc-700 dark:text-zinc-200">{title}</p>
      {hint && (
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      )}
      {actionHref && actionLabel && (
        <Link href={actionHref} className={btnPrimary + " mt-2"}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

const avatarColors = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
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
        className={`inline-block ${sizeClass} shrink-0 rounded-full border border-zinc-200 object-cover dark:border-zinc-700`}
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
