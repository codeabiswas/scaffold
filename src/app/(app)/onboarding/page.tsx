import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TipiForm } from "@/components/onboarding/tipi-form";
import { HobbiesForm } from "@/components/onboarding/hobbies-form";
import { GoalForm } from "@/components/onboarding/goal-form";
import { CalendarConnect } from "@/components/onboarding/calendar-connect";
import { AiPlan } from "@/components/onboarding/ai-plan";
import { SusForm } from "@/components/surveys/sus-form";
import { CalendarInviteBanner } from "@/components/onboarding/calendar-invite-banner";
import { Progress } from "@/components/ui/progress";
import {
  getConfig,
  getStepKey,
  getStepTitle,
  isOnboardingComplete,
} from "@/lib/treatment-config";
import type { Treatment } from "@/lib/types";
import type { Habit } from "@/lib/types";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const { step: stepParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const treatment: Treatment = (profile?.treatment as Treatment) || "b";
  const config = getConfig(treatment);
  const step = parseInt(stepParam || "1", 10);

  // If onboarding already complete, go to dashboard
  if (
    profile &&
    isOnboardingComplete(treatment, profile.onboarding_step)
  ) {
    redirect("/dashboard");
  }

  // Get habit if one exists
  const { data: habits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const habit = habits?.[0] as Habit | undefined;

  const stepKey = getStepKey(treatment, step);
  const stepTitle = getStepTitle(treatment, step);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Onboarding</h1>
        <p className="text-muted-foreground">{config.subtitle}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Step {step} of {config.totalSteps}: {stepTitle}
          </span>
          <span>
            {Math.round((step / config.totalSteps) * 100)}%
          </span>
        </div>
        <Progress value={(step / config.totalSteps) * 100} />
      </div>

      {stepKey === "tipi" && (
        <TipiForm
          userId={user.id}
          existingScores={profile?.tipi_scores}
          onboardingStep={step}
          nextUrl={`/onboarding?step=${step + 1}`}
        />
      )}
      {stepKey === "hobbies" && (
        <HobbiesForm
          userId={user.id}
          existingHobbies={profile?.hobbies}
          onboardingStep={step}
          nextUrl={`/onboarding?step=${step + 1}`}
        />
      )}
      {stepKey === "goal" && (
        <GoalForm
          userId={user.id}
          existingHabit={habit}
          onboardingStep={step}
          nextUrl={`/onboarding?step=${step + 1}`}
        />
      )}
      {stepKey === "calendar" && (
        <CalendarConnect
          userId={user.id}
          onboardingStep={step}
          nextUrl={`/onboarding?step=${step + 1}`}
        />
      )}
      {stepKey === "ai_plan" && habit && (
        <AiPlan
          userId={user.id}
          habit={habit}
          profile={profile}
          onboardingStep={step}
          nextUrl={`/onboarding?step=${step + 1}`}
        />
      )}
      {stepKey === "ai_plan" && !habit && (
        <div className="rounded-lg border p-8 text-center space-y-4">
          <p className="text-muted-foreground">
            We couldn&apos;t find your habit. Please go back and complete the
            goal step first.
          </p>
          <a
            href={`/onboarding?step=${config.steps.indexOf("goal") + 1}`}
            className="inline-block text-primary underline"
          >
            Go to Goal Step
          </a>
        </div>
      )}
      {stepKey === "sus" && <CalendarInviteBanner />}
      {stepKey === "sus" && (
        <SusForm
          userId={user.id}
          habitId={habit?.id}
          phase="onboarding"
          redirectTo="/dashboard"
          onboardingStep={config.totalSteps}
        />
      )}
    </div>
  );
}
