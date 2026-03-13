-- Add treatment field for A/B study
-- 'a' = generic AI coaching (no personalization, no offboarding)
-- 'b' = personalized coaching (TIPI, calendar, full offboarding)
ALTER TABLE public.users ADD COLUMN treatment text NOT NULL DEFAULT 'b';
