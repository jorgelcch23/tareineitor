"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Json } from "@/lib/types/database";

const CreateTaskSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  status_id: z.string().uuid(),
  list_id: z.string().uuid(),
  assignee_id: z.string().uuid().nullable().optional(),
  priority: z.enum(["urgent", "high", "normal", "low"]).nullable().optional(),
  due_date: z.string().nullable().optional(),
  tag_id: z.string().uuid().nullable().optional(),
});

const UpdateTaskTitleSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  project_id: z.string().uuid(),
});

const UpdateTaskStatusSchema = z.object({
  id: z.string().uuid(),
  status_id: z.string().uuid(),
  project_id: z.string().uuid(),
});

const UpdateTaskPrioritySchema = z.object({
  id: z.string().uuid(),
  priority: z.enum(["urgent", "high", "normal", "low"]).nullable(),
  project_id: z.string().uuid(),
});

const UpdateTaskAssigneeSchema = z.object({
  id: z.string().uuid(),
  assignee_id: z.string().uuid().nullable(),
  project_id: z.string().uuid(),
});

const UpdateTaskDueDateSchema = z.object({
  id: z.string().uuid(),
  due_date: z.string().nullable(),
  project_id: z.string().uuid(),
});

const UpdateTaskDescriptionSchema = z.object({
  id: z.string().uuid(),
  description: z.unknown(),
  project_id: z.string().uuid(),
});

const DeleteTaskSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
});

const CreateCommentSchema = z.object({
  task_id: z.string().uuid(),
  body: z.string().min(1).max(5000),
  project_id: z.string().uuid(),
});

const ReorderTaskSchema = z.object({
  id: z.string().uuid(),
  status_id: z.string().uuid(),
  position: z.number(),
  project_id: z.string().uuid(),
});

const UpdateTaskListSchema = z.object({
  id: z.string().uuid(),
  list_id: z.string().uuid(),
  project_id: z.string().uuid(),
});

const UpdateTaskTagSchema = z.object({
  id: z.string().uuid(),
  tag_id: z.string().uuid().nullable(),
  project_id: z.string().uuid(),
});

const DeleteCommentSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
});


export async function createTask(formData: {
  project_id: string;
  title: string;
  status_id: string;
  list_id: string;
  assignee_id?: string | null;
  priority?: string | null;
  due_date?: string | null;
  tag_id?: string | null;
}) {
  const parsed = CreateTaskSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const id = crypto.randomUUID();

  const { error } = await supabase.from("tasks").insert({
    id,
    project_id: parsed.data.project_id,
    title: parsed.data.title,
    status_id: parsed.data.status_id,
    list_id: parsed.data.list_id,
    created_by: user.id,
    position: Math.floor(Date.now() / 1000) % 2147483647,
    ...(parsed.data.assignee_id && { assignee_id: parsed.data.assignee_id }),
    ...(parsed.data.priority && { priority: parsed.data.priority }),
    ...(parsed.data.due_date && { due_date: parsed.data.due_date }),
    ...(parsed.data.tag_id && { tag_id: parsed.data.tag_id }),
  });

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { id };
}

export async function updateTaskTitle(formData: {
  id: string;
  title: string;
  project_id: string;
}) {
  const parsed = UpdateTaskTitleSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { success: true };
}

export async function updateTaskStatus(formData: {
  id: string;
  status_id: string;
  project_id: string;
}) {
  const parsed = UpdateTaskStatusSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .update({ status_id: parsed.data.status_id })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { success: true };
}

export async function updateTaskPriority(formData: {
  id: string;
  priority: "urgent" | "high" | "normal" | "low" | null;
  project_id: string;
}) {
  const parsed = UpdateTaskPrioritySchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .update({ priority: parsed.data.priority })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { success: true };
}

export async function updateTaskAssignee(formData: {
  id: string;
  assignee_id: string | null;
  project_id: string;
}) {
  const parsed = UpdateTaskAssigneeSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .update({ assignee_id: parsed.data.assignee_id })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { success: true };
}

export async function updateTaskDueDate(formData: {
  id: string;
  due_date: string | null;
  project_id: string;
}) {
  const parsed = UpdateTaskDueDateSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .update({ due_date: parsed.data.due_date })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { success: true };
}

export async function updateTaskDescription(formData: {
  id: string;
  description: Json | null;
  project_id: string;
}) {
  const parsed = UpdateTaskDescriptionSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .update({ description: parsed.data.description as Json })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { success: true };
}

export async function deleteTask(formData: {
  id: string;
  project_id: string;
}) {
  const parsed = DeleteTaskSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { success: true };
}

export async function createComment(formData: {
  task_id: string;
  body: string;
  project_id: string;
}) {
  const parsed = CreateCommentSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("comments")
    .insert({
      task_id: parsed.data.task_id,
      body: parsed.data.body,
      user_id: user.id,
    })
    .select("id, body, created_at")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { comment: { ...data, user_id: user.id } };
}

export async function reorderTask(formData: {
  id: string;
  status_id: string;
  position: number;
  project_id: string;
}) {
  const parsed = ReorderTaskSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .update({ status_id: parsed.data.status_id, position: parsed.data.position })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { success: true };
}

export async function updateTaskList(formData: {
  id: string;
  list_id: string;
  project_id: string;
}) {
  const parsed = UpdateTaskListSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .update({ list_id: parsed.data.list_id })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { success: true };
}

export async function updateTaskTag(formData: {
  id: string;
  tag_id: string | null;
  project_id: string;
}) {
  const parsed = UpdateTaskTagSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .update({ tag_id: parsed.data.tag_id })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { success: true };
}

export async function deleteComment(formData: {
  id: string;
  project_id: string;
}) {
  const parsed = DeleteCommentSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { success: true };
}
