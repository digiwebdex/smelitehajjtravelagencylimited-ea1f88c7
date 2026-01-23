-- Drop the existing check constraint
ALTER TABLE notification_settings DROP CONSTRAINT IF EXISTS notification_settings_setting_type_check;

-- Add new check constraint that includes 'whatsapp'
ALTER TABLE notification_settings ADD CONSTRAINT notification_settings_setting_type_check 
CHECK (setting_type IN ('sms', 'email', 'whatsapp'));