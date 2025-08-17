
-- Add currency column to notification_settings table
ALTER TABLE public.notification_settings 
ADD COLUMN currency text DEFAULT 'USD';

-- Add a check constraint to ensure only valid currencies
ALTER TABLE public.notification_settings 
ADD CONSTRAINT valid_currency CHECK (currency IN ('USD', 'PKR'));
