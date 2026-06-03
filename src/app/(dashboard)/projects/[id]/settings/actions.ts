"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const AddMemberSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["admin", "member"]).default("member"),
});

const RemoveMemberSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
});

const UpdateMemberRoleSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

export async function addProjectMember(formData: {
  projectId: string;
  userId: string;
  role?: "admin" | "member";
}) {
  const parsed = AddMemberSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("project_members").insert({
    project_id: parsed.data.projectId,
    user_id: parsed.data.userId,
    role: parsed.data.role,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "User is already a member of this project" };
    }
    return { error: error.message };
  }

  revalidatePath(`/projects/${parsed.data.projectId}/settings`);
  return { success: true };
}

export async function removeProjectMember(formData: {
  projectId: string;
  userId: string;
}) {
  const parsed = RemoveMemberSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Cannot remove yourself
  if (parsed.data.userId === user.id) {
    return { error: "Cannot remove yourself from the project" };
  }

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", parsed.data.projectId)
    .eq("user_id", parsed.data.userId);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.projectId}/settings`);
  revalidatePath("/");
  return { success: true };
}

export async function updateProjectMemberRole(formData: {
  projectId: string;
  userId: string;
  role: "admin" | "member";
}) {
  const parsed = UpdateMemberRoleSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Cannot change own role
  if (parsed.data.userId === user.id) {
    return { error: "Cannot change your own role" };
  }

  const { error } = await supabase
    .from("project_members")
    .update({ role: parsed.data.role })
    .eq("project_id", parsed.data.projectId)
    .eq("user_id", parsed.data.userId);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${parsed.data.projectId}/settings`);
  return { success: true };
}
