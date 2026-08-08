import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { notificationsQuery } from "@/lib/market-queries";

const SEEN_KEY = "kelmarket.notifications.seen";

export function NotificationBell() {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState<number>(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSeenAt(Number(localStorage.getItem(SEEN_KEY) ?? 0));
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data } = useQuery({ ...notificationsQuery, enabled: signedIn, refetchInterval: 60_000 });
  const items = data ?? [];
  const unread = items.filter((n) => new Date(n.created_at).getTime() > seenAt).length;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (!signedIn) return null;

  const toggle = () => {
    setOpen((o) => {
      if (!o) {
        const now = Date.now();
        localStorage.setItem(SEEN_KEY, String(now));
        setSeenAt(now);
      }
      return !o;
    });
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={toggle}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        className="relative rounded-md px-2.5 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="num absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          <p className="border-b border-border px-4 py-2.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            Notifications
          </p>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nothing yet. Trades and resolutions show up here.
              </p>
            )}
            {items.map((n) => {
              const inner = (
                <>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="num mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </>
              );
              return n.market_id ? (
                <Link
                  key={n.id}
                  to="/market/$marketId"
                  params={{ marketId: n.market_id }}
                  onClick={() => setOpen(false)}
                  className="block border-b border-border/60 px-4 py-3 last:border-0 hover:bg-secondary"
                >
                  {inner}
                </Link>
              ) : (
                <div key={n.id} className="border-b border-border/60 px-4 py-3 last:border-0">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}