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

  // Find all habits in active coaching (phase 2)
  const { data: activeHabits } = await supabase
    .from("habits")
    .select("id, goal, user_id")
    .eq("phase", 2);

  if (!activeHabits || activeHabits.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Batch-fetch user emails in a single query
  const userIds = activeHabits.map((h) => h.user_id);
  const { data: users } = await supabase
    .from("users")
    .select("id, email")
    .in("id", userIds);

  const emailByUserId = Object.fromEntries(
    (users || []).map((u) => [u.id, u.email])
  );

  // Send one reminder per active habit
  let sent = 0;
  for (const habit of activeHabits) {
    const email = emailByUserId[habit.user_id];
    if (!email) continue;

    try {
      await sendCheckInReminderEmail({
        to: email,
        habitGoal: habit.goal,
        checkInUrl: `${process.env.NEXT_PUBLIC_APP_URL}/habit/${habit.id}/check-in`,
      });
      sent++;
    } catch (e) {
      console.error(`Failed to send reminder to ${email}:`, e);
    }
  }

  return NextResponse.json({ sent });
}
