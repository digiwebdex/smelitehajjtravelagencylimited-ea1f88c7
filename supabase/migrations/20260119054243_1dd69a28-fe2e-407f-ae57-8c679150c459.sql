-- Add second address field to footer_content table
ALTER TABLE public.footer_content ADD COLUMN IF NOT EXISTS contact_address_2 TEXT;