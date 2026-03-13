import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGroqClient, DEFAULT_MODEL } from "@/lib/groq";
import {
  buildPlanGenerationPrompt,
  buildGenericPlanGenerationPrompt,
  buildPlanRegenerationPrompt,
} from "@/lib/prompts/plan-generation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { habitId, feedback, previousPlan } = body;

  // Get user profile
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get habit
  const { data: habit } = await supabase
    .from("habits")
    .select("*")
    .eq("id", habitId)
    .single();

  if (!profile || !habit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let prompt: { system: string; user: string };

  if (profile.treatment === "a") {
    // Treatment A: generic prompt (no personality, hobbies, or availability)
    prompt = buildGenericPlanGenerationPrompt({
      goal: habit.goal,
      targetDate: habit.target_date,
      successCondition: habit.success_condition,
      priorExperience: habit.prior_experience,
    });
  } else {
    // Treatment B: personalized prompt
    const { data: calData } = await supabase
      .from("calendar_availability")
      .select("availability")
      .eq("user_id", user.id)
      .single();

    prompt = buildPlanGenerationPrompt({
      tipiScores: profile.tipi_scores,
      hobbies: profile.hobbies || "",
      goal: habit.goal,
      targetDate: habit.target_date,
      successCondition: habit.success_condition,
      priorExperience: habit.prior_experience,
      availability: calData?.availability || {},
    });
  }

  const messages: { role: "system" | "user"; content: string }[] = [
    { role: "system", content: prompt.system },
    { role: "user", content: prompt.user },
  ];

  // If regenerating, add feedback context
  if (feedback && previousPlan) {
    messages.push({
      role: "user",
      content: buildPlanRegenerationPrompt(feedback, previousPlan),
    });
  }

  try {
    const completion = await getGroqClient().chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Empty response from AI" },
        { status: 500 }
      );
    }

    const plan = JSON.parse(content);

    return NextResponse.json({ plan });
  } catch (e) {
    console.error("AI plan generation failed:", e);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}
