"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FolderKanban,
  Plus,
  ChevronRight,
  ChevronsUpDown,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  Settings,
  List,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { updateProject, deleteProject } from "@/app/(dashboard)/actions";
import { createList, renameList, deleteList } from "@/app/(dashboard)/projects/[id]/list-actions";
import { toast } from "sonner";

type ListInfo = {
  id: string;
  name: string;
  position: number;
};

type ProjectWithLists = {
  id: string;
  name: string;
  lists: ListInfo[];
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
  projects: ProjectWithLists[];
  profile: Profile | null;
}) {
  const pathname = usePathname();

  const isAdmin = profile?.role === "owner" || profile?.role === "admin";

  return (
    <aside className="flex h-full w-64 flex-col bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800">
      {/* Logo */}
      <div className="flex items-center px-3" style={{ height: "var(--eleven-header-height, 3.5rem)" }}>
        <div className="flex items-center gap-2 px-2">
          <FolderKanban className="h-[18px] w-[18px] text-gray-950 dark:text-gray-50" />
          <span className="text-sm font-semibold text-gray-950 dark:text-gray-50 tracking-tight">
            Tasknator
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex h-full flex-1 flex-col min-h-0">
        {/* Workspace switcher */}
        <div className="px-3.5 w-full mt-2">
          <button
            type="button"
            className="group/ws w-full rounded-[10px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
            style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 0px 1px rgba(0,0,0,0.15)" }}
          >
            <div className="flex items-center gap-2 px-2 min-w-0">
              <div className="flex items-center justify-center h-8">
                <div className="w-5 h-5 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                    {profile?.full_name?.[0]?.toUpperCase() ?? "T"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between flex-1 h-9 min-w-0">
                <p className="text-sm font-medium whitespace-nowrap truncate text-gray-950 dark:text-gray-50">
                  {profile?.full_name ?? "Workspace"}
                </p>
                <ChevronsUpDown className="ml-auto mr-0.5 h-4 w-4 shrink-0 text-gray-500" />
              </div>
            </div>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex h-full flex-1 flex-col min-h-0 overflow-y-auto overflow-x-hidden mt-2">
          <ul className="flex flex-col gap-5 shrink-0 p-3 pb-0">
            {/* Projects section */}
            <li>
              <div className="flex items-center justify-between mb-1.5 ml-1.5">
                <h2 className="text-sm font-medium text-gray-500 whitespace-nowrap">
                  Projects
                </h2>
                <Link href="/?new=true">
                  <button
                    type="button"
                    className="flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-[6px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                  >
                    <Plus className="h-3 w-3 text-gray-500 opacity-50 hover:opacity-70" />
                  </button>
                </Link>
              </div>
              <ul className="flex flex-col gap-1">
                {projects.map((project) => (
                  <ProjectItem
                    key={project.id}
                    project={project}
                    pathname={pathname}
                  />
                ))}
                {projects.length === 0 && (
                  <li className="px-2 py-4 text-center text-xs text-gray-400">
                    No projects yet
                  </li>
                )}
              </ul>
            </li>
          </ul>
        </div>

        {/* Bottom section */}
        {isAdmin && (
          <div className="flex flex-col mt-1 pb-3">
            <div className="px-3 mb-1">
              <ul className="flex flex-col gap-1">
                <li>
                  <Link
                    href="/settings/members"
                    className={cn(
                      "relative group rounded-[10px] overflow-hidden flex items-center gap-2 px-2 min-w-0 transition-colors",
                      pathname === "/settings/members"
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-950 dark:text-gray-50"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <div className="flex items-center justify-center h-8">
                      <Users className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium whitespace-nowrap truncate">
                      Members
                    </p>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}

/* ─── Project item ─── */

function ProjectItem({
  project,
  pathname,
}: {
  project: ProjectWithLists;
  pathname: string;
}) {
  const router = useRouter();
  const isActive = pathname.startsWith(`/projects/${project.id}`);
  const [expanded, setExpanded] = useState(isActive);
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(project.name);
  const [isPending, startTransition] = useTransition();
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");

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

  const handleAddList = () => {
    if (!newListName.trim()) {
      setIsAddingList(false);
      setNewListName("");
      return;
    }
    startTransition(async () => {
      const result = await createList({
        project_id: project.id,
        name: newListName.trim(),
      });
      if (result.error) {
        toast.error(result.error);
      } else if (result.id) {
        router.push(`/projects/${project.id}/lists/${result.id}`);
      }
      setIsAddingList(false);
      setNewListName("");
    });
  };

  return (
    <li className="group/item w-full">
      {/* Project row */}
      <div className="relative w-full group/navitem rounded-[10px] hover:bg-gray-100 dark:hover:bg-gray-800">
        <div
          className={cn(
            "relative rounded-[10px] overflow-hidden transition-colors w-full",
            isActive
              ? "bg-gray-100 dark:bg-gray-800 text-gray-950 dark:text-gray-50"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-gray-50"
          )}
        >
          <div className="flex items-center gap-2 px-2 min-w-0">
            {/* Chevron */}
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-center h-8 shrink-0"
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 text-gray-400 transition-transform duration-150",
                  expanded && "rotate-90"
                )}
              />
            </button>

            {/* Name / Rename */}
            {isRenaming ? (
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
                className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none"
              />
            ) : (
              <Link
                href={`/projects/${project.id}`}
                className="flex items-center flex-1 h-8 min-w-0"
              >
                <p className="text-sm font-medium whitespace-nowrap truncate">
                  {project.name}
                </p>
              </Link>
            )}
          </div>
        </div>

        {/* Action buttons — appear on hover */}
        <div className="absolute right-[0.125rem] top-[0.325rem] z-10 flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => {
              setExpanded(true);
              setIsAddingList(true);
            }}
            className="flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-[6px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 overflow-hidden transition-colors"
            title="Add list"
          >
            <Plus className="h-3 w-3 text-gray-500 opacity-50 hover:opacity-70 transition-opacity" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-[6px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 overflow-hidden transition-colors"
                />
              }
            >
              <MoreHorizontal className="h-3 w-3 text-gray-500 opacity-50 hover:opacity-70 transition-opacity" />
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

      {/* Nested lists — expand inline */}
      {expanded && (
        <ul className="mt-0.5 flex flex-col gap-0.5 ml-5">
          {project.lists.map((list) => (
            <SidebarListItem
              key={list.id}
              list={list}
              projectId={project.id}
              isOnly={project.lists.length <= 1}
              isActive={pathname === `/projects/${project.id}/lists/${list.id}`}
            />
          ))}

          {/* Inline add list */}
          {isAddingList && (
            <li className="flex items-center gap-2 rounded-[10px] px-2 h-8">
              <List className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onBlur={handleAddList}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddList();
                  if (e.key === "Escape") {
                    setIsAddingList(false);
                    setNewListName("");
                  }
                }}
                placeholder="List name"
                disabled={isPending}
                className="flex-1 min-w-0 bg-transparent text-sm font-medium placeholder:text-gray-400 outline-none"
              />
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

/* ─── List item ─── */

function SidebarListItem({
  list,
  projectId,
  isOnly,
  isActive,
}: {
  list: ListInfo;
  projectId: string;
  isOnly: boolean;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(list.name);
  const [isPending, startTransition] = useTransition();

  const handleRename = () => {
    if (!name.trim() || name.trim() === list.name) {
      setName(list.name);
      setIsRenaming(false);
      return;
    }
    startTransition(async () => {
      const result = await renameList({
        id: list.id,
        name: name.trim(),
        project_id: projectId,
      });
      if (result.error) {
        toast.error(result.error);
        setName(list.name);
      }
      setIsRenaming(false);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteList({
        id: list.id,
        project_id: projectId,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        router.push(`/projects/${projectId}`);
      }
    });
  };

  if (isRenaming) {
    return (
      <li className="flex items-center gap-2 rounded-[10px] px-2 h-8">
        <List className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setName(list.name);
              setIsRenaming(false);
            }
          }}
          disabled={isPending}
          className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none"
        />
      </li>
    );
  }

  return (
    <li className="group/list w-full">
      <div className="relative w-full group/navitem rounded-[10px] hover:bg-gray-100 dark:hover:bg-gray-800">
        <Link
          href={`/projects/${projectId}/lists/${list.id}`}
          className={cn(
            "relative rounded-[10px] overflow-hidden flex items-center gap-2 px-2 min-w-0 transition-colors w-full",
            isActive
              ? "bg-gray-100 dark:bg-gray-800 text-gray-950 dark:text-gray-50"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-gray-50"
          )}
        >
          <div className="flex items-center justify-center h-8">
            <List className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium whitespace-nowrap truncate">
            {list.name}
          </p>
        </Link>

        {/* Action button — appears on hover */}
        <div className="absolute right-[0.125rem] top-[0.325rem] z-10 flex items-center opacity-0 group-hover/list:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-[6px] border-0 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                />
              }
            >
              <MoreHorizontal className="h-3 w-3 text-gray-500 opacity-50 hover:opacity-70 transition-opacity" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
              <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Rename
              </DropdownMenuItem>
              {!isOnly && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}
