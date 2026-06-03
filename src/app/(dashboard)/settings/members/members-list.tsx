"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { MoreHorizontal, Plus, Shield, Crown, User, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  inviteToWorkspace,
  updateUserRole,
  removeFromWorkspace,
} from "./actions";

type Member = {
  id: string;
  full_name: string | null;
  role: "owner" | "admin" | "member";
  email: string | null;
};

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
};

const roleBadgeVariant = {
  owner: "default" as const,
  admin: "secondary" as const,
  member: "outline" as const,
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

export function MembersList({
  members,
  currentUserId,
  currentUserRole,
}: {
  members: Member[];
  currentUserId: string;
  currentUserRole: "owner" | "admin" | "member";
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null);

  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Members ({members.length})</h2>
          <p className="text-sm text-muted-foreground">
            People with access to this workspace
          </p>
        </div>
        {isAdmin && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger
              render={
                <Button size="sm">
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Invite Member
                </Button>
              }
            />
            <InviteDialog onClose={() => setInviteOpen(false)} />
          </Dialog>
        )}
      </div>

      <div className="mt-4 divide-y divide-border rounded-lg border border-border">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onRemove={() => setConfirmRemove(member)}
          />
        ))}
      </div>

      {/* Remove confirmation dialog */}
      <Dialog
        open={confirmRemove !== null}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
      >
        {confirmRemove && (
          <RemoveDialog
            member={confirmRemove}
            onClose={() => setConfirmRemove(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

function MemberRow({
  member,
  currentUserId,
  currentUserRole,
  onRemove,
}: {
  member: Member;
  currentUserId: string;
  currentUserRole: "owner" | "admin" | "member";
  onRemove: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const RoleIcon = roleIcons[member.role];
  const isCurrentUser = member.id === currentUserId;
  const canManage =
    !isCurrentUser &&
    member.role !== "owner" &&
    (currentUserRole === "owner" || currentUserRole === "admin");

  const handleRoleChange = (newRole: string) => {
    startTransition(async () => {
      const result = await updateUserRole({
        userId: member.id,
        role: newRole as "admin" | "member",
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
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">
            {member.full_name ?? "Unnamed"}
            {isCurrentUser && (
              <span className="ml-1 text-muted-foreground">(you)</span>
            )}
          </p>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {member.email ?? "No email"}
        </p>
      </div>

      <Badge variant={roleBadgeVariant[member.role]} className="gap-1 capitalize">
        <RoleIcon className="h-3 w-3" />
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
            {currentUserRole === "owner" && member.role === "member" && (
              <DropdownMenuItem onClick={() => handleRoleChange("admin")}>
                <Shield className="mr-2 h-3.5 w-3.5" />
                Make Admin
              </DropdownMenuItem>
            )}
            {currentUserRole === "owner" && member.role === "admin" && (
              <DropdownMenuItem onClick={() => handleRoleChange("member")}>
                <User className="mr-2 h-3.5 w-3.5" />
                Make Member
              </DropdownMenuItem>
            )}
            {((currentUserRole === "owner" && member.role !== "owner") ||
              (currentUserRole === "admin" && member.role === "member")) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={onRemove}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Remove from workspace
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleInvite = () => {
    if (!email.trim()) return;
    startTransition(async () => {
      const result = await inviteToWorkspace({ email: email.trim() });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Invitation sent");
        setEmail("");
        onClose();
      }
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Invite Member</DialogTitle>
        <DialogDescription>
          Send an email invitation to join this workspace.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor="invite-email">Email address</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="colleague@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          disabled={isPending}
        />
      </div>
      <DialogFooter>
        <Button onClick={handleInvite} disabled={isPending || !email.trim()}>
          {isPending ? "Sending..." : "Send Invite"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function RemoveDialog({
  member,
  onClose,
}: {
  member: Member;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleRemove = () => {
    startTransition(async () => {
      const result = await removeFromWorkspace({ userId: member.id });
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
          <strong>{member.full_name ?? member.email}</strong> from the workspace?
          This will revoke all their project access and delete their account.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleRemove} disabled={isPending}>
          {isPending ? "Removing..." : "Remove"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
