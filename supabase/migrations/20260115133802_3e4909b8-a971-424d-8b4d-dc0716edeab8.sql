-- Create storage bucket for admin uploads (testimonials, team members)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('admin-uploads', 'admin-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view images (public bucket)
CREATE POLICY "Public can view admin uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'admin-uploads');

-- Allow admins to upload files
CREATE POLICY "Admins can upload admin files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'admin-uploads' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow admins to update files
CREATE POLICY "Admins can update admin files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'admin-uploads'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow admins to delete files
CREATE POLICY "Admins can delete admin files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'admin-uploads'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);