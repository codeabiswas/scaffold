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
  const teamEmail = process.env.FEEDBACK_EMAIL || "team@example.com";

  await getTransporter().sendMail({
    from: FROM_ADDRESS,
    to: teamEmail,
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
    subject: `Time to check in: ${shortGoal}`,
    text: `Hey! It's time to check in on your habit: ${data.habitGoal}

Click here to check in: ${data.checkInUrl}

— Scaffold`,
  });
}
