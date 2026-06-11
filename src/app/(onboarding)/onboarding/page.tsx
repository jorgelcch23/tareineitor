import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check if already completed onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect("/");
  }

  // Check if this user was invited to a workspace (has workspace_members entry)
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const isInvited = !!membership;

  return (
    <OnboardingWizard
      isInvited={isInvited}
      initialName={profile?.full_name && profile.full_name !== user.email ? profile.full_name : ""}
      initialAvatarUrl={profile?.avatar_url ?? null}
    />
  );
}
