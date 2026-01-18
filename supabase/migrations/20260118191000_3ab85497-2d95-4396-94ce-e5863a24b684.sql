-- Add hotel image and map link columns to packages table
ALTER TABLE public.packages 
ADD COLUMN hotel_image_url TEXT,
ADD COLUMN hotel_map_link TEXT;