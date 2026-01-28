-- Create backup_history table to track all backups
CREATE TABLE public.backup_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_name TEXT NOT NULL,
  backup_type TEXT NOT NULL DEFAULT 'full', -- 'full', 'cms', 'transactions'
  file_path TEXT NOT NULL,
  file_size BIGINT,
  tables_included TEXT[] NOT NULL DEFAULT '{}',
  record_counts JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed' -- 'in_progress', 'completed', 'failed'
);

-- Create restore_history table to track all restores
CREATE TABLE public.restore_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_id UUID REFERENCES public.backup_history(id),
  restore_type TEXT NOT NULL DEFAULT 'full', -- 'full', 'selective'
  tables_restored TEXT[] NOT NULL DEFAULT '{}',
  restored_by UUID REFERENCES auth.users(id),
  restored_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed', -- 'in_progress', 'completed', 'failed'
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restore_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for backup_history (admin only)
CREATE POLICY "Admins can manage backups" ON public.backup_history
  FOR ALL USING (is_admin());

-- RLS policies for restore_history (admin only)
CREATE POLICY "Admins can manage restores" ON public.restore_history
  FOR ALL USING (is_admin());

-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('backups', 'backups', false, 104857600) -- 100MB limit
ON CONFLICT (id) DO NOTHING;

-- Storage policies for backups bucket (admin only)
CREATE POLICY "Admins can upload backups" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'backups' AND is_admin());

CREATE POLICY "Admins can view backups" ON storage.objects
  FOR SELECT USING (bucket_id = 'backups' AND is_admin());

CREATE POLICY "Admins can delete backups" ON storage.objects
  FOR DELETE USING (bucket_id = 'backups' AND is_admin());