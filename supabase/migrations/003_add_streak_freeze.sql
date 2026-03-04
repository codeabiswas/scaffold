-- Add streak freeze tracking to habits
alter table public.habits
  add column if not exists streak_freeze_available boolean default true;
