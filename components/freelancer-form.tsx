import { SERVICES, serviceLabel } from "@/lib/intake";
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
            defaultValue={defaults.rate ?? ""}
            placeholder="e.g. $150/video or Rs 2,000/hr"
            className={inputClass}
          />
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
