"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Flag, CalendarDays, MessageSquare } from "lucide-react";
import { PRIORITY_CONFIG, formatDueDate, getInitials } from "@/lib/task-utils";
import type { Priority } from "@/lib/task-utils";
import { updateTaskPriority, updateTaskStatus } from "./actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatusIcon } from "./status-icon";
import type { StatusInfo } from "./status-group";

export type TaskRowData = {
  id: string;
  title: string;
  status_id: string;
  assignee_id: string | null;
  priority: Priority | null;
  due_date: string | null;
  position: number;
  created_at: string;
  comment_count: number;
};

export type MemberInfo = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

/** Shared grid for task rows — keep in sync with status-group.tsx, inline-add-task.tsx */
export const TASK_GRID_COLS =
  "grid grid-cols-[1fr_160px_160px_160px] items-center";

interface TaskRowProps {
  task: TaskRowData;
  members: MemberInfo[];
  projectId: string;
  statuses: StatusInfo[];
  statusColor: string;
  onClick: () => void;
}

export function TaskRow({
  task,
  members,
  projectId,
  statuses,
  statusColor,
  onClick,
}: TaskRowProps) {
  const assignee = task.assignee_id
    ? members.find((m) => m.id === task.assignee_id)
    : null;
  const dueInfo = formatDueDate(task.due_date);

  const handlePriorityChange = async (priority: Priority | null) => {
    const result = await updateTaskPriority({
      id: task.id,
      priority,
      project_id: projectId,
    });
    if (result.error) toast.error(result.error);
  };

  const handleStatusChange = async (statusId: string) => {
    if (statusId === task.status_id) return;
    const result = await updateTaskStatus({
      id: task.id,
      status_id: statusId,
      project_id: projectId,
    });
    if (result.error) toast.error(result.error);
  };

  return (
    <div
      className={cn(
        TASK_GRID_COLS,
        "cursor-pointer border-b border-border/40 px-4 py-2 transition-colors hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      {/* NAME — with status indicator icon */}
      <div className="flex items-center gap-2 pr-2">
        {/* Status indicator — click to change status */}
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="shrink-0 hover:brightness-110 transition-all"
                  title="Change status"
                />
              }
            >
              {(() => {
                const currentSt = statuses.find((s) => s.id === task.status_id);
                return (
                  <StatusIcon
                    name={currentSt?.name ?? ""}
                    color={statusColor}
                    isDone={currentSt?.is_done ?? false}
                    size={16}
                  />
                );
              })()}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {statuses.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => handleStatusChange(s.id)}
                >
                  <StatusIcon
                    name={s.name}
                    color={s.color}
                    isDone={s.is_done}
                    size={16}
                  />
                  <span className="ml-2">{s.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <span className="truncate text-sm">{task.title}</span>

        {/* Comment count — inline after title */}
        {task.comment_count > 0 && (
          <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            {task.comment_count}
          </span>
        )}
      </div>

      {/* ASSIGNEE */}
      <div className="flex justify-center">
        {assignee ? (
          <Avatar size="sm">
            {assignee.avatar_url && <AvatarImage src={assignee.avatar_url} />}
            <AvatarFallback>{getInitials(assignee.full_name)}</AvatarFallback>
          </Avatar>
        ) : (
          <span />
        )}
      </div>

      {/* DUE DATE */}
      <div className="flex items-center justify-center">
        {dueInfo ? (
          <span
            className={cn(
              "flex items-center gap-1 text-xs",
              dueInfo.overdue ? "text-red-500" : "text-muted-foreground"
            )}
          >
            <CalendarDays className="h-3 w-3" />
            {dueInfo.text}
          </span>
        ) : (
          <span />
        )}
      </div>

      {/* PRIORITY */}
      <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
              />
            }
          >
            <Flag
              className="h-3.5 w-3.5"
              style={{
                color: task.priority
                  ? PRIORITY_CONFIG[task.priority].color
                  : undefined,
              }}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
              <DropdownMenuItem
                key={p}
                onClick={() => handlePriorityChange(p)}
              >
                <Flag
                  className="mr-2 h-3.5 w-3.5"
                  style={{ color: PRIORITY_CONFIG[p].color }}
                />
                {PRIORITY_CONFIG[p].label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handlePriorityChange(null)}>
              No priority
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
