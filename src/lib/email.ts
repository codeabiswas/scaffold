import nodemailer from "nodemailer";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return _transporter;
}

const FROM_ADDRESS = `Scaffold <${process.env.GMAIL_USER}>`;

/** Truncate text to maxLen characters, adding ellipsis if needed */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

export async function sendFeedbackEmail(data: {
  userEmail: string;
  page: string;
  pageUrl: string;
  habitGoal?: string;
  phase?: string;
  message: string;
  timestamp: string;
}) {
  const teamEmails = process.env.FEEDBACK_EMAIL || "team@example.com";

  await getTransporter().sendMail({
    from: FROM_ADDRESS,
    to: teamEmails,
    subject: `[Scaffold Feedback] — ${data.page}`,
    text: `User: ${data.userEmail}
Page: ${data.page} — ${data.pageUrl}
Habit: ${data.habitGoal || "N/A"}
Phase: ${data.phase || "N/A"}
Message: ${data.message}
Submitted at: ${data.timestamp}`,
  });
}

export async function sendCheckInReminderEmail(data: {
  to: string;
  habitGoal: string;
  checkInUrl: string;
}) {
  const shortGoal = truncate(data.habitGoal, 60);

  await getTransporter().sendMail({
    from: FROM_ADDRESS,
    to: data.to,
    subject: `You haven't checked in yet: ${shortGoal}`,
    text: `Hey! You haven't checked in on your habit today: ${data.habitGoal}

Click here to check in: ${data.checkInUrl}

— Scaffold`,
  });
}

export async function sendCalendarInviteEmail(data: {
  to: string;
  habitGoal: string;
  icsContent: string;
  type?: "habit" | "final-checkin";
}) {
  const shortGoal = truncate(data.habitGoal, 60);
  const isFinalCheckin = data.type === "final-checkin";

  const subject = isFinalCheckin
    ? `Final check-in for ${shortGoal}`
    : `Your Scaffold Habit Schedule: ${shortGoal}`;

  const text = isFinalCheckin
    ? `You're almost at the finish line! We've scheduled one final check-in for you in one week.

Open the attached .ics file to add the reminder to your calendar. When the time comes, complete your final check-in to wrap up your coaching journey.

— Scaffold`
    : `Your personalized habit schedule is attached! Open the .ics file to add it to your calendar.

This will create recurring events for your habit and a 5-minute check-in reminder after each session. Your calendar app will handle the reminders automatically.

— Scaffold`;

  const filename = isFinalCheckin
    ? "scaffold-final-checkin.ics"
    : "scaffold-habit.ics";

  await getTransporter().sendMail({
    from: FROM_ADDRESS,
    to: data.to,
    subject,
    text,
    attachments: [
      {
        filename,
        content: data.icsContent,
        contentType: "text/calendar",
      },
    ],
  });
}
