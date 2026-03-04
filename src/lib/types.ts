export interface TipiScores {
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  neuroticism: number;
  openness: number;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  google_id: string | null;
  tipi_scores: TipiScores | null;
  hobbies: string | null;
  onboarding_step: number;
  created_at: string;
}

export interface HabitSchedule {
  days: string[];
  time: string;
  duration_minutes: number;
}

export interface AiPlan {
  habit: string;
  schedule: string;
  rationale: string;
}

export interface PriorExperience {
  tried: boolean;
  outcome: "progress" | "quit" | "never";
  detail: string;
}

export interface Habit {
  id: string;
  user_id: string;
  goal: string;
  target_date: string | null;
  success_condition: string | null;
  prior_experience: PriorExperience | null;
  schedule: HabitSchedule;
  ai_plan: AiPlan | null;
  phase: number; // 1=onboarding, 2=active, 3=offboarding, 4=complete
  building_floors: number;
  consecutive_misses: number;
  current_srbai: number;
  streak_freeze_available: boolean;
  created_at: string;
}

export interface CheckIn {
  id: string;
  habit_id: string;
  scheduled_at: string;
  completed_at: string | null;
  performed: boolean | null;
  missed_reason: "schedule_conflict" | "no_motivation" | "forgot" | null;
  ai_response: string | null;
  created_at: string;
}

export interface SrbaiScore {
  id: string;
  habit_id: string;
  check_in_id: string | null;
  score: number;
  items: { q1: number; q2: number; q3: number; q4: number } | null;
  is_decay: boolean;
  recorded_at: string;
}

export interface SusScore {
  id: string;
  user_id: string;
  habit_id: string | null;
  phase: "onboarding" | "phase2" | "offboarding";
  responses: Record<string, number>;
  score: number;
  recorded_at: string;
}

export interface Feedback {
  id: string;
  user_id: string;
  habit_id: string | null;
  page: string;
  message: string;
  created_at: string;
}
