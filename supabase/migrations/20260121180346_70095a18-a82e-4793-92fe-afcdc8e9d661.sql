-- Add link_url column to services table for navigation links
ALTER TABLE public.services 
ADD COLUMN link_url TEXT DEFAULT NULL;