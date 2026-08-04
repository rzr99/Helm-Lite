import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { ProdHeader } from "@/components/production-shell";
import { stationByKey, STATIONS } from "@/lib/production";

export const dynamic = "force-dynamic";

export default async function StationPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const station = stationByKey(key);
  if (!station) notFound();

  const idx = STATIONS.findIndex((s) => s.key === key);

  return (
    <>
      <ProdHeader
        title={station.name}
        subtitle={station.objective}
        back={{ href: "/production/playbook", label: "Playbook" }}
        action={
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-amber-500/70">
              Station {String(idx + 1).padStart(2, "0")}
            </span>
            {station.tool && (
              <span className="rounded border border-amber-600/30 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-500/90">
                {station.tool}
              </span>
            )}
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        {/* How to */}
        <Card title="How to do it" padded>
          <ol className="flex flex-col gap-5">
            {station.how.map((h, i) => (
              <li key={i} className="flex gap-4">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-amber-600/40 font-mono text-xs text-amber-500/90">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-[#f8f7f4]">{h.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[#f8f7f4]/60">
                    {h.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        {/* Settings */}
        {station.settings && station.settings.length > 0 && (
          <Card title="Settings & specs" padded>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {station.settings.map((s) => (
                <div
                  key={s.k}
                  className="flex items-baseline justify-between gap-4 border-b border-white/[0.06] pb-2"
                >
                  <dt className="text-sm text-[#f8f7f4]/55">{s.k}</dt>
                  <dd className="text-right font-mono text-sm text-[#f8f7f4]">
                    {s.v}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        )}

        {/* Pass the gate */}
        <Card title="To pass this gate" description={station.gate} padded>
          <ul className="flex flex-col gap-2.5">
            {station.pass.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rotate-45 bg-amber-600" />
                <span className="text-[#f8f7f4]/75">{p}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Mistakes */}
        <Card title="Common mistakes" padded>
          <ul className="flex flex-col gap-2.5">
            {station.mistakes.map((m, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 shrink-0 text-red-400/70">✕</span>
                <span className="text-[#f8f7f4]/60">{m}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Your media — to be filled from real work */}
        <Card title="Your reference & templates" padded>
          <p className="text-sm leading-relaxed text-[#f8f7f4]/55">
            This is where your own walkthrough video, screenshots, and the
            template link for this station will live — captured from your real
            projects so the standard is yours, not generic. Attaching media here
            is the next thing we can wire in.
          </p>
        </Card>
      </div>
    </>
  );
}
