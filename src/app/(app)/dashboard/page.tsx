import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Habit, Treatment } from "@/lib/types";
import { isOnboardingComplete } from "@/lib/treatment-config";

export default async function DashboardPage() {
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

  const { data: habits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // If onboarding not complete and no active habits exist, redirect to onboarding
  const hasActiveHabits = (habits || []).some(
    (h: Habit) => h.phase >= 2
  );
  const treatment: Treatment = (profile?.treatment as Treatment) || "b";
  if (!hasActiveHabits && (!profile || !isOnboardingComplete(treatment, profile.onboarding_step))) {
    redirect(`/onboarding?step=${(profile?.onboarding_step || 0) + 1}`);
  }

  const typedHabits = (habits || []) as Habit[];
  const canCreateHabit = typedHabits.length < 1; // Beta: 1 habit max

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Habits</h1>
          <p className="text-muted-foreground">
            Track your progress and check in on your habits.
          </p>
        </div>
        {canCreateHabit ? (
          <Button asChild>
            <Link href="/onboarding?step=3">New Habit</Link>
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button disabled>New Habit</Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Only 1 habit is allowed during Beta testing</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {typedHabits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-lg text-muted-foreground mb-4">
              No habits yet. Let&apos;s build something together.
            </p>
            <Button asChild>
              <Link href="/onboarding?step=3">Create Your First Habit</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {typedHabits.map((habit) => (
            <Link key={habit.id} href={`/habit/${habit.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">
                    {habit.ai_plan?.habit || habit.goal}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Check-ins completed</span>
                    <span className="font-medium">
                      {habit.building_floors}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
