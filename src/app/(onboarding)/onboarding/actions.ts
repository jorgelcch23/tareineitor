"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ProfileSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(100),
  avatar_url: z.string().url().nullable().optional(),
});

const WorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100),
});

const InviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(10),
  workspace_id: z.string().uuid(),
});

export async function updateOnboardingProfile(formData: {
  full_name: string;
  avatar_url?: string | null;
}) {
  const parsed = ProfileSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      avatar_url: parsed.data.avatar_url ?? null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function createWorkspace(formData: { name: string }) {
  const parsed = WorkspaceSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Create workspace
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({
      name: parsed.data.name,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (wsError) return { error: wsError.message };

  // Add creator as owner
  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) return { error: memberError.message };

  return { success: true, workspace_id: workspace.id };
}

export async function inviteMembers(formData: {
  emails: string[];
  workspace_id: string;
}) {
  const parsed = InviteSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();
  const results: { email: string; success: boolean; error?: string }[] = [];

  for (const email of parsed.data.emails) {
    // Check if user already exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existing = existingUsers?.users.find((u) => u.email === email);

    if (existing) {
      results.push({ email, success: false, error: "User already exists" });
      continue;
    }

    // Invite with workspace_id in metadata so the trigger auto-joins them
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { workspace_id: parsed.data.workspace_id },
    });

    if (error) {
      results.push({ email, success: false, error: error.message });
    } else {
      results.push({ email, success: true });
    }
  }

  return { success: true, results };
}

export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}
