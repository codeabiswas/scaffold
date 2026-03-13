import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateHabitIcs, generateFinalCheckInIcs } from "@/lib/ics";
import { sendCalendarInviteEmail } from "@/lib/email";
import type { HabitSchedule } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { habitId, type = "habit" } = await request.json();
  if (!habitId) {
    return NextResponse.json(
      { error: "habitId is required" },
      { status: 400 }
    );
  }

  // Fetch habit with plan and schedule
  const { data: habit } = await supabase
    .from("habits")
    .select("id, goal, ai_plan, schedule, user_id")
    .eq("id", habitId)
    .eq("user_id", user.id)
    .single();

  if (!habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  const aiPlan = habit.ai_plan as { habit: string; rationale: string } | null;
  const schedule = habit.schedule as HabitSchedule | null;

  if (!aiPlan || !schedule) {
    return NextResponse.json(
      { error: "Habit is missing plan or schedule data" },
      { status: 400 }
    );
  }

  // Coerce time to string if it's not already (e.g., if stored as a number or object)
  if (schedule.time && typeof schedule.time !== "string") {
    schedule.time = String(schedule.time);
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  let icsContent: string;

  if (type === "final-checkin") {
    icsContent = generateFinalCheckInIcs({
      habitId: habit.id,
      habitDescription: aiPlan.habit,
      scheduleTime: schedule.time,
      appUrl,
    });
  } else {
    if (!schedule.days?.length) {
      return NextResponse.json(
        { error: "Habit is missing schedule days" },
        { status: 400 }
      );
    }
    icsContent = generateHabitIcs({
      habitId: habit.id,
      habitDescription: aiPlan.habit,
      habitRationale: aiPlan.rationale,
      schedule,
      appUrl,
    });
  }

  try {
    await sendCalendarInviteEmail({
      to: user.email!,
      habitGoal: habit.goal,
      icsContent,
      type: type as "habit" | "final-checkin",
    });
  } catch (e) {
    console.error("Failed to send calendar invite email:", e);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
