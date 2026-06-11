"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Flag, CalendarDays, User, Tag } from "lucide-react";
import { PRIORITY_CONFIG, getInitials } from "@/lib/task-utils";
import type { Priority } from "@/lib/task-utils";
import { createTask } from "./actions";
import { toast } from "sonner";
import type { StatusInfo } from "./status-group";
import type { MemberInfo, TagInfo } from "./task-row";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  listId: string;
  statuses: StatusInfo[];
  members: MemberInfo[];
  tags: TagInfo[];
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  projectId,
  listId,
  statuses,
  members,
  tags,
}: CreateTaskDialogProps) {
  const todoStatus = statuses.find(
    (s) => s.name.toLowerCase() === "to do"
  ) ?? statuses[0];

  const [title, setTitle] = useState("");
  const [statusId, setStatusId] = useState(todoStatus?.id ?? "");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [tagId, setTagId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resetForm = () => {
    setTitle("");
    setStatusId(todoStatus?.id ?? "");
    setAssigneeId(null);
    setPriority(null);
    setDueDate(undefined);
    setTagId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      const result = await createTask({
        project_id: projectId,
        title: title.trim(),
        status_id: statusId,
        list_id: listId,
        assignee_id: assigneeId,
        priority,
        due_date: dueDate ? dueDate.toISOString() : null,
        tag_id: tagId,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Task created");
        resetForm();
        onOpenChange(false);
      }
    });
  };

  const currentStatus = statuses.find((s) => s.id === statusId);
  const currentAssignee = assigneeId
    ? members.find((m) => m.id === assigneeId)
    : null;
  const currentTag = tagId ? tags.find((t) => t.id === tagId) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                autoFocus
                placeholder="Task name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Properties grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={statusId} onValueChange={(v) => v && setStatusId(v)}>
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
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Assignee
                </Label>
                <Select
                  value={assigneeId ?? "__none__"}
                  onValueChange={(v) =>
                    setAssigneeId(!v || v === "__none__" ? null : v)
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
                          {currentAssignee.full_name}
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
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Priority
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                      />
                    }
                  >
                    <Flag
                      className="mr-1.5 h-3.5 w-3.5"
                      style={{
                        color: priority
                          ? PRIORITY_CONFIG[priority].color
                          : undefined,
                      }}
                    />
                    {priority ? PRIORITY_CONFIG[priority].label : "No priority"}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
                      <DropdownMenuItem
                        key={p}
                        onClick={() => setPriority(p)}
                      >
                        <Flag
                          className="mr-2 h-3.5 w-3.5"
                          style={{ color: PRIORITY_CONFIG[p].color }}
                        />
                        {PRIORITY_CONFIG[p].label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setPriority(null)}>
                      No priority
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Due date */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Due date
                </Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                      />
                    }
                  >
                    <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                    {dueDate
                      ? dueDate.toLocaleDateString()
                      : "No due date"}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                    />
                    {dueDate && (
                      <div className="border-t border-border p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-muted-foreground"
                          onClick={() => setDueDate(undefined)}
                        >
                          Clear date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Tag */}
              {tags.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tag</Label>
                  <Select
                    value={tagId ?? "__none__"}
                    onValueChange={(v) =>
                      setTagId(!v || v === "__none__" ? null : v)
                    }
                  >
                    <SelectTrigger size="sm">
                      <SelectValue>
                        {currentTag ? (
                          <>
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: currentTag.color }}
                            />
                            {currentTag.name}
                          </>
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
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
