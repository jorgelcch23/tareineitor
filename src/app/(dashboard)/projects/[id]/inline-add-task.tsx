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
}

export function InlineAddTask({ projectId, statusId, statusColor }: InlineAddTaskProps) {
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
      <div className="flex items-center gap-2">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[#838383]">
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
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
    </form>
  );
}
