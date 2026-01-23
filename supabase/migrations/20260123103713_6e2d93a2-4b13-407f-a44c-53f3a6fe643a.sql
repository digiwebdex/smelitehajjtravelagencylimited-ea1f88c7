-- Add video blur column to footer_content
ALTER TABLE public.footer_content 
ADD COLUMN IF NOT EXISTS video_blur numeric DEFAULT 0.5;