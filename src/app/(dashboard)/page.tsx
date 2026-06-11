import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ProjectList } from "./project-list";
import { PageHeader } from "@/components/page-header";
import { Suspense } from "react";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Get user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user!.id)
    .single();

  // Get active workspace from cookie, fallback to first membership
  const cookieStore = await cookies();
  const savedWsId = cookieStore.get("active_workspace_id")?.value;

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true });

  const activeWsId = memberships?.find((m) => m.workspace_id === savedWsId)?.workspace_id
    ?? memberships?.[0]?.workspace_id;

  let projectsQuery = supabase
    .from("projects")
    .select("id, name, description, archived, created_at, created_by")
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (activeWsId) {
    projectsQuery = projectsQuery.eq("workspace_id", activeWsId);
  }

  const { data: projects } = await projectsQuery;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Projects"
        currentUser={{
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
        }}
      />
      <div className="mx-auto max-w-4xl w-full p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Manage your team projects
            </p>
          </div>
        </div>
        <Suspense>
          <ProjectList projects={projects ?? []} />
        </Suspense>
      </div>
    </div>
  );
}
