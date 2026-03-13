"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SrbaiForm } from "@/components/surveys/srbai-form";
import { SusForm } from "@/components/surveys/sus-form";
import { ScaffoldBuilding } from "@/components/building/scaffold-building";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { Habit, Treatment } from "@/lib/types";

type MissedReason = "schedule_conflict" | "no_motivation" | "forgot";
type CheckInStep =
  | "performed"
  | "srbai"
  | "missed_reason"
  | "ai_response"
  | "success"
  | "coaching_sus"
  | "phase3_trigger"
  | "simple_complete"
  | "offboarding_complete";

const MISSED_OPTIONS: { value: MissedReason; label: string }[] = [
  { value: "schedule_conflict", label: "Schedule conflict" },
  { value: "no_motivation", label: "Didn't feel like it" },
  { value: "forgot", label: "I forgot" },
];

// SRBAI decay tiers
function getDecay(consecutiveMisses: number): number {
  if (consecutiveMisses >= 3) return 0.75;
  if (consecutiveMisses === 2) return 0.5;
  return 0.25;
}

export default function CheckInPage() {
  const params = useParams();
  const router = useRouter();
  const habitId = params.id as string;

  const [habit, setHabit] = useState<Habit | null>(null);
  const [treatment, setTreatment] = useState<Treatment>("b");
  const [userId, setUserId] = useState("");
  const [step, setStep] = useState<CheckInStep>("performed");
  const [missedReason, setMissedReason] = useState<MissedReason | "">("");
  const [aiResponse, setAiResponse] = useState("");
  const [coachFarewell, setCoachFarewell] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newFloors, setNewFloors] = useState(0);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("habits")
        .select("*")
        .eq("id", habitId)
        .single();
      if (data) {
        setHabit(data as Habit);
        setNewFloors(data.building_floors);
      }

      // Fetch treatment from user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("users")
          .select("treatment")
          .eq("id", user.id)
          .single();
        if (profile?.treatment) {
          setTreatment(profile.treatment as Treatment);
        }
      }

      setLoading(false);
    }
    load();
  }, [habitId]);

  async function handlePerformed(performed: boolean) {
    if (performed) {
      setStep("srbai");
    } else {
      setStep("missed_reason");
    }
  }

  /**
   * If this is the final offboarding check-in, fetch the coach farewell,
   * save it, and mark the habit complete.
   * Returns true if offboarding was triggered, false otherwise.
   */
  async function handleOffboardingComplete(): Promise<boolean> {
    if (!habit?.needs_final_checkin) return false;

    const supabase = createClient();

    // Fetch AI coach farewell message
    let message =
      "You've built something incredible. Trust in what you've created.";
    try {
      const res = await fetch("/api/ai/offboarding-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId }),
      });
      const data = await res.json();
      if (data.message) message = data.message;
    } catch {
      // Use fallback message
    }

    // Save coach message, clear flag, mark phase 4
    await supabase
      .from("habits")
      .update({
        phase: 4,
        needs_final_checkin: false,
        final_coach_message: message,
      })
      .eq("id", habitId);

    setCoachFarewell(message);
    setStep("offboarding_complete");
    return true;
  }

  async function handleSrbaiSubmit(score: number) {
    if (!habit) return;
    setSubmitting(true);
    const supabase = createClient();

    // Create check-in record
    const { data: checkIn } = await supabase
      .from("check_ins")
      .insert({
        habit_id: habitId,
        scheduled_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        performed: true,
      })
      .select()
      .single();

    // Store SRBAI score
    if (checkIn) {
      await supabase.from("srbai_scores").insert({
        habit_id: habitId,
        check_in_id: checkIn.id,
        score,
        items: null,
        is_decay: false,
      });
    }

    // Update habit
    const updatedFloors = habit.building_floors + 1;

    const updates: Record<string, unknown> = {
      current_srbai: score,
      building_floors: updatedFloors,
      consecutive_misses: 0, // Reset on success
    };

    // Check if streak freeze should be re-enabled:
    // If freeze is currently unavailable, check if the last 7 completed
    // check-ins are all successful — if so, re-enable the freeze.
    if (!habit.streak_freeze_available) {
      const { data: lastSeven } = await supabase
        .from("check_ins")
        .select("performed")
        .eq("habit_id", habitId)
        .not("performed", "is", null)
        .order("scheduled_at", { ascending: false })
        .limit(7);

      // +1 because this current successful check-in isn't in DB yet
      const allSuccessful =
        lastSeven &&
        lastSeven.length >= 6 &&
        lastSeven.every((ci) => ci.performed === true);

      if (allSuccessful) {
        updates.streak_freeze_available = true;
      }
    }

    // If this is the final offboarding check-in, skip the normal flow
    if (habit.needs_final_checkin) {
      await supabase.from("habits").update(updates).eq("id", habitId);
      setNewFloors(updatedFloors);
      await handleOffboardingComplete();
      setSubmitting(false);
      return;
    }

    // Check if habit has become automatic:
    // Requires 3 consecutive (non-decay) SRBAI scores >= 6.0
    const { data: recentScores } = await supabase
      .from("srbai_scores")
      .select("score")
      .eq("habit_id", habitId)
      .eq("is_decay", false)
      .order("recorded_at", { ascending: false })
      .limit(3);

    const hitThreshold =
      recentScores &&
      recentScores.length >= 3 &&
      recentScores.every((s) => Number(s.score) >= 6.0);

    if (hitThreshold) {
      if (treatment === "a") {
        // Treatment A: SUS → simple completion, skip offboarding
        updates.phase = 4;
        await supabase.from("habits").update(updates).eq("id", habitId);
        setNewFloors(updatedFloors);
        setStep("coaching_sus");
      } else {
        // Treatment B: SUS → offboarding flow
        updates.phase = 3;
        await supabase.from("habits").update(updates).eq("id", habitId);
        setNewFloors(updatedFloors);
        setStep("coaching_sus");
      }
    } else {
      await supabase.from("habits").update(updates).eq("id", habitId);
      setNewFloors(updatedFloors);
      setStep("success");
    }

    setSubmitting(false);
  }

  async function handleMissedSubmit() {
    if (!habit || !missedReason) return;
    setSubmitting(true);
    const supabase = createClient();

    const newConsecutiveMisses = habit.consecutive_misses + 1;
    const decay = getDecay(newConsecutiveMisses);
    const newSrbai = Math.max(1.0, Number(habit.current_srbai) - decay);

    // Get AI coaching response
    try {
      const res = await fetch("/api/ai/coaching-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, missedReason }),
      });
      const data = await res.json();
      setAiResponse(data.message || "Keep going — every day is a new chance.");
    } catch {
      setAiResponse("Keep going — every day is a new chance.");
    }

    // Create check-in record
    const { data: checkIn } = await supabase
      .from("check_ins")
      .insert({
        habit_id: habitId,
        scheduled_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        performed: false,
        missed_reason: missedReason,
        ai_response: aiResponse,
      })
      .select()
      .single();

    // Store decay SRBAI
    if (checkIn) {
      await supabase.from("srbai_scores").insert({
        habit_id: habitId,
        check_in_id: checkIn.id,
        score: newSrbai,
        is_decay: true,
      });
    }

    // Streak freeze logic:
    // If freeze is available and this is the first consecutive miss, use it
    // If freeze is already gone and they miss again, streak fully breaks
    const habitUpdates: Record<string, unknown> = {
      current_srbai: newSrbai,
      consecutive_misses: newConsecutiveMisses,
    };

    if (habit.streak_freeze_available && newConsecutiveMisses === 1) {
      // Use the freeze — streak survives this one miss
      habitUpdates.streak_freeze_available = false;
    }

    // Update habit
    await supabase
      .from("habits")
      .update(habitUpdates)
      .eq("id", habitId);

    // If this is the final offboarding check-in, trigger offboarding completion
    if (habit.needs_final_checkin) {
      await handleOffboardingComplete();
      setSubmitting(false);
      return;
    }

    setStep("ai_response");
    setSubmitting(false);
  }

  if (loading || !habit) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Check In</h1>
      <p className="text-muted-foreground">{habit.ai_plan?.habit || habit.goal}</p>

      {step === "performed" && (
        <Card>
          <CardHeader>
            <CardTitle>Did you perform your habit today?</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button
              onClick={() => handlePerformed(true)}
              className="flex-1"
              size="lg"
            >
              Yes, I did it!
            </Button>
            <Button
              onClick={() => handlePerformed(false)}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              No, not today
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "srbai" && (
        <SrbaiForm
          habitDescription={habit.ai_plan?.habit || habit.goal}
          onSubmit={handleSrbaiSubmit}
          submitting={submitting}
        />
      )}

      {step === "missed_reason" && (
        <Card>
          <CardHeader>
            <CardTitle>What got in the way?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={missedReason}
              onValueChange={(val) => setMissedReason(val as MissedReason)}
            >
              {MISSED_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={opt.value} />
                  <Label htmlFor={opt.value}>{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
            <Button
              onClick={handleMissedSubmit}
              disabled={!missedReason || submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? "Processing..." : "Submit"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "ai_response" && (
        <Card>
          <CardHeader>
            <CardTitle>Your Coach Says</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg italic">&quot;{aiResponse}&quot;</p>
            <Button
              onClick={() => router.push(`/habit/${habitId}`)}
              className="w-full"
              size="lg"
            >
              Back to Habit
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "success" && (
        <Card>
          <CardHeader>
            <CardTitle>Great job!</CardTitle>
            <CardDescription>
              Your building just got a new floor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScaffoldBuilding floors={newFloors} phase={2} />
            <Button
              onClick={() => router.push(`/habit/${habitId}`)}
              className="w-full"
              size="lg"
            >
              Back to Habit
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "phase3_trigger" && (
        <Card>
          <CardHeader>
            <CardTitle>Incredible!</CardTitle>
            <CardDescription>
              Your habit is becoming second nature — it&apos;s time to see if you
              can stand on your own. Let&apos;s take off the scaffolding!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push(`/habit/${habitId}/offboarding`)}
              className="w-full"
              size="lg"
            >
              Begin Off-boarding
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "coaching_sus" && (
        <SusForm
          userId={userId}
          habitId={habitId}
          phase="active-coaching"
          onComplete={() =>
            setStep(treatment === "a" ? "simple_complete" : "phase3_trigger")
          }
        />
      )}

      {step === "simple_complete" && (
        <Card>
          <CardHeader>
            <CardTitle>Congratulations!</CardTitle>
            <CardDescription>
              You&apos;ve built a real habit. Your consistency has paid off —
              keep it going!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScaffoldBuilding floors={newFloors} phase={4} showScaffolding={false} />
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full"
              size="lg"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "offboarding_complete" && (
        <Card>
          <CardHeader>
            <CardTitle>Your Coach&apos;s Final Words</CardTitle>
            <CardDescription>
              Congratulations — you&apos;ve completed your final check-in. The
              scaffolding is gone, and your building stands on its own.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg italic">&quot;{coachFarewell}&quot;</p>
            <Button
              onClick={() => router.push(`/habit/${habitId}`)}
              className="w-full"
              size="lg"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
