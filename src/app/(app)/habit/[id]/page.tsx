import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ScaffoldBuilding } from "@/components/building/scaffold-building";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Habit } from "@/lib/types";

export default async function HabitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: habit } = await supabase
    .from("habits")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!habit) notFound();

  const typedHabit = habit as Habit;

  // Get recent check-ins for the list
  const { data: recentCheckIns } = await supabase
    .from("check_ins")
    .select("*")
    .eq("habit_id", id)
    .order("scheduled_at", { ascending: false })
    .limit(5);

  // Compute current streak with freeze mechanic:
  // One miss is forgiven if streak_freeze_available was true.
  // Two consecutive misses break the streak.
  const { data: allCheckIns } = await supabase
    .from("check_ins")
    .select("performed")
    .eq("habit_id", id)
    .not("performed", "is", null)
    .order("scheduled_at", { ascending: false });

  let streak = 0;
  let freezeUsedInStreak = false;
  if (allCheckIns) {
    for (const ci of allCheckIns) {
      if (ci.performed) {
        streak++;
      } else if (!freezeUsedInStreak && typedHabit.streak_freeze_available === false) {
        // Freeze was used for this miss — it's already consumed, count it
        freezeUsedInStreak = true;
        // Don't increment streak, but don't break either
      } else {
        break;
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {typedHabit.ai_plan?.habit || typedHabit.goal}
        </h1>
        <p className="mt-1 text-muted-foreground italic">
          &ldquo;{typedHabit.goal}&rdquo;
        </p>
      </div>

      {/* Check-in action — always visible during active coaching */}
      {typedHabit.phase === 2 && (
        <Button asChild className="w-full" size="lg">
          <Link href={`/habit/${id}/check-in`}>Perform Check-In</Link>
        </Button>
      )}

      {typedHabit.phase === 3 && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Ready for off-boarding!</CardTitle>
            <CardDescription>
              It looks like this habit is becoming second nature. Time to see if
              you can stand on your own.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" size="lg">
              <Link href={`/habit/${id}/offboarding`}>
                Begin Off-boarding
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Responsive 2-column layout: stats left, building right on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Stats + Plan */}
        <div className="space-y-6 order-2 lg:order-1">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">
                    {typedHabit.building_floors}
                  </p>
                  <p className="text-sm text-muted-foreground">Check-ins</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{streak}</p>
                  <p className="text-sm text-muted-foreground">
                    Current Streak
                  </p>
                </div>
              </div>
              {/* Streak freeze indicator */}
              {!typedHabit.streak_freeze_available && freezeUsedInStreak && (
                <div className="flex items-center justify-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-950 px-3 py-1.5 text-sm text-blue-700 dark:text-blue-300">
                  <span>❄️</span>
                  <span>Streak freeze used</span>
                </div>
              )}
              {typedHabit.streak_freeze_available && (
                <div className="flex items-center justify-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-sm text-muted-foreground">
                  <span>❄️</span>
                  <span>Streak freeze available</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan */}
          {typedHabit.ai_plan && (
            <Card>
              <CardHeader>
                <CardTitle>Your Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Schedule
                  </p>
                  <p>{typedHabit.ai_plan.schedule}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Why this plan
                  </p>
                  <p>{typedHabit.ai_plan.rationale}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent check-ins */}
          {recentCheckIns && recentCheckIns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Check-ins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentCheckIns.map((ci) => (
                    <div
                      key={ci.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm">
                          {new Date(ci.scheduled_at).toLocaleDateString(
                            undefined,
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>
                      <Badge
                        variant={
                          ci.performed === null
                            ? "outline"
                            : ci.performed
                              ? "default"
                              : "destructive"
                        }
                      >
                        {ci.performed === null
                          ? "Pending"
                          : ci.performed
                            ? "Completed"
                            : "Missed"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Building visualization */}
        <div className="order-1 lg:order-2">
          <Card className="lg:sticky lg:top-24">
            <CardContent className="py-8">
              <ScaffoldBuilding
                floors={typedHabit.building_floors}
                phase={typedHabit.phase}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
