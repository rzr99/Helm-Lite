"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// A thin amber bar at the very top that animates while a page is loading, so a
// slow navigation never looks frozen. No dependencies — starts on internal link
// clicks / form submits / back-forward, and completes when the route changes.
export function TopProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0); // 0 = hidden, 100 = done
  const guard = useRef<number | null>(null);
  const running = progress > 0 && progress < 100;

  // Finish whenever the route actually changes.
  useEffect(() => {
    setProgress((p) => (p > 0 ? 100 : 0));
  }, [pathname, searchParams]);

  // Start on navigations.
  useEffect(() => {
    function start() {
      setProgress((p) => (p > 0 && p < 100 ? p : 8));
      if (guard.current) window.clearTimeout(guard.current);
      // Safety: never leave the bar stuck if a route somehow doesn't change.
      guard.current = window.setTimeout(() => setProgress(100), 8000);
    }
    function onClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        a.target === "_blank" ||
        a.hasAttribute("download")
      )
        return;
      try {
        const url = new URL((a as HTMLAnchorElement).href, location.href);
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.search === location.search)
          return;
        start();
      } catch {
        /* ignore malformed hrefs */
      }
    }
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", start, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", start, true);
      window.removeEventListener("popstate", start);
    };
  }, []);

  // Creep upward toward 90% while loading so it always feels alive.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setProgress((p) => (p < 90 ? p + (90 - p) * 0.08 : p));
    }, 500);
    return () => window.clearInterval(id);
  }, [running]);

  // Hide shortly after completing.
  useEffect(() => {
    if (progress !== 100) return;
    if (guard.current) window.clearTimeout(guard.current);
    const t = window.setTimeout(() => setProgress(0), 350);
    return () => window.clearTimeout(t);
  }, [progress]);

  if (progress <= 0) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "2.5px",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "#e87000",
          boxShadow: "0 0 8px rgba(232,112,0,0.6)",
          opacity: progress === 100 ? 0 : 1,
          transition:
            progress === 100
              ? "width 0.2s ease, opacity 0.3s ease 0.15s"
              : "width 0.3s ease",
        }}
      />
    </div>
  );
}
