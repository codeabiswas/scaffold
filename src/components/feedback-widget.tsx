"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function FeedbackWidget({
  userId,
  habitId,
  phase,
}: {
  userId: string;
  habitId?: string;
  phase?: number;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pathname = usePathname();

  async function handleSubmit() {
    if (!message.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          habitId,
          page: pathname,
          message: message.trim(),
          phase: phase ? `Phase ${phase}` : undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit feedback");

      toast.success("Feedback submitted — thank you!");
      setMessage("");
      setOpen(false);
    } catch {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-6 right-6 rounded-full shadow-lg"
        >
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve Scaffold. Your feedback goes directly to the team.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="What's on your mind?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
        <Button onClick={handleSubmit} disabled={submitting || !message.trim()}>
          {submitting ? "Sending..." : "Submit"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
