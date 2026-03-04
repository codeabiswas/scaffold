"use client";

import { useState, useEffect, useCallback } from "react";
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
import { RevealAnimation } from "@/components/building/reveal-animation";
import { ScaffoldBuilding } from "@/components/building/scaffold-building";
import { SusForm } from "@/components/surveys/sus-form";
import type { Habit, User } from "@/lib/types";

type OffboardingStep = "reveal" | "admire" | "sus" | "independence" | "final_message" | "complete";

export default function OffboardingPage() {
  const params = useParams();
  const router = useRouter();
  const habitId = params.id as string;

  const [habit, setHabit] = useState<Habit | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState<OffboardingStep>("reveal");
  const [finalMessage, setFinalMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      const { data: habitData } = await supabase
        .from("habits")
        .select("*")
        .eq("id", habitId)
        .single();

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      setHabit(habitData as Habit);
      setUser(profile as User);
      setLoading(false);
    }
    load();
  }, [habitId, router]);

  const handleRevealComplete = useCallback(() => {
    setStep("admire");
  }, []);

  async function handleIndependenceYes() {
    const supabase = createClient();
    await supabase
      .from("habits")
      .update({ phase: 4 })
      .eq("id", habitId);
    setStep("complete");
  }

  async function handleIndependenceNotYet() {
    // Get AI final coaching message
    try {
      const res = await fetch("/api/ai/offboarding-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId }),
      });
      const data = await res.json();
      setFinalMessage(data.message || "You've built something incredible. Trust in what you've created.");
    } catch {
      setFinalMessage("You've built something incredible. Trust in what you've created.");
    }
    setStep("final_message");
  }

  async function handleFinalComplete() {
    const supabase = createClient();
    await supabase
      .from("habits")
      .update({ phase: 4 })
      .eq("id", habitId);

    // Schedule a 1-week check-in
    const oneWeekLater = new Date();
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    await supabase.from("check_ins").insert({
      habit_id: habitId,
      scheduled_at: oneWeekLater.toISOString(),
    });

    setStep("complete");
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
      <h1 className="text-2xl font-bold">Off-boarding</h1>

      {step === "reveal" && (
        <Card>
          <CardContent className="py-8">
            <RevealAnimation
              floors={habit.building_floors}
              onComplete={handleRevealComplete}
            />
          </CardContent>
        </Card>
      )}

      {step === "admire" && (
        <div className="space-y-6">
          <Card>
            <CardContent className="py-8">
              <ScaffoldBuilding
                floors={habit.building_floors}
                phase={4}
                showScaffolding={false}
              />
              <p className="text-center text-lg font-semibold mt-4">
                Your building stands on its own.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Look at what you&apos;ve built</CardTitle>
              <CardDescription>
                Every floor represents a day you chose to show up. The
                scaffolding is gone — this is all you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setStep("sus")}
                className="w-full"
                size="lg"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "sus" && (
        <SusForm
          userId={user?.id || ""}
          habitId={habitId}
          phase="offboarding"
          onComplete={() => setStep("independence")}
        />
      )}

      {step === "independence" && (
        <Card>
          <CardHeader>
            <CardTitle>One last question</CardTitle>
            <CardDescription>
              Do you feel like you can keep this habit going without the app?
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button
              onClick={handleIndependenceYes}
              className="flex-1"
              size="lg"
            >
              Yes, I&apos;m ready
            </Button>
            <Button
              onClick={handleIndependenceNotYet}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              Not yet
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "final_message" && (
        <Card>
          <CardHeader>
            <CardTitle>Your Coach&apos;s Final Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg italic">&quot;{finalMessage}&quot;</p>
            <p className="text-sm text-muted-foreground">
              We&apos;ve scheduled one final check-in in a week. After that,
              you&apos;re fully on your own.
            </p>
            <Button
              onClick={handleFinalComplete}
              className="w-full"
              size="lg"
            >
              I&apos;m Ready
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "complete" && (
        <Card>
          <CardHeader>
            <CardTitle>Congratulations!</CardTitle>
            <CardDescription>
              Your building stands on its own. The scaffolding has been removed.
              You&apos;ve built a real habit.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
    </div>
  );
}
