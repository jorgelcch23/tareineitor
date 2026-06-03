"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { updateProject } from "@/app/(dashboard)/actions";

export function ProjectSettingsForm({
  project,
  isProjectAdmin,
}: {
  project: { id: string; name: string; description: string | null };
  isProjectAdmin: boolean;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [isPending, startTransition] = useTransition();

  const hasChanges =
    name.trim() !== project.name ||
    description.trim() !== (project.description ?? "");

  const handleSave = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await updateProject({
        id: project.id,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Project updated");
      }
    });
  };

  return (
    <div>
      <h2 className="text-lg font-semibold">General</h2>
      <p className="text-sm text-muted-foreground">
        Project name and description
      </p>
      <div className="mt-4 space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="project-name">Name</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isProjectAdmin || isPending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="project-desc">Description</Label>
          <Textarea
            id="project-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isProjectAdmin || isPending}
            rows={3}
          />
        </div>
        {isProjectAdmin && (
          <Button
            onClick={handleSave}
            disabled={!hasChanges || !name.trim() || isPending}
            size="sm"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </div>
    </div>
  );
}
