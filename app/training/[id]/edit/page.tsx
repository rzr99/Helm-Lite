import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  Card,
  btnPrimary,
  btnSecondary,
  inputClass,
  labelClass,
} from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { updateAsset, deleteAsset } from "@/app/training/actions";

export const dynamic = "force-dynamic";

export default async function EditTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/training");

  const { data: asset } = await supabase
    .from("training_assets")
    .select("id, title, category, content")
    .eq("id", id)
    .single();

  if (!asset) notFound();

  const save = updateAsset.bind(null, asset.id);
  const remove = deleteAsset.bind(null, asset.id);

  return (
    <Shell
      profile={profile}
      active="training"
      title="Edit material"
      subtitle={asset.title}
      action={
        <Link
          href={`/training/${asset.id}`}
          className="text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back
        </Link>
      }
    >
      <div className="max-w-2xl">
        <Card padded>
          <form action={save} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  required
                  defaultValue={asset.title}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <input
                  name="category"
                  defaultValue={asset.category ?? ""}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Content</label>
              <textarea
                name="content"
                rows={14}
                defaultValue={asset.content ?? ""}
                className={inputClass + " font-mono text-sm"}
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" className={btnPrimary}>
                Save changes
              </button>
              <Link href={`/training/${asset.id}`} className={btnSecondary}>
                Cancel
              </Link>
            </div>
          </form>
        </Card>

        <div className="mt-6">
          <Card
            title="Danger zone"
            description="Removes this material for everyone. There is no undo."
          >
            <form action={remove}>
              <button
                type="submit"
                className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
              >
                Delete this material
              </button>
            </form>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
