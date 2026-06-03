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

  return (
    <div className="flex h-full">
      <Sidebar projects={projects ?? []} profile={profile} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
