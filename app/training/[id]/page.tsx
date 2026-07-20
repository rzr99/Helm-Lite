import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, btnSecondary, btnGhost } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { FileUploader } from "@/components/training-files";
import { deleteFile } from "@/app/training/actions";

export const dynamic = "force-dynamic";

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function TrainingAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const isOwner = profile.role === "owner";

  const { data: asset } = await supabase
    .from("training_assets")
    .select("id, title, category, content, created_at")
    .eq("id", id)
    .single();

  if (!asset) notFound();

  const { data: filesData } = await supabase
    .from("training_files")
    .select("id, name, path, size_bytes")
    .eq("asset_id", id)
    .order("created_at");

  const files = filesData ?? [];

  // Time-limited download links (1 hour) for the private bucket.
  const links = new Map<string, string>();
  for (const f of files) {
    const { data: signed } = await supabase.storage
      .from("training")
      .createSignedUrl(f.path, 3600);
    if (signed?.signedUrl) links.set(f.id, signed.signedUrl);
  }

  return (
    <Shell
      profile={profile}
      active="training"
      title={asset.title}
      subtitle={(asset.category || "General") + " · " + asset.created_at.slice(0, 10)}
      action={
        <div className="flex items-center gap-3">
          {isOwner && (
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
      {(asset.content || files.length === 0) && (
        <Card padded>
          {asset.content ? (
            <div className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-800 dark:text-zinc-200">
              {asset.content}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              (No written content{isOwner ? " — attach files below or add text via Edit" : ""}.)
            </p>
          )}
        </Card>
      )}

      <Card
        title={`Files (${files.length})`}
        description={
          isOwner
            ? "Attach PDFs, docs, or videos. The team gets secure download links."
            : files.length > 0
              ? "Click a file to download it."
              : undefined
        }
        padded={false}
      >
        {files.length > 0 && (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <a
                  href={links.get(f.id) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-3 font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  <span aria-hidden>📄</span>
                  <span className="truncate">{f.name}</span>
                  <span className="shrink-0 text-xs font-normal text-zinc-400">
                    {fmtSize(f.size_bytes)}
                  </span>
                </a>
                {isOwner && (
                  <form action={deleteFile.bind(null, f.id, f.path, asset.id)}>
                    <button type="submit" className={btnGhost} title="Delete file">
                      ✕
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {files.length === 0 && !isOwner && (
          <p className="px-5 py-4 text-sm text-zinc-500 dark:text-zinc-400">
            No files attached.
          </p>
        )}

        {isOwner && (
          <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-800/40">
            <FileUploader assetId={asset.id} />
          </div>
        )}
      </Card>
    </Shell>
  );
}
