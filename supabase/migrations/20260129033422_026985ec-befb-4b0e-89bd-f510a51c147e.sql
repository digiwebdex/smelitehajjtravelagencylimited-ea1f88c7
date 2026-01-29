-- Add staff_name and mobile_number columns to staff_members table
ALTER TABLE public.staff_members 
ADD COLUMN IF NOT EXISTS staff_name TEXT,
ADD COLUMN IF NOT EXISTS mobile_number TEXT;

-- Update existing staff to populate staff_name from profiles if available
UPDATE public.staff_members sm
SET staff_name = p.full_name
FROM public.profiles p
WHERE sm.user_id = p.id AND sm.staff_name IS NULL;