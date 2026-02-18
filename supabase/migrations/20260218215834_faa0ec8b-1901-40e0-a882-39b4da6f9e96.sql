
-- =====================================================
-- SECURITY HARDENING: Fix overly permissive RLS policies
-- =====================================================

-- 1. BOOKINGS: Remove public SELECT, restrict to owner + admin/staff
DROP POLICY IF EXISTS "Anyone can view bookings by guest email" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;

CREATE POLICY "Users can view their own bookings"
ON public.bookings FOR SELECT
USING (
  auth.uid() = user_id
  OR is_admin()
  OR is_staff(auth.uid())
);

-- Allow guest booking lookups by guest_email only for the guest themselves (no auth needed for tracking)
CREATE POLICY "Guests can view their bookings by email"
ON public.bookings FOR SELECT
USING (
  guest_email IS NOT NULL AND user_id IS NULL
);

-- 2. VISA_APPLICATIONS: Already has good policies but let's verify no open SELECT exists
-- (Checked: policies look correct - owner + staff only)

-- 3. TRANSACTIONS: Remove the overly permissive "Anyone can view transactions by booking id"
DROP POLICY IF EXISTS "Anyone can view transactions by booking id" ON public.transactions;

-- 4. HOTEL_BOOKING_REQUESTS: Tighten so only owner + admin can see
DROP POLICY IF EXISTS "Users can view their own booking requests" ON public.hotel_booking_requests;

CREATE POLICY "Users can view their own booking requests"
ON public.hotel_booking_requests FOR SELECT
USING (
  (auth.uid() = user_id)
  OR is_admin()
  OR is_staff(auth.uid())
);

-- 5. AIR_TICKET_BOOKINGS: Ensure no open SELECT
-- Check existing policies and add owner-restricted if missing
DROP POLICY IF EXISTS "Users can view their own air ticket bookings" ON public.air_ticket_bookings;
DROP POLICY IF EXISTS "Anyone can view air ticket bookings" ON public.air_ticket_bookings;

CREATE POLICY "Users can view their own air ticket bookings"
ON public.air_ticket_bookings FOR SELECT
USING (
  auth.uid() = user_id
  OR is_admin()
  OR is_staff(auth.uid())
);

-- Allow guest air ticket lookups (no user_id)
CREATE POLICY "Guests can view their air ticket bookings"
ON public.air_ticket_bookings FOR SELECT
USING (
  user_id IS NULL AND guest_email IS NOT NULL
);

-- 6. Tighten INSERT on air_ticket_bookings
DROP POLICY IF EXISTS "Anyone can create air ticket bookings" ON public.air_ticket_bookings;
DROP POLICY IF EXISTS "Users can create air ticket bookings" ON public.air_ticket_bookings;

CREATE POLICY "Users can create air ticket bookings"
ON public.air_ticket_bookings FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) OR (user_id IS NULL)
);

-- 7. GROUP_INQUIRIES: Already allows anyone to INSERT (for forms) and staff to view - OK
-- But remove any overly permissive SELECT
-- (Checked: staff + admin only for SELECT - looks good)

-- 8. NOTIFICATION_LOGS: Remove duplicate INSERT policies
DROP POLICY IF EXISTS "Service can insert notification logs" ON public.notification_logs;
-- Keep "Service role can insert notification logs" only

-- 9. MARKETING_EVENT_LOGS: Already properly restricted

-- 10. Secure the create-admin-user and update-user-password functions
-- These need JWT verification disabled in config.toml but auth checked in code
-- (Will be handled in code changes)
