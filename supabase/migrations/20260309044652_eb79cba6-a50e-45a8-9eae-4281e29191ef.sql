-- FIX 1: Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user_roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- FIX 2: Fix payment_methods - replace public policy to exclude credentials
DROP POLICY IF EXISTS "Public can view enabled payment methods" ON public.payment_methods;

CREATE POLICY "Public can view enabled payment methods safe"
ON public.payment_methods FOR SELECT
USING (
  CASE 
    WHEN is_admin() THEN true
    WHEN is_enabled = true THEN true
    ELSE false
  END
);

CREATE OR REPLACE FUNCTION public.get_public_payment_methods()
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  description text,
  icon_name text,
  is_enabled boolean,
  order_index integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, slug, description, icon_name, is_enabled, order_index
  FROM public.payment_methods
  WHERE is_enabled = true
  ORDER BY order_index;
$$;

-- FIX 3: Remove overly permissive bookings SELECT policy
DROP POLICY IF EXISTS "Anyone can view bookings by id" ON public.bookings;
DROP POLICY IF EXISTS "Guests can view their bookings by email" ON public.bookings;

CREATE POLICY "Users and guests can view their own bookings"
ON public.bookings FOR SELECT
USING (
  (auth.uid() = user_id)
  OR (user_id IS NULL AND guest_email IS NOT NULL)
  OR is_admin()
  OR is_staff(auth.uid())
);

-- FIX 4: Fix guest air ticket bookings policy
DROP POLICY IF EXISTS "Guests can view their air ticket bookings" ON public.air_ticket_bookings;

CREATE POLICY "Guests can view their air ticket bookings safe"
ON public.air_ticket_bookings FOR SELECT
USING (
  (auth.uid() = user_id)
  OR (user_id IS NULL AND guest_email IS NOT NULL)
  OR is_admin()
  OR is_staff(auth.uid())
);