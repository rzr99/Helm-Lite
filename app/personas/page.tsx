import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  Card,
  EmptyState,
  Avatar,
  btnPrimary,
  inputClass,
} from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { addPlatform } from "@/app/personas/actions";

export const dynamic = "force-dynamic";

type PersonaRow = {
  id: string;
  persona_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  manager: { full_name: string; avatar_url: string | null } | null;
  accounts: { count: number }[];
};

export default async function PersonasPage() {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const [{ data: personasData }, { data: platforms }] = await Promise.all([
    supabase
      .from("personas")
      .select(
        "id, persona_name, contact_email, contact_phone, manager:users(full_name, avatar_url), accounts(count)"
      )
      .order("persona_name"),
    supabase.from("platforms").select("name").order("name"),
  ]);

  const personas = (personasData ?? []) as unknown as PersonaRow[];

  return (
    <Shell
      profile={profile}
      active="personas"
      title="Personas & accounts"
      subtitle="Owner-only. The identities your team operates and the accounts behind them."
      action={
        <Link href="/personas/new" className={btnPrimary}>
          + New persona
        </Link>
      }
    >
      <Card
        title={`${personas.length} persona${personas.length === 1 ? "" : "s"}`}
        padded={false}
      >
        {personas.length === 0 ? (
          <EmptyState
            emoji="🎭"
            title="No personas yet"
            hint="A persona is an operating identity — create one and add its accounts."
            actionHref="/personas/new"
            actionLabel="+ New persona"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Persona</th>
                  <th className="px-5 py-3 font-semibold">Run by</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">Accounts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {personas.map((p) => (
                  <tr
                    key={p.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/personas/${p.id}`}
                        className="font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                      >
                        {p.persona_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      {p.manager ? (
                        <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                          <Avatar
                            name={p.manager.full_name}
                            src={p.manager.avatar_url}
                            size={7}
                          />
                          {p.manager.full_name}
                        </span>
                      ) : (
                        <span className="text-zinc-400">unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {p.contact_email ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                      {p.contact_phone ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-zinc-900 dark:text-zinc-50">
                      {p.accounts?.[0]?.count ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Platforms"
        description="The dropdown options for accounts. Adding one here is all it takes — no rebuild needed."
      >
        <div className="flex flex-wrap items-center gap-2">
          {(platforms ?? []).map((p) => (
            <span
              key={p.name}
              className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {p.name}
            </span>
          ))}
        </div>
        <form action={addPlatform} className="mt-4 flex flex-wrap items-center gap-2">
          <input
            name="name"
            placeholder="new platform, e.g. telegram"
            className={inputClass + " max-w-60"}
          />
          <button type="submit" className={btnPrimary}>
            Add platform
          </button>
        </form>
      </Card>
    </Shell>
  );
}
