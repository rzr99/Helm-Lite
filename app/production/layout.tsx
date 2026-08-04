import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/profile";
import { ProductionShell } from "@/components/production-shell";

export const dynamic = "force-dynamic";

// Wraps every /production/* page in the dedicated Production workspace, and
// gates the whole section to the owner.
export default async function ProductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  return <ProductionShell profile={profile}>{children}</ProductionShell>;
}
