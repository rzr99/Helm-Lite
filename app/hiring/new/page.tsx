import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, btnPrimary, inputClass, labelClass } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { HIRING_STATUSES } from "@/lib/enums";
import { createCandidate } from "@/app/hiring/actions";

export const dynamic = "force-dynamic";

export default async function NewCandidatePage() {
  const { profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  return (
    <Shell
      profile={profile}
      active="hiring"
      title="New candidate"
      subtitle="Log the person you interviewed. You can attach their CV on the next screen."
      action={
        <Link
          href="/hiring"
          className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          ← All candidates
        </Link>
      }
    >
      <Card>
        <form action={createCandidate} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Full name <span className="text-red-500">*</span>
              </label>
              <input name="full_name" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Role applied for</label>
              <input
                name="role_applied"
                placeholder="e.g. Video editor"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" name="email" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input name="phone" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Interview date</label>
              <input type="date" name="interview_date" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select name="status" defaultValue="interviewing" className={inputClass}>
                {HIRING_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Rating</label>
              <select name="rating" defaultValue="0" className={inputClass}>
                <option value="0">Not rated</option>
                <option value="1">★ (1)</option>
                <option value="2">★★ (2)</option>
                <option value="3">★★★ (3)</option>
                <option value="4">★★★★ (4)</option>
                <option value="5">★★★★★ (5)</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              name="notes"
              rows={5}
              placeholder="How did the interview go? Strengths, concerns, next steps…"
              className={inputClass}
            />
          </div>
          <button type="submit" className={btnPrimary + " self-start"}>
            Save candidate
          </button>
        </form>
      </Card>
    </Shell>
  );
}
