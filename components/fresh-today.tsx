"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Guards date-sensitive pages against a stale cached render. If the page was
// server-rendered on an earlier day (e.g. the client Router Cache replayed a
// render from before a month/day boundary), the date it was built with won't
// match the real Karachi date now — so refresh to re-render on the server with
// today. No-op when already current, so it never loops.
export function FreshToday({ today }: { today: string }) {
  const router = useRouter();
  useEffect(() => {
    const now = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
    }).format(new Date());
    if (now !== today) router.refresh();
  }, [today, router]);
  return null;
}
