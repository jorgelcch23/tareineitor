import { createClient } from "@/lib/supabase/server";

export async function getCurrentWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get the user's workspace membership (first one — single workspace for now)
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces:workspace_id(id, name, logo_url)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) return null;

  const workspace = membership.workspaces as unknown as {
    id: string;
    name: string;
    logo_url: string | null;
  };

  return {
    id: workspace.id,
    name: workspace.name,
    logo_url: workspace.logo_url,
    role: membership.role as "owner" | "admin" | "member",
  };
}
