import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  Card,
  btnPrimary,
  btnSecondary,
  inputClass,
  labelClass,
} from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { ACCOUNT_STATUSES } from "@/lib/enums";
import { createAccount } from "@/app/personas/actions";

export const dynamic = "force-dynamic";

export default async function NewAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const [{ data: persona }, { data: platforms }] = await Promise.all([
    supabase.from("personas").select("id, persona_name").eq("id", id).single(),
    supabase.from("platforms").select("name").order("name"),
  ]);

  if (!persona) notFound();

  const saveAccount = createAccount.bind(null, persona.id);

  return (
    <Shell
      profile={profile}
      active="personas"
      title="Add an account"
      subtitle={`A platform account that ${persona.persona_name} operates.`}
      action={
        <Link
          href={`/personas/${persona.id}`}
          className="text-sm font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to {persona.persona_name}
        </Link>
      }
    >
      <div className="max-w-xl">
        <Card padded>
          <form action={saveAccount} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Missing a platform? Add it on the Personas page first.
                </p>
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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Subscription date</label>
                <input
                  type="date"
                  name="subscription_date"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Renewal date</label>
                <input type="date" name="renewal_date" className={inputClass} />
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  You'll get a "soon" flag when this is a week away.
                </p>
              </div>
            </div>

            <div>
              <label className={labelClass}>Card reference (label only)</label>
              <input
                name="assigned_card"
                placeholder="Kripicard 6190"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Never the real card number — the app will refuse it.
              </p>
            </div>

            <div>
              <label className={labelClass}>Proxy</label>
              <input
                name="assigned_proxy"
                placeholder="proxy label / region"
                className={inputClass}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" className={btnPrimary}>
                Save account
              </button>
              <Link href={`/personas/${persona.id}`} className={btnSecondary}>
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
