-- Add video playback speed column to footer_content
ALTER TABLE public.footer_content 
ADD COLUMN IF NOT EXISTS video_speed numeric DEFAULT 1.0;