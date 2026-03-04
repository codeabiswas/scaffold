import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { FeedbackWidget } from "@/components/feedback-widget";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: habits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", user.id);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={profile} />
      <main className="container mx-auto px-4 py-8">{children}</main>
      <FeedbackWidget
        userId={user.id}
        habitId={habits?.[0]?.id}
        phase={habits?.[0]?.phase}
      />
    </div>
  );
}
