import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";

export function AccountMenu() {
  const { user, ready } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!ready) return null;

  if (!user) {
    return (
      <Link
        to="/auth"
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"
      >
        Sign in
      </Link>
    );
  }

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className="hidden max-w-[160px] truncate text-xs text-muted-foreground md:inline"
        title={user.email ?? ""}
      >
        {user.email}
      </span>
      <button
        type="button"
        onClick={signOut}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary"
      >
        Sign out
      </button>
    </div>
  );
}
