import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, btnSecondary } from "@/components/ui";
import { requireProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function TrainingAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();

  const { data: asset } = await supabase
    .from("training_assets")
    .select("id, title, category, content, created_at")
    .eq("id", id)
    .single();

  if (!asset) notFound();

  return (
    <Shell
      profile={profile}
      active="training"
      title={asset.title}
      subtitle={(asset.category || "General") + " · " + asset.created_at.slice(0, 10)}
      action={
        <div className="flex items-center gap-3">
          {profile.role === "owner" && (
            <Link href={`/training/${asset.id}/edit`} className={btnSecondary}>
              Edit
            </Link>
          )}
          <Link
            href="/training"
            className="text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← All material
          </Link>
        </div>
      }
    >
      <Card padded>
        {asset.content ? (
          <div className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-800 dark:text-zinc-200">
            {asset.content}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            (No content yet.)
          </p>
        )}
      </Card>
    </Shell>
  );
}
