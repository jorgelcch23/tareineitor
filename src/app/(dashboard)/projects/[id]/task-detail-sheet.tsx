"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Flag, CalendarDays, Trash2, User, Send, List, Tag } from "lucide-react";
import { PRIORITY_CONFIG, getInitials } from "@/lib/task-utils";
import type { Priority } from "@/lib/task-utils";
import {
  updateTaskTitle,
  updateTaskStatus,
  updateTaskPriority,
  updateTaskAssignee,
  updateTaskDueDate,
  updateTaskDescription,
  deleteTask,
  updateTaskList,
  updateTaskTag,
  createComment,
  deleteComment,
} from "./actions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { StatusInfo } from "./status-group";
import type { MemberInfo, TagInfo } from "./task-row";
import type { Json } from "@/lib/types/database";

export type ListInfo = {
  id: string;
  name: string;
};

export type { TagInfo };

type FullTask = {
  id: string;
  title: string;
  description: Json | null;
  status_id: string;
  assignee_id: string | null;
  priority: Priority | null;
  due_date: string | null;
  list_id: string | null;
  tag_id: string | null;
};

type Comment = {
  id: string;
  body: string;
  user_id: string;
  created_at: string;
};

interface TaskDetailSheetProps {
  taskId: string | null;
  statuses: StatusInfo[];
  members: MemberInfo[];
  tags: TagInfo[];
  lists: ListInfo[];
  projectId: string;
  onClose: () => void;
}

export function TaskDetailSheet({
  taskId,
  statuses,
  members,
  tags,
  lists,
  projectId,
  onClose,
}: TaskDetailSheetProps) {
  const [task, setTask] = useState<FullTask | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch task + comments on-demand
  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setComments([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchData = async () => {
      const supabase = createClient();
      const [taskRes, commentsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, description, status_id, assignee_id, priority, due_date, list_id, tag_id")
          .eq("id", taskId)
          .single(),
        supabase
          .from("comments")
          .select("id, body, user_id, created_at")
          .eq("task_id", taskId)
          .order("created_at", { ascending: true }),
      ]);

      if (cancelled) return;
      if (taskRes.error) {
        toast.error("Failed to load task");
        setLoading(false);
        return;
      }
      setTask(taskRes.data as FullTask);
      setComments((commentsRes.data as Comment[]) ?? []);
      setLoading(false);
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const handleTitleBlur = useCallback(
    async (newTitle: string) => {
      if (!task || newTitle === task.title) return;
      setTask((prev) => (prev ? { ...prev, title: newTitle } : null));
      const result = await updateTaskTitle({
        id: task.id,
        title: newTitle,
        project_id: projectId,
      });
      if (result.error) {
        toast.error(result.error);
        setTask((prev) => (prev ? { ...prev, title: task.title } : null));
      }
    },
    [task, projectId]
  );

  const handleStatusChange = useCallback(
    async (statusId: string | null) => {
      if (!task || !statusId) return;
      const prev = task.status_id;
      setTask((t) => (t ? { ...t, status_id: statusId } : null));
      const result = await updateTaskStatus({
        id: task.id,
        status_id: statusId,
        project_id: projectId,
      });
      if (result.error) {
        toast.error(result.error);
        setTask((t) => (t ? { ...t, status_id: prev } : null));
      }
    },
    [task, projectId]
  );

  const handlePriorityChange = useCallback(
    async (priority: Priority | null) => {
      if (!task) return;
      const prev = task.priority;
      setTask((t) => (t ? { ...t, priority } : null));
      const result = await updateTaskPriority({
        id: task.id,
        priority,
        project_id: projectId,
      });
      if (result.error) {
        toast.error(result.error);
        setTask((t) => (t ? { ...t, priority: prev } : null));
      }
    },
    [task, projectId]
  );

  const handleAssigneeChange = useCallback(
    async (assigneeId: string | null) => {
      if (!task) return;
      const prev = task.assignee_id;
      setTask((t) => (t ? { ...t, assignee_id: assigneeId } : null));
      const result = await updateTaskAssignee({
        id: task.id,
        assignee_id: assigneeId,
        project_id: projectId,
      });
      if (result.error) {
        toast.error(result.error);
        setTask((t) => (t ? { ...t, assignee_id: prev } : null));
      }
    },
    [task, projectId]
  );

  const handleDueDateChange = useCallback(
    async (date: Date | undefined) => {
      if (!task) return;
      const prev = task.due_date;
      const isoDate = date ? date.toISOString() : null;
      setTask((t) => (t ? { ...t, due_date: isoDate } : null));
      const result = await updateTaskDueDate({
        id: task.id,
        due_date: isoDate,
        project_id: projectId,
      });
      if (result.error) {
        toast.error(result.error);
        setTask((t) => (t ? { ...t, due_date: prev } : null));
      }
    },
    [task, projectId]
  );

  const handleListChange = useCallback(
    async (listId: string | null) => {
      if (!task || !listId) return;
      const prev = task.list_id;
      setTask((t) => (t ? { ...t, list_id: listId } : null));
      const result = await updateTaskList({
        id: task.id,
        list_id: listId,
        project_id: projectId,
      });
      if (result.error) {
        toast.error(result.error);
        setTask((t) => (t ? { ...t, list_id: prev } : null));
      }
    },
    [task, projectId]
  );

  const handleTagChange = useCallback(
    async (tagId: string | null) => {
      if (!task) return;
      const prev = task.tag_id;
      setTask((t) => (t ? { ...t, tag_id: tagId } : null));
      const result = await updateTaskTag({
        id: task.id,
        tag_id: tagId,
        project_id: projectId,
      });
      if (result.error) {
        toast.error(result.error);
        setTask((t) => (t ? { ...t, tag_id: prev } : null));
      }
    },
    [task, projectId]
  );

  const handleDescriptionSave = useCallback(
    async (description: Json) => {
      if (!task) return;
      const result = await updateTaskDescription({
        id: task.id,
        description,
        project_id: projectId,
      });
      if (result.error) toast.error(result.error);
    },
    [task, projectId]
  );

  const handleDelete = useCallback(async () => {
    if (!task) return;
    const result = await deleteTask({
      id: task.id,
      project_id: projectId,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Task deleted");
      onClose();
    }
  }, [task, projectId, onClose]);

  const handleAddComment = useCallback(
    async (body: string) => {
      if (!task) return;
      const result = await createComment({
        task_id: task.id,
        body,
        project_id: projectId,
      });
      if (result.error) {
        toast.error(result.error);
      } else if (result.comment) {
        setComments((prev) => [...prev, result.comment as Comment]);
      }
    },
    [task, projectId]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      const result = await deleteComment({
        id: commentId,
        project_id: projectId,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    },
    [projectId]
  );

  const currentStatus = task
    ? statuses.find((s) => s.id === task.status_id)
    : null;
  const currentAssignee = task?.assignee_id
    ? members.find((m) => m.id === task.assignee_id)
    : null;

  return (
    <Dialog open={!!taskId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl h-[80vh] p-0 gap-0 flex flex-col">
        {loading || !task ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <>
            {/* Title bar */}
            <div className="border-b border-border px-6 py-4 pr-12">
              <DialogTitle className="sr-only">Task Detail</DialogTitle>
              <TitleInput value={task.title} onSave={handleTitleBlur} />
            </div>

            {/* Two-column body */}
            <div className="flex flex-1 overflow-hidden">
              {/* LEFT — Properties + Description */}
              <div className="flex-1 overflow-y-auto border-r border-border p-6 space-y-6">
                {/* Properties grid */}
                <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-sm">
                  {/* Status */}
                  <span className="text-muted-foreground">Status</span>
                  <Select
                    value={task.status_id}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue>
                        {currentStatus && (
                          <>
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: currentStatus.color }}
                            />
                            {currentStatus.name}
                          </>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Assignee */}
                  <span className="text-muted-foreground">Assignee</span>
                  <Select
                    value={task.assignee_id ?? "__none__"}
                    onValueChange={(v: string | null) =>
                      handleAssigneeChange(!v || v === "__none__" ? null : v)
                    }
                  >
                    <SelectTrigger size="sm">
                      <SelectValue>
                        {currentAssignee ? (
                          <>
                            <Avatar size="sm">
                              {currentAssignee.avatar_url && (
                                <AvatarImage src={currentAssignee.avatar_url} />
                              )}
                              <AvatarFallback>
                                {getInitials(currentAssignee.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            {currentAssignee.full_name ?? "Unknown"}
                          </>
                        ) : (
                          <>
                            <User className="h-4 w-4 text-muted-foreground" />
                            Unassigned
                          </>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Unassigned
                      </SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <Avatar size="sm">
                            {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                            <AvatarFallback>
                              {getInitials(m.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          {m.full_name ?? "Unknown"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Priority */}
                  <span className="text-muted-foreground">Priority</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="outline" size="sm" />}
                    >
                      <Flag
                        className="mr-1.5 h-3.5 w-3.5"
                        style={{
                          color: task.priority
                            ? PRIORITY_CONFIG[task.priority].color
                            : undefined,
                        }}
                      />
                      {task.priority
                        ? PRIORITY_CONFIG[task.priority].label
                        : "No priority"}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
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

                  {/* Due date */}
                  <span className="text-muted-foreground">Due date</span>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger
                        render={<Button variant="outline" size="sm" />}
                      >
                        <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                        {task.due_date
                          ? new Date(task.due_date).toLocaleDateString()
                          : "No due date"}
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={task.due_date ? new Date(task.due_date) : undefined}
                          onSelect={handleDueDateChange}
                        />
                      </PopoverContent>
                    </Popover>
                    {task.due_date && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDueDateChange(undefined)}
                        className="text-xs text-muted-foreground"
                      >
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Tag */}
                  <span className="text-muted-foreground">Tag</span>
                  <Select
                    value={task.tag_id ?? "__none__"}
                    onValueChange={(v: string | null) =>
                      handleTagChange(!v || v === "__none__" ? null : v)
                    }
                  >
                    <SelectTrigger size="sm">
                      <SelectValue>
                        {task.tag_id ? (
                          (() => {
                            const tag = tags.find((t) => t.id === task.tag_id);
                            return tag ? (
                              <>
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: tag.color }}
                                />
                                {tag.name}
                              </>
                            ) : (
                              <>
                                <Tag className="h-4 w-4 text-muted-foreground" />
                                No tag
                              </>
                            );
                          })()
                        ) : (
                          <>
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            No tag
                          </>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        No tag
                      </SelectItem>
                      {tags.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: t.color }}
                          />
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* List */}
                  {lists.length > 1 && (
                    <>
                      <span className="text-muted-foreground">List</span>
                      <Select
                        value={task.list_id ?? ""}
                        onValueChange={handleListChange}
                      >
                        <SelectTrigger size="sm">
                          <SelectValue>
                            <List className="h-3.5 w-3.5 text-muted-foreground" />
                            {lists.find((l) => l.id === task.list_id)?.name ?? "No list"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {lists.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              <List className="h-3.5 w-3.5 text-muted-foreground" />
                              {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h3 className="mb-2 text-sm font-medium">Description</h3>
                  <TiptapEditor
                    content={task.description}
                    onSave={handleDescriptionSave}
                  />
                </div>

                {/* Delete */}
                <div className="border-t border-border pt-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete task
                  </Button>
                </div>
              </div>

              {/* RIGHT — Comments */}
              <div className="flex w-80 flex-col">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-medium">Comments</h3>
                </div>
                <CommentsPanel
                  comments={comments}
                  members={members}
                  onAdd={handleAddComment}
                  onDelete={handleDeleteComment}
                />
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TitleInput({
  value,
  onSave,
}: {
  value: string;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (!editing) {
    return (
      <h2
        className="cursor-text text-xl font-semibold hover:bg-accent/50 rounded px-1 -mx-1"
        onClick={() => setEditing(true)}
      >
        {value}
      </h2>
    );
  }

  return (
    <Input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft.trim() && draft !== value) onSave(draft.trim());
        else setDraft(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className="text-xl font-semibold"
    />
  );
}

function CommentsPanel({
  comments,
  members,
  onAdd,
  onDelete,
}: {
  comments: Comment[];
  members: MemberInfo[];
  onAdd: (body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    const text = body.trim();
    setBody("");
    startTransition(async () => {
      await onAdd(text);
    });
  };

  return (
    <>
      {/* Comment list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">
            No comments yet
          </p>
        )}
        {comments.map((c) => {
          const author = members.find((m) => m.id === c.user_id);
          return (
            <div key={c.id} className="group flex gap-2.5">
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
                <AvatarFallback className="text-[10px]">
                  {getInitials(author?.full_name ?? null)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium truncate">
                    {author?.full_name ?? "Unknown"}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(c.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-0.5">
                  {c.body}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                className="opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 text-muted-foreground hover:text-destructive transition-opacity"
                title="Delete comment"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* New comment input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border p-3 flex gap-2"
      >
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment..."
          disabled={isPending}
          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          disabled={isPending || !body.trim()}
          className="h-7 w-7 shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </>
  );
}
