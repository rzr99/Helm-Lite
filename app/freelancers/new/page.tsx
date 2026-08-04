import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { FreelancerForm } from "@/components/freelancer-form";
import { createFreelancer } from "@/app/freelancers/actions";

export const dynamic = "force-dynamic";

export default async function NewFreelancerPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  return (
    <Shell
      profile={profile}
      active="freelancers"
      title="Add a freelancer"
      subtitle="A production person or studio you can assign work to."
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
        <FreelancerForm action={createFreelancer} submitLabel="Save freelancer" />
      </Card>
    </Shell>
  );
}
