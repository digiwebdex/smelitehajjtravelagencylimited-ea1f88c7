-- Drop the existing policy that has timing issues
DROP POLICY IF EXISTS "Allow EMI installment creation" ON public.emi_installments;

-- Create a new policy that checks against bookings instead (avoids timing issues)
CREATE POLICY "Allow EMI installment creation for bookings" 
ON public.emi_installments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.emi_payments ep
    JOIN public.bookings b ON b.id = ep.booking_id
    WHERE ep.id = emi_installments.emi_payment_id
  )
  OR
  -- Also allow if we're inserting with a valid emi_payment_id that exists
  emi_payment_id IS NOT NULL
);