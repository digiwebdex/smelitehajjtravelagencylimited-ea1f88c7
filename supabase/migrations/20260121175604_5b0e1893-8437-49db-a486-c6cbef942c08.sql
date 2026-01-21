-- Create social_networks table for dynamic social links with icons
CREATE TABLE public.social_networks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_name TEXT NOT NULL,
  icon_name TEXT NOT NULL DEFAULT 'Globe',
  url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.social_networks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active social networks" 
ON public.social_networks 
FOR SELECT 
USING ((is_active = true) OR is_admin());

CREATE POLICY "Admins can insert social networks" 
ON public.social_networks 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Admins can update social networks" 
ON public.social_networks 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete social networks" 
ON public.social_networks 
FOR DELETE 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_social_networks_updated_at
BEFORE UPDATE ON public.social_networks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default social networks
INSERT INTO public.social_networks (platform_name, icon_name, url, order_index) VALUES
('Facebook', 'Facebook', 'https://facebook.com', 0),
('Instagram', 'Instagram', 'https://instagram.com', 1),
('YouTube', 'Youtube', 'https://youtube.com', 2),
('Twitter', 'Twitter', 'https://twitter.com', 3),
('TikTok', 'Music', 'https://tiktok.com', 4),
('LinkedIn', 'Linkedin', 'https://linkedin.com', 5),
('WhatsApp', 'MessageCircle', 'https://whatsapp.com', 6),
('Telegram', 'Send', 'https://telegram.org', 7);