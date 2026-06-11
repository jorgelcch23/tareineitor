"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CreateProjectFileSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1).max(500),
  storage_path: z.string().min(1),
  size: z.number().int().nonnegative(),
  content_type: z.string().min(1),
});

const DeleteProjectFileSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  storage_path: z.string().min(1),
});

export async function createProjectFile(formData: {
  project_id: string;
  name: string;
  storage_path: string;
  size: number;
  content_type: string;
}) {
  const parsed = CreateProjectFileSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("project_files")
    .insert({
      project_id: parsed.data.project_id,
      name: parsed.data.name,
      storage_path: parsed.data.storage_path,
      size: parsed.data.size,
      content_type: parsed.data.content_type,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.project_id}/files`);
  return { id: data.id };
}

export async function deleteProjectFile(formData: {
  id: string;
  project_id: string;
  storage_path: string;
}) {
  const parsed = DeleteProjectFileSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Delete from storage first
  const { error: storageError } = await supabase.storage
    .from("project-files")
    .remove([parsed.data.storage_path]);

  if (storageError) return { error: storageError.message };

  // Then delete the DB row
  const { error } = await supabase
    .from("project_files")
    .delete()
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.project_id}/files`);
  return { success: true };
}
