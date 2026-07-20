import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, EmptyState, btnPrimary } from "@/components/ui";
import { requireProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

type Asset = {
  id: string;
  title: string;
  category: string | null;
  content: string | null;
  created_at: string;
};

export default async function TrainingPage() {
  const { supabase, profile } = await requireProfile();
  const isOwner = profile.role === "owner";

  const { data } = await supabase
    .from("training_assets")
    .select("id, title, category, content, created_at")
    .order("created_at", { ascending: false });

  const assets = (data ?? []) as Asset[];

  const categories = [
    ...new Set(assets.map((a) => a.category || "General")),
  ].sort();

  return (
    <Shell
      profile={profile}
      active="training"
      title="Training"
      subtitle={
        isOwner
          ? "Playbooks and materials for the team. Everyone can read; only you can write."
          : "Playbooks and materials from the owner. Read anything, anytime."
      }
      action={
        isOwner ? (
          <Link href="/training/new" className={btnPrimary}>
            + New material
          </Link>
        ) : undefined
      }
    >
      {assets.length === 0 ? (
        <Card padded>
          <EmptyState
            emoji="📚"
            title="No training material yet"
            hint={
              isOwner
                ? "Write your first playbook — outreach scripts, objection handling, onboarding steps."
                : "The owner hasn't published any material yet. Check back soon."
            }
            actionHref={isOwner ? "/training/new" : undefined}
            actionLabel={isOwner ? "+ New material" : undefined}
          />
        </Card>
      ) : (
        categories.map((cat) => (
          <Card key={cat} title={cat} padded={false}>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {assets
                .filter((a) => (a.category || "General") === cat)
                .map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/training/${a.id}`}
                      className="block px-5 py-3.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {a.title}
                      </p>
                      {a.content && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                          {a.content.slice(0, 200)}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
            </ul>
          </Card>
        ))
      )}
    </Shell>
  );
}
