import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, EmptyState, Stars, btnPrimary } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { serviceLabel } from "@/lib/intake";
import { freelancerAvg } from "@/lib/enums";

export const dynamic = "force-dynamic";

type Freelancer = {
  id: string;
  name: string;
  kind: string;
  services: string[];
  email: string | null;
  phone: string | null;
  rate: string | null;
  active: boolean;
  rating_quality: number;
  rating_price: number;
  rating_speed: number;
  rating_communication: number;
};

export default async function FreelancersPage() {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { data } = await supabase
    .from("freelancers")
    .select(
      "id, name, kind, services, email, phone, rate, active, rating_quality, rating_price, rating_speed, rating_communication"
    )
    .order("active", { ascending: false })
    .order("name");

  const rows = (data ?? []) as Freelancer[];

  return (
    <Shell
      profile={profile}
      active="freelancers"
      title="Freelancers"
      subtitle="Owner-only. Your production people and studios — assign them to projects."
      action={
        <Link href="/freelancers/new" className={btnPrimary}>
          + Add
        </Link>
      }
    >
      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState
            emoji="🎬"
            title="No freelancers yet"
            hint="Add the editors, designers, and studios you work with."
            actionHref="/freelancers/new"
            actionLabel="+ Add freelancer"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] font-mono text-[10.5px] uppercase tracking-[0.13em] text-[var(--text-faint)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Rating</th>
                  <th className="hidden px-5 py-3 font-semibold sm:table-cell">Type</th>
                  <th className="hidden px-5 py-3 font-semibold sm:table-cell">Services</th>
                  <th className="hidden px-5 py-3 font-semibold sm:table-cell">Contact</th>
                  <th className="hidden px-5 py-3 font-semibold sm:table-cell">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {rows.map((f) => (
                  <tr
                    key={f.id}
                    className={
                      "transition-colors hover:bg-[var(--sunken)] " +
                      (f.active ? "" : "opacity-55")
                    }
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/freelancers/${f.id}`}
                        className="font-semibold text-[var(--text)] hover:underline"
                      >
                        {f.name}
                      </Link>
                      {!f.active && (
                        <span className="ml-2 rounded-full border border-[var(--border-strong)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-faint)]">
                          inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {freelancerAvg(f) > 0 ? (
                        <span className="flex items-center gap-1.5">
                          <Stars value={freelancerAvg(f)} />
                          <span className="text-xs text-[var(--text-muted)]">
                            {freelancerAvg(f)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[var(--text-faint)]">—</span>
                      )}
                    </td>
                    <td className="hidden px-5 py-3.5 text-[var(--text-muted)] sm:table-cell">
                      {f.kind === "production_house" ? "Production house" : "Freelancer"}
                    </td>
                    <td className="hidden px-5 py-3.5 text-[var(--text-muted)] sm:table-cell">
                      {(f.services ?? []).map((s) => serviceLabel(s)).join(", ") || "—"}
                    </td>
                    <td className="hidden px-5 py-3.5 text-[var(--text-muted)] sm:table-cell">
                      {f.email || f.phone || "—"}
                    </td>
                    <td className="hidden px-5 py-3.5 text-[var(--text-muted)] sm:table-cell">
                      {f.rate || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Shell>
  );
}
