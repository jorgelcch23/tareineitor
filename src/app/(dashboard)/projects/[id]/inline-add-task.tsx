"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createTask } from "./actions";
import { toast } from "sonner";
import { TASK_GRID_COLS } from "./task-row";

interface InlineAddTaskProps {
  projectId: string;
  statusId: string;
  statusColor: string;
  listId: string;
}

export function InlineAddTask({ projectId, statusId, statusColor, listId }: InlineAddTaskProps) {
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const trimmed = title.trim();
    setTitle("");

    startTransition(async () => {
      const result = await createTask({
        project_id: projectId,
        title: trimmed,
        status_id: statusId,
        list_id: listId,
      });
      if (result.error) {
        toast.error(result.error);
        setTitle(trimmed);
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${TASK_GRID_COLS} group/add px-4 py-2`}
    >
      <div className="flex items-center gap-1.5">
        {/* Spacer matching drag handle width */}
        <span className="shrink-0 p-0.5">
          <span className="h-3.5 w-3.5 block" />
        </span>
        <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" strokeWidth={2.5} />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New Task"
          disabled={isPending}
          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
        />
      </div>
      {/* Empty columns to maintain grid alignment */}
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </form>
  );
}
