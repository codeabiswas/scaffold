"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { Habit, User } from "@/lib/types";

interface AiPlanData {
  habit: string;
  schedule: string;
  rationale: string;
  schedule_data?: {
    days: string[];
    time: string;
    duration_minutes: number;
  };
}

export function AiPlan({
  userId,
  habit,
  profile,
}: {
  userId: string;
  habit: Habit;
  profile: User | null;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<AiPlanData | null>(
    habit.ai_plan as AiPlanData | null
  );
  const [loading, setLoading] = useState(!habit.ai_plan);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function generatePlan(regenerateFeedback?: string) {
    setLoading(true);
    setShowFeedback(false);
    try {
      const res = await fetch("/api/ai/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habitId: habit.id,
          feedback: regenerateFeedback,
          previousPlan: plan ? JSON.stringify(plan) : undefined,
        }),
      });
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
      }
    } catch (e) {
      console.error("Failed to generate plan:", e);
    } finally {
      setLoading(false);
    }
  }

  // Auto-generate on mount if no plan
  const hasTriggered = useRef(false);
  useEffect(() => {
    if (!habit.ai_plan && !hasTriggered.current) {
      hasTriggered.current = true;
      generatePlan();
    }
  }, [habit.ai_plan]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAccept() {
    if (!plan) return;
    setSubmitting(true);
    const supabase = createClient();

    // Save plan and schedule to habit
    await supabase
      .from("habits")
      .update({
        ai_plan: plan,
        schedule: plan.schedule_data || {},
        phase: 2, // Move to active coaching
      })
      .eq("id", habit.id);

    await supabase
      .from("users")
      .update({ onboarding_step: 5 })
      .eq("id", userId);

    router.push("/onboarding?step=6");
  }

  async function handleDislike() {
    setShowFeedback(true);
  }

  async function handleRegenerate() {
    await generatePlan(feedback);
    setFeedback("");
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-muted-foreground">Generating your personalized plan...</p>
        </CardContent>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground mb-4">
            Something went wrong generating your plan.
          </p>
          <Button onClick={() => generatePlan()}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Personalized Plan</CardTitle>
        <CardDescription>
          Based on your personality, routines, and goals, here&apos;s what we
          recommend.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">The Habit</h3>
            <p className="text-muted-foreground">{plan.habit}</p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-lg">The Schedule</h3>
            <p className="text-muted-foreground">{plan.schedule}</p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-lg">Why This Plan?</h3>
            <p className="text-muted-foreground">{plan.rationale}</p>
          </div>
        </div>

        {showFeedback ? (
          <div className="space-y-4 rounded-lg border p-4">
            <p className="text-sm italic text-muted-foreground">
              Growth requires some discomfort — we&apos;ll only regenerate if
              this plan really doesn&apos;t work for you. What specifically
              isn&apos;t working?
            </p>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what isn't working..."
              rows={3}
            />
            <Button
              onClick={handleRegenerate}
              disabled={!feedback.trim()}
              className="w-full"
            >
              Regenerate Plan
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={handleAccept}
              disabled={submitting}
              className="col-span-1"
            >
              ❤️ Love it
            </Button>
            <Button
              onClick={handleAccept}
              disabled={submitting}
              variant="secondary"
              className="col-span-1"
            >
              👍 Like it
            </Button>
            <Button
              onClick={handleDislike}
              variant="outline"
              className="col-span-1"
            >
              👎 Dislike it
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
