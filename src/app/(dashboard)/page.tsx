import { createClient } from "@/lib/supabase/server";
import { ProjectList } from "./project-list";
import { Suspense } from "react";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, archived, created_at, created_by")
    .eq("archived", false)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage your team projects
          </p>
        </div>
      </div>
      <Suspense>
        <ProjectList projects={projects ?? []} />
      </Suspense>
    </div>
  );
}
