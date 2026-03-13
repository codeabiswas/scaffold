"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Habit } from "@/lib/types";

type PriorOutcome = "progress" | "quit" | "never";

const FOLLOW_UP_PROMPTS: Record<PriorOutcome, string> = {
  progress: "What worked for you back then?",
  quit: "What got in the way last time?",
  never: "What do you think has stopped you from starting in the past?",
};

export function GoalForm({
  userId,
  existingHabit,
  onboardingStep = 3,
  nextUrl = "/onboarding?step=4",
}: {
  userId: string;
  existingHabit?: Habit | null;
  onboardingStep?: number;
  nextUrl?: string;
}) {
  const router = useRouter();
  const [goal, setGoal] = useState(existingHabit?.goal || "");
  const [targetDate, setTargetDate] = useState(
    existingHabit?.target_date || ""
  );
  const [successCondition, setSuccessCondition] = useState(
    existingHabit?.success_condition || ""
  );
  const [triedBefore, setTriedBefore] = useState<"yes" | "no" | "">("");
  const [priorOutcome, setPriorOutcome] = useState<PriorOutcome | "">("");
  const [priorDetail, setPriorDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    const supabase = createClient();

    const priorExperience = triedBefore
      ? {
          tried: triedBefore === "yes",
          outcome:
            triedBefore === "no"
              ? "never"
              : (priorOutcome as PriorOutcome),
          detail: priorDetail,
        }
      : null;

    if (existingHabit) {
      const { error } = await supabase
        .from("habits")
        .update({
          goal,
          target_date: targetDate || null,
          success_condition: successCondition || null,
          prior_experience: priorExperience,
        })
        .eq("id", existingHabit.id);
      if (error) {
        console.error("Failed to update habit:", error);
        setSubmitting(false);
        return;
      }
    } else {
      const { error } = await supabase.from("habits").insert({
        user_id: userId,
        goal,
        target_date: targetDate || null,
        success_condition: successCondition || null,
        prior_experience: priorExperience,
        schedule: {},
        phase: 1,
      });
      if (error) {
        console.error("Failed to create habit:", error);
        setSubmitting(false);
        return;
      }
    }

    const { error: profileError } = await supabase
      .from("users")
      .update({ onboarding_step: onboardingStep })
      .eq("id", userId);
    if (profileError) {
      console.error("Failed to update profile:", profileError);
    }

    router.push(nextUrl);
  }

  // Validate all required fields including follow-up text boxes:
  // - "No" path: the "What stopped you?" textarea must be filled
  // - "Yes" path: a sub-option must be selected AND its textarea must be filled
  const isValid = (() => {
    if (!goal.trim() || !triedBefore) return false;
    if (triedBefore === "no") return priorDetail.trim().length > 0;
    if (triedBefore === "yes") {
      if (!priorOutcome) return false;
      return priorDetail.trim().length > 0;
    }
    return false;
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Who do you want to become?</CardTitle>
        <CardDescription>
          Describe the person you want to grow into. Be specific — it helps us
          build the right plan for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Describe the person you want to become</Label>
          <Textarea
            placeholder='e.g., "A runner who has completed a 5K" or "A pianist who can play Kiss the Rain by Yiruma"'
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>By when?</Label>
          <Input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min={(() => {
              const d = new Date();
              d.setDate(d.getDate() + 14);
              return d.toISOString().split("T")[0];
            })()}
          />
          <p className="text-xs text-muted-foreground">
            Must be at least 2 weeks from today — habits take time to build.
          </p>
        </div>

        <div className="space-y-2">
          <Label>How will you know you&apos;ve made it?</Label>
          <Textarea
            placeholder="Describe a concrete success condition..."
            value={successCondition}
            onChange={(e) => setSuccessCondition(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-4">
          <Label className="text-base font-medium">
            Have you worked toward this before, even informally?
          </Label>
          <RadioGroup
            value={triedBefore}
            onValueChange={(val) => {
              setTriedBefore(val as "yes" | "no");
              if (val === "no") {
                setPriorOutcome("never");
              } else {
                setPriorOutcome("");
              }
            }}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="tried-yes" />
              <Label htmlFor="tried-yes">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="tried-no" />
              <Label htmlFor="tried-no">No</Label>
            </div>
          </RadioGroup>

          {triedBefore === "yes" && (
            <RadioGroup
              value={priorOutcome}
              onValueChange={(val) =>
                setPriorOutcome(val as PriorOutcome)
              }
              className="ml-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="progress" id="outcome-progress" />
                <Label htmlFor="outcome-progress">
                  Yes, and I made progress
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="quit" id="outcome-quit" />
                <Label htmlFor="outcome-quit">
                  Yes, but I didn&apos;t stick with it
                </Label>
              </div>
            </RadioGroup>
          )}

          {(priorOutcome || triedBefore === "no") && (
            <div className="space-y-2">
              <Label>
                {FOLLOW_UP_PROMPTS[
                  triedBefore === "no"
                    ? "never"
                    : (priorOutcome as PriorOutcome)
                ]}
              </Label>
              <Textarea
                value={priorDetail}
                onChange={(e) => setPriorDetail(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting || !isValid}
          className="w-full"
          size="lg"
        >
          {submitting ? "Saving..." : "Continue"}
        </Button>
      </CardContent>
    </Card>
  );
}
