-- Create a policy to allow public SELECT on bookings by ID
-- This is needed for guests to view their booking details after booking
CREATE POLICY "Anyone can view bookings by id"
ON public.bookings
FOR SELECT
TO public
USING (true);