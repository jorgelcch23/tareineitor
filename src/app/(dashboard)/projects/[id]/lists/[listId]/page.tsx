import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskList } from "../../task-list";
import type { TaskRowData, MemberInfo, TagInfo } from "../../task-row";
import type { StatusInfo } from "../../status-group";

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string; listId: string }>;
}) {
  const { id, listId } = await params;
  const supabase = await createClient();

  // Parallel fetch: project, statuses, tasks for this list, members
  const [projectRes, statusesRes, tasksRes, membersRes, listRes, allListsRes, tagsRes] = await Promise.all([
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
      .select("id, title, description, status_id, assignee_id, priority, due_date, position, list_id, tag_id, created_at")
      .eq("project_id", id)
      .eq("list_id", listId)
      .order("position"),
    supabase
      .from("project_members")
      .select("user_id, profiles(id, full_name, avatar_url)")
      .eq("project_id", id),
    supabase
      .from("lists")
      .select("id, name")
      .eq("id", listId)
      .single(),
    supabase
      .from("lists")
      .select("id, name")
      .eq("project_id", id)
      .order("position"),
    supabase
      .from("tags")
      .select("id, name, color")
      .eq("project_id", id)
      .order("name"),
  ]);

  const { data: { user } } = await supabase.auth.getUser();

  if (!projectRes.data || !listRes.data) notFound();

  const project = projectRes.data;
  const list = listRes.data;
  const allLists = (allListsRes.data ?? []) as { id: string; name: string }[];
  const statuses: StatusInfo[] = statusesRes.data ?? [];
  const tags: TagInfo[] = (tagsRes.data ?? []) as TagInfo[];
  const members: MemberInfo[] = (membersRes.data ?? []).map((pm) => {
    const p = pm.profiles as unknown as { id: string; full_name: string | null; avatar_url: string | null };
    return { id: p.id, full_name: p.full_name, avatar_url: p.avatar_url };
  });

  const currentUser = user ? members.find((m) => m.id === user.id) ?? { id: user.id, full_name: user.email ?? "User", avatar_url: null } : null;

  const tasks: TaskRowData[] = (tasksRes.data ?? []).map((t) => ({
    ...t,
    list_id: t.list_id ?? null,
    tag_id: t.tag_id ?? null,
    priority: t.priority as TaskRowData["priority"],
    comment_count: 0,
    has_description: t.description != null && JSON.stringify(t.description) !== "null",
  }));

  // Group tasks by status_id
  const groupedTasks: Record<string, TaskRowData[]> = {};
  for (const status of statuses) {
    groupedTasks[status.id] = tasks.filter((t) => t.status_id === status.id);
  }

  return (
    <div className="flex h-full flex-col">
      <TaskList
        projectId={project.id}
        projectName={`${project.name} / ${list.name}`}
        listId={listId}
        statuses={statuses}
        groupedTasks={groupedTasks}
        members={members}
        tags={tags}
        lists={allLists}
        currentUser={currentUser}
      />
    </div>
  );
}
