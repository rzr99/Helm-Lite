import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, btnPrimary, btnSecondary, btnGhost, inputClass } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { FileUploader } from "@/components/training-files";
import { deleteFile, updateContent } from "@/app/training/actions";

export const dynamic = "force-dynamic";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function youtubeId(url: string) {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([\w-]{11})/
  );
  return m?.[1] ?? null;
}

// Plain text in, readable page out: paragraphs, clickable links,
// and embedded players for YouTube links.
function RenderedContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="flex flex-col gap-1 text-[15px] leading-7 text-zinc-800 dark:text-zinc-200">
      {lines.map((line, i) => {
        const parts = line.split(/(https?:\/\/\S+)/g);
        const embeds: string[] = [];
        const nodes = parts.map((part, j) => {
          if (/^https?:\/\//.test(part)) {
            const id = youtubeId(part);
            if (id) embeds.push(id);
            return (
              <a
                key={j}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-medium text-violet-700 underline dark:text-violet-400"
              >
                {part}
              </a>
            );
          }
          return part;
        });
        return (
          <div key={i}>
            <p className="min-h-[1.25em] whitespace-pre-wrap">{nodes}</p>
            {embeds.map((id) => (
              <iframe
                key={id}
                src={`https://www.youtube-nocookie.com/embed/${id}`}
                title="Video"
                allowFullScreen
                className="my-3 aspect-video w-full max-w-2xl rounded-xl border border-zinc-200 dark:border-zinc-800"
              />
            ))}
          </div>
        );
      })}
    </div>
  );
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

  // Time-limited links (1 hour) for the private bucket.
  const links = new Map<string, string>();
  for (const f of files) {
    const { data: signed } = await supabase.storage
      .from("training")
      .createSignedUrl(f.path, 3600);
    if (signed?.signedUrl) links.set(f.id, signed.signedUrl);
  }

  const images = files.filter((f) => IMAGE_EXT.test(f.name));
  const videos = files.filter((f) => VIDEO_EXT.test(f.name));
  const docs = files.filter(
    (f) => !IMAGE_EXT.test(f.name) && !VIDEO_EXT.test(f.name)
  );

  const saveContent = updateContent.bind(null, asset.id);

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
              Rename / delete
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
          <RenderedContent text={asset.content} />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No written content yet
            {isOwner ? " — write below, or attach files." : "."}
          </p>
        )}

        {isOwner && (
          <details
            open={!asset.content}
            className="mt-5 rounded-xl border border-zinc-200 dark:border-zinc-800"
          >
            <summary className="cursor-pointer select-none rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800">
              ✏️ Write / edit text
            </summary>
            <form
              action={saveContent}
              className="flex flex-col gap-3 border-t border-zinc-100 p-4 dark:border-zinc-800"
            >
              <textarea
                name="content"
                rows={12}
                defaultValue={asset.content ?? ""}
                placeholder={
                  "Write the material here.\n\nPaste a YouTube link on its own line and it becomes a video player. Any other link becomes clickable."
                }
                className={inputClass + " font-mono text-sm"}
              />
              <button type="submit" className={btnPrimary + " self-start"}>
                Save text
              </button>
            </form>
          </details>
        )}
      </Card>

      {images.length > 0 && (
        <Card title={`Pictures (${images.length})`} padded>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {images.map((f) => (
              <figure key={f.id} className="relative">
                <a
                  href={links.get(f.id) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={links.get(f.id) ?? ""}
                    alt={f.name}
                    className="max-h-96 w-full rounded-xl border border-zinc-200 bg-zinc-50 object-contain dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </a>
                <figcaption className="mt-1 flex items-center justify-between text-xs text-zinc-400">
                  <span className="truncate">{f.name}</span>
                  {isOwner && (
                    <form action={deleteFile.bind(null, f.id, f.path, asset.id)}>
                      <button type="submit" className={btnGhost} title="Delete">
                        ✕
                      </button>
                    </form>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </Card>
      )}

      {videos.length > 0 && (
        <Card title={`Videos (${videos.length})`} padded>
          <div className="flex flex-col gap-5">
            {videos.map((f) => (
              <div key={f.id}>
                <video
                  controls
                  preload="metadata"
                  src={links.get(f.id) ?? ""}
                  className="w-full max-w-2xl rounded-xl border border-zinc-200 dark:border-zinc-800"
                />
                <p className="mt-1 flex items-center justify-between text-xs text-zinc-400">
                  <span className="truncate">
                    {f.name} · {fmtSize(f.size_bytes)}
                  </span>
                  {isOwner && (
                    <form action={deleteFile.bind(null, f.id, f.path, asset.id)}>
                      <button type="submit" className={btnGhost} title="Delete">
                        ✕
                      </button>
                    </form>
                  )}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card
        title={docs.length > 0 ? `Documents (${docs.length})` : "Attach files"}
        description={
          isOwner
            ? "Pictures show on the page, videos get a player, documents become download links."
            : docs.length > 0
              ? "Click a document to download it."
              : undefined
        }
        padded={false}
      >
        {docs.length > 0 && (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {docs.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <a
                  href={links.get(f.id) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-3 font-semibold text-violet-700 hover:underline dark:text-violet-400"
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

        {docs.length === 0 && !isOwner && files.length === 0 && (
          <p className="px-5 py-4 text-sm text-zinc-500 dark:text-zinc-400">
            No files attached.
          </p>
        )}

        {isOwner && (
          <div
            className={
              "px-5 py-4 " +
              (docs.length > 0
                ? "border-t border-zinc-100 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-800/40"
                : "")
            }
          >
            <FileUploader assetId={asset.id} />
          </div>
        )}
      </Card>
    </Shell>
  );
}
