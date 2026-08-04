import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { FreelancerForm } from "@/components/freelancer-form";
import { updateFreelancer, deleteFreelancer } from "@/app/freelancers/actions";

export const dynamic = "force-dynamic";

export default async function FreelancerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { data: f } = await supabase
    .from("freelancers")
    .select(
      "id, name, kind, services, email, phone, rate, portfolio_url, active, notes"
    )
    .eq("id", id)
    .single();
  if (!f) notFound();

  return (
    <Shell
      profile={profile}
      active="freelancers"
      title={f.name}
      subtitle={f.kind === "production_house" ? "Production house" : "Freelancer"}
      action={
        <Link
          href="/freelancers"
          className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          ← All freelancers
        </Link>
      }
    >
      <Card>
        <FreelancerForm
          action={updateFreelancer.bind(null, f.id)}
          defaults={f}
          submitLabel="Save changes"
        />
      </Card>

      <Card
        title="Danger zone"
        description="Removes this freelancer from your directory. Projects they were assigned to keep the name."
      >
        <form action={deleteFreelancer.bind(null, f.id)}>
          <button
            type="submit"
            className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete this freelancer
          </button>
        </form>
      </Card>
    </Shell>
  );
}
