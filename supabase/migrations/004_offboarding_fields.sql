-- Add offboarding fields to habits table
-- final_coach_message: stores the AI coach's farewell, displayed permanently on the habit dashboard
-- needs_final_checkin: flags that the user said "Not yet" during offboarding, waiting for one last check-in

ALTER TABLE habits ADD COLUMN IF NOT EXISTS final_coach_message text;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS needs_final_checkin boolean DEFAULT false;
