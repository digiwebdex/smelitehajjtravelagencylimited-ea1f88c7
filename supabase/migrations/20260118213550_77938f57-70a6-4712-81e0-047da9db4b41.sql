-- Enhance section_settings with styling options
ALTER TABLE section_settings
ADD COLUMN IF NOT EXISTS bg_color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_css TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create terminal_content table for terminal section
CREATE TABLE IF NOT EXISTS public.terminal_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT DEFAULT 'Terminal',
  terminal_text TEXT DEFAULT 'Welcome to our system...',
  bg_color TEXT DEFAULT '#1a1a2e',
  text_color TEXT DEFAULT '#00ff00',
  font_size TEXT DEFAULT '14px',
  typing_animation BOOLEAN DEFAULT true,
  is_enabled BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on terminal_content
ALTER TABLE public.terminal_content ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for terminal_content
CREATE POLICY "Anyone can view terminal content" 
ON public.terminal_content 
FOR SELECT 
USING (is_enabled = true OR is_admin());

CREATE POLICY "Admins can insert terminal content" 
ON public.terminal_content 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Admins can update terminal content" 
ON public.terminal_content 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete terminal content" 
ON public.terminal_content 
FOR DELETE 
USING (is_admin());

-- Create theme_settings table for global theme
CREATE TABLE IF NOT EXISTS public.theme_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_color TEXT DEFAULT '#1e3a5f',
  secondary_color TEXT DEFAULT '#c9a227',
  accent_color TEXT DEFAULT '#2e7d32',
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#1a1a1a',
  font_family TEXT DEFAULT 'Inter',
  heading_font TEXT DEFAULT 'Playfair Display',
  dark_mode_enabled BOOLEAN DEFAULT false,
  border_radius TEXT DEFAULT 'lg',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on theme_settings
ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for theme_settings
CREATE POLICY "Anyone can view theme settings" 
ON public.theme_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert theme settings" 
ON public.theme_settings 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Admins can update theme settings" 
ON public.theme_settings 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete theme settings" 
ON public.theme_settings 
FOR DELETE 
USING (is_admin());

-- Insert default theme settings if none exists
INSERT INTO public.theme_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.theme_settings LIMIT 1);

-- Insert default terminal content if none exists
INSERT INTO public.terminal_content (id, terminal_text)
SELECT gen_random_uuid(), 'بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ

Welcome to Bright Expeditions...
Your trusted partner for Hajj & Umrah journeys.

Connecting hearts to the Holy Lands since 2010.
Over 50,000+ satisfied pilgrims served.

Type "help" for more information...'
WHERE NOT EXISTS (SELECT 1 FROM public.terminal_content LIMIT 1);

-- Insert default sections into section_settings if they don't exist
INSERT INTO public.section_settings (section_key, title, subtitle, is_active, order_index)
VALUES 
  ('hero', 'Hero Section', 'Main banner area', true, 1),
  ('services', 'Our Services', 'What we offer', true, 2),
  ('hajj', 'Hajj Packages', 'Sacred pilgrimage packages', true, 3),
  ('umrah', 'Umrah Packages', 'Year-round pilgrimage', true, 4),
  ('visa', 'Visa Services', 'Visa processing', true, 5),
  ('gallery', 'Gallery', 'Photo gallery', true, 6),
  ('testimonials', 'Testimonials', 'Customer reviews', true, 7),
  ('team', 'Our Team', 'Meet our experts', true, 8),
  ('faq', 'FAQ', 'Frequently asked questions', true, 9),
  ('terminal', 'Terminal', 'Interactive terminal', true, 10),
  ('contact', 'Contact', 'Get in touch', true, 11)
ON CONFLICT (section_key) DO UPDATE SET
  order_index = EXCLUDED.order_index;