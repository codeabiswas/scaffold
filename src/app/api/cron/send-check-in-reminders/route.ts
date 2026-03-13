import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCheckInReminderEmail } from "@/lib/email";

/** Map JS getUTCDay() (0=Sun) to lowercase day names matching schedule.days */
const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** Also match abbreviated forms the AI might generate */
const DAY_ABBREVS: Record<string, string[]> = {
  sunday: ["sun"],
  monday: ["mon"],
  tuesday: ["tue"],
  wednesday: ["wed"],
  thursday: ["thu"],
  friday: ["fri"],
  saturday: ["sat"],
};

function isScheduledForDay(
  scheduleDays: string[],
  targetDay: string
): boolean {
  const aliases = [targetDay, ...(DAY_ABBREVS[targetDay] || [])];
  return scheduleDays.some((d) => aliases.includes(d.toLowerCase()));
}

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

  // Find all habits in active coaching (phase 2) with their schedule
  const { data: activeHabits } = await supabase
    .from("habits")
    .select("id, goal, user_id, schedule")
    .eq("phase", 2);

  if (!activeHabits || activeHabits.length === 0) {
    return NextResponse.json({ sent: 0, checked: 0 });
  }

  // Determine today's day of week (UTC)
  const now = new Date();
  const todayDayName = DAY_NAMES[now.getUTCDay()];

  // Filter to habits scheduled for today
  const habitsScheduledToday = activeHabits.filter((h) => {
    const schedule = h.schedule as { days?: string[] } | null;
    if (!schedule?.days?.length) return false;
    return isScheduledForDay(schedule.days, todayDayName);
  });

  if (habitsScheduledToday.length === 0) {
    return NextResponse.json({
      sent: 0,
      checked: activeHabits.length,
      scheduledToday: 0,
    });
  }

  // Check which of these habits already have a check-in today
  const habitIds = habitsScheduledToday.map((h) => h.id);
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setUTCHours(23, 59, 59, 999);

  const { data: todaysCheckIns } = await supabase
    .from("check_ins")
    .select("habit_id")
    .in("habit_id", habitIds)
    .gte("scheduled_at", todayStart.toISOString())
    .lte("scheduled_at", todayEnd.toISOString());

  const checkedInHabitIds = new Set(
    (todaysCheckIns || []).map((ci) => ci.habit_id)
  );

  // Filter to habits that haven't checked in yet
  const habitsNeedingReminder = habitsScheduledToday.filter(
    (h) => !checkedInHabitIds.has(h.id)
  );

  if (habitsNeedingReminder.length === 0) {
    return NextResponse.json({
      sent: 0,
      checked: activeHabits.length,
      scheduledToday: habitsScheduledToday.length,
      alreadyCheckedIn: checkedInHabitIds.size,
    });
  }

  // Batch-fetch user emails in a single query
  const userIds = habitsNeedingReminder.map((h) => h.user_id);
  const { data: users } = await supabase
    .from("users")
    .select("id, email")
    .in("id", userIds);

  const emailByUserId = Object.fromEntries(
    (users || []).map((u) => [u.id, u.email])
  );

  // Send one reminder per habit that hasn't been checked in
  let sent = 0;
  for (const habit of habitsNeedingReminder) {
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

  return NextResponse.json({
    sent,
    checked: activeHabits.length,
    scheduledToday: habitsScheduledToday.length,
    alreadyCheckedIn: checkedInHabitIds.size,
  });
}
