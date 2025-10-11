-- Add advisor_code and regional columns to advisors table
ALTER TABLE public.advisors 
ADD COLUMN IF NOT EXISTS advisor_code text,
ADD COLUMN IF NOT EXISTS regional text;

-- Add index for advisor_code for better query performance
CREATE INDEX IF NOT EXISTS idx_advisors_advisor_code ON public.advisors(advisor_code);

-- Add index for regional for better filtering
CREATE INDEX IF NOT EXISTS idx_advisors_regional ON public.advisors(regional);