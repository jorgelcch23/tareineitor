"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskRow, TASK_GRID_COLS } from "./task-row";
import { InlineAddTask } from "./inline-add-task";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { TaskRowData, MemberInfo, TagInfo } from "./task-row";

export type StatusInfo = {
  id: string;
  name: string;
  color: string;
  position: number;
  is_done: boolean;
};

interface StatusGroupProps {
  status: StatusInfo;
  tasks: TaskRowData[];
  members: MemberInfo[];
  tags: TagInfo[];
  statuses: StatusInfo[];
  projectId: string;
  listId: string;
  onTaskClick: (taskId: string) => void;
}

export function StatusGroup({
  status,
  tasks,
  members,
  tags,
  statuses,
  projectId,
  listId,
  onTaskClick,
}: StatusGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const { setNodeRef } = useDroppable({ id: status.id });

  return (
    <div ref={setNodeRef}>
      {/* Status header — rounded bar with color dot */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:brightness-95"
        style={{ backgroundColor: status.color + "14" }}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-90"
          )}
        />
        {/* Color dot */}
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <span className="text-sm font-medium">{status.name}</span>
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-background px-1.5 text-[11px] font-medium text-muted-foreground"
        >
          {tasks.length}
        </span>
      </button>

      {/* Table */}
      {expanded && (
        <div className="mt-1">
          {/* Column headers */}
          <div className={`${TASK_GRID_COLS} px-4 py-1`}>
            <span className="pl-7 text-xs font-medium text-muted-foreground/60">
              Name
            </span>
            <span className="text-left text-xs font-medium text-muted-foreground/60">
              Status
            </span>
            <span className="text-left text-xs font-medium text-muted-foreground/60">
              Tag
            </span>
            <span className="text-left text-xs font-medium text-muted-foreground/60">
              Assignee
            </span>
            <span className="text-left text-xs font-medium text-muted-foreground/60">
              Due date
            </span>
            <span className="text-right text-xs font-medium text-muted-foreground/60">
              Priority
            </span>
            <span />
          </div>

          <SortableContext
            id={status.id}
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                members={members}
                tags={tags}
                statuses={statuses}
                projectId={projectId}
                statusColor={status.color}
                onClick={() => onTaskClick(task.id)}
              />
            ))}
          </SortableContext>

          <InlineAddTask
            projectId={projectId}
            statusId={status.id}
            statusColor={status.color}
            listId={listId}
          />
        </div>
      )}
    </div>
  );
}
