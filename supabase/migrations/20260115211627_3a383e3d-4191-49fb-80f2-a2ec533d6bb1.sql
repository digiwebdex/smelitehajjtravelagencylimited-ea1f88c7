-- Create office_locations table
CREATE TABLE public.office_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phones TEXT[] NOT NULL DEFAULT '{}',
  email TEXT,
  map_query TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active office locations"
ON public.office_locations FOR SELECT
USING (is_active = true OR is_admin());

CREATE POLICY "Admins can insert office locations"
ON public.office_locations FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update office locations"
ON public.office_locations FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete office locations"
ON public.office_locations FOR DELETE
USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_office_locations_updated_at
BEFORE UPDATE ON public.office_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default office locations
INSERT INTO public.office_locations (name, address, phones, email, map_query, order_index) VALUES
('Head Office', 'House # 37, Block # C, Road # 6, Banani, Dhaka-1213.', ARRAY['+8801867666888', '+8801619959625'], 'info@smelitehajj.com', 'House+37+Block+C+Road+6+Banani+Dhaka+1213', 0),
('Savar Office', 'B-25/4, Al-Baraka Super Market, Savar Bazar Bus-Stand, Savar, Dhaka-1340.', ARRAY['+8802224446664', '+8801619959626'], 'info@smelitehajj.com', 'Al-Baraka+Super+Market+Savar+Bazar+Bus-Stand+Savar+Dhaka+1340', 1);