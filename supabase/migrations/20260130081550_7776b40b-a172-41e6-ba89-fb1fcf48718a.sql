-- =============================================
-- BUSINESS GROWTH SYSTEM DATABASE MIGRATION
-- =============================================

-- 1. Downloadable Resources (Lead Magnets)
CREATE TABLE public.downloadable_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('umrah_guide', 'hajj_checklist', 'ramadan_guide', 'visa_guide', 'other')),
  file_url TEXT NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Resource Downloads Tracking
CREATE TABLE public.resource_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.downloadable_resources(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  source TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Webinars
CREATE TABLE public.webinars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 100,
  registration_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Webinar Registrations
CREATE TABLE public.webinar_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  preferred_session TEXT,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Referral Codes
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Referral Conversions
CREATE TABLE public.referral_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referred_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  conversion_value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Agents (Sub-agent System)
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  commission_rate NUMERIC NOT NULL DEFAULT 5 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  referral_link_code TEXT NOT NULL UNIQUE,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_leads INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,
  total_commission NUMERIC NOT NULL DEFAULT 0,
  pending_commission NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Agent Leads
CREATE TABLE public.agent_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  converted BOOLEAN NOT NULL DEFAULT false,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. CRM Sequences
CREATE TABLE public.crm_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'both')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. CRM Sequence Steps
CREATE TABLE public.crm_sequence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.crm_sequences(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  day_offset INTEGER NOT NULL DEFAULT 0,
  message_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. CRM Lead Sequences (tracking automation for each lead)
CREATE TABLE public.crm_lead_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.crm_sequences(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  next_trigger_at TIMESTAMP WITH TIME ZONE,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 12. Blog Categories
CREATE TABLE public.blog_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 13. Blog Posts
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image_url TEXT,
  seo_title TEXT,
  meta_description TEXT,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 14. Audience Segments (Retargeting)
CREATE TABLE public.audience_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_name TEXT NOT NULL,
  segment_type TEXT NOT NULL CHECK (segment_type IN ('viewed_no_lead', 'lead_no_payment', 'whatsapp_no_booking', 'premium_interest', 'group_inquiry', 'custom')),
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  lead_ids UUID[] NOT NULL DEFAULT '{}',
  lead_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 15. Translations (Multi-language)
CREATE TABLE public.translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  language_code TEXT NOT NULL CHECK (language_code IN ('en', 'bn')),
  section TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(language_code, section, key)
);

-- 16. Group Inquiries
CREATE TABLE public.group_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  traveler_count INTEGER NOT NULL DEFAULT 1,
  preferred_package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  budget TEXT,
  travel_date DATE,
  special_requirements TEXT,
  lead_status TEXT NOT NULL DEFAULT 'New' CHECK (lead_status IN ('New', 'Contacted', 'Quoted', 'Converted', 'Lost')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  group_discount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- TABLE MODIFICATIONS
-- =============================================

-- Modify packages table
ALTER TABLE public.packages 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'economy' CHECK (category IN ('economy', 'premium', 'vip')),
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS countdown_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS weekly_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS installment_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_down_payment_percent INTEGER DEFAULT 30 CHECK (min_down_payment_percent >= 0 AND min_down_payment_percent <= 100),
ADD COLUMN IF NOT EXISTS max_installment_months INTEGER DEFAULT 6 CHECK (max_installment_months >= 1 AND max_installment_months <= 24);

-- Modify testimonials table
ALTER TABLE public.testimonials 
ADD COLUMN IF NOT EXISTS is_video BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS display_location TEXT DEFAULT 'homepage' CHECK (display_location IN ('homepage', 'package_pages', 'both'));

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE public.downloadable_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webinar_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_inquiries ENABLE ROW LEVEL SECURITY;

-- Downloadable Resources Policies
CREATE POLICY "Admins can manage downloadable resources" ON public.downloadable_resources FOR ALL USING (is_admin());
CREATE POLICY "Anyone can view active resources" ON public.downloadable_resources FOR SELECT USING (is_active = true);

-- Resource Downloads Policies
CREATE POLICY "Admins can view all downloads" ON public.resource_downloads FOR SELECT USING (is_admin() OR is_staff(auth.uid()));
CREATE POLICY "Anyone can create downloads" ON public.resource_downloads FOR INSERT WITH CHECK (true);

-- Webinars Policies
CREATE POLICY "Admins can manage webinars" ON public.webinars FOR ALL USING (is_admin());
CREATE POLICY "Anyone can view active webinars" ON public.webinars FOR SELECT USING (is_active = true);

-- Webinar Registrations Policies
CREATE POLICY "Admins can view all registrations" ON public.webinar_registrations FOR SELECT USING (is_admin() OR is_staff(auth.uid()));
CREATE POLICY "Anyone can register" ON public.webinar_registrations FOR INSERT WITH CHECK (true);

-- Referral Codes Policies
CREATE POLICY "Admins can manage referral codes" ON public.referral_codes FOR ALL USING (is_admin());
CREATE POLICY "Staff can view referral codes" ON public.referral_codes FOR SELECT USING (is_staff(auth.uid()));

-- Referral Conversions Policies
CREATE POLICY "Admins can manage referral conversions" ON public.referral_conversions FOR ALL USING (is_admin());
CREATE POLICY "Staff can view referral conversions" ON public.referral_conversions FOR SELECT USING (is_staff(auth.uid()));

-- Agents Policies
CREATE POLICY "Admins can manage agents" ON public.agents FOR ALL USING (is_admin());
CREATE POLICY "Agents can view their own profile" ON public.agents FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Agents can update their own profile" ON public.agents FOR UPDATE USING (user_id = auth.uid());

-- Agent Leads Policies
CREATE POLICY "Admins can manage agent leads" ON public.agent_leads FOR ALL USING (is_admin());
CREATE POLICY "Agents can view their own leads" ON public.agent_leads FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.agents WHERE agents.id = agent_leads.agent_id AND agents.user_id = auth.uid())
);

-- CRM Sequences Policies
CREATE POLICY "Admins can manage CRM sequences" ON public.crm_sequences FOR ALL USING (is_admin());
CREATE POLICY "Staff can view CRM sequences" ON public.crm_sequences FOR SELECT USING (is_staff(auth.uid()));

-- CRM Sequence Steps Policies
CREATE POLICY "Admins can manage sequence steps" ON public.crm_sequence_steps FOR ALL USING (is_admin());
CREATE POLICY "Staff can view sequence steps" ON public.crm_sequence_steps FOR SELECT USING (is_staff(auth.uid()));

-- CRM Lead Sequences Policies
CREATE POLICY "Admins can manage lead sequences" ON public.crm_lead_sequences FOR ALL USING (is_admin());
CREATE POLICY "Staff can view lead sequences" ON public.crm_lead_sequences FOR SELECT USING (is_staff(auth.uid()));

-- Blog Categories Policies
CREATE POLICY "Admins can manage blog categories" ON public.blog_categories FOR ALL USING (is_admin());
CREATE POLICY "Anyone can view active categories" ON public.blog_categories FOR SELECT USING (is_active = true);

-- Blog Posts Policies
CREATE POLICY "Admins can manage blog posts" ON public.blog_posts FOR ALL USING (is_admin());
CREATE POLICY "Anyone can view published posts" ON public.blog_posts FOR SELECT USING (is_published = true);

-- Audience Segments Policies
CREATE POLICY "Admins can manage audience segments" ON public.audience_segments FOR ALL USING (is_admin());
CREATE POLICY "Staff can view audience segments" ON public.audience_segments FOR SELECT USING (is_staff(auth.uid()));

-- Translations Policies
CREATE POLICY "Admins can manage translations" ON public.translations FOR ALL USING (is_admin());
CREATE POLICY "Anyone can view translations" ON public.translations FOR SELECT USING (true);

-- Group Inquiries Policies
CREATE POLICY "Admins can manage group inquiries" ON public.group_inquiries FOR ALL USING (is_admin());
CREATE POLICY "Staff can view group inquiries" ON public.group_inquiries FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff can update group inquiries" ON public.group_inquiries FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Anyone can submit group inquiries" ON public.group_inquiries FOR INSERT WITH CHECK (true);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_resource_downloads_resource_id ON public.resource_downloads(resource_id);
CREATE INDEX idx_resource_downloads_lead_id ON public.resource_downloads(lead_id);
CREATE INDEX idx_webinar_registrations_webinar_id ON public.webinar_registrations(webinar_id);
CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX idx_referral_codes_lead_id ON public.referral_codes(lead_id);
CREATE INDEX idx_referral_conversions_referral_code_id ON public.referral_conversions(referral_code_id);
CREATE INDEX idx_agents_referral_link_code ON public.agents(referral_link_code);
CREATE INDEX idx_agents_user_id ON public.agents(user_id);
CREATE INDEX idx_agent_leads_agent_id ON public.agent_leads(agent_id);
CREATE INDEX idx_agent_leads_lead_id ON public.agent_leads(lead_id);
CREATE INDEX idx_crm_sequence_steps_sequence_id ON public.crm_sequence_steps(sequence_id);
CREATE INDEX idx_crm_lead_sequences_lead_id ON public.crm_lead_sequences(lead_id);
CREATE INDEX idx_crm_lead_sequences_sequence_id ON public.crm_lead_sequences(sequence_id);
CREATE INDEX idx_crm_lead_sequences_next_trigger ON public.crm_lead_sequences(next_trigger_at);
CREATE INDEX idx_blog_posts_category_id ON public.blog_posts(category_id);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON public.blog_posts(is_published, published_at);
CREATE INDEX idx_translations_lang_section ON public.translations(language_code, section);
CREATE INDEX idx_group_inquiries_status ON public.group_inquiries(lead_status);
CREATE INDEX idx_packages_category ON public.packages(category);
CREATE INDEX idx_packages_featured ON public.packages(is_featured);

-- =============================================
-- INSERT DEFAULT DATA
-- =============================================

-- Insert default blog categories
INSERT INTO public.blog_categories (name, slug, description, order_index) VALUES
('Hajj Guide', 'hajj-guide', 'Complete guides for Hajj pilgrimage', 1),
('Umrah Guide', 'umrah-guide', 'Everything about Umrah pilgrimage', 2),
('Visa Process', 'visa-process', 'Saudi visa application guides', 3),
('Preparation Tips', 'preparation-tips', 'Tips for travel preparation', 4);

-- Insert default CRM sequence
INSERT INTO public.crm_sequences (name, description, channel) VALUES
('Lead Follow-up', 'Default follow-up sequence for new leads', 'whatsapp');

-- Get the sequence ID and insert default steps
INSERT INTO public.crm_sequence_steps (sequence_id, step_number, day_offset, message_template)
SELECT id, 1, 0, 'Assalamu Alaikum {{name}}! Thank you for your interest in our {{package}} package. Our team will contact you shortly. For immediate assistance, please call us.'
FROM public.crm_sequences WHERE name = 'Lead Follow-up';

INSERT INTO public.crm_sequence_steps (sequence_id, step_number, day_offset, message_template)
SELECT id, 2, 3, 'Dear {{name}}, we hope you are doing well. We wanted to follow up on your interest in our {{package}} package. Do you have any questions we can help with?'
FROM public.crm_sequences WHERE name = 'Lead Follow-up';

INSERT INTO public.crm_sequence_steps (sequence_id, step_number, day_offset, message_template)
SELECT id, 3, 7, 'Assalamu Alaikum {{name}}! Just checking in - we have limited seats available for {{package}}. Would you like to proceed with the booking?'
FROM public.crm_sequences WHERE name = 'Lead Follow-up';

INSERT INTO public.crm_sequence_steps (sequence_id, step_number, day_offset, message_template)
SELECT id, 4, 14, 'Dear {{name}}, this is our final reminder about the {{package}} package. Seats are filling fast! Reply YES if you would like us to reserve your spot.'
FROM public.crm_sequences WHERE name = 'Lead Follow-up';

-- Insert default audience segments
INSERT INTO public.audience_segments (segment_name, segment_type, criteria) VALUES
('Viewed but No Lead', 'viewed_no_lead', '{"description": "Users who viewed packages but did not submit lead form"}'),
('Lead but No Payment', 'lead_no_payment', '{"description": "Leads who submitted form but have not paid"}'),
('WhatsApp but No Booking', 'whatsapp_no_booking', '{"description": "Users who clicked WhatsApp but did not book"}'),
('Premium Package Interest', 'premium_interest', '{"description": "Users interested in premium or VIP packages"}'),
('Group Inquiry', 'group_inquiry', '{"description": "Users who submitted group inquiry form"}');