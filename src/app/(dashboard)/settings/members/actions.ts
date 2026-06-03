"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const InviteSchema = z.object({
  email: z.string().email(),
});

const UpdateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

const RemoveSchema = z.object({
  userId: z.string().uuid(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
    return { error: "Not authorized" as const };
  }

  return { user, profile, supabase };
}

export async function inviteToWorkspace(formData: { email: string }) {
  const parsed = InviteSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const admin = createAdminClient();

  // Check if user already exists by email
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existing = existingUsers?.users.find(
    (u) => u.email === parsed.data.email
  );
  if (existing) {
    // Check if they already have a profile
    const { data: existingProfile } = await auth.supabase
      .from("profiles")
      .select("id")
      .eq("id", existing.id)
      .single();
    if (existingProfile) {
      return { error: "User is already a workspace member" };
    }
  }

  // Invite user by email — Supabase sends the invite email
  const { error } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email
  );

  if (error) {
    if (error.message.includes("already been registered")) {
      return { error: "User is already registered" };
    }
    return { error: error.message };
  }

  revalidatePath("/settings/members");
  return { success: true };
}

export async function updateUserRole(formData: {
  userId: string;
  role: "admin" | "member";
}) {
  const parsed = UpdateRoleSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  // Cannot change owner's role
  const { data: target } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", parsed.data.userId)
    .single();

  if (!target) return { error: "User not found" };
  if (target.role === "owner") return { error: "Cannot change owner's role" };

  // Cannot change own role
  if (parsed.data.userId === auth.user.id) {
    return { error: "Cannot change your own role" };
  }

  // Only owner can promote to admin
  if (parsed.data.role === "admin" && auth.profile.role !== "owner") {
    return { error: "Only the owner can promote users to admin" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.userId);

  if (error) return { error: error.message };

  revalidatePath("/settings/members");
  return { success: true };
}

export async function removeFromWorkspace(formData: { userId: string }) {
  const parsed = RemoveSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  // Cannot remove owner
  const { data: target } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", parsed.data.userId)
    .single();

  if (!target) return { error: "User not found" };
  if (target.role === "owner") return { error: "Cannot remove the owner" };

  // Cannot remove self
  if (parsed.data.userId === auth.user.id) {
    return { error: "Cannot remove yourself" };
  }

  const admin = createAdminClient();

  // Delete the user — CASCADE will clean up profiles, project_members, etc.
  const { error } = await admin.auth.admin.deleteUser(parsed.data.userId);
  if (error) return { error: error.message };

  revalidatePath("/settings/members");
  return { success: true };
}
