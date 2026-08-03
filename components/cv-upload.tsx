"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export function CvUploader({
  candidateId,
  currentPath,
  hasCv,
}: {
  candidateId: string;
  currentPath: string | null;
  hasCv: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function client() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setIsError(true);
      setMessage("Pick a file first.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setIsError(true);
      setMessage("Keep it under 20MB.");
      return;
    }

    setBusy(true);
    setMessage(null);
    setIsError(false);

    const supabase = client();
    const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
    const path = `${candidateId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("cvs")
      .upload(path, file, { contentType: file.type });
    if (uploadError) {
      setBusy(false);
      setIsError(true);
      setMessage("Could not upload: " + uploadError.message);
      return;
    }

    const { error: rowError } = await supabase
      .from("candidates")
      .update({ cv_path: path, cv_name: file.name })
      .eq("id", candidateId);
    if (rowError) {
      setBusy(false);
      setIsError(true);
      setMessage("Uploaded, but could not save: " + rowError.message);
      return;
    }

    // Clean up the previous CV, if any.
    if (currentPath && currentPath !== path) {
      await supabase.storage.from("cvs").remove([currentPath]);
    }

    setBusy(false);
    setMessage("CV saved.");
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function handleRemove() {
    setBusy(true);
    setMessage(null);
    const supabase = client();
    if (currentPath) await supabase.storage.from("cvs").remove([currentPath]);
    await supabase
      .from("candidates")
      .update({ cv_path: null, cv_name: null })
      .eq("id", candidateId);
    setBusy(false);
    setIsError(false);
    setMessage("CV removed.");
    router.refresh();
  }

  return (
    <form onSubmit={handleUpload} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          className="text-sm text-[var(--text-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--sunken)] file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-[var(--text)] hover:file:bg-[var(--hover)]"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-[#140d05] transition-colors hover:bg-amber-500 disabled:opacity-50"
        >
          {busy ? "Uploading…" : hasCv ? "Replace CV" : "Upload CV"}
        </button>
        {hasCv && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)] disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
      <p className="text-xs text-[var(--text-faint)]">
        A photo (JPG/PNG) or a document (PDF/Word), up to 20MB.
      </p>
      {message && (
        <p
          className={
            "text-sm font-medium " +
            (isError ? "text-[var(--negative)]" : "text-amber-600")
          }
        >
          {message}
        </p>
      )}
    </form>
  );
}
