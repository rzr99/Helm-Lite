"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export function FileUploader({ assetId }: { assetId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    const files = inputRef.current?.files;
    if (!files || files.length === 0) {
      setIsError(true);
      setMessage("Pick a file first.");
      return;
    }

    setBusy(true);
    setMessage(null);
    setIsError(false);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let uploaded = 0;
    for (const file of Array.from(files)) {
      const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
      const path = `${assetId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("training")
        .upload(path, file);

      if (uploadError) {
        setIsError(true);
        setMessage(`Could not upload ${file.name}: ${uploadError.message}`);
        continue;
      }

      const { error: rowError } = await supabase.from("training_files").insert({
        asset_id: assetId,
        name: file.name,
        path,
        size_bytes: file.size,
      });

      if (rowError) {
        setIsError(true);
        setMessage(`Uploaded ${file.name} but could not record it: ${rowError.message}`);
        continue;
      }

      uploaded++;
    }

    setBusy(false);
    if (uploaded > 0) {
      setIsError(false);
      setMessage(`${uploaded} file${uploaded === 1 ? "" : "s"} uploaded.`);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleUpload} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          multiple
          className="text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        PDFs, docs, videos — up to 50MB per file.
      </p>
      {message && (
        <p
          className={
            "text-sm font-medium " +
            (isError
              ? "text-red-600 dark:text-red-400"
              : "text-violet-700 dark:text-violet-400")
          }
        >
          {message}
        </p>
      )}
    </form>
  );
}
