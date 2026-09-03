import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { getAdminStatus } from "@/lib/markets.functions";

const title = "Admin sign in — KELMARKET";
const description =
  "Restricted KELMARKET admin access. Only accounts with the admin role can enter the market console.";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      try {
        const status = await getAdminStatus();
        if (status.isAdmin) navigate({ to: "/admin", replace: true });
      } catch {
        // stay on the login form
      }
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("not confirmed")) {
          throw new Error("Please verify your email before signing in.");
        }
        throw error;
      }
      const status = await getAdminStatus();
      if (!status.isAdmin) {
        await supabase.auth.signOut();
        throw new Error("This account does not have admin access.");
      }
      toast.success("Welcome back, admin");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Admin sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-5 py-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
          Restricted
        </p>
        <h1 className="mt-2 text-3xl font-bold">Admin sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This console is separate from trader accounts. Only accounts granted the admin role can
          continue — other accounts are signed out immediately.
        </p>

        <form
          onSubmit={submit}
          className="mt-8 space-y-4 rounded-lg border border-primary/30 bg-card p-6"
        >
          <div>
            <label
              htmlFor="admin-email"
              className="text-[11px] uppercase tracking-widest text-muted-foreground"
            >
              Admin email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label
              htmlFor="admin-password"
              className="text-[11px] uppercase tracking-widest text-muted-foreground"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Checking access…" : "Enter admin console"}
          </button>
          <Link
            to="/auth"
            className="block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Not an admin? Go to the trader sign in
          </Link>
        </form>
      </main>
    </div>
  );
}
