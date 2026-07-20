"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export function AvatarUploader({
  userId,
  hasAvatar,
}: {
  userId: string;
  hasAvatar: boolean;
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
      setMessage("Pick a picture first.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setIsError(true);
      setMessage("That's not an image — use a JPG or PNG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setIsError(true);
      setMessage("Keep it under 5MB.");
      return;
    }

    setBusy(true);
    setMessage(null);
    setIsError(false);

    const supabase = client();
    const path = `${userId}/avatar`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setBusy(false);
      setIsError(true);
      setMessage("Could not upload: " + uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = data.publicUrl + "?v=" + Date.now();

    const { error: rowError } = await supabase
      .from("users")
      .update({ avatar_url: url })
      .eq("id", userId);

    setBusy(false);
    if (rowError) {
      setIsError(true);
      setMessage("Uploaded, but could not save: " + rowError.message);
      return;
    }

    setMessage("Picture updated.");
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function handleRemove() {
    setBusy(true);
    setMessage(null);
    const supabase = client();
    await supabase.storage.from("avatars").remove([`${userId}/avatar`]);
    await supabase.from("users").update({ avatar_url: null }).eq("id", userId);
    setBusy(false);
    setIsError(false);
    setMessage("Picture removed.");
    router.refresh();
  }

  return (
    <form onSubmit={handleUpload} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200 dark:hover:file:bg-zinc-700"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Working…" : "Set picture"}
        </button>
        {hasAvatar && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Remove
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        JPG or PNG, up to 5MB. A square picture looks best.
      </p>
      {message && (
        <p
          className={
            "text-sm font-medium " +
            (isError
              ? "text-red-600 dark:text-red-400"
              : "text-emerald-700 dark:text-emerald-400")
          }
        >
          {message}
        </p>
      )}
    </form>
  );
}
