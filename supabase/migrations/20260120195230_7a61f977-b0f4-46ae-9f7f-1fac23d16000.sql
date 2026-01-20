-- Add imo_number column to team_members table
ALTER TABLE public.team_members 
ADD COLUMN imo_number text DEFAULT NULL;