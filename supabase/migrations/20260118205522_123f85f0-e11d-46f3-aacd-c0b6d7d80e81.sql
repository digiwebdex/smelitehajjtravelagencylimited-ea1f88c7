-- Add more customization columns to gallery_settings
ALTER TABLE gallery_settings 
ADD COLUMN IF NOT EXISTS columns_desktop INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS columns_tablet INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS columns_mobile INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS image_aspect_ratio TEXT DEFAULT 'square',
ADD COLUMN IF NOT EXISTS image_border_radius TEXT DEFAULT 'lg',
ADD COLUMN IF NOT EXISTS show_captions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS hover_effect TEXT DEFAULT 'zoom',
ADD COLUMN IF NOT EXISTS lightbox_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS autoplay_carousel BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS autoplay_speed INTEGER DEFAULT 4000,
ADD COLUMN IF NOT EXISTS show_thumbnails BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS title_color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subtitle_color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS overlay_color TEXT DEFAULT 'rgba(0,0,0,0.6)',
ADD COLUMN IF NOT EXISTS default_view TEXT DEFAULT 'grid';

-- Add category support to gallery_images
ALTER TABLE gallery_images
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Update the existing row with defaults
UPDATE gallery_settings SET 
  columns_desktop = COALESCE(columns_desktop, 4),
  columns_tablet = COALESCE(columns_tablet, 3),
  columns_mobile = COALESCE(columns_mobile, 2),
  image_aspect_ratio = COALESCE(image_aspect_ratio, 'square'),
  image_border_radius = COALESCE(image_border_radius, 'lg'),
  show_captions = COALESCE(show_captions, true),
  hover_effect = COALESCE(hover_effect, 'zoom'),
  lightbox_enabled = COALESCE(lightbox_enabled, true),
  autoplay_carousel = COALESCE(autoplay_carousel, true),
  autoplay_speed = COALESCE(autoplay_speed, 4000),
  show_thumbnails = COALESCE(show_thumbnails, true),
  overlay_color = COALESCE(overlay_color, 'rgba(0,0,0,0.6)'),
  default_view = COALESCE(default_view, 'grid')
WHERE id IS NOT NULL;