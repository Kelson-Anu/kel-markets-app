import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const title = "Sign in or create an account — KELMARKET";
const description =
  "Create a KELMARKET account, verify your email and sign in to trade prediction markets.";

export const Route = createFileRoute("/auth")({
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
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/portfolio", replace: true });
    });
  }, [navigate]);

  const redirectTo = () =>
    typeof window === "undefined" ? "" : `${window.location.origin}/verify`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password !== confirm) throw new Error("Passwords do not match");
        const name = username.trim();
        if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(name)) {
          throw new Error("Username must be 3-24 letters, numbers, . _ or -");
        }
        const tel = phone.trim();
        if (tel && !/^\+?[0-9 ()-]{6,20}$/.test(tel)) {
          throw new Error("Enter a valid phone number");
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo(),
            data: { username: name, phone: tel },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setPending(email);
          return;
        }
        toast.success("Account created");
        navigate({ to: "/portfolio" });
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("not confirmed")) {
          setPending(email);
          toast.error("Please verify your email first.");
          return;
        }
        throw error;
      }
      navigate({ to: "/portfolio" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!pending) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pending,
      options: { emailRedirectTo: redirectTo() },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email sent again.");
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/portfolio" });
  };

  if (pending) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-md px-5 py-16">
          <h1 className="text-3xl font-bold">Verify your email</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-foreground">{pending}</span>. Click it to activate
            your account, then come back and sign in.
          </p>
          <div className="mt-8 space-y-3 rounded-lg border border-border bg-card p-6">
            <button
              type="button"
              onClick={resend}
              disabled={busy}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              Resend verification email
            </button>
            <button
              type="button"
              onClick={() => {
                setPending(null);
                setMode("signin");
              }}
              className="w-full rounded-md border border-border py-2.5 text-sm font-medium hover:bg-secondary"
            >
              Back to sign in
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-3xl font-bold">
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Access your KELMARKET portfolio and trades."
            : "We'll email you a verification link before your account goes live."}
        </p>

        <form
          onSubmit={submit}
          className="mt-8 space-y-4 rounded-lg border border-border bg-card p-6"
        >
          {mode === "signup" && (
            <>
              <div>
                <label
                  htmlFor="username"
                  className="text-[11px] uppercase tracking-widest text-muted-foreground"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={24}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="text-[11px] uppercase tracking-widest text-muted-foreground"
                >
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  maxLength={20}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </>
          )}
          <div>
            <label
              htmlFor="email"
              className="text-[11px] uppercase tracking-widest text-muted-foreground"
            >
              Email
            </label>
            <input
              id="email"
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
              htmlFor="password"
              className="text-[11px] uppercase tracking-widest text-muted-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          {mode === "signup" && (
            <div>
              <label
                htmlFor="confirm"
                className="text-[11px] uppercase tracking-widest text-muted-foreground"
              >
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button
            type="button"
            onClick={google}
            className="w-full rounded-md border border-border py-2.5 text-sm font-medium hover:bg-secondary"
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin"
              ? "Need an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
          <Link
            to="/admin/login"
            className="block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Admin? Use the admin sign in
          </Link>
        </form>
      </main>
    </div>
  );
}
