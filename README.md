# Scaffold

An AI-powered habit coaching app that guides users through building a habit — from personalized onboarding to active coaching and eventual independence.

## How It Works

Scaffold uses a three-phase model:

1. **Onboarding** — Collects a personality profile (TIPI questionnaire), hobbies, goal, and weekly availability. An AI generates a personalized habit plan.
2. **Coaching** — Scheduled check-ins with AI-generated responses. A "scaffold building" visualization grows with each completed check-in. A streak freeze mechanic forgives one missed check-in.
3. **Off-boarding** — When the habit is strong enough, the user graduates to independence.

Progress is tracked via SRBAI (Self-Reported Behavioral Automaticity Index) scores, and usability is measured with SUS surveys at onboarding and off-boarding.

## Tech Stack

- **Next.js 16** (App Router, React 19)
- **Supabase** — auth (Google OAuth), database, Row Level Security
- **Groq** — LLM API for plan generation, coaching responses, and off-boarding messages
- **Resend / Nodemailer** — email reminders via cron
- **Tailwind CSS v4** + shadcn/ui components
- **Framer Motion** — building visualization animation

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key
- An email provider (Resend or Gmail app password)

### Setup

1. **Clone and install**

   ```bash
   git clone <repo-url>
   cd scaffold
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in the values:

   | Variable | Description |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for cron) |
   | `GROQ_API_KEY` | Groq API key |
   | `GMAIL_USER` | Gmail address for sending reminders |
   | `GMAIL_APP_PASSWORD` | Gmail app password |
   | `FEEDBACK_EMAIL` | Address that receives feedback submissions |
   | `CRON_SECRET` | Secret token to authenticate cron requests |
   | `NEXT_PUBLIC_APP_URL` | App base URL (e.g. `http://localhost:3000`) |

3. **Apply database migrations**

   In your Supabase SQL editor, run the migration files in order:

   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_add_user_name.sql
   supabase/migrations/003_add_streak_freeze.sql
   ```

4. **Enable Google OAuth** in Supabase Auth → Providers → Google.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated pages
│   │   ├── dashboard/      # Habit list
│   │   ├── onboarding/     # 6-step onboarding flow
│   │   └── habit/[id]/     # Habit detail, check-in, off-boarding
│   ├── (auth)/login/       # Google sign-in
│   └── api/
│       ├── ai/             # AI endpoints (plan, coaching, off-boarding)
│       ├── cron/           # Check-in reminder email cron
│       └── feedback/       # Feedback submission
├── components/
│   ├── building/           # Scaffold building visualization
│   ├── onboarding/         # TIPI, hobbies, goal, calendar, plan forms
│   ├── surveys/            # SUS and SRBAI forms
│   └── ui/                 # shadcn/ui components
└── lib/
    ├── prompts/            # LLM prompt builders
    ├── supabase/           # Client/server Supabase helpers
    └── types.ts            # Shared TypeScript types
```

## Cron Job

The `/api/cron/send-check-in-reminders` endpoint sends email reminders for upcoming check-ins. Call it on a schedule (e.g. via Vercel Cron) with the `Authorization: Bearer <CRON_SECRET>` header.

Example `vercel.json` cron (already included):

```json
{
  "crons": [{ "path": "/api/cron/send-check-in-reminders", "schedule": "0 * * * *" }]
}
```
