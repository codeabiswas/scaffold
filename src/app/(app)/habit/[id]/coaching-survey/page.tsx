"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SusForm } from "@/components/surveys/sus-form";
import type { Habit, Treatment } from "@/lib/types";

export default function CoachingSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const habitId = params.id as string;

  const [habit, setHabit] = useState<Habit | null>(null);
  const [userId, setUserId] = useState("");
  const [treatment, setTreatment] = useState<Treatment>("b");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("users")
        .select("treatment")
        .eq("id", user.id)
        .single();

      if (profile?.treatment) {
        setTreatment(profile.treatment as Treatment);
      }

      const { data: habitData } = await supabase
        .from("habits")
        .select("*")
        .eq("id", habitId)
        .eq("user_id", user.id)
        .single();

      if (!habitData || !habitData.needs_coaching_sus) {
        router.push(`/habit/${habitId}`);
        return;
      }

      // Guard against duplicate submissions
      const { data: existingSus } = await supabase
        .from("sus_scores")
        .select("id")
        .eq("habit_id", habitId)
        .eq("phase", "active-coaching")
        .limit(1);

      if (existingSus && existingSus.length > 0) {
        // Already submitted — clear the flag and redirect
        await supabase
          .from("habits")
          .update({ needs_coaching_sus: false })
          .eq("id", habitId);
        router.push(`/habit/${habitId}`);
        return;
      }

      setHabit(habitData as Habit);
      setLoading(false);
    }
    load();
  }, [habitId, router]);

  async function handleSusComplete() {
    const supabase = createClient();

    // Clear the flag and transition phase
    const newPhase = treatment === "a" ? 4 : 3;
    await supabase
      .from("habits")
      .update({ needs_coaching_sus: false, phase: newPhase })
      .eq("id", habitId);

    router.push(`/habit/${habitId}`);
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
      <SusForm
        userId={userId}
        habitId={habitId}
        phase="active-coaching"
        onComplete={handleSusComplete}
      />
    </div>
  );
}
