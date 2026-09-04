import { SERVICES, serviceLabel } from "@/lib/intake";
import { FREELANCER_RATINGS } from "@/lib/enums";
import { btnPrimary, inputClass, labelClass } from "@/components/ui";

type Defaults = {
  name?: string;
  kind?: string;
  services?: string[];
  email?: string | null;
  phone?: string | null;
  rate?: string | null;
  portfolio_url?: string | null;
  active?: boolean;
  notes?: string;
  rating_quality?: number;
  rating_price?: number;
  rating_speed?: number;
  rating_communication?: number;
  manual_projects?: number;
};

const KINDS = [
  { value: "freelancer", label: "Freelancer" },
  { value: "production_house", label: "Production house" },
];

export function FreelancerForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: Defaults;
  submitLabel: string;
}) {
  const svc = new Set(defaults.services ?? []);
  const kind = defaults.kind ?? "freelancer";
  const active = defaults.active ?? true;

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            required
            defaultValue={defaults.name ?? ""}
            placeholder="Person or studio name"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Type</label>
          <div className="flex gap-2">
            {KINDS.map((k, idx) => (
              <label
                key={k.value}
                className="flex-1 cursor-pointer rounded-lg border border-[var(--border-strong)] px-3 py-2.5 text-center text-sm font-medium text-[var(--text-muted)] transition-colors has-[:checked]:border-amber-600 has-[:checked]:bg-[var(--accent-soft)] has-[:checked]:text-[var(--text)]"
              >
                <input
                  type="radio"
                  name="kind"
                  value={k.value}
                  defaultChecked={kind === k.value || (idx === 0 && !kind)}
                  className="sr-only"
                />
                {k.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Services they do</label>
        <div className="flex flex-wrap gap-2">
          {SERVICES.map((s) => (
            <label
              key={s.value}
              className="cursor-pointer rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] transition-colors has-[:checked]:border-amber-600 has-[:checked]:bg-[var(--accent-soft)] has-[:checked]:text-[var(--text)]"
            >
              <input
                type="checkbox"
                name="services"
                value={s.value}
                defaultChecked={svc.has(s.value)}
                className="sr-only"
              />
              {serviceLabel(s.value)}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            name="email"
            defaultValue={defaults.email ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone / WhatsApp</label>
          <input
            name="phone"
            defaultValue={defaults.phone ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Rate</label>
          <input
            name="rate"
            list="rate-options"
            defaultValue={defaults.rate ?? ""}
            placeholder="Pick a model or type an amount"
            className={inputClass}
          />
          <datalist id="rate-options">
            <option value="Per project — varies" />
            <option value="Negotiated per project" />
            <option value="Per hour" />
            <option value="Per video / deliverable" />
            <option value="Per minute" />
            <option value="Per day" />
            <option value="Monthly retainer" />
          </datalist>
          <p className="mt-1 text-xs text-[var(--text-faint)]">
            Varies by project? Pick “Per project — varies”, or note a range like
            “$150–300”.
          </p>
        </div>
        <div>
          <label className={labelClass}>Portfolio link</label>
          <input
            name="portfolio_url"
            defaultValue={defaults.portfolio_url ?? ""}
            placeholder="Behance, Drive, site…"
            className={inputClass}
          />
        </div>
      </div>

      <div className="sm:max-w-xs">
        <label className={labelClass}>Projects done before Helm</label>
        <input
          type="number"
          name="manual_projects"
          min="0"
          defaultValue={String(defaults.manual_projects ?? 0)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-[var(--text-faint)]">
          A starting count for past work. Delivered projects assigned to them
          in Helm are added on top automatically.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <input
          type="checkbox"
          name="active"
          defaultChecked={active}
          className="h-4 w-4 accent-amber-600"
        />
        Active (available for work)
      </label>

      <div>
        <label className={labelClass}>Ratings — out of 5, adjust anytime</label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FREELANCER_RATINGS.map((r) => {
            const current = Number(
              (defaults as Record<string, unknown>)[r.key] ?? 0
            );
            return (
              <div
                key={r.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <span className="text-sm text-[var(--text)]">{r.label}</span>
                <select
                  name={r.key}
                  defaultValue={String(current)}
                  className="rounded-lg border border-[var(--border-strong)] bg-[var(--field)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none focus:border-amber-600"
                >
                  <option value="0">— not rated</option>
                  <option value="1">★ 1</option>
                  <option value="2">★ 2</option>
                  <option value="3">★ 3</option>
                  <option value="4">★ 4</option>
                  <option value="5">★ 5</option>
                </select>
              </div>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-[var(--text-faint)]">
          Rate them once you&apos;ve worked together — bump it up later as they
          improve.
        </p>
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          name="notes"
          rows={4}
          defaultValue={defaults.notes ?? ""}
          placeholder="Strengths, turnaround time, how you found them…"
          className={inputClass}
        />
      </div>

      <button type="submit" className={btnPrimary + " self-start"}>
        {submitLabel}
      </button>
    </form>
  );
}
