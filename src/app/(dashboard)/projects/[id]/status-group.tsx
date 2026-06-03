"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskRow, TASK_GRID_COLS } from "./task-row";
import { InlineAddTask } from "./inline-add-task";
import { StatusIcon } from "./status-icon";
import type { TaskRowData, MemberInfo } from "./task-row";

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
  statuses: StatusInfo[];
  projectId: string;
  onTaskClick: (taskId: string) => void;
}

export function StatusGroup({
  status,
  tasks,
  members,
  statuses,
  projectId,
  onTaskClick,
}: StatusGroupProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      {/* Group header */}
      <div className="flex w-full items-center gap-1.5 py-2 pb-1.5">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left"
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-90"
            )}
          />
          <span
            className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-1.5 pr-2.5 text-xs font-semibold lowercase"
            style={{
              backgroundColor: status.color + "18",
              color: status.color,
            }}
          >
            <StatusIcon
              name={status.name}
              color={status.color}
              isDone={status.is_done}
              size={14}
            />
            {status.name}
          </span>
        </button>
        <span className="text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {/* Table */}
      {expanded && (
        <div className="ml-5 overflow-hidden rounded-lg border border-border/60">
          {/* Column headers */}
          <div
            className={`${TASK_GRID_COLS} border-b border-border/40 px-4 py-1.5`}
          >
            <span className="pl-7 text-xs font-medium text-[#838383]">
              Name
            </span>
            <span className="text-center text-xs font-medium text-[#838383]">
              Assignee
            </span>
            <span className="text-center text-xs font-medium text-[#838383]">
              Due date
            </span>
            <span className="text-center text-xs font-medium text-[#838383]">
              Priority
            </span>
          </div>

          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              members={members}
              statuses={statuses}
              projectId={projectId}
              statusColor={status.color}
              onClick={() => onTaskClick(task.id)}
            />
          ))}
          <InlineAddTask
            projectId={projectId}
            statusId={status.id}
            statusColor={status.color}
          />
        </div>
      )}
    </div>
  );
}
