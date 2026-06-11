import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get profile
  let { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, onboarding_completed")
    .eq("id", user.id)
    .single();

  // Auto-create profile if missing (user signed up before migration)
  if (!profile) {
    const { data: newProfile } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        full_name: user.user_metadata?.full_name ?? user.email,
        onboarding_completed: false,
      })
      .select("id, full_name, avatar_url, onboarding_completed")
      .single();

    profile = newProfile;
  }

  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  // Get ALL workspace memberships
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces:workspace_id(id, name, logo_url)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const allWorkspaces = (memberships ?? []).map((m) => {
    const ws = m.workspaces as unknown as { id: string; name: string; logo_url: string | null };
    return { id: ws.id, name: ws.name, logo_url: ws.logo_url, role: m.role as "owner" | "admin" | "member" };
  });

  // Active workspace from cookie, fallback to first
  const cookieStore = await cookies();
  const savedWsId = cookieStore.get("active_workspace_id")?.value;
  const activeWs = allWorkspaces.find((ws) => ws.id === savedWsId) ?? allWorkspaces[0] ?? null;
  const workspaceRole = activeWs?.role ?? "member";
  const workspace = activeWs ? { id: activeWs.id, name: activeWs.name, logo_url: activeWs.logo_url } : null;

  // Fetch projects (filtered by workspace)
  let projectsQuery = supabase
    .from("projects")
    .select("id, name")
    .eq("archived", false)
    .order("created_at", { ascending: true });

  if (workspace) {
    projectsQuery = projectsQuery.eq("workspace_id", workspace.id);
  }

  const { data: projects } = await projectsQuery;

  // Fetch lists
  const { data: allLists } = await supabase
    .from("lists")
    .select("id, name, position, project_id")
    .order("position");

  const listsMap = new Map<string, { id: string; name: string; position: number }[]>();
  for (const list of allLists ?? []) {
    const arr = listsMap.get(list.project_id) ?? [];
    arr.push({ id: list.id, name: list.name, position: list.position });
    listsMap.set(list.project_id, arr);
  }

  const projectsWithLists = (projects ?? []).map((p) => ({
    ...p,
    lists: (listsMap.get(p.id) ?? []).sort((a, b) => a.position - b.position),
  }));

  return (
    <div className="flex h-full">
      <Sidebar
        projects={projectsWithLists}
        profile={profile ? { id: profile.id, full_name: profile.full_name, role: workspaceRole } : null}
        workspace={workspace}
        allWorkspaces={allWorkspaces}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
