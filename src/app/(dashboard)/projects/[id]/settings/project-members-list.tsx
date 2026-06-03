"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Shield, User, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
} from "./actions";

type ProjectMember = {
  id: string;
  user_id: string;
  full_name: string | null;
  role: "admin" | "member";
};

type WorkspaceUser = {
  id: string;
  full_name: string | null;
};

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ProjectMembersList({
  projectId,
  members,
  availableUsers,
  currentUserId,
  isProjectAdmin,
}: {
  projectId: string;
  members: ProjectMember[];
  availableUsers: WorkspaceUser[];
  currentUserId: string;
  isProjectAdmin: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<ProjectMember | null>(
    null
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Project Members ({members.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            People with access to this project
          </p>
        </div>
        {isProjectAdmin && availableUsers.length > 0 && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger
              render={
                <Button size="sm">
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Add Member
                </Button>
              }
            />
            <AddMemberDialog
              projectId={projectId}
              availableUsers={availableUsers}
              onClose={() => setAddOpen(false)}
            />
          </Dialog>
        )}
      </div>

      <div className="mt-4 divide-y divide-border rounded-lg border border-border">
        {members.map((member) => (
          <ProjectMemberRow
            key={member.id}
            projectId={projectId}
            member={member}
            currentUserId={currentUserId}
            isProjectAdmin={isProjectAdmin}
            onRemove={() => setConfirmRemove(member)}
          />
        ))}
        {members.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No members yet
          </div>
        )}
      </div>

      <Dialog
        open={confirmRemove !== null}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
      >
        {confirmRemove && (
          <RemoveMemberDialog
            projectId={projectId}
            member={confirmRemove}
            onClose={() => setConfirmRemove(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

function ProjectMemberRow({
  projectId,
  member,
  currentUserId,
  isProjectAdmin,
  onRemove,
}: {
  projectId: string;
  member: ProjectMember;
  currentUserId: string;
  isProjectAdmin: boolean;
  onRemove: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isCurrentUser = member.user_id === currentUserId;
  const canManage = isProjectAdmin && !isCurrentUser;

  const handleRoleChange = (newRole: "admin" | "member") => {
    startTransition(async () => {
      const result = await updateProjectMemberRole({
        projectId,
        userId: member.user_id,
        role: newRole,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Role updated");
      }
    });
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">
          {getInitials(member.full_name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">
          {member.full_name ?? "Unnamed"}
          {isCurrentUser && (
            <span className="ml-1 text-muted-foreground">(you)</span>
          )}
        </p>
      </div>

      <Badge
        variant={member.role === "admin" ? "secondary" : "outline"}
        className="gap-1 capitalize"
      >
        {member.role === "admin" ? (
          <Shield className="h-3 w-3" />
        ) : (
          <User className="h-3 w-3" />
        )}
        {member.role}
      </Badge>

      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                disabled={isPending}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              />
            }
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {member.role === "member" ? (
              <DropdownMenuItem onClick={() => handleRoleChange("admin")}>
                <Shield className="mr-2 h-3.5 w-3.5" />
                Make Admin
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => handleRoleChange("member")}>
                <User className="mr-2 h-3.5 w-3.5" />
                Make Member
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onRemove}>
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Remove from project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function AddMemberDialog({
  projectId,
  availableUsers,
  onClose,
}: {
  projectId: string;
  availableUsers: WorkspaceUser[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleAdd = (userId: string) => {
    startTransition(async () => {
      const result = await addProjectMember({ projectId, userId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Member added");
        onClose();
      }
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add Member</DialogTitle>
        <DialogDescription>
          Add a workspace member to this project.
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-64 overflow-y-auto divide-y divide-border rounded-md border border-border">
        {availableUsers.map((u) => (
          <button
            key={u.id}
            type="button"
            disabled={isPending}
            onClick={() => handleAdd(u.id)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">
                {getInitials(u.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{u.full_name ?? "Unnamed"}</span>
          </button>
        ))}
      </div>
    </DialogContent>
  );
}

function RemoveMemberDialog({
  projectId,
  member,
  onClose,
}: {
  projectId: string;
  member: ProjectMember;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeProjectMember({
        projectId,
        userId: member.user_id,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Member removed");
        onClose();
      }
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Remove Member</DialogTitle>
        <DialogDescription>
          Are you sure you want to remove{" "}
          <strong>{member.full_name ?? "this member"}</strong> from the project?
          They will lose access to all tasks in this project.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={handleRemove}
          disabled={isPending}
        >
          {isPending ? "Removing..." : "Remove"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
