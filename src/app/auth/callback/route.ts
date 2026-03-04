import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has completed onboarding
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Ensure a public.users row exists for this auth user
        let { data: profile } = await supabase
          .from("users")
          .select("onboarding_step")
          .eq("id", user.id)
          .single();

        if (!profile) {
          // First-time login — create the profile row
          // Extract name from Google OAuth metadata
          const name =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            null;

          const { data: newProfile } = await supabase
            .from("users")
            .insert({
              id: user.id,
              email: user.email || "",
              name,
              onboarding_step: 0,
            })
            .select("onboarding_step")
            .single();
          profile = newProfile;
        }

        // If onboarding not complete (step < 6), go to onboarding
        if (!profile || profile.onboarding_step < 6) {
          const step = profile?.onboarding_step || 0;
          return NextResponse.redirect(
            `${origin}/onboarding?step=${step + 1}`
          );
        }

        // Otherwise go to dashboard
        return NextResponse.redirect(`${origin}/dashboard`);
      }
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
