import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOnboardingComplete } from "@/lib/treatment-config";
import type { Treatment } from "@/lib/types";

/** Parse a specific cookie value from a cookie header string */
function parseCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

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
          .select("onboarding_step, treatment")
          .eq("id", user.id)
          .single();

        if (!profile) {
          // First-time login — create the profile row (fallback if trigger didn't fire)
          const name =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            null;

          // Read treatment from cookie set by /join/[treatment]
          const cookieHeader = request.headers.get("cookie") || "";
          const treatmentCookie = parseCookie(cookieHeader, "scaffold_treatment");
          const treatment: Treatment =
            treatmentCookie === "a" || treatmentCookie === "b"
              ? treatmentCookie
              : "b";

          const { data: newProfile } = await supabase
            .from("users")
            .insert({
              id: user.id,
              email: user.email || "",
              name,
              treatment,
              onboarding_step: 0,
            })
            .select("onboarding_step, treatment")
            .single();
          profile = newProfile;
        } else if (profile.onboarding_step === 0) {
          // User row was created by the Supabase trigger but hasn't started onboarding yet.
          // This is effectively a new user — assign treatment from the cookie if present.
          const cookieHeader = request.headers.get("cookie") || "";
          const treatmentCookie = parseCookie(cookieHeader, "scaffold_treatment");

          if (treatmentCookie === "a" || treatmentCookie === "b") {
            await supabase
              .from("users")
              .update({ treatment: treatmentCookie })
              .eq("id", user.id);
            profile = { ...profile, treatment: treatmentCookie };
          }
        }

        const treatment = (profile?.treatment as Treatment) || "b";

        // Clear the treatment cookie
        const response = isOnboardingComplete(treatment, profile?.onboarding_step || 0)
          ? NextResponse.redirect(`${origin}/dashboard`)
          : NextResponse.redirect(
              `${origin}/onboarding?step=${(profile?.onboarding_step || 0) + 1}`
            );

        // Expire the treatment cookie
        response.cookies.set("scaffold_treatment", "", {
          path: "/",
          maxAge: 0,
        });

        return response;
      }
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
