import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Verify project exists
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .single();

  if (!project) notFound();

  // Get lists for this project
  const { data: lists } = await supabase
    .from("lists")
    .select("id")
    .eq("project_id", id)
    .order("position")
    .limit(1);

  if (lists && lists.length > 0) {
    redirect(`/projects/${id}/lists/${lists[0].id}`);
  }

  // No lists exist — create a default one
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: newList } = await supabase
    .from("lists")
    .insert({
      project_id: id,
      name: "General",
      position: 0,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (newList) {
    redirect(`/projects/${id}/lists/${newList.id}`);
  }

  notFound();
}
