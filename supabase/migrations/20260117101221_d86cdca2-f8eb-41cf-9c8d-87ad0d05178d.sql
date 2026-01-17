-- Create booking_documents table
CREATE TABLE public.booking_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for customers
CREATE POLICY "Users can view their own documents"
ON public.booking_documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own documents"
ON public.booking_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON public.booking_documents FOR DELETE
USING (auth.uid() = user_id);

-- RLS policy for admins
CREATE POLICY "Admins can view all documents"
ON public.booking_documents FOR SELECT
USING (public.is_admin());

-- Create storage bucket for booking documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('booking-documents', 'booking-documents', false, 10485760);

-- Storage policies
CREATE POLICY "Users can upload their booking documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'booking-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own booking documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'booking-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own booking documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'booking-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all booking documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'booking-documents' 
  AND public.is_admin()
);

-- Add index for faster queries
CREATE INDEX idx_booking_documents_booking_id ON public.booking_documents(booking_id);
CREATE INDEX idx_booking_documents_user_id ON public.booking_documents(user_id);