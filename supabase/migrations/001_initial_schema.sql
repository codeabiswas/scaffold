-- Users (extends Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  google_id text,
  tipi_scores jsonb,
  hobbies text,
  onboarding_step int default 0,
  created_at timestamptz default now()
);

-- Habits
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  goal text not null,
  target_date date,
  success_condition text,
  prior_experience jsonb,
  schedule jsonb not null default '{}',
  ai_plan jsonb,
  phase int default 1,
  building_floors int default 0,
  consecutive_misses int default 0,
  current_srbai numeric(3,2) default 1.0,
  created_at timestamptz default now()
);

-- Check-ins
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  performed boolean,
  missed_reason text,
  ai_response text,
  created_at timestamptz default now()
);

-- SRBAI Scores
create table public.srbai_scores (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  check_in_id uuid references public.check_ins(id) on delete set null,
  score numeric(3,2) not null,
  items jsonb,
  is_decay boolean default false,
  recorded_at timestamptz default now()
);

-- SUS Scores
create table public.sus_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete set null,
  phase text not null,
  responses jsonb not null,
  score numeric(5,2) not null,
  recorded_at timestamptz default now()
);

-- Feedback
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete set null,
  page text not null,
  message text not null,
  created_at timestamptz default now()
);

-- Calendar availability cache
create table public.calendar_availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  availability jsonb not null,
  fetched_at timestamptz default now()
);

-- RLS
alter table public.users enable row level security;
alter table public.habits enable row level security;
alter table public.check_ins enable row level security;
alter table public.srbai_scores enable row level security;
alter table public.sus_scores enable row level security;
alter table public.feedback enable row level security;
alter table public.calendar_availability enable row level security;

create policy "Users own data" on public.users for all using (auth.uid() = id);
create policy "Habits own data" on public.habits for all using (auth.uid() = user_id);
create policy "CheckIns via habit" on public.check_ins for all using (
  habit_id in (select id from public.habits where user_id = auth.uid())
);
create policy "SRBAI via habit" on public.srbai_scores for all using (
  habit_id in (select id from public.habits where user_id = auth.uid())
);
create policy "SUS own data" on public.sus_scores for all using (auth.uid() = user_id);
create policy "Feedback own data" on public.feedback for all using (auth.uid() = user_id);
create policy "Calendar own data" on public.calendar_availability for all using (auth.uid() = user_id);

-- Auto-create public.users row on sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, google_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'provider_id'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
