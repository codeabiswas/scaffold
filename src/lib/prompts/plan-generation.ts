import type { TipiScores, Habit } from "@/lib/types";

export function buildPlanGenerationPrompt(params: {
  tipiScores: TipiScores;
  hobbies: string;
  goal: string;
  targetDate: string | null;
  successCondition: string | null;
  priorExperience: Habit["prior_experience"];
  availability: unknown;
}) {
  const {
    tipiScores,
    hobbies,
    goal,
    targetDate,
    successCondition,
    priorExperience,
    availability,
  } = params;

  const personalityContext = `
Personality Profile (OCEAN, scale 1-7):
- Extraversion: ${tipiScores.extraversion.toFixed(1)}
- Agreeableness: ${tipiScores.agreeableness.toFixed(1)}
- Conscientiousness: ${tipiScores.conscientiousness.toFixed(1)}
- Neuroticism: ${tipiScores.neuroticism.toFixed(1)}
- Openness: ${tipiScores.openness.toFixed(1)}

Coaching tone calibration:
${tipiScores.conscientiousness >= 5 ? "- High conscientiousness: Use structured, milestone-driven feedback." : "- Lower conscientiousness: Keep things flexible, focus on small wins."}
${tipiScores.neuroticism >= 5 ? "- High neuroticism: More encouragement, reduced pressure framing. Emphasize self-compassion." : "- Lower neuroticism: Can handle direct feedback and ambitious targets."}
${tipiScores.extraversion >= 5 ? "- High extraversion: Social accountability may help. Energetic, enthusiastic tone." : "- Lower extraversion: Quiet, reflective encouragement. Don't overwhelm with social aspects."}
  `.trim();

  const priorContext = priorExperience
    ? `Prior experience: ${
        priorExperience.tried
          ? priorExperience.outcome === "progress"
            ? `Tried before and made progress. What worked: "${priorExperience.detail}"`
            : `Tried before but didn't stick. What got in the way: "${priorExperience.detail}"`
          : `Never tried before. Barriers: "${priorExperience.detail}"`
      }`
    : "No prior experience data.";

  return {
    system: `You are Scaffold, an AI habit coach. Your job is to propose a specific, realistic daily habit plan based on the user's personality, existing routines, goal, and availability.

RULES:
1. The habit must be small and specific enough to do daily (or on scheduled days).
2. Anchor the new habit to existing routines when possible.
3. The schedule must fit within the user's real availability.
4. Be encouraging but honest. Don't overpromise.
5. Respond ONLY with valid JSON matching the schema below. No extra text.

Response schema:
{
  "habit": "A specific, actionable daily habit (e.g., 'Run for 15 minutes')",
  "schedule": "A human-readable schedule (e.g., 'Monday, Wednesday, Friday at 7:00 AM for 15 minutes')",
  "rationale": "2-3 sentences explaining why this plan fits this specific person",
  "schedule_data": {
    "days": ["monday", "wednesday", "friday"],
    "time": "07:00",
    "duration_minutes": 15
  }
}`,
    user: `${personalityContext}

Existing hobbies and routines:
${hobbies}

Goal: "${goal}"
${targetDate ? `Target date: ${targetDate}` : "No specific target date."}
${successCondition ? `Success condition: "${successCondition}"` : ""}

${priorContext}

Availability:
${JSON.stringify(availability, null, 2)}

${params.priorExperience ? "" : ""}
Generate a habit plan for this user.`,
  };
}

export function buildPlanRegenerationPrompt(
  feedback: string,
  previousPlan: string
) {
  return `The user disliked the previous plan. Here was the previous plan:
${previousPlan}

Their feedback: "${feedback}"

Generate a new plan that addresses their concerns. Follow the same JSON schema.`;
}
