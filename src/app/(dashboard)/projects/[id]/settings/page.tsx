import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ProjectMembersList } from "./project-members-list";
import { ProjectSettingsForm } from "./project-settings-form";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get project
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description")
    .eq("id", id)
    .single();

  if (!project) notFound();

  // Get current user's workspace role
  const { data: wsMembership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  // Get project members with their profiles
  const { data: projectMembers } = await supabase
    .from("project_members")
    .select("id, user_id, role, profiles:user_id(full_name)")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  // Check if current user is a project admin or workspace admin
  const currentMembership = projectMembers?.find(
    (m) => m.user_id === user.id
  );
  const isWorkspaceAdmin =
    wsMembership?.role === "owner" || wsMembership?.role === "admin";
  const isProjectAdmin =
    isWorkspaceAdmin || currentMembership?.role === "admin";

  // Get all workspace profiles to find users not yet in the project
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  const memberUserIds = new Set(projectMembers?.map((m) => m.user_id) ?? []);
  const availableUsers = (allProfiles ?? []).filter(
    (p) => !memberUserIds.has(p.id)
  );

  const members = (projectMembers ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    full_name: (m.profiles as { full_name: string | null } | null)?.full_name ?? null,
    role: m.role as "admin" | "member",
  }));

  // Get current user's profile for header
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Project Settings"
        currentUser={{
          full_name: currentProfile?.full_name ?? null,
          avatar_url: currentProfile?.avatar_url ?? null,
        }}
      />
      <div className="mx-auto max-w-3xl w-full p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Project Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">{project.name}</p>
        </div>

        <div className="space-y-8">
          <ProjectSettingsForm
            project={project}
            isProjectAdmin={isProjectAdmin}
          />
          <ProjectMembersList
            projectId={id}
            members={members}
            availableUsers={availableUsers}
            currentUserId={user.id}
            isProjectAdmin={isProjectAdmin}
          />
        </div>
      </div>
    </div>
  );
}
