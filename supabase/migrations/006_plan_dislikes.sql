-- Track how many times users disliked the AI-generated habit plan
ALTER TABLE public.habits ADD COLUMN plan_dislikes int NOT NULL DEFAULT 0;
