import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";

export type TraderProfileRow = {
  id: string;
  username: string;
  phone: string | null;
  email: string | null;
  created_at: string;
};

/** The signed-in trader's own profile row (username, phone, email). */
export function useTraderProfile() {
  const { user, ready } = useSession();
  return useQuery({
    queryKey: ["profile", user?.id ?? null],
    enabled: ready && !!user,
    queryFn: async (): Promise<TraderProfileRow | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, phone, email, created_at")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as TraderProfileRow | null;
    },
  });
}
