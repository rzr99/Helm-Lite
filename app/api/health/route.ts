// A tiny public endpoint for an external uptime pinger to hit every few minutes.
// Keeps the serverless function warm (fewer cold starts) without touching auth
// or the database. Excluded from the proxy in proxy.ts so the ping is cheap.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response("ok", {
    status: 200,
    headers: { "cache-control": "no-store" },
  });
}
