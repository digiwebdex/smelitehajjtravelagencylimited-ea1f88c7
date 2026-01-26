-- Create visa_applications table
CREATE TABLE public.visa_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  visa_country_id UUID REFERENCES public.visa_countries(id) NOT NULL,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT,
  applicant_phone TEXT NOT NULL,
  applicant_count INTEGER NOT NULL DEFAULT 1,
  travel_date DATE,
  passport_number TEXT,
  date_of_birth DATE,
  nationality TEXT DEFAULT 'Bangladeshi',
  notes TEXT,
  total_price DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  bank_transaction_number TEXT,
  bank_transfer_screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.visa_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for visa applications
CREATE POLICY "Users can view their own visa applications" 
ON public.visa_applications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create visa applications" 
ON public.visa_applications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own pending visa applications" 
ON public.visa_applications 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');

-- Admin/Staff policies
CREATE POLICY "Staff can view all visa applications" 
ON public.visa_applications 
FOR SELECT 
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update any visa application" 
ON public.visa_applications 
FOR UPDATE 
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete visa applications" 
ON public.visa_applications 
FOR DELETE 
USING (public.is_staff(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_visa_applications_updated_at
BEFORE UPDATE ON public.visa_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();