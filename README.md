# Scaffold

An AI-powered habit coaching web app built for a between-subjects experimental study. Scaffold guides users from goal-setting through active daily coaching to eventual independence, using an LLM to generate personalized (or generic) plans and coaching responses depending on the assigned treatment group.

---

## Table of Contents

- [Overview](#overview)
- [A/B Study Design (Treatment A vs Treatment B)](#ab-study-design-treatment-a-vs-treatment-b)
- [User Journey Walkthrough](#user-journey-walkthrough)
  - [1. Entry and Treatment Assignment](#1-entry-and-treatment-assignment)
  - [2. Onboarding](#2-onboarding)
  - [3. Active Coaching (Phase 2)](#3-active-coaching-phase-2)
  - [4. Active Coaching Completion](#4-active-coaching-completion)
  - [5. Off-boarding (Treatment B Only)](#5-off-boarding-treatment-b-only)
  - [6. Completion (Phase 4)](#6-completion-phase-4)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Cron Job](#cron-job)
- [Deployment](#deployment)

---

## Overview

Scaffold uses a four-phase model to guide users through habit formation:

| Phase | Name | Description |
|-------|------|-------------|
| 1 | **Onboarding** | Collect user data, generate an AI habit plan, and gather a baseline SUS survey |
| 2 | **Active Coaching** | Daily check-ins with AI-generated coaching responses and a growing building visualization |
| 3 | **Off-boarding** | (Treatment B only) A guided graduation ceremony with a final SUS survey and coach farewell |
| 4 | **Complete** | The user has graduated; the building stands on its own |

Habit strength is measured using **SRBAI** (Self-Reported Behavioral Automaticity Index) scores collected during each check-in. When scores consistently reach the automaticity threshold, the system triggers the graduation flow.

Usability is measured with **SUS** (System Usability Scale) surveys at three points: after onboarding, after active coaching, and after off-boarding (Treatment B only).

---

## A/B Study Design (Treatment A vs Treatment B)

Scaffold is built for a **between-subjects experimental study** comparing personalized AI coaching against generic AI coaching. Users are assigned to a treatment group via the URL they use to join.

| Aspect | Treatment A (Generic) | Treatment B (Personalized) |
|--------|----------------------|---------------------------|
| **Entry URL** | `/join/a` | `/join/b` |
| **Onboarding steps** | 3 steps: Goal, AI Plan, SUS | 6 steps: TIPI, Hobbies, Goal, Calendar, AI Plan, SUS |
| **Personality profiling** | None | TIPI (Ten-Item Personality Inventory) for OCEAN scores |
| **Calendar availability** | None | Weekly availability collected and used in plan generation |
| **AI plan generation** | Generic prompt (goal only) | Personalized prompt (TIPI scores, hobbies, availability, goal) |
| **AI coaching responses** | Generic coaching tone | Personality-calibrated tone based on TIPI profile |
| **Off-boarding** | Simple completion (Congrats card) | Full ceremony: reveal animation, SUS, independence check, coach farewell |
| **Viewable in Supabase** | `treatment = 'a'` in `users` table | `treatment = 'b'` in `users` table |

The treatment configuration is centralized in `src/lib/treatment-config.ts`, which maps each treatment to its ordered onboarding steps and feature flags.

---

## User Journey Walkthrough

### 1. Entry and Treatment Assignment

- Users arrive via a study-specific URL: **`/join/a`** or **`/join/b`**
- The join page sets a `scaffold_treatment` cookie before redirecting to Google OAuth
- After authentication, the `/auth/callback` route reads the cookie and writes the treatment value (`"a"` or `"b"`) to the user's row in the `users` table
- The cookie is cleared after use
- If a user goes to `/login` directly (no join URL), they default to Treatment B

**Note on Supabase triggers:** A `handle_new_user()` database trigger creates the user row when they sign up. The auth callback detects this (user exists with `onboarding_step = 0`) and updates the treatment from the cookie, handling the race condition gracefully.

### 2. Onboarding

The onboarding flow is dynamic based on treatment assignment:

**Treatment A (3 steps):**
1. **Define Your Goal** -- describe the habit you want to build
2. **Your Plan** -- AI generates a generic habit plan based on the goal alone
3. **Quick Survey** -- baseline SUS survey ("Onboarding Complete!")

**Treatment B (6 steps):**
1. **Personality Profile** -- TIPI questionnaire (10 items measuring Big Five / OCEAN traits)
2. **Your Routines** -- hobbies and daily routines
3. **Define Your Goal** -- describe the habit you want to build
4. **Your Availability** -- weekly calendar availability
5. **Your Plan** -- AI generates a personalized plan using TIPI scores, hobbies, availability, and goal
6. **Quick Survey** -- baseline SUS survey ("Onboarding Complete!")

After submitting the SUS survey, the user's habit moves to **Phase 2** (active coaching) and they arrive at the dashboard.

### 3. Active Coaching (Phase 2)

During active coaching, users perform daily check-ins for their habit:

1. **Did you perform the habit?** -- Yes/No
2. **SRBAI survey** -- 4 questions measuring habit automaticity (1-5 scale)
3. **If missed:** a text input asking why, followed by an AI coaching response
4. **If performed:** a success screen with the building growing by one floor

The **Scaffold Building** visualization is central to the experience: each completed check-in adds a floor. During Phase 2, the building is shown with scaffolding around it (like a building under construction). The building grows as the user progresses.

**AI coaching responses** differ by treatment:
- **Treatment A:** Generic, encouraging coaching tone without personality calibration
- **Treatment B:** Personality-calibrated coaching that adapts tone and style based on TIPI/OCEAN scores

#### Streak Freeze

Scaffold includes a streak freeze mechanic to forgive a single missed check-in:

- Each habit starts with one **streak freeze** available
- If a user misses a check-in but has a freeze available, the streak is preserved (the freeze is consumed)
- A second consecutive miss breaks the streak
- The freeze status is displayed on the habit detail page

#### SRBAI Threshold and Graduation Trigger

After each check-in, the system evaluates SRBAI scores. When scores consistently reach the automaticity threshold (indicating the habit is becoming automatic), the system triggers the graduation flow:

- **Treatment A:** Moves to the active coaching SUS survey, then simple completion
- **Treatment B:** Moves to the active coaching SUS survey, then the full off-boarding flow

### 4. Active Coaching Completion

When the SRBAI threshold is met, **both treatments** are presented with an **"Active Coaching Complete!"** SUS survey. This captures usability feedback specifically about the coaching phase.

After submitting the survey:
- **Treatment A** sees a "Congratulations!" card with their building visualization and a "Back to Dashboard" button (habit moves to Phase 4)
- **Treatment B** enters the off-boarding flow (habit moves to Phase 3)

### 5. Off-boarding (Treatment B Only)

Treatment B users go through a structured graduation ceremony:

1. **Reveal Animation** -- the scaffolding is removed from the building in an animated sequence, revealing the completed structure
2. **Admire** -- the user sees their building standing on its own with an encouraging message
3. **Off-boarding SUS Survey** -- a third usability survey for the off-boarding experience
4. **Independence Check** -- "Do you feel ready to continue without the app?"
   - **"Yes, I'm ready"** -- AI generates a personalized farewell message; habit moves to Phase 4
   - **"Not yet"** -- a final check-in is scheduled for one week later; a calendar invite (.ics file) is emailed to the user

Treatment A users are redirected away from the offboarding page if they somehow reach it.

### 6. Completion (Phase 4)

- **Treatment A:** The habit detail page shows a simple "Habit Complete" card
- **Treatment B:** The habit detail page shows the "Coach's Final Words" -- the personalized farewell message generated during off-boarding

In both cases, the building visualization is shown without scaffolding, representing the user's independence.

---

## Key Features

- **AI-Powered Coaching** -- Groq LLM generates habit plans, daily coaching responses, and farewell messages
- **TIPI Personality Profiling** -- Big Five / OCEAN trait measurement used to calibrate coaching tone (Treatment B)
- **Scaffold Building Visualization** -- animated building that grows with each check-in, with scaffolding removal during off-boarding
- **SRBAI Automaticity Tracking** -- scientific measure of habit strength used to determine when a user is ready to graduate
- **SUS Usability Surveys** -- collected at onboarding, active coaching completion, and off-boarding for research analysis
- **Streak Freeze** -- forgives one missed check-in to reduce frustration
- **Calendar Invites** -- .ics file emails for habit reminders and final check-in scheduling
- **Email Reminders** -- automated daily check-in reminder emails via cron job
- **Treatment-Aware Architecture** -- single codebase serving both treatment groups with URL-based assignment
- **Between-Subjects Design** -- clean separation of experimental conditions viewable in Supabase

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 16** | App Router, React 19, server/client components |
| **Supabase** | Auth (Google OAuth), PostgreSQL database, Row Level Security |
| **Groq** | LLM API (plan generation, coaching responses, off-boarding messages) |
| **Nodemailer** | Email reminders and calendar invites via Gmail SMTP |
| **Tailwind CSS v4** | Utility-first styling |
| **shadcn/ui** | UI component library |
| **Framer Motion** | Building visualization animations |
| **Vercel** | Hosting and cron jobs |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key
- A Gmail account with an [app password](https://support.google.com/accounts/answer/185833)

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
   supabase/migrations/004_offboarding_fields.sql
   supabase/migrations/005_treatment_field.sql
   ```

4. **Enable Google OAuth** in Supabase Auth > Providers > Google.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── (app)/                    # Authenticated pages
│   │   ├── dashboard/            # Habit list with treatment-aware guards
│   │   ├── onboarding/           # Dynamic onboarding (3 or 6 steps)
│   │   └── habit/[id]/           # Habit detail, check-in, off-boarding
│   ├── (auth)/
│   │   ├── login/                # Google sign-in (default entry)
│   │   └── join/[treatment]/     # Treatment-specific entry (/join/a, /join/b)
│   ├── auth/callback/            # OAuth callback with treatment assignment
│   └── api/
│       ├── ai/                   # AI endpoints (plan, coaching, off-boarding)
│       ├── calendar-invite/      # ICS calendar invite generation and emailing
│       ├── cron/                 # Check-in reminder email cron
│       └── feedback/             # Feedback submission
├── components/
│   ├── building/                 # Scaffold building + reveal animation
│   ├── onboarding/               # TIPI, hobbies, goal, calendar, AI plan forms
│   ├── surveys/                  # SUS and SRBAI survey forms
│   └── ui/                       # shadcn/ui components
└── lib/
    ├── prompts/                  # LLM prompt builders (generic + personalized)
    ├── supabase/                 # Client/server Supabase helpers + middleware
    ├── treatment-config.ts       # Central treatment configuration
    ├── types.ts                  # Shared TypeScript types
    ├── ics.ts                    # ICS calendar file generation
    └── email.ts                  # Email sending utilities
```

---

## Database Schema

### Key Tables

| Table | Purpose |
|-------|---------|
| `users` | User profiles with `treatment` (`'a'` or `'b'`), `onboarding_step`, TIPI scores, hobbies, calendar availability |
| `habits` | User habits with `phase` (1-4), `ai_plan` (JSONB), `building_floors`, `streak_freeze_available`, `final_coach_message` |
| `check_ins` | Daily check-in records with `performed`, `srbai_score`, `missed_reason`, `ai_response` |
| `sus_scores` | SUS survey responses with `phase` (`'onboarding'`, `'active-coaching'`, `'offboarding'`) |
| `feedback` | General user feedback submissions |

### Treatment Field

The `users.treatment` column (`text NOT NULL DEFAULT 'b'`) stores the assigned treatment group. This can be queried directly in Supabase to analyze results by treatment.

---

## Cron Job

The `/api/cron/send-check-in-reminders` endpoint sends email reminders for upcoming check-ins. Call it on a schedule (e.g. via Vercel Cron) with the `Authorization: Bearer <CRON_SECRET>` header.

Example `vercel.json` cron (already included):

```json
{
  "crons": [{ "path": "/api/cron/send-check-in-reminders", "schedule": "0 1 * * *" }]
}
```

---

## Deployment

Scaffold is designed to be deployed on **Vercel** with a **Supabase** backend:

1. Push to your Git repository
2. Connect the repo to Vercel
3. Set all environment variables in Vercel's project settings
4. Ensure the Supabase database has all migrations applied
5. Share `/join/a` and `/join/b` URLs with study participants

Both treatment groups run on the same deployment -- the URL determines the treatment assignment, and the codebase dynamically adjusts the experience based on the `treatment` value stored in the database.
