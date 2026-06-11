"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FolderKanban, ArrowRight, X, Plus, Check, Loader2 } from "lucide-react";
import {
  updateOnboardingProfile,
  createWorkspace,
  inviteMembers,
  completeOnboarding,
} from "./actions";

type Step = "profile" | "workspace" | "invite";

export function OnboardingWizard({
  isInvited,
  initialName,
  initialAvatarUrl,
}: {
  isInvited: boolean;
  initialName: string;
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Steps: invited users only see profile step
  const steps: Step[] = isInvited
    ? ["profile"]
    : ["profile", "workspace", "invite"];

  const [currentStep, setCurrentStep] = useState<Step>("profile");
  const currentStepIndex = steps.indexOf(currentStep);

  // Profile state
  const [fullName, setFullName] = useState(initialName);

  // Workspace state — default to "Jorge's Workspace" style
  const defaultWsName = fullName.trim()
    ? `${fullName.trim().split(" ")[0]}'s Workspace`
    : "";
  const [workspaceName, setWorkspaceName] = useState(defaultWsName);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Invite state
  const [emails, setEmails] = useState<string[]>([""]);

  const handleProfileNext = () => {
    if (!fullName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    startTransition(async () => {
      const result = await updateOnboardingProfile({
        full_name: fullName.trim(),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (isInvited) {
        // Invited users are done after profile
        const completeResult = await completeOnboarding();
        if (completeResult.error) {
          toast.error(completeResult.error);
          return;
        }
        router.push("/");
        router.refresh();
      } else {
        // Pre-fill workspace name with "Name's Workspace"
        const firstName = fullName.trim().split(" ")[0];
        if (firstName && !workspaceName) {
          setWorkspaceName(`${firstName}'s Workspace`);
        }
        setCurrentStep("workspace");
      }
    });
  };

  const handleWorkspaceNext = () => {
    if (!workspaceName.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }
    startTransition(async () => {
      const result = await createWorkspace({ name: workspaceName.trim() });
      if (result.error && !result.workspace_id) {
        toast.error(result.error);
        return;
      }
      setWorkspaceId(result.workspace_id!);
      setCurrentStep("invite");
    });
  };

  const handleInviteSkip = () => {
    startTransition(async () => {
      const result = await completeOnboarding();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  const handleInviteSend = () => {
    const validEmails = emails
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (validEmails.length === 0) {
      handleInviteSkip();
      return;
    }

    startTransition(async () => {
      if (workspaceId) {
        const result = await inviteMembers({
          emails: validEmails,
          workspace_id: workspaceId,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        const sent = result.results?.filter((r) => r.success).length ?? 0;
        if (sent > 0) {
          toast.success(`${sent} invitation${sent > 1 ? "s" : ""} sent`);
        }
        const failed = result.results?.filter((r) => !r.success) ?? [];
        for (const f of failed) {
          toast.error(`${f.email}: ${f.error}`);
        }
      }

      const completeResult = await completeOnboarding();
      if (completeResult.error) {
        toast.error(completeResult.error);
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  const addEmailField = () => {
    if (emails.length < 10) {
      setEmails([...emails, ""]);
    }
  };

  const updateEmail = (index: number, value: string) => {
    const updated = [...emails];
    updated[index] = value;
    setEmails(updated);
  };

  const removeEmail = (index: number) => {
    if (emails.length <= 1) return;
    setEmails(emails.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <FolderKanban className="h-8 w-8 text-gray-950 dark:text-gray-50" />
          <span className="text-2xl font-bold text-gray-950 dark:text-gray-50 tracking-tight">
            Tasknator
          </span>
        </div>
        {!isInvited && steps.length > 1 && (
          <div className="flex items-center justify-center gap-2">
            {steps.map((step, i) => (
              <div
                key={step}
                className={`h-1.5 w-12 rounded-full transition-colors ${
                  i <= currentStepIndex
                    ? "bg-gray-900 dark:bg-gray-100"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        {/* Step: Profile */}
        {currentStep === "profile" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">
                {isInvited ? "Welcome to Tasknator" : "Set up your profile"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isInvited
                  ? "Tell us your name to get started."
                  : "Let's start with your name."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                onKeyDown={(e) => e.key === "Enter" && handleProfileNext()}
                autoFocus
              />
            </div>

            <Button
              onClick={handleProfileNext}
              disabled={isPending || !fullName.trim()}
              className="w-full"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {isInvited ? "Get Started" : "Continue"}
            </Button>
          </div>
        )}

        {/* Step: Workspace */}
        {currentStep === "workspace" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Create your workspace</h2>
              <p className="text-sm text-muted-foreground mt-1">
                A workspace is where your team organizes projects and tasks.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspaceName">Workspace name</Label>
              <Input
                id="workspaceName"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="My Company"
                onKeyDown={(e) => e.key === "Enter" && handleWorkspaceNext()}
                autoFocus
              />
            </div>

            <Button
              onClick={handleWorkspaceNext}
              disabled={isPending || !workspaceName.trim()}
              className="w-full"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Continue
            </Button>
          </div>
        )}

        {/* Step: Invite */}
        {currentStep === "invite" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Invite your team</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Add team members by email. You can always do this later.
              </p>
            </div>

            <div className="space-y-2">
              {emails.map((email, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => updateEmail(index, e.target.value)}
                    placeholder="colleague@company.com"
                    autoFocus={index === 0}
                  />
                  {emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(index)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {emails.length < 10 && (
                <button
                  type="button"
                  onClick={addEmailField}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add another
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleInviteSkip}
                disabled={isPending}
                className="flex-1"
              >
                Skip
              </Button>
              <Button
                onClick={handleInviteSend}
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Send Invites
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
