import Link from "next/link";
import { Card, btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/ui";
import { ProdHeader } from "@/components/production-shell";
import { requireProfile } from "@/lib/profile";
import { JOB_TYPES } from "@/lib/production";
import { createJob } from "@/app/production/actions";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const { supabase } = await requireProfile();

  // Designer name suggestions from past deals.
  const { data: designerData } = await supabase
    .from("deals")
    .select("designer")
    .not("designer", "is", null);
  const designers = [
    ...new Set((designerData ?? []).map((d) => d.designer).filter(Boolean)),
  ] as string[];

  return (
    <>
      <ProdHeader
        title="New job"
        subtitle="Start a job on the line. It picks up the right checklist from its type."
        back={{ href: "/production", label: "Jobs" }}
      />

      <div className="max-w-xl">
        <Card padded>
          <form action={createJob} className="flex flex-col gap-5">
            <div>
              <label className={labelClass}>
                Client <span className="text-red-500">*</span>
              </label>
              <input
                name="client_name"
                required
                placeholder="Client or project name"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Type</label>
              <select name="job_type" defaultValue="launch" className={inputClass}>
                {JOB_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[var(--text)]/40">
                Sets which stations the job runs through.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Designer</label>
                <input
                  name="designer"
                  list="designer-options"
                  placeholder="Who's producing it"
                  className={inputClass}
                />
                <datalist id="designer-options">
                  {designers.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className={labelClass}>Deadline</label>
                <input type="date" name="deadline" className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Anything the producer should know…"
                className={inputClass}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" className={btnPrimary}>
                Create job
              </button>
              <Link href="/production" className={btnSecondary}>
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
