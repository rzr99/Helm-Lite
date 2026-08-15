"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/ui";
import type { IntakeField } from "@/lib/intake";

// One intake field. Optional `value` prefills it (used by the edit form).
export function Field({ f, value }: { f: IntakeField; value?: string }) {
  return (
    <div>
      <label className={labelClass}>
        {f.label}
        {f.required && <span className="text-red-500"> *</span>}
      </label>
      {f.type === "textarea" ? (
        <textarea
          name={f.name}
          required={f.required}
          rows={3}
          defaultValue={value ?? ""}
          placeholder={f.placeholder}
          className={inputClass}
        />
      ) : f.type === "select" ? (
        <select name={f.name} defaultValue={value ?? ""} className={inputClass}>
          <option value="">Select…</option>
          {f.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={f.name}
          required={f.required}
          defaultValue={value ?? ""}
          placeholder={f.placeholder}
          className={inputClass}
        />
      )}
      {f.help && <p className="mt-1 text-xs text-[var(--text)]/40">{f.help}</p>}
    </div>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={btnPrimary + (pending ? " pointer-events-none opacity-60" : "")}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function IntakeForm({
  action,
  service,
  submitLabel,
  pendingLabel,
  cancelHref,
  children,
}: {
  action: (formData: FormData) => void;
  service: string;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onKeyDown={(e) => {
        // Pressing Enter in a single-line field must NOT submit the whole intake
        // — agents hit it to move between fields. Textareas keep Enter for
        // newlines, and the submit button still works normally.
        const el = e.target as HTMLElement;
        if (e.key === "Enter" && el.tagName === "INPUT") e.preventDefault();
      }}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="service" value={service} />
      {children}
      <div className="flex gap-3 pt-1">
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
        <Link href={cancelHref} className={btnSecondary}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
