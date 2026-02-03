-- Remove the restrictive city check constraint to allow hotels in any city
ALTER TABLE public.hotels DROP CONSTRAINT IF EXISTS hotels_city_check;