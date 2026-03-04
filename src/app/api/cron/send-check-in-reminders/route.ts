import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCheckInReminderEmail } from "@/lib/email";

// This route uses the service role key since it runs as a cron job, not as a user
export async function POST(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find pending check-ins that are past due
  const { data: pendingCheckIns } = await supabase
    .from("check_ins")
    .select("*, habits!inner(goal, id, user_id)")
    .is("completed_at", null)
    .lte("scheduled_at", new Date().toISOString());

  if (!pendingCheckIns || pendingCheckIns.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;

  for (const checkIn of pendingCheckIns) {
    // Get user email
    const { data: user } = await supabase
      .from("users")
      .select("email")
      .eq("id", checkIn.habits.user_id)
      .single();

    if (!user?.email) continue;

    try {
      await sendCheckInReminderEmail({
        to: user.email,
        habitGoal: checkIn.habits.goal,
        checkInUrl: `${process.env.NEXT_PUBLIC_APP_URL}/habit/${checkIn.habits.id}/check-in`,
      });
      sent++;
    } catch (e) {
      console.error(`Failed to send reminder to ${user.email}:`, e);
    }
  }

  return NextResponse.json({ sent });
}
