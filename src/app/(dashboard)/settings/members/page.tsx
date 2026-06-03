import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MembersList } from "./members-list";

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get current user's profile to check role
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !currentProfile ||
    (currentProfile.role !== "owner" && currentProfile.role !== "admin")
  ) {
    redirect("/");
  }

  // Get all profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .order("created_at", { ascending: true });

  // Get emails from admin API
  const admin = createAdminClient();
  const { data: authUsers } = await admin.auth.admin.listUsers();

  // Merge profiles with emails
  const emailMap = new Map<string, string>();
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      if (u.email) emailMap.set(u.id, u.email);
    }
  }

  const members = (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    role: p.role,
    email: emailMap.get(p.id) ?? null,
  }));

  // Sort: owner first, then admin, then member
  const roleOrder = { owner: 0, admin: 1, member: 2 };
  members.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Workspace Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who has access to this workspace
        </p>
      </div>
      <MembersList
        members={members}
        currentUserId={user.id}
        currentUserRole={currentProfile.role}
      />
    </div>
  );
}
