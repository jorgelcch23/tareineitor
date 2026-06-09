import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let [{ data: profile }, { data: projects }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .single(),
    supabase
      .from("projects")
      .select("id, name")
      .eq("archived", false)
      .order("created_at", { ascending: true }),
  ]);

  // Auto-create profile if missing (user signed up before migration)
  if (!profile) {
    const { data: existingCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    const role = existingCount === null ? "owner" : "member";

    const { data: newProfile } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        full_name: user.user_metadata?.full_name ?? user.email,
        role,
      })
      .select("id, full_name, role")
      .single();

    profile = newProfile;
  }

  // Fetch lists separately (table might not exist yet before migration)
  const { data: allLists } = await supabase
    .from("lists")
    .select("id, name, position, project_id")
    .order("position");

  const listsMap = new Map<string, { id: string; name: string; position: number }[]>();
  for (const list of allLists ?? []) {
    const arr = listsMap.get(list.project_id) ?? [];
    arr.push({ id: list.id, name: list.name, position: list.position });
    listsMap.set(list.project_id, arr);
  }

  const projectsWithLists = (projects ?? []).map((p) => ({
    ...p,
    lists: (listsMap.get(p.id) ?? []).sort((a, b) => a.position - b.position),
  }));

  return (
    <div className="flex h-full">
      <Sidebar projects={projectsWithLists} profile={profile} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
