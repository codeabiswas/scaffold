"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { TipiScores } from "@/lib/types";

const TIPI_ITEMS = [
  "Extraverted, enthusiastic",
  "Critical, quarrelsome",
  "Dependable, self-disciplined",
  "Anxious, easily upset",
  "Open to new experiences, complex",
  "Reserved, quiet",
  "Sympathetic, warm",
  "Disorganized, careless",
  "Calm, emotionally stable",
  "Conventional, uncreative",
];

const SCALE_LABELS = [
  "",
  "Disagree strongly",
  "Disagree moderately",
  "Disagree a little",
  "Neither agree nor disagree",
  "Agree a little",
  "Agree moderately",
  "Agree strongly",
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
}: {
  userId: string;
  existingScores?: TipiScores | null;
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
        onboarding_step: 1,
      })
      .eq("id", userId);

    router.push("/onboarding?step=2");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>I see myself as someone who is...</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {TIPI_ITEMS.map((item, i) => (
          <div key={i} className="space-y-3">
            <Label className="text-base font-medium">
              {i + 1}. {item}
            </Label>
            <div className="px-2">
              <Slider
                min={1}
                max={7}
                step={1}
                value={[responses[i]]}
                onValueChange={([val]) => updateResponse(i, val)}
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>Disagree strongly</span>
                <span>Neither agree nor disagree</span>
                <span>Agree strongly</span>
              </div>
            </div>
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
