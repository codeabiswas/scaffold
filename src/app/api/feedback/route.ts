import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendFeedbackEmail } from "@/lib/email";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { habitId, page, message, phase } = body;

  // Store feedback
  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    habit_id: habitId || null,
    page,
    message,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get habit goal for email
  let habitGoal: string | undefined;
  if (habitId) {
    const { data: habit } = await supabase
      .from("habits")
      .select("goal")
      .eq("id", habitId)
      .single();
    habitGoal = habit?.goal;
  }

  // Send email notification
  try {
    await sendFeedbackEmail({
      userEmail: user.email!,
      page,
      pageUrl: `${process.env.NEXT_PUBLIC_APP_URL}${page}`,
      habitGoal,
      phase,
      message,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Failed to send feedback email:", e);
  }

  return NextResponse.json({ success: true });
}
