import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  Card,
  Avatar,
  btnPrimary,
  inputClass,
  labelClass,
} from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { STATUS_BADGE, statusLabel } from "@/lib/enums";
import { todayStr, daysAgoStr } from "@/lib/dates";
import { updatePersona, deletePersona } from "@/app/personas/actions";

export const dynamic = "force-dynamic";

type AccountRow = {
  id: string;
  platform: string;
  handle: string;
  subscription_date: string | null;
  renewal_date: string | null;
  assigned_card: string | null;
  assigned_proxy: string | null;
  status: string;
};

const platformChip: Record<string, string> = {
  x: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
  discord: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  instagram: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200",
  threads: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
};

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const [{ data: persona }, { data: teammates }] = await Promise.all([
    supabase
      .from("personas")
      .select("id, persona_name, managed_by, contact_email, contact_phone")
      .eq("id", id)
      .single(),
    supabase
      .from("users")
      .select("id, full_name")
      .eq("active", true)
      .order("full_name"),
  ]);

  if (!persona) notFound();

  const { data: accountsData } = await supabase
    .from("accounts")
    .select(
      "id, platform, handle, subscription_date, renewal_date, assigned_card, assigned_proxy, status"
    )
    .eq("persona_id", id)
    .order("platform")
    .order("handle");

  const accounts = (accountsData ?? []) as AccountRow[];
  const today = todayStr();
  const soon = daysAgoStr(-7);

  const manager = (teammates ?? []).find((t) => t.id === persona.managed_by);
  const savePersona = updatePersona.bind(null, persona.id);
  const removePersona = deletePersona.bind(null, persona.id);

  return (
    <Shell
      profile={profile}
      active="personas"
      title={persona.persona_name}
      subtitle="One persona, all of its accounts."
      action={
        <Link
          href="/personas"
          className="text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← All personas
        </Link>
      }
    >
      <Card padded>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
          <span className="flex items-center gap-2">
            <span className="text-zinc-500 dark:text-zinc-400">Run by</span>
            {manager ? (
              <span className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-50">
                <Avatar name={manager.full_name} size={7} />
                {manager.full_name}
              </span>
            ) : (
              <span className="text-zinc-400">unassigned</span>
            )}
          </span>
          <span>
            <span className="text-zinc-500 dark:text-zinc-400">Email </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {persona.contact_email ?? "—"}
            </span>
          </span>
          <span>
            <span className="text-zinc-500 dark:text-zinc-400">Phone </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {persona.contact_phone ?? "—"}
            </span>
          </span>
        </div>

        <details className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <summary className="cursor-pointer select-none rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800">
            ✏️ Edit persona details
          </summary>
          <form
            action={savePersona}
            className="flex flex-col gap-5 border-t border-zinc-100 p-4 dark:border-zinc-800"
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Persona name <span className="text-red-500">*</span>
                </label>
                <input
                  name="persona_name"
                  required
                  defaultValue={persona.persona_name}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Run by</label>
                <select
                  name="managed_by"
                  defaultValue={persona.managed_by ?? ""}
                  className={inputClass}
                >
                  <option value="">Unassigned</option>
                  {(teammates ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Contact email</label>
                <input
                  type="email"
                  name="contact_email"
                  defaultValue={persona.contact_email ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Contact phone</label>
                <input
                  name="contact_phone"
                  defaultValue={persona.contact_phone ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
            <button type="submit" className={btnPrimary + " self-start"}>
              Save details
            </button>
          </form>
        </details>
      </Card>

      <Card
        title={`Accounts (${accounts.length})`}
        description="Every account this persona runs, across all platforms."
        action={
          <Link
            href={`/personas/${persona.id}/accounts/new`}
            className={btnPrimary}
          >
            + Add account
          </Link>
        }
      >
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="text-3xl">📱</span>
            <p className="font-medium text-zinc-700 dark:text-zinc-200">
              No accounts yet
            </p>
            <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              Add the accounts this persona has — its X, Discord, Instagram, and
              so on. Each one becomes a card here.
            </p>
            <Link
              href={`/personas/${persona.id}/accounts/new`}
              className={btnPrimary + " mt-2"}
            >
              + Add the first account
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => {
              const renewSoon =
                a.renewal_date && a.renewal_date >= today && a.renewal_date <= soon;
              const renewPast = a.renewal_date && a.renewal_date < today;
              return (
                <div
                  key={a.id}
                  className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={
                        "rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide " +
                        (platformChip[a.platform] ??
                          "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")
                      }
                    >
                      {a.platform}
                    </span>
                    <span
                      className={
                        "rounded-full px-2.5 py-1 text-xs font-semibold " +
                        (STATUS_BADGE[a.status] ?? "")
                      }
                    >
                      {statusLabel(a.status)}
                    </span>
                  </div>

                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    {a.handle}
                  </p>

                  <dl className="flex flex-col gap-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-zinc-500 dark:text-zinc-400">Renews</dt>
                      <dd
                        className={
                          renewPast
                            ? "font-semibold text-red-600 dark:text-red-400"
                            : renewSoon
                              ? "font-semibold text-amber-600 dark:text-amber-400"
                              : "text-zinc-700 dark:text-zinc-300"
                        }
                      >
                        {a.renewal_date ?? "—"}
                        {renewSoon && " · soon"}
                        {renewPast && " · overdue"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Subscribed
                      </dt>
                      <dd className="text-zinc-700 dark:text-zinc-300">
                        {a.subscription_date ?? "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500 dark:text-zinc-400">Card</dt>
                      <dd className="text-zinc-700 dark:text-zinc-300">
                        {a.assigned_card ?? "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500 dark:text-zinc-400">Proxy</dt>
                      <dd className="text-zinc-700 dark:text-zinc-300">
                        {a.assigned_proxy ?? "—"}
                      </dd>
                    </div>
                  </dl>

                  <Link
                    href={`/accounts/${a.id}`}
                    className="mt-auto rounded-lg border border-zinc-300 py-1.5 text-center text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Edit account
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <details className="rounded-2xl border border-red-200 bg-white dark:border-red-950 dark:bg-zinc-900">
        <summary className="cursor-pointer select-none rounded-2xl px-5 py-3.5 text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40">
          Danger zone
        </summary>
        <div className="border-t border-red-100 p-5 dark:border-red-950">
          <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
            Deleting this persona also deletes all of its accounts. There is no
            undo.
          </p>
          <form action={removePersona}>
            <button
              type="submit"
              className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Delete this persona
            </button>
          </form>
        </div>
      </details>
    </Shell>
  );
}
