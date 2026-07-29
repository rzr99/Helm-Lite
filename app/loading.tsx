// Shown instantly on navigation while the next page renders on the server —
// so a click gives immediate feedback instead of a frozen screen.
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0e0e0d]">
      <div className="flex flex-col items-center gap-4">
        <svg
          viewBox="0 0 400 400"
          className="h-12 w-12 animate-pulse rounded-xl border border-white/10"
          aria-hidden
        >
          <rect width="400" height="400" fill="#0E0E0D" />
          <g fill="#F8F7F4">
            <rect x="96" y="96" width="62" height="13" />
            <rect x="96" y="96" width="13" height="62" />
            <rect x="242" y="96" width="62" height="13" />
            <rect x="291" y="96" width="13" height="62" />
            <rect x="96" y="291" width="62" height="13" />
            <rect x="96" y="242" width="13" height="62" />
            <rect x="242" y="291" width="62" height="13" />
            <rect x="291" y="242" width="13" height="62" />
          </g>
          <polygon points="200,146 254,200 200,254 146,200" fill="#E87000" />
        </svg>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#f8f7f4]/40">
          Loading…
        </p>
      </div>
    </div>
  );
}
