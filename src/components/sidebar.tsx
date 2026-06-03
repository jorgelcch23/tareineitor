"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  Plus,
  LogOut,
  Hash,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { updateProject, deleteProject } from "@/app/(dashboard)/actions";
import { toast } from "sonner";

type Project = {
  id: string;
  name: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  role: string;
};

export function Sidebar({
  projects,
  profile,
}: {
  projects: Project[];
  profile: Profile | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const isAdmin = profile?.role === "owner" || profile?.role === "admin";

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      {/* Header */}
      <div className="flex h-14 items-center gap-2 px-4">
        <FolderKanban className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold">TaskFlow</span>
      </div>

      <Separator />

      {/* Projects */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="flex items-center justify-between px-2 pb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Projects
          </span>
          <Link href="/?new=true">
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <nav className="flex flex-col gap-0.5">
          {projects.map((project) => {
            const isActive = pathname.startsWith(`/projects/${project.id}`);
            return (
              <ProjectItem
                key={project.id}
                project={project}
                isActive={isActive}
              />
            );
          })}

          {projects.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No projects yet
            </p>
          )}
        </nav>
      </div>

      <Separator />

      {/* Footer */}
      <div className="flex flex-col gap-1 p-2">
        {isAdmin && (
          <Link
            href="/settings/members"
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              pathname === "/settings/members"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            Members
          </Link>
        )}
      </div>

      <Separator />

      {/* User */}
      <div className="flex items-center gap-2 p-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium">
            {profile?.full_name ?? "User"}
          </p>
          <p className="truncate text-xs text-muted-foreground capitalize">
            {profile?.role ?? "member"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </aside>
  );
}

function ProjectItem({
  project,
  isActive,
}: {
  project: Project;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(project.name);
  const [isPending, startTransition] = useTransition();

  const handleRename = () => {
    if (!name.trim() || name.trim() === project.name) {
      setName(project.name);
      setIsRenaming(false);
      return;
    }
    startTransition(async () => {
      const result = await updateProject({ id: project.id, name: name.trim() });
      if (result.error) {
        toast.error(result.error);
        setName(project.name);
      }
      setIsRenaming(false);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProject({ id: project.id });
      if (result.error) {
        toast.error(result.error);
      } else {
        router.push("/");
      }
    });
  };

  if (isRenaming) {
    return (
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
        <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setName(project.name);
              setIsRenaming(false);
            }
          }}
          disabled={isPending}
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/project flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}
    >
      <Link
        href={`/projects/${project.id}`}
        className="flex flex-1 items-center gap-2 overflow-hidden"
      >
        <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{project.name}</span>
      </Link>

      <div
        className="opacity-0 group-hover/project:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              />
            }
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/projects/${project.id}/settings`)}
            >
              <Settings className="mr-2 h-3.5 w-3.5" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
