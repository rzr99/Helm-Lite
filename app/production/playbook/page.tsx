import Link from "next/link";
import { Card } from "@/components/ui";
import { ProdHeader } from "@/components/production-shell";
import { STATIONS, jobTypeLabel } from "@/lib/production";

export const dynamic = "force-dynamic";

export default function PlaybookPage() {
  return (
    <>
      <ProdHeader
        title="Playbook"
        subtitle="The Motion Graphics line — the detailed SOP behind every station."
      />

      <div className="flex flex-col gap-6">
        <Card padded>
          <p className="text-sm leading-relaxed text-[#f8f7f4]/70">
            One line runs every job. A job&apos;s type decides which stations
            apply — a few are skipped for some types. Open any station for the
            full how-to: the detailed steps, exact settings, the checklist to
            pass its gate, and the mistakes to avoid.
          </p>
        </Card>

        <Card
          title="The line"
          description="Ten stations, brief to delivery"
          padded={false}
        >
          <ol className="divide-y divide-white/[0.06]">
            {STATIONS.map((s, i) => (
              <li key={s.key}>
                <Link
                  href={`/production/playbook/${s.key}`}
                  className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
                >
                  <span className="mt-0.5 font-mono text-xs text-amber-500/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[#f8f7f4]">{s.name}</span>
                      {s.tool && (
                        <span className="rounded border border-amber-600/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-500/90">
                          {s.tool}
                        </span>
                      )}
                      {s.isGate && (
                        <span className="text-[10px] uppercase tracking-wide text-amber-500/80">
                          QC gate
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-[#f8f7f4]/55">
                      {s.objective}
                    </span>
                    {s.skipFor && s.skipFor.length > 0 && (
                      <span className="mt-1 block text-xs text-[#f8f7f4]/35">
                        Skipped for {s.skipFor.map(jobTypeLabel).join(", ")}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 text-[#f8f7f4]/25">→</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
