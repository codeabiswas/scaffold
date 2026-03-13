"use client";

import { useState } from "react";
import { X } from "lucide-react";

const DEFAULT_MESSAGE =
  "We've sent you a calendar invite with your habit schedule and check-in reminders. Open the attached .ics file to add it to your calendar.";

export function CalendarInviteBanner({ message }: { message?: string }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative rounded-lg border border-primary/30 bg-primary/5 p-4 pr-10">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-sm">
        📅 <strong>Check your email!</strong> {message || DEFAULT_MESSAGE}
      </p>
    </div>
  );
}
