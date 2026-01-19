
-- Create EMI payment schedules table
CREATE TABLE public.emi_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  total_amount NUMERIC NOT NULL,
  advance_amount NUMERIC NOT NULL DEFAULT 0,
  number_of_emis INTEGER NOT NULL CHECK (number_of_emis >= 1 AND number_of_emis <= 12),
  emi_amount NUMERIC NOT NULL,
  paid_emis INTEGER NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL,
  is_emi_plan BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create individual EMI installments table
CREATE TABLE public.emi_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emi_payment_id UUID NOT NULL REFERENCES public.emi_payments(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE,
  paid_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on emi_payments
ALTER TABLE public.emi_payments ENABLE ROW LEVEL SECURITY;

-- Admin can do everything on emi_payments
CREATE POLICY "Admins can manage EMI payments"
ON public.emi_payments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Users can view their own EMI payments
CREATE POLICY "Users can view their own EMI payments"
ON public.emi_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = emi_payments.booking_id
    AND bookings.user_id = auth.uid()
  )
);

-- Enable RLS on emi_installments
ALTER TABLE public.emi_installments ENABLE ROW LEVEL SECURITY;

-- Admin can do everything on emi_installments
CREATE POLICY "Admins can manage EMI installments"
ON public.emi_installments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Users can view their own EMI installments
CREATE POLICY "Users can view their own EMI installments"
ON public.emi_installments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.emi_payments ep
    JOIN public.bookings b ON b.id = ep.booking_id
    WHERE ep.id = emi_installments.emi_payment_id
    AND b.user_id = auth.uid()
  )
);

-- Create trigger for updating timestamps on emi_payments
CREATE TRIGGER update_emi_payments_updated_at
BEFORE UPDATE ON public.emi_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updating timestamps on emi_installments
CREATE TRIGGER update_emi_installments_updated_at
BEFORE UPDATE ON public.emi_installments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_emi_payments_booking_id ON public.emi_payments(booking_id);
CREATE INDEX idx_emi_installments_emi_payment_id ON public.emi_installments(emi_payment_id);
CREATE INDEX idx_emi_installments_status ON public.emi_installments(status);
