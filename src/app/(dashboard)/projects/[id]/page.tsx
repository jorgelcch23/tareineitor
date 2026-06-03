import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskList } from "./task-list";
import type { TaskRowData, MemberInfo } from "./task-row";
import type { StatusInfo } from "./status-group";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Parallel fetch: project, statuses, tasks, members
  const [projectRes, statusesRes, tasksRes, membersRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, description")
      .eq("id", id)
      .single(),
    supabase
      .from("statuses")
      .select("id, name, color, position, is_done")
      .eq("project_id", id)
      .order("position"),
    supabase
      .from("tasks")
      .select("id, title, status_id, assignee_id, priority, due_date, position, created_at")
      .eq("project_id", id)
      .order("position"),
    supabase
      .from("project_members")
      .select("user_id, profiles(id, full_name, avatar_url)")
      .eq("project_id", id),
  ]);

  if (!projectRes.data) notFound();

  const project = projectRes.data;
  const statuses: StatusInfo[] = statusesRes.data ?? [];
  const members: MemberInfo[] = (membersRes.data ?? []).map((pm) => {
    const p = pm.profiles as unknown as { id: string; full_name: string | null; avatar_url: string | null };
    return { id: p.id, full_name: p.full_name, avatar_url: p.avatar_url };
  });

  // Group tasks by status_id, with comment_count = 0 (real count in Phase 3)
  const tasks: TaskRowData[] = (tasksRes.data ?? []).map((t) => ({
    ...t,
    priority: t.priority as TaskRowData["priority"],
    comment_count: 0,
  }));

  const groupedTasks: Record<string, TaskRowData[]> = {};
  for (const status of statuses) {
    groupedTasks[status.id] = tasks.filter((t) => t.status_id === status.id);
  }

  return (
    <div className="flex h-full flex-col">
      <TaskList
        projectId={project.id}
        projectName={project.name}
        statuses={statuses}
        groupedTasks={groupedTasks}
        members={members}
      />
    </div>
  );
}
