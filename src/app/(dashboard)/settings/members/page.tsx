import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/page-header";
import { MembersList } from "./members-list";

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Resolve active workspace from cookie (same logic as layout)
  const cookieStore = await cookies();
  const savedWsId = cookieStore.get("active_workspace_id")?.value;

  // Get current user's workspace membership for the active workspace
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const currentMembership = savedWsId
    ? (memberships ?? []).find((m) => m.workspace_id === savedWsId) ?? memberships?.[0]
    : memberships?.[0];

  if (
    !currentMembership ||
    (currentMembership.role !== "owner" && currentMembership.role !== "admin")
  ) {
    redirect("/");
  }

  // Get all workspace members with their profiles
  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, role, profiles:user_id(id, full_name)")
    .eq("workspace_id", currentMembership.workspace_id)
    .order("created_at", { ascending: true });

  // Get emails from admin API
  const admin = createAdminClient();
  const { data: authUsers } = await admin.auth.admin.listUsers();

  const emailMap = new Map<string, string>();
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      if (u.email) emailMap.set(u.id, u.email);
    }
  }

  const membersList = (members ?? []).map((m) => {
    const profile = m.profiles as unknown as { id: string; full_name: string | null } | null;
    return {
      id: m.user_id,
      full_name: profile?.full_name ?? null,
      role: m.role as "owner" | "admin" | "member",
      email: emailMap.get(m.user_id) ?? null,
    };
  });

  // Sort: owner first, then admin, then member
  const roleOrder = { owner: 0, admin: 1, member: 2 };
  membersList.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

  // Get current user's profile for header
  const currentUserProfile = membersList.find((m) => m.id === user.id);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Members"
        currentUser={{
          full_name: currentUserProfile?.full_name ?? null,
          avatar_url: null,
        }}
      />
      <div className="mx-auto max-w-3xl w-full p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Workspace Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage who has access to this workspace
          </p>
        </div>
        <MembersList
          members={membersList}
          currentUserId={user.id}
          currentUserRole={currentMembership.role as "owner" | "admin" | "member"}
        />
      </div>
    </div>
  );
}
