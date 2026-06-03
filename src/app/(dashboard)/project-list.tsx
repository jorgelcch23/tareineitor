"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createProject, updateProject, archiveProject } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FolderKanban, MoreHorizontal, Pencil, Archive } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type Project = {
  id: string;
  name: string;
  description: string | null;
  archived: boolean;
  created_at: string;
  created_by: string;
};

export function ProjectList({ projects }: { projects: Project[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Auto-open create dialog when ?new=true
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setCreateOpen(true);
      window.history.replaceState(null, "", "/");
    }
  }, [searchParams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const result = await createProject({
      name: name.trim(),
      description: description.trim() || undefined,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Project created");
      setCreateOpen(false);
      setName("");
      setDescription("");
      router.push(`/projects/${result.id}`);
    }
    setLoading(false);
  };

  const openEdit = (project: Project) => {
    setEditProject(project);
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProject || !editName.trim()) return;
    setEditLoading(true);

    const result = await updateProject({
      id: editProject.id,
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Project updated");
      setEditOpen(false);
      setEditProject(null);
    }
    setEditLoading(false);
  };

  const handleArchive = async (project: Project) => {
    const result = await archiveProject({ id: project.id });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Project archived");
    }
  };

  return (
    <div className="mt-6">
      {/* Create Project Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogTrigger render={<Button />}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Project"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-desc">Description (optional)</Label>
              <Textarea
                id="project-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project about?"
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Project name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description (optional)</Label>
              <Textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What is this project about?"
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full" disabled={editLoading}>
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Project List */}
      <div className="mt-4 grid gap-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="group flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
          >
            <Link
              href={`/projects/${project.id}`}
              className="flex flex-1 items-center gap-3 overflow-hidden"
            >
              <FolderKanban className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1 overflow-hidden">
                <p className="font-medium">{project.name}</p>
                {project.description && (
                  <p className="truncate text-sm text-muted-foreground">
                    {project.description}
                  </p>
                )}
              </div>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100"
                  />
                }
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(project)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleArchive(project)}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No projects yet. Create your first one!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
