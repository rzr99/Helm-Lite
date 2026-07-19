import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  Card,
  EmptyState,
  btnPrimary,
  inputClass,
  labelClass,
} from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { ACCOUNT_STATUSES, STATUS_BADGE, statusLabel } from "@/lib/enums";
import { todayStr, daysAgoStr } from "@/lib/dates";
import {
  updatePersona,
  deletePersona,
  createAccount,
} from "@/app/personas/actions";

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

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const [{ data: persona }, { data: teammates }, { data: platforms }] =
    await Promise.all([
      supabase
        .from("personas")
        .select(
          "id, persona_name, managed_by, contact_email, contact_phone"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("users")
        .select("id, full_name")
        .eq("active", true)
        .order("full_name"),
      supabase.from("platforms").select("name").order("name"),
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
  const soon = daysAgoStr(-7); // 7 days from now

  const savePersona = updatePersona.bind(null, persona.id);
  const removePersona = deletePersona.bind(null, persona.id);
  const saveAccount = createAccount.bind(null, persona.id);

  return (
    <Shell
      profile={profile}
      active="personas"
      title={persona.persona_name}
      subtitle={`${accounts.length} account${accounts.length === 1 ? "" : "s"} across platforms`}
      action={
        <Link
          href="/personas"
          className="text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← All personas
        </Link>
      }
    >
      <Card title="Persona details" description="Edit anything and hit Save.">
        <form action={savePersona} className="flex flex-col gap-5">
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
            Save changes
          </button>
        </form>
      </Card>

      <Card
        title="Accounts"
        description="Every account this persona operates. Card and proxy fields are reference labels only — never store real card numbers."
        padded={false}
      >
        {accounts.length === 0 ? (
          <EmptyState
            emoji="📱"
            title="No accounts yet"
            hint="Add the first account with the form below."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Platform</th>
                  <th className="px-5 py-3 font-semibold">Handle</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Subscribed</th>
                  <th className="px-5 py-3 font-semibold">Renews</th>
                  <th className="px-5 py-3 font-semibold">Card ref</th>
                  <th className="px-5 py-3 font-semibold">Proxy</th>
                  <th className="px-5 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {accounts.map((a) => {
                  const renewSoon =
                    a.renewal_date &&
                    a.renewal_date >= today &&
                    a.renewal_date <= soon;
                  const renewPast = a.renewal_date && a.renewal_date < today;
                  return (
                    <tr
                      key={a.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-zinc-50">
                        {a.platform}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300">
                        {a.handle}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={
                            "rounded-full px-2.5 py-1 text-xs font-semibold " +
                            (STATUS_BADGE[a.status] ?? "")
                          }
                        >
                          {statusLabel(a.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                        {a.subscription_date ?? "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={
                            renewPast
                              ? "font-semibold text-red-600 dark:text-red-400"
                              : renewSoon
                                ? "font-semibold text-amber-600 dark:text-amber-400"
                                : "text-zinc-600 dark:text-zinc-400"
                          }
                        >
                          {a.renewal_date ?? "—"}
                          {renewSoon && " · soon"}
                          {renewPast && " · overdue"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                        {a.assigned_card ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                        {a.assigned_proxy ?? "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/accounts/${a.id}`}
                          className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          Edit →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <form
          action={saveAccount}
          className="grid grid-cols-1 gap-4 border-t border-zinc-100 bg-zinc-50/60 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-800/40 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label className={labelClass}>
              Platform <span className="text-red-500">*</span>
            </label>
            <select name="platform" defaultValue="x" className={inputClass}>
              {(platforms ?? []).map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Handle <span className="text-red-500">*</span>
            </label>
            <input
              name="handle"
              required
              placeholder="@persona_handle"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select name="status" defaultValue="active" className={inputClass}>
              {ACCOUNT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Card ref (label only)</label>
            <input
              name="assigned_card"
              placeholder="Kripicard 6190"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Subscription date</label>
            <input type="date" name="subscription_date" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Renewal date</label>
            <input type="date" name="renewal_date" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Proxy</label>
            <input
              name="assigned_proxy"
              placeholder="proxy label / region"
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className={btnPrimary + " w-full"}>
              Add account
            </button>
          </div>
        </form>
      </Card>

      <Card
        title="Danger zone"
        description="Deleting this persona also deletes all of its accounts. There is no undo."
      >
        <form action={removePersona}>
          <button
            type="submit"
            className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete this persona
          </button>
        </form>
      </Card>
    </Shell>
  );
}
