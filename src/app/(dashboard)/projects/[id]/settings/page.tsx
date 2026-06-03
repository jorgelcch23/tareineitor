import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  // Get current user's profile (for workspace admin check)
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
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
    currentProfile?.role === "owner" || currentProfile?.role === "admin";
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

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Project Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">{project.name}</p>
      </div>

      <div className="space-y-8">
        {/* Project details */}
        <ProjectSettingsForm
          project={project}
          isProjectAdmin={isProjectAdmin}
        />

        {/* Members */}
        <ProjectMembersList
          projectId={id}
          members={members}
          availableUsers={availableUsers}
          currentUserId={user.id}
          isProjectAdmin={isProjectAdmin}
        />
      </div>
    </div>
  );
}
