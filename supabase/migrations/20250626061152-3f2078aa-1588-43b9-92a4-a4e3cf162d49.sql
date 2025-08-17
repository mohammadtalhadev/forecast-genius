
-- Add missing columns to notification_settings table
ALTER TABLE public.notification_settings 
ADD COLUMN company text,
ADD COLUMN bio text;

-- Update currency constraint to include all supported currencies
ALTER TABLE public.notification_settings 
DROP CONSTRAINT IF EXISTS valid_currency;

ALTER TABLE public.notification_settings 
ADD CONSTRAINT valid_currency CHECK (currency IN ('USD', 'PKR', 'GBP', 'EUR'));
