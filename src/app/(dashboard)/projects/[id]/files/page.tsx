import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectFiles } from "../project-files";
import { ProjectHeader } from "../project-header";

export default async function FilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [projectRes, filesRes, membersRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name")
      .eq("id", id)
      .single(),
    supabase
      .from("project_files")
      .select("id, name, storage_path, size, content_type, uploaded_by, created_at, profiles(id, full_name, avatar_url)")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_members")
      .select("user_id, profiles(id, full_name, avatar_url)")
      .eq("project_id", id),
  ]);

  const { data: { user } } = await supabase.auth.getUser();

  if (!projectRes.data) notFound();

  const project = projectRes.data;

  const members = (membersRes.data ?? []).map((pm) => {
    const p = pm.profiles as unknown as { id: string; full_name: string | null; avatar_url: string | null };
    return { id: p.id, full_name: p.full_name, avatar_url: p.avatar_url };
  });

  const currentUser = user
    ? members.find((m) => m.id === user.id) ?? { id: user.id, full_name: user.email ?? "User", avatar_url: null }
    : null;

  const files = (filesRes.data ?? []).map((f) => {
    const uploader = f.profiles as unknown as { id: string; full_name: string | null; avatar_url: string | null } | null;
    return {
      id: f.id,
      name: f.name,
      storage_path: f.storage_path,
      size: f.size,
      content_type: f.content_type,
      uploaded_by: f.uploaded_by,
      created_at: f.created_at,
      uploader_name: uploader?.full_name ?? "Unknown",
      uploader_avatar: uploader?.avatar_url ?? null,
    };
  });

  return (
    <div className="flex h-full flex-col">
      <ProjectHeader
        projectName={`${project.name} / Files`}
        currentUser={currentUser}
      />
      <ProjectFiles
        projectId={project.id}
        files={files}
      />
    </div>
  );
}
