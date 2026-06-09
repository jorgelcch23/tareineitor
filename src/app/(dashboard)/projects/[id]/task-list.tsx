"use client";

import { useState, useRef, useMemo, useEffect, useCallback, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { ProjectHeader } from "./project-header";
import { StatusGroup } from "./status-group";
import { TaskDetailSheet } from "./task-detail-sheet";
import type { ListInfo } from "./task-detail-sheet";
import { reorderTask } from "./actions";
import { toast } from "sonner";
import type { StatusInfo } from "./status-group";
import type { TaskRowData, MemberInfo, TagInfo } from "./task-row";

interface TaskListProps {
  projectId: string;
  projectName: string;
  listId: string;
  statuses: StatusInfo[];
  groupedTasks: Record<string, TaskRowData[]>;
  members: MemberInfo[];
  tags: TagInfo[];
  lists: ListInfo[];
  currentUser: MemberInfo | null;
}

export function TaskList({
  projectId,
  projectName,
  listId,
  statuses,
  groupedTasks,
  members,
  tags,
  lists,
  currentUser,
}: TaskListProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Local groups for optimistic drag updates
  const [localGroups, setLocalGroups] = useState(groupedTasks);

  // Sync from server when task arrangement changes
  const serverFingerprint = useMemo(
    () =>
      statuses
        .map((s) => (groupedTasks[s.id] ?? []).map((t) => t.id).join(","))
        .join("|"),
    [groupedTasks, statuses]
  );
  useEffect(() => {
    setLocalGroups(groupedTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverFingerprint]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Find which container (status ID) a task belongs to
  const findContainer = useCallback(
    (id: string): string | null => {
      for (const [statusId, tasks] of Object.entries(localGroups)) {
        if (tasks.some((t) => t.id === id)) return statusId;
      }
      // id might be a container (status) ID itself
      if (localGroups[id] !== undefined) return id;
      return null;
    },
    [localGroups]
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeIdStr = active.id as string;
      const overId = over.id as string;

      const activeContainer = findContainer(activeIdStr);
      const overContainer = findContainer(overId);

      if (!activeContainer || !overContainer || activeContainer === overContainer) return;

      setLocalGroups((prev) => {
        const activeItems = [...prev[activeContainer]];
        const overItems = [...prev[overContainer]];

        const activeIndex = activeItems.findIndex((t) => t.id === activeIdStr);
        if (activeIndex === -1) return prev;

        const [movedTask] = activeItems.splice(activeIndex, 1);

        // Is overId a task or a container?
        const overIndex = overItems.findIndex((t) => t.id === overId);
        const insertIndex = overIndex >= 0 ? overIndex : overItems.length;

        overItems.splice(insertIndex, 0, {
          ...movedTask,
          status_id: overContainer,
        });

        return { ...prev, [activeContainer]: activeItems, [overContainer]: overItems };
      });
    },
    [findContainer]
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeIdStr = active.id as string;
      const overId = over.id as string;

      // Find current container of active item
      let container: string | null = null;
      for (const [statusId, tasks] of Object.entries(localGroups)) {
        if (tasks.some((t) => t.id === activeIdStr)) {
          container = statusId;
          break;
        }
      }
      if (!container) return;

      let tasks = [...localGroups[container]];
      const oldIndex = tasks.findIndex((t) => t.id === activeIdStr);
      const newIndex = tasks.findIndex((t) => t.id === overId);

      // Reorder within same container
      if (oldIndex !== newIndex && newIndex >= 0) {
        tasks = arrayMove(tasks, oldIndex, newIndex);
        setLocalGroups((prev) => ({ ...prev, [container!]: tasks }));
      }

      // Calculate position
      const taskIndex = tasks.findIndex((t) => t.id === activeIdStr);
      const position = calculatePosition(tasks, taskIndex);

      // Persist to server
      startTransition(async () => {
        const result = await reorderTask({
          id: activeIdStr,
          status_id: container!,
          position,
          project_id: projectId,
        });
        if (result.error) {
          toast.error(result.error);
          setLocalGroups(groupedTasks);
        }
      });
    },
    [localGroups, projectId, groupedTasks, startTransition]
  );

  const onDragCancel = useCallback(() => {
    setActiveId(null);
    setLocalGroups(groupedTasks);
  }, [groupedTasks]);

  // Active task for DragOverlay
  const activeTask = activeId
    ? Object.values(localGroups).flat().find((t) => t.id === activeId)
    : null;

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
        currentUser={currentUser}
        filterAssigneeId={filterAssigneeId}
        onFilterChange={setFilterAssigneeId}
        onAddTask={handleAddTask}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="flex-1 overflow-y-auto border-t border-border px-4 py-4 space-y-6">
          {statuses.map((status) => {
            const tasks = localGroups[status.id] ?? [];
            const filtered = filterAssigneeId
              ? tasks.filter((t) => t.assignee_id === filterAssigneeId)
              : tasks;

            return (
              <StatusGroup
                key={status.id}
                status={status}
                tasks={filtered}
                members={members}
                tags={tags}
                statuses={statuses}
                projectId={projectId}
                listId={listId}
                onTaskClick={setSelectedTaskId}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 shadow-lg">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{activeTask.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TaskDetailSheet
        taskId={selectedTaskId}
        statuses={statuses}
        members={members}
        tags={tags}
        lists={lists}
        projectId={projectId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}

function calculatePosition(tasks: TaskRowData[], index: number): number {
  if (tasks.length <= 1) return 1000;
  const prev = index > 0 ? tasks[index - 1].position : null;
  const next = index < tasks.length - 1 ? tasks[index + 1].position : null;
  if (prev === null && next === null) return 1000;
  if (prev === null) return next! - 1000;
  if (next === null) return prev + 1000;
  return Math.floor((prev + next) / 2);
}
