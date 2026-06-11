"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
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

  // Resolve active workspace from cookie (same logic as layout)
  const cookieStore = await cookies();
  const savedWsId = cookieStore.get("active_workspace_id")?.value;

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const membership = savedWsId
    ? (memberships ?? []).find((m) => m.workspace_id === savedWsId) ?? memberships?.[0]
    : memberships?.[0];

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return { error: "Not authorized" as const };
  }

  return { user, membership, supabase };
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
    // Check if they already have a workspace membership
    const { data: existingMembership } = await admin
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", auth.membership.workspace_id)
      .eq("user_id", existing.id)
      .single();
    if (existingMembership) {
      return { error: "User is already a workspace member" };
    }
    // Check if they have a profile — user exists in another workspace, add them directly
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", existing.id)
      .single();
    if (existingProfile) {
      const { error: insertError } = await admin
        .from("workspace_members")
        .insert({
          workspace_id: auth.membership.workspace_id,
          user_id: existing.id,
          role: "member",
        });
      if (insertError) return { error: insertError.message };
      revalidatePath("/settings/members");
      return { success: true };
    }
    // Orphaned auth user (was removed) — delete first, then re-invite
    await admin.auth.admin.deleteUser(existing.id);
  }

  // Invite user by email with workspace_id in metadata
  const { error } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: { workspace_id: auth.membership.workspace_id },
    }
  );

  if (error) {
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

  // Cannot change own role
  if (parsed.data.userId === auth.user.id) {
    return { error: "Cannot change your own role" };
  }

  // Get target's workspace membership
  const { data: target } = await auth.supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", auth.membership.workspace_id)
    .eq("user_id", parsed.data.userId)
    .single();

  if (!target) return { error: "User not found in workspace" };
  if (target.role === "owner") return { error: "Cannot change owner's role" };

  // Only owner can promote to admin
  if (parsed.data.role === "admin" && auth.membership.role !== "owner") {
    return { error: "Only the owner can promote users to admin" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("workspace_members")
    .update({ role: parsed.data.role })
    .eq("workspace_id", auth.membership.workspace_id)
    .eq("user_id", parsed.data.userId);

  if (error) return { error: error.message };

  revalidatePath("/settings/members");
  return { success: true };
}

export async function removeFromWorkspace(formData: { userId: string }) {
  const parsed = RemoveSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  // Cannot remove self
  if (parsed.data.userId === auth.user.id) {
    return { error: "Cannot remove yourself" };
  }

  // Cannot remove owner
  const { data: target } = await auth.supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", auth.membership.workspace_id)
    .eq("user_id", parsed.data.userId)
    .single();

  if (!target) return { error: "User not found" };
  if (target.role === "owner") return { error: "Cannot remove the owner" };

  const admin = createAdminClient();

  // Remove only from this workspace — do NOT delete profile or auth user
  const { error } = await admin
    .from("workspace_members")
    .delete()
    .eq("workspace_id", auth.membership.workspace_id)
    .eq("user_id", parsed.data.userId);
  if (error) return { error: error.message };

  revalidatePath("/settings/members");
  return { success: true };
}
