-- Add hotel_images column as an array to store multiple images
ALTER TABLE public.packages 
ADD COLUMN hotel_images TEXT[] DEFAULT '{}'::TEXT[];