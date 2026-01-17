-- Drop and recreate the policy as PERMISSIVE for public read access
DROP POLICY IF EXISTS "Anyone can view enabled payment methods" ON public.payment_methods;

CREATE POLICY "Anyone can view enabled payment methods"
ON public.payment_methods
FOR SELECT
TO public
USING (is_enabled = true);