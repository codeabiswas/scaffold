"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const SRBAI_ITEMS = [
  "do automatically",
  "do without having to consciously remember",
  "do without thinking",
  "start doing before I realize I'm doing it",
];

const SCALE_LABELS: Record<number, string> = {
  1: "Disagree strongly",
  2: "Disagree moderately",
  3: "Disagree a little",
  4: "Neither agree nor disagree",
  5: "Agree a little",
  6: "Agree moderately",
  7: "Agree strongly",
};

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
        <CardTitle>&quot;{habitDescription}&quot; is something I…</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {SRBAI_ITEMS.map((item, i) => (
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
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </CardContent>
    </Card>
  );
}
