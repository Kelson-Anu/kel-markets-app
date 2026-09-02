import { createMiddleware } from "@tanstack/react-start";

/**
 * Project-specific replacement for the generated `attachSupabaseAuth`.
 * The generated version touches the Supabase browser client eagerly, so any
 * environment hiccup (missing VITE_SUPABASE_* at build time) turned every
 * server-function call — including public reads — into a blank screen.
 * Here the token lookup is best-effort: public queries keep working.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
    } catch {
      token = undefined;
    }
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);
