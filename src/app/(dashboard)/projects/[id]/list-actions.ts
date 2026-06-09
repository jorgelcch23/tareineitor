"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CreateListSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1).max(200),
});

const RenameListSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  project_id: z.string().uuid(),
});

const DeleteListSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
});

const ReorderListSchema = z.object({
  id: z.string().uuid(),
  position: z.number(),
  project_id: z.string().uuid(),
});

export async function createList(formData: {
  project_id: string;
  name: string;
}) {
  const parsed = CreateListSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get max position
  const { data: existing } = await supabase
    .from("lists")
    .select("position")
    .eq("project_id", parsed.data.project_id)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from("lists")
    .insert({
      project_id: parsed.data.project_id,
      name: parsed.data.name,
      position: nextPosition,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { id: data.id };
}

export async function renameList(formData: {
  id: string;
  name: string;
  project_id: string;
}) {
  const parsed = RenameListSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("lists")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteList(formData: {
  id: string;
  project_id: string;
}) {
  const parsed = DeleteListSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Prevent deleting the last list
  const { data: listCount } = await supabase
    .from("lists")
    .select("id", { count: "exact", head: true })
    .eq("project_id", parsed.data.project_id);

  if (listCount === null || (listCount as unknown as number) <= 1) {
    return { error: "Cannot delete the only list in a project" };
  }

  const { error } = await supabase
    .from("lists")
    .delete()
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function reorderList(formData: {
  id: string;
  position: number;
  project_id: string;
}) {
  const parsed = ReorderListSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("lists")
    .update({ position: parsed.data.position })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}
