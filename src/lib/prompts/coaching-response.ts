import type { TipiScores } from "@/lib/types";

export function buildCoachingResponsePrompt(params: {
  tipiScores: TipiScores;
  habitGoal: string;
  habitDescription: string;
  missedReason: "schedule_conflict" | "no_motivation" | "forgot";
  consecutiveMisses: number;
  currentSrbai: number;
}) {
  const { tipiScores, habitGoal, habitDescription, missedReason, consecutiveMisses, currentSrbai } = params;

  const reasonContext = {
    schedule_conflict: "The user had a schedule conflict and couldn't fit the habit in.",
    no_motivation: "The user didn't feel like doing it today.",
    forgot: "The user forgot to do the habit.",
  }[missedReason];

  const urgency =
    consecutiveMisses >= 3
      ? "CRITICAL: This is the 3rd+ consecutive miss. The AI should replan the habit approach entirely — suggest a smaller version, different time, or modified routine."
      : consecutiveMisses === 2
        ? "WARNING: Second consecutive miss. Heighten encouragement and gently explore if the current plan needs adjustment."
        : "First miss. Be supportive and address the specific barrier.";

  return {
    system: `You are Scaffold, an AI habit coach. A user missed their scheduled habit. Respond with empathy and actionable advice.

Personality calibration:
${tipiScores.neuroticism >= 5 ? "- High neuroticism: Be extra gentle. Emphasize that missing one day doesn't undo progress." : "- Can handle direct feedback."}
${tipiScores.conscientiousness >= 5 ? "- High conscientiousness: They're probably being hard on themselves already. Reassure." : "- May need more structure and concrete next steps."}

${urgency}

Keep your response to 2-3 sentences. Be warm, specific, and forward-looking. Never guilt-trip.`,
    user: `Goal: "${habitGoal}"
Habit: "${habitDescription}"
Reason for missing: ${reasonContext}
Consecutive misses: ${consecutiveMisses}
Current SRBAI score: ${currentSrbai}

Provide a coaching response for this user.`,
  };
}
