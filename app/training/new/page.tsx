import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  Card,
  btnPrimary,
  btnSecondary,
  inputClass,
  labelClass,
} from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { createAsset } from "@/app/training/actions";

export const dynamic = "force-dynamic";

export default async function NewTrainingPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/training");

  return (
    <Shell
      profile={profile}
      active="training"
      title="New material"
      subtitle="Write it once, the whole team can read it."
    >
      <div className="max-w-2xl">
        <Card padded>
          <form action={createAsset} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  required
                  placeholder="e.g. First-reply outreach script"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <input
                  name="category"
                  placeholder="e.g. Outreach, Onboarding, Closing"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Content</label>
              <textarea
                name="content"
                rows={14}
                placeholder="The material itself. Paste scripts, steps, links to videos or docs — anything the team should read."
                className={inputClass + " font-mono text-sm"}
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" className={btnPrimary}>
                Publish
              </button>
              <Link href="/training" className={btnSecondary}>
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
