import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TipiForm } from "@/components/onboarding/tipi-form";
import { HobbiesForm } from "@/components/onboarding/hobbies-form";
import { GoalForm } from "@/components/onboarding/goal-form";
import { CalendarConnect } from "@/components/onboarding/calendar-connect";
import { AiPlan } from "@/components/onboarding/ai-plan";
import { SusForm } from "@/components/surveys/sus-form";
import { Progress } from "@/components/ui/progress";

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

  const step = parseInt(stepParam || "1", 10);

  // If onboarding already complete, go to dashboard
  if (profile && profile.onboarding_step >= 6) {
    redirect("/dashboard");
  }

  // Get habit if one exists (for steps 4+)
  const { data: habits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const habit = habits?.[0];

  const STEP_TITLES = [
    "",
    "Personality Profile",
    "Your Routines",
    "Define Your Goal",
    "Your Availability",
    "Your Plan",
    "Quick Survey",
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Onboarding</h1>
        <p className="text-muted-foreground">Learning about the real you</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Step {step} of 6: {STEP_TITLES[step]}
          </span>
          <span>{Math.round((step / 6) * 100)}%</span>
        </div>
        <Progress value={(step / 6) * 100} />
      </div>

      {step === 1 && (
        <TipiForm
          userId={user.id}
          existingScores={profile?.tipi_scores}
        />
      )}
      {step === 2 && (
        <HobbiesForm
          userId={user.id}
          existingHobbies={profile?.hobbies}
        />
      )}
      {step === 3 && <GoalForm userId={user.id} existingHabit={habit} />}
      {step === 4 && <CalendarConnect userId={user.id} />}
      {step === 5 && habit && (
        <AiPlan userId={user.id} habit={habit} profile={profile} />
      )}
      {step === 5 && !habit && (
        <div className="rounded-lg border p-8 text-center space-y-4">
          <p className="text-muted-foreground">
            We couldn&apos;t find your habit. Please go back and complete the
            goal step first.
          </p>
          <a
            href="/onboarding?step=3"
            className="inline-block text-primary underline"
          >
            Go to Step 3
          </a>
        </div>
      )}
      {step === 6 && (
        <SusForm
          userId={user.id}
          habitId={habit?.id}
          phase="onboarding"
          redirectTo="/dashboard"
          onboardingStep={6}
        />
      )}
    </div>
  );
}
