import type { Treatment } from "./types";

export type StepKey =
  | "tipi"
  | "hobbies"
  | "goal"
  | "calendar"
  | "ai_plan"
  | "sus";

interface TreatmentConfig {
  steps: StepKey[];
  totalSteps: number;
  stepTitles: Record<StepKey, string>;
  subtitle: string;
  hasPersonalizedCoaching: boolean;
  hasFullOffboarding: boolean;
}

const STEP_TITLE_MAP: Record<StepKey, string> = {
  tipi: "Personality Profile",
  hobbies: "Your Routines",
  goal: "Define Your Goal",
  calendar: "Your Availability",
  ai_plan: "Your Plan",
  sus: "Quick Survey",
};

const TREATMENT_CONFIGS: Record<Treatment, TreatmentConfig> = {
  a: {
    steps: ["goal", "ai_plan", "sus"],
    totalSteps: 3,
    stepTitles: STEP_TITLE_MAP,
    subtitle: "Let's set up your habit",
    hasPersonalizedCoaching: false,
    hasFullOffboarding: false,
  },
  b: {
    steps: ["tipi", "hobbies", "goal", "calendar", "ai_plan", "sus"],
    totalSteps: 6,
    stepTitles: STEP_TITLE_MAP,
    subtitle: "Learning about the real you",
    hasPersonalizedCoaching: true,
    hasFullOffboarding: true,
  },
};

/** Get the full config for a treatment */
export function getConfig(treatment: Treatment): TreatmentConfig {
  return TREATMENT_CONFIGS[treatment] || TREATMENT_CONFIGS.b;
}

/** Check if a user has completed onboarding for their treatment */
export function isOnboardingComplete(
  treatment: Treatment,
  step: number
): boolean {
  const config = getConfig(treatment);
  return step >= config.totalSteps;
}

/** Get the step key for a given step number (1-based) */
export function getStepKey(
  treatment: Treatment,
  stepNumber: number
): StepKey | undefined {
  const config = getConfig(treatment);
  return config.steps[stepNumber - 1];
}

/** Get the step title for a given step number (1-based) */
export function getStepTitle(
  treatment: Treatment,
  stepNumber: number
): string {
  const key = getStepKey(treatment, stepNumber);
  return key ? STEP_TITLE_MAP[key] : "";
}
