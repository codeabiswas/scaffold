"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LikertScale } from "@/components/ui/likert-scale";
import type { TipiScores } from "@/lib/types";

const TIPI_ITEMS = [
  "I see myself as someone who is extraverted and enthusiastic.",
  "I see myself as someone who is critical and quarrelsome.",
  "I see myself as someone who is dependable and self-disciplined.",
  "I see myself as someone who is anxious and easily upset.",
  "I see myself as someone who is open to new experiences and complex.",
  "I see myself as someone who is reserved and quiet.",
  "I see myself as someone who is sympathetic and warm.",
  "I see myself as someone who is disorganized and careless.",
  "I see myself as someone who is calm and emotionally stable.",
  "I see myself as someone who is conventional and uncreative.",
];

const AGREE_DISAGREE_OPTIONS = [
  { value: 1, label: "Disagree strongly" },
  { value: 2, label: "Disagree moderately" },
  { value: 3, label: "Disagree a little" },
  { value: 4, label: "Neither agree nor disagree" },
  { value: 5, label: "Agree a little" },
  { value: 6, label: "Agree moderately" },
  { value: 7, label: "Agree strongly" },
];

function computeOceanScores(responses: number[]): TipiScores {
  // TIPI scoring (Gosling et al., 2003)
  // Items are paired: (1,6), (2,7), (3,8), (4,9), (5,10)
  // Second item in each pair is reverse-scored (R = 8 - score)
  const r = responses;
  return {
    extraversion: (r[0] + (8 - r[5])) / 2,
    agreeableness: ((8 - r[1]) + r[6]) / 2,
    conscientiousness: (r[2] + (8 - r[7])) / 2,
    neuroticism: (r[3] + (8 - r[8])) / 2,
    openness: (r[4] + (8 - r[9])) / 2,
  };
}

export function TipiForm({
  userId,
  existingScores,
  onboardingStep = 1,
  nextUrl = "/onboarding?step=2",
}: {
  userId: string;
  existingScores?: TipiScores | null;
  onboardingStep?: number;
  nextUrl?: string;
}) {
  const router = useRouter();
  const [responses, setResponses] = useState<number[]>(
    existingScores
      ? // Reverse-compute from OCEAN scores is lossy, so just use defaults
        new Array(10).fill(4)
      : new Array(10).fill(4)
  );
  const [submitting, setSubmitting] = useState(false);

  function updateResponse(index: number, value: number) {
    const next = [...responses];
    next[index] = value;
    setResponses(next);
  }

  async function handleSubmit() {
    setSubmitting(true);
    const supabase = createClient();
    const scores = computeOceanScores(responses);

    await supabase
      .from("users")
      .update({
        tipi_scores: scores,
        onboarding_step: onboardingStep,
      })
      .eq("id", userId);

    router.push(nextUrl);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personality Profile</CardTitle>
        <CardDescription>
          Rate how well each statement describes you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {TIPI_ITEMS.map((item, i) => (
          <div key={i} className="space-y-3">
            <Label className="text-base font-medium">
              {i + 1}. {item}
            </Label>
            <LikertScale
              options={AGREE_DISAGREE_OPTIONS}
              value={responses[i]}
              onValueChange={(val) => updateResponse(i, val)}
            />
          </div>
        ))}
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
          size="lg"
        >
          {submitting ? "Saving..." : "Continue"}
        </Button>
      </CardContent>
    </Card>
  );
}
