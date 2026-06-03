"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, User, Filter } from "lucide-react";
import { getInitials } from "@/lib/task-utils";
import type { MemberInfo } from "./task-row";

interface ProjectHeaderProps {
  projectName: string;
  members: MemberInfo[];
  filterAssigneeId: string | null;
  onFilterChange: (assigneeId: string | null) => void;
  onAddTask: () => void;
}

export function ProjectHeader({
  projectName,
  members,
  filterAssigneeId,
  onFilterChange,
  onAddTask,
}: ProjectHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4">
      <h1 className="text-xl font-bold">{projectName}</h1>

      <div className="flex items-center gap-2">
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
      </div>
    </div>
  );
}
