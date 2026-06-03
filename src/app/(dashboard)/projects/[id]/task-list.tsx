"use client";

import { useState, useRef } from "react";
import { ProjectHeader } from "./project-header";
import { StatusGroup } from "./status-group";
import { TaskDetailSheet } from "./task-detail-sheet";
import type { StatusInfo } from "./status-group";
import type { TaskRowData, MemberInfo } from "./task-row";

interface TaskListProps {
  projectId: string;
  projectName: string;
  statuses: StatusInfo[];
  groupedTasks: Record<string, TaskRowData[]>;
  members: MemberInfo[];
}

export function TaskList({
  projectId,
  projectName,
  statuses,
  groupedTasks,
  members,
}: TaskListProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | null>(null);

  // Focus first inline add when header "Add Task" is clicked
  const containerRef = useRef<HTMLDivElement>(null);
  const handleAddTask = () => {
    const firstInput = containerRef.current?.querySelector<HTMLInputElement>(
      'input[placeholder="New Task"]'
    );
    firstInput?.focus();
  };

  return (
    <div ref={containerRef} className="flex h-full flex-col">
      <ProjectHeader
        projectName={projectName}
        members={members}
        filterAssigneeId={filterAssigneeId}
        onFilterChange={setFilterAssigneeId}
        onAddTask={handleAddTask}
      />

      <div className="flex-1 overflow-y-auto border-t border-border px-4 py-4 space-y-6">
        {statuses.map((status) => {
          const tasks = groupedTasks[status.id] ?? [];
          const filtered = filterAssigneeId
            ? tasks.filter((t) => t.assignee_id === filterAssigneeId)
            : tasks;

          return (
            <StatusGroup
              key={status.id}
              status={status}
              tasks={filtered}
              members={members}
              statuses={statuses}
              projectId={projectId}
              onTaskClick={setSelectedTaskId}
            />
          );
        })}
      </div>

      <TaskDetailSheet
        taskId={selectedTaskId}
        statuses={statuses}
        members={members}
        projectId={projectId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
