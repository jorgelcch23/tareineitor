"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  List,
  LayoutGrid,
  User,
  Flag,
  Plus,
  X,
} from "lucide-react";
import { PRIORITY_CONFIG, getInitials } from "@/lib/task-utils";
import type { Priority } from "@/lib/task-utils";
import type { MemberInfo } from "./task-row";

interface TaskToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterAssigneeId: string | null;
  onFilterAssigneeChange: (id: string | null) => void;
  filterPriority: Priority | null;
  onFilterPriorityChange: (p: Priority | null) => void;
  members: MemberInfo[];
  onCreateTask: () => void;
}

export function TaskToolbar({
  searchQuery,
  onSearchChange,
  filterAssigneeId,
  onFilterAssigneeChange,
  filterPriority,
  onFilterPriorityChange,
  members,
  onCreateTask,
}: TaskToolbarProps) {
  const activeAssignee = filterAssigneeId
    ? members.find((m) => m.id === filterAssigneeId)
    : null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      {/* Left — Search + View toggle */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 w-56 rounded-md border border-border bg-background pl-8 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-md border border-border">
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-l-md bg-primary/10 px-3 text-xs font-medium text-primary"
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
          <button
            type="button"
            disabled
            className="flex h-8 items-center gap-1.5 rounded-r-md px-3 text-xs font-medium text-muted-foreground opacity-50 cursor-not-allowed"
            title="Coming soon"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Board
          </button>
        </div>
      </div>

      {/* Right — Filters + Create */}
      <div className="flex items-center gap-2">
        {/* Assignee filter */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant={filterAssigneeId ? "secondary" : "outline"}
                size="sm"
                className="h-8 gap-1.5"
              />
            }
          >
            {activeAssignee ? (
              <>
                <Avatar className="h-4 w-4">
                  {activeAssignee.avatar_url && (
                    <AvatarImage src={activeAssignee.avatar_url} />
                  )}
                  <AvatarFallback className="text-[8px]">
                    {getInitials(activeAssignee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-20 truncate text-xs">
                  {activeAssignee.full_name}
                </span>
              </>
            ) : (
              <>
                <User className="h-3.5 w-3.5" />
                <span className="text-xs">Assignee</span>
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onFilterAssigneeChange(null)}>
              <User className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              All members
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {members.map((m) => (
              <DropdownMenuItem
                key={m.id}
                onClick={() => onFilterAssigneeChange(m.id)}
              >
                <Avatar className="mr-2 h-5 w-5">
                  {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                  <AvatarFallback className="text-[9px]">
                    {getInitials(m.full_name)}
                  </AvatarFallback>
                </Avatar>
                {m.full_name ?? "Unknown"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority filter */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant={filterPriority ? "secondary" : "outline"}
                size="sm"
                className="h-8 gap-1.5"
              />
            }
          >
            <Flag
              className="h-3.5 w-3.5"
              style={{
                color: filterPriority
                  ? PRIORITY_CONFIG[filterPriority].color
                  : undefined,
              }}
            />
            <span className="text-xs">
              {filterPriority
                ? PRIORITY_CONFIG[filterPriority].label
                : "Priority"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onFilterPriorityChange(null)}>
              All priorities
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
              <DropdownMenuItem
                key={p}
                onClick={() => onFilterPriorityChange(p)}
              >
                <Flag
                  className="mr-2 h-3.5 w-3.5"
                  style={{ color: PRIORITY_CONFIG[p].color }}
                />
                {PRIORITY_CONFIG[p].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Create Task */}
        <Button size="sm" className="h-8 gap-1.5" onClick={onCreateTask}>
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
      </div>
    </div>
  );
}
