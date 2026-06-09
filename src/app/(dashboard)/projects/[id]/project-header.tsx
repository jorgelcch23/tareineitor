"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, User, Filter, LogOut } from "lucide-react";
import { getInitials } from "@/lib/task-utils";
import { createClient } from "@/lib/supabase/client";
import type { MemberInfo } from "./task-row";

interface ProjectHeaderProps {
  projectName: string;
  members: MemberInfo[];
  currentUser: MemberInfo | null;
  filterAssigneeId: string | null;
  onFilterChange: (assigneeId: string | null) => void;
  onAddTask: () => void;
}

export function ProjectHeader({
  projectName,
  members,
  currentUser,
  filterAssigneeId,
  onFilterChange,
  onAddTask,
}: ProjectHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-background/90 backdrop-blur-[8px] px-2.5">
      {/* Left — Page title */}
      <p className="text-sm font-medium text-foreground truncate pl-1">
        {projectName}
      </p>

      {/* Right — Actions + User */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Assignee filter */}
        <Select
          value={filterAssigneeId ?? "__all__"}
          onValueChange={(v: string | null) =>
            onFilterChange(!v || v === "__all__" ? null : v)
          }
        >
          <SelectTrigger size="sm" className="w-auto">
            <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue>
              {filterAssigneeId
                ? members.find((m) => m.id === filterAssigneeId)?.full_name ??
                  "Filter"
                : "All members"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">
              <User className="h-4 w-4 text-muted-foreground" />
              All members
            </SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <Avatar size="sm">
                  {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                  <AvatarFallback>{getInitials(m.full_name)}</AvatarFallback>
                </Avatar>
                {m.full_name ?? "Unknown"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button size="sm" onClick={onAddTask}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Task
        </Button>

        {/* User avatar */}
        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              }
            >
              <Avatar size="sm">
                {currentUser.avatar_url && (
                  <AvatarImage src={currentUser.avatar_url} />
                )}
                <AvatarFallback>
                  {getInitials(currentUser.full_name)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {currentUser.full_name ?? "User"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
