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
import { Label } from "@/components/ui/label";
import { LikertScale } from "@/components/ui/likert-scale";

const SUS_QUESTIONS = [
  "I think I would like to use this system frequently.",
  "I found the system unnecessarily complex.",
  "I thought the system was easy to use.",
  "I think that I would need the support of a technical person to be able to use this system.",
  "I found the various functions in this system were well integrated.",
  "I thought there was too much inconsistency in this system.",
  "I would imagine that most people would learn to use this system very quickly.",
  "I found the system very cumbersome to use.",
  "I felt very confident using the system.",
  "I needed to learn a lot of things before I could get going with this system.",
];

const SUS_OPTIONS = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
];

function computeSusScore(responses: number[]): number {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      // Odd-numbered items (0-indexed even): response - 1
      sum += responses[i] - 1;
    } else {
      // Even-numbered items (0-indexed odd): 5 - response
      sum += 5 - responses[i];
    }
  }
  return sum * 2.5;
}

export function SusForm({
  userId,
  habitId,
  phase,
  redirectTo,
  onboardingStep,
  onComplete,
}: {
  userId: string;
  habitId?: string;
  phase: "onboarding" | "active-coaching" | "offboarding";
  redirectTo?: string;
  onboardingStep?: number;
  onComplete?: () => void;
}) {
  const router = useRouter();
  const [responses, setResponses] = useState<number[]>(new Array(10).fill(3));
  const [submitting, setSubmitting] = useState(false);

  function setResponse(index: number, value: number) {
    const next = [...responses];
    next[index] = value;
    setResponses(next);
  }

  async function handleSubmit() {
    setSubmitting(true);
    const supabase = createClient();
    const score = computeSusScore(responses);

    const responseMap: Record<string, number> = {};
    responses.forEach((r, i) => {
      responseMap[`q${i + 1}`] = r;
    });

    await supabase.from("sus_scores").insert({
      user_id: userId,
      habit_id: habitId || null,
      phase,
      responses: responseMap,
      score,
    });

    if (onboardingStep) {
      await supabase
        .from("users")
        .update({ onboarding_step: onboardingStep })
        .eq("id", userId);
    }

    if (onComplete) {
      onComplete();
    } else if (redirectTo) {
      router.push(redirectTo);
    }
  }

  const isOnboarding = phase === "onboarding";
  const isActiveCoaching = phase === "active-coaching";

  const headerConfig = isOnboarding
    ? {
        title: "Onboarding Complete!",
        subtitle:
          "Your personalized plan is ready. Before you begin, we'd love a quick bit of feedback to help us improve Scaffold for future users.",
        cardDescription:
          "This survey helps the development team understand how intuitive the onboarding experience felt. Your honest responses are invaluable.",
      }
    : isActiveCoaching
      ? {
          title: "Active Coaching Complete!",
          subtitle:
            "Your habit is becoming second nature. Before we move on, we'd love a quick bit of feedback on how the coaching experience felt.",
          cardDescription:
            "This survey helps the development team understand how useful the active coaching phase was. Your honest responses are invaluable.",
        }
      : null;

  return (
    <div className="space-y-6">
      {headerConfig && (
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">{headerConfig.title}</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            {headerConfig.subtitle}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usability Survey</CardTitle>
          <CardDescription>
            {headerConfig
              ? headerConfig.cardDescription
              : "Please rate your experience with the system so far."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {SUS_QUESTIONS.map((question, i) => (
            <div key={i} className="space-y-3">
              <Label className="text-base">
                {i + 1}. {question}
              </Label>
              <LikertScale
                options={SUS_OPTIONS}
                value={responses[i]}
                onValueChange={(val) => setResponse(i, val)}
              />
            </div>
          ))}
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
