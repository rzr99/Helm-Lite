import { Card } from "@/components/ui";
import { ProdHeader } from "@/components/production-shell";
import { KIT } from "@/lib/production";

export const dynamic = "force-dynamic";

export default function KitPage() {
  return (
    <>
      <ProdHeader
        title="Kit"
        subtitle="The LS- templates that make the line run. Build these once."
      />

      <div className="flex flex-col gap-6">
        <Card padded>
          <p className="text-sm leading-relaxed text-[var(--text)]/70">
            The playbook keeps pointing at these{" "}
            <span className="font-mono text-amber-500/90">LS-</span> templates.
            They&apos;re what turn &ldquo;produce it&rdquo; into &ldquo;fill in
            the template.&rdquo; Building the kit is the one-time investment —
            after it exists, the line runs on rails.
          </p>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {KIT.map((k) => (
            <div
              key={k.code}
              className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-5"
            >
              <p className="font-mono text-sm font-semibold text-amber-500/90">
                {k.code}
              </p>
              <p className="mt-1.5 text-sm text-[var(--text)]/60">{k.what}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
