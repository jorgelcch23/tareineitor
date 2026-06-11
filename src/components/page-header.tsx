"use client";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function PageHeader({
  title,
  currentUser,
  children,
}: {
  title: string;
  currentUser: { full_name: string | null; avatar_url: string | null };
  children?: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-background/90 backdrop-blur-[8px] px-2.5">
      <p className="text-sm font-medium text-foreground truncate pl-1">
        {title}
      </p>

      <div className="flex items-center gap-2 shrink-0">
        {children}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            }
          >
            <Avatar size="sm">
              {currentUser.avatar_url && (
                <AvatarImage src={currentUser.avatar_url} />
              )}
              <AvatarFallback>
                {getInitials(currentUser.full_name)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {currentUser.full_name ?? "User"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
