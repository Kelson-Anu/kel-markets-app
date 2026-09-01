import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";

const title = "Email verification — KELMARKET";
const description = "Confirming your KELMARKET account email address.";

export const Route = createFileRoute("/verify")({
  ssr: false,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const [state, setState] = useState<"checking" | "ok" | "error">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const params = new URLSearchParams(window.location.search);
    const err = hash.get("error_description") ?? params.get("error_description");
    if (err) {
      setMessage(err);
      setState("error");
      return;
    }
    const check = async (attempt = 0) => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setState("ok");
        return;
      }
      if (attempt < 5) setTimeout(() => check(attempt + 1), 400);
      else {
        setMessage("We couldn't confirm this link. It may have expired.");
        setState("error");
      }
    };
    check();
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-5 py-16 text-center">
        {state === "checking" && (
          <p className="text-sm text-muted-foreground">Confirming your email…</p>
        )}
        {state === "ok" && (
          <>
            <h1 className="text-3xl font-bold">Email verified</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your KELMARKET account is active and you're signed in.
            </p>
            <Link
              to="/portfolio"
              className="mt-8 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Go to portfolio
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="text-3xl font-bold">Verification failed</h1>
            <p className="mt-3 text-sm text-muted-foreground">{message}</p>
            <Link
              to="/auth"
              className="mt-8 inline-block rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary"
            >
              Back to sign in
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
