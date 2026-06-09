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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Flag, CalendarDays, MessageSquare, GripVertical, User, Tag, X } from "lucide-react";
import { PRIORITY_CONFIG, formatDueDate, getInitials } from "@/lib/task-utils";
import type { Priority } from "@/lib/task-utils";
import { updateTaskPriority, updateTaskStatus, updateTaskAssignee, updateTaskDueDate, updateTaskTag } from "./actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatusIcon } from "./status-icon";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { StatusInfo } from "./status-group";

export type TagInfo = {
  id: string;
  name: string;
  color: string;
};

export type TaskRowData = {
  id: string;
  title: string;
  status_id: string;
  assignee_id: string | null;
  priority: Priority | null;
  due_date: string | null;
  position: number;
  list_id: string | null;
  tag_id: string | null;
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
  "grid grid-cols-[1fr_120px_160px_160px_160px] items-center";

interface TaskRowProps {
  task: TaskRowData;
  members: MemberInfo[];
  tags: TagInfo[];
  projectId: string;
  statuses: StatusInfo[];
  statusColor: string;
  onClick: () => void;
}

export function TaskRow({
  task,
  members,
  tags,
  projectId,
  statuses,
  statusColor,
  onClick,
}: TaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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

  const handleAssigneeChange = async (assigneeId: string | null) => {
    const result = await updateTaskAssignee({
      id: task.id,
      assignee_id: assigneeId,
      project_id: projectId,
    });
    if (result.error) toast.error(result.error);
  };

  const handleDueDateChange = async (date: Date | undefined) => {
    const result = await updateTaskDueDate({
      id: task.id,
      due_date: date ? date.toISOString() : null,
      project_id: projectId,
    });
    if (result.error) toast.error(result.error);
  };

  const handleTagChange = async (tagId: string | null) => {
    const result = await updateTaskTag({
      id: task.id,
      tag_id: tagId,
      project_id: projectId,
    });
    if (result.error) toast.error(result.error);
  };

  const currentTag = task.tag_id ? tags.find((t) => t.id === task.tag_id) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        TASK_GRID_COLS,
        "group/task cursor-pointer border-b border-border/40 px-4 py-2 transition-colors hover:bg-muted/50",
        isDragging && "opacity-40 bg-muted/30"
      )}
      onClick={onClick}
    >
      {/* NAME — with drag handle + status indicator icon */}
      <div className="flex items-center gap-1.5 pr-2">
        {/* Drag handle */}
        <button
          type="button"
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 cursor-grab touch-none rounded p-0.5 opacity-0 transition-opacity group-hover/task:opacity-100 text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

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

      {/* TAG */}
      <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors hover:bg-muted"
              />
            }
          >
            {currentTag ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: currentTag.color + "20",
                  color: currentTag.color,
                }}
              >
                {currentTag.name}
              </span>
            ) : (
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={() => handleTagChange(null)}>
              <X className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              No tag
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {tags.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => handleTagChange(t.id)}
              >
                <span
                  className="mr-2 h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                {t.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ASSIGNEE */}
      <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-muted"
              />
            }
          >
            {assignee ? (
              <Avatar size="sm">
                {assignee.avatar_url && <AvatarImage src={assignee.avatar_url} />}
                <AvatarFallback>{getInitials(assignee.full_name)}</AvatarFallback>
              </Avatar>
            ) : (
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={() => handleAssigneeChange(null)}>
              <User className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              Unassigned
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {members.map((m) => (
              <DropdownMenuItem
                key={m.id}
                onClick={() => handleAssigneeChange(m.id)}
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
      </div>

      {/* DUE DATE */}
      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs",
                  dueInfo?.overdue && "text-red-500 hover:text-red-500"
                )}
              />
            }
          >
            <CalendarDays className="mr-1 h-3 w-3" />
            {dueInfo ? dueInfo.text : <span className="text-muted-foreground">No date</span>}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={task.due_date ? new Date(task.due_date) : undefined}
              onSelect={handleDueDateChange}
            />
            {task.due_date && (
              <div className="border-t border-border p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => handleDueDateChange(undefined)}
                >
                  Clear date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
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
