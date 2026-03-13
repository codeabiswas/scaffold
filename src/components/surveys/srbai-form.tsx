"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LikertScale } from "@/components/ui/likert-scale";

const SRBAI_SUFFIXES = [
  "is something I do automatically.",
  "is something I do without having to consciously remember.",
  "is something I do without thinking.",
  "is something I start doing before I realize I'm doing it.",
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

export function SrbaiForm({
  habitDescription,
  onSubmit,
  submitting,
}: {
  habitDescription: string;
  onSubmit: (score: number) => void;
  submitting: boolean;
}) {
  const [responses, setResponses] = useState<number[]>([4, 4, 4, 4]);

  function updateResponse(index: number, value: number) {
    const next = [...responses];
    next[index] = value;
    setResponses(next);
  }

  function handleSubmit() {
    const score = responses.reduce((sum, r) => sum + r, 0) / responses.length;
    onSubmit(score);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Habit Automaticity Check</CardTitle>
        <CardDescription>
          Rate how much you agree with each statement about your habit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {SRBAI_SUFFIXES.map((suffix, i) => (
          <div key={i} className="space-y-3">
            <Label className="text-base font-medium">
              {i + 1}. &quot;{habitDescription}&quot; {suffix}
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
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </CardContent>
    </Card>
  );
}
