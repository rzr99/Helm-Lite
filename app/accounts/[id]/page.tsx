import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, btnPrimary, inputClass, labelClass } from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { ACCOUNT_STATUSES } from "@/lib/enums";
import { updateAccount, deleteAccount } from "@/app/personas/actions";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const [{ data: account }, { data: platforms }] = await Promise.all([
    supabase
      .from("accounts")
      .select(
        "id, persona_id, platform, handle, subscription_date, renewal_date, assigned_card, assigned_proxy, status, persona:personas(persona_name)"
      )
      .eq("id", id)
      .single(),
    supabase.from("platforms").select("name").order("name"),
  ]);

  if (!account) notFound();

  const personaInfo = account.persona as unknown as {
    persona_name: string;
  } | null;

  const saveAccount = updateAccount.bind(null, account.id, account.persona_id);
  const removeAccount = deleteAccount.bind(null, account.id, account.persona_id);

  return (
    <Shell
      profile={profile}
      active="personas"
      title={account.handle}
      subtitle={`${account.platform} account of ${personaInfo?.persona_name ?? "persona"}`}
      action={
        <Link
          href={`/personas/${account.persona_id}`}
          className="text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to persona
        </Link>
      }
    >
      <Card
        title="Account details"
        description="Card and proxy are reference labels only — never a real card number."
      >
        <form action={saveAccount} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Platform</label>
              <select
                name="platform"
                defaultValue={account.platform}
                className={inputClass}
              >
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
                defaultValue={account.handle}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                name="status"
                defaultValue={account.status}
                className={inputClass}
              >
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
                defaultValue={account.assigned_card ?? ""}
                placeholder="Kripicard 6190"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Subscription date</label>
              <input
                type="date"
                name="subscription_date"
                defaultValue={account.subscription_date ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Renewal date</label>
              <input
                type="date"
                name="renewal_date"
                defaultValue={account.renewal_date ?? ""}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Proxy</label>
              <input
                name="assigned_proxy"
                defaultValue={account.assigned_proxy ?? ""}
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
        title="Danger zone"
        description="Removes this account from the persona. There is no undo."
      >
        <form action={removeAccount}>
          <button
            type="submit"
            className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete this account
          </button>
        </form>
      </Card>
    </Shell>
  );
}
