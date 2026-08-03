import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, btnPrimary, inputClass, labelClass } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { HIRING_STATUSES } from "@/lib/enums";
import { CvUploader } from "@/components/cv-upload";
import { updateCandidate, deleteCandidate } from "@/app/hiring/actions";

export const dynamic = "force-dynamic";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|heic|avif)$/i;

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { data: c } = await supabase
    .from("candidates")
    .select(
      "id, full_name, role_applied, email, phone, interview_date, status, rating, notes, cv_path, cv_name"
    )
    .eq("id", id)
    .single();

  if (!c) notFound();

  let cvUrl: string | null = null;
  if (c.cv_path) {
    const { data: signed } = await supabase.storage
      .from("cvs")
      .createSignedUrl(c.cv_path, 3600);
    cvUrl = signed?.signedUrl ?? null;
  }
  const cvIsImage = c.cv_name ? IMAGE_EXT.test(c.cv_name) : false;

  const save = updateCandidate.bind(null, c.id);

  return (
    <Shell
      profile={profile}
      active="hiring"
      title={c.full_name}
      subtitle={c.role_applied ? `Applied for ${c.role_applied}` : "Candidate"}
      action={
        <Link
          href="/hiring"
          className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          ← All candidates
        </Link>
      }
    >
      <Card title="CV" description="A photo or document — kept private to you.">
        {c.cv_path && cvUrl ? (
          <div className="flex flex-col gap-4">
            {cvIsImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cvUrl}
                alt={c.cv_name ?? "CV"}
                className="max-h-[28rem] w-auto rounded-lg border border-[var(--border)]"
              />
            ) : (
              <a
                href={cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--hover)]"
              >
                📎 {c.cv_name ?? "Open CV"}
              </a>
            )}
            <CvUploader candidateId={c.id} currentPath={c.cv_path} hasCv />
          </div>
        ) : (
          <CvUploader candidateId={c.id} currentPath={c.cv_path} hasCv={false} />
        )}
      </Card>

      <Card title="Details" description="Edit anything and hit Save.">
        <form action={save} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                name="full_name"
                required
                defaultValue={c.full_name}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Role applied for</label>
              <input
                name="role_applied"
                defaultValue={c.role_applied}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                name="email"
                defaultValue={c.email ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                name="phone"
                defaultValue={c.phone ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Interview date</label>
              <input
                type="date"
                name="interview_date"
                defaultValue={c.interview_date ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                name="status"
                defaultValue={c.status}
                className={inputClass}
              >
                {HIRING_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Rating</label>
              <select
                name="rating"
                defaultValue={String(c.rating)}
                className={inputClass}
              >
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
              rows={6}
              defaultValue={c.notes}
              className={inputClass}
            />
          </div>
          <button type="submit" className={btnPrimary + " self-start"}>
            Save changes
          </button>
        </form>
      </Card>

      <Card
        title="Danger zone"
        description="Deletes this candidate and their CV. There is no undo."
      >
        <form action={deleteCandidate.bind(null, c.id)}>
          <button
            type="submit"
            className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete this candidate
          </button>
        </form>
      </Card>
    </Shell>
  );
}
