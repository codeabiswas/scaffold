"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function HobbiesForm({
  userId,
  existingHobbies,
}: {
  userId: string;
  existingHobbies?: string | null;
}) {
  const router = useRouter();
  const [hobbies, setHobbies] = useState(existingHobbies || "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    const supabase = createClient();

    await supabase
      .from("users")
      .update({
        hobbies,
        onboarding_step: 2,
      })
      .eq("id", userId);

    router.push("/onboarding?step=3");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>What are your hobbies?</CardTitle>
        <CardDescription>
          Tell us about your existing routines and hobbies. How often do you do
          them? This helps us anchor new habits to things you already enjoy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="e.g., I practice piano 3x/week on weeknights, go for a run on Saturday mornings, read before bed most nights..."
          value={hobbies}
          onChange={(e) => setHobbies(e.target.value)}
          rows={6}
        />
        <Button
          onClick={handleSubmit}
          disabled={submitting || !hobbies.trim()}
          className="w-full"
          size="lg"
        >
          {submitting ? "Saving..." : "Continue"}
        </Button>
      </CardContent>
    </Card>
  );
}
