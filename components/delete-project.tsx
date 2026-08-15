"use client";

import { useFormStatus } from "react-dom";
import { deleteProject } from "@/app/projects/actions";

function Button() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!confirm("Delete this project? This can't be undone.")) {
          e.preventDefault();
        }
      }}
      className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
    >
      {pending ? "Deleting…" : "Delete this project"}
    </button>
  );
}

export function DeleteProjectButton({ id }: { id: string }) {
  return (
    <form action={deleteProject.bind(null, id)}>
      <Button />
    </form>
  );
}
