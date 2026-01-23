-- Add video scale column to footer_content
ALTER TABLE public.footer_content 
ADD COLUMN IF NOT EXISTS video_scale numeric DEFAULT 100;