import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import {
  Card,
  btnPrimary,
  btnSecondary,
  inputClass,
  labelClass,
} from "@/components/ui";
import { requireProfile } from "@/lib/profile";
import { createPersona } from "@/app/personas/actions";

export const dynamic = "force-dynamic";

export default async function NewPersonaPage() {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "owner") redirect("/");

  const { data: teammates } = await supabase
    .from("users")
    .select("id, full_name")
    .eq("active", true)
    .order("full_name");

  return (
    <Shell
      profile={profile}
      active="personas"
      title="New persona"
      subtitle="An operating identity — name it, assign who runs it, and add its accounts after saving."
    >
      <div className="max-w-xl">
        <Card padded>
          <form action={createPersona} className="flex flex-col gap-5">
            <div>
              <label className={labelClass}>
                Persona name <span className="text-red-500">*</span>
              </label>
              <input
                name="persona_name"
                required
                placeholder="e.g. Aria Design Co"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Run by</label>
              <select name="managed_by" defaultValue="" className={inputClass}>
                <option value="">Unassigned</option>
                {(teammates ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Contact email</label>
                <input
                  type="email"
                  name="contact_email"
                  placeholder="inbox tied to this persona"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Contact phone</label>
                <input
                  name="contact_phone"
                  placeholder="number tied to this persona"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" className={btnPrimary}>
                Save persona
              </button>
              <Link href="/personas" className={btnSecondary}>
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
