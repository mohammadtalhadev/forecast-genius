
-- Create products table to store uploaded product data
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  is_perishable BOOLEAN DEFAULT false,
  shelf_life_days INTEGER,
  cost_price DECIMAL(10,2),
  current_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales_data table to store historical sales
CREATE TABLE public.sales_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  quantity_sold INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create competitor_prices table for price tracking
CREATE TABLE public.competitor_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  competitor_url TEXT,
  price DECIMAL(10,2) NOT NULL,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create marketing_events table for calendar sync
CREATE TABLE public.marketing_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL, -- 'sale', 'holiday', 'promotion'
  impact_multiplier DECIMAL(3,2) DEFAULT 1.0, -- expected demand multiplier
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create price_recommendations table
CREATE TABLE public.price_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  current_price DECIMAL(10,2) NOT NULL,
  recommended_price DECIMAL(10,2) NOT NULL,
  expected_profit_increase DECIMAL(5,2),
  confidence_score DECIMAL(3,2),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  email_notifications BOOLEAN DEFAULT true,
  whatsapp_notifications BOOLEAN DEFAULT false,
  whatsapp_number TEXT,
  low_stock_threshold INTEGER DEFAULT 10,
  overstock_threshold INTEGER DEFAULT 100,
  expiry_warning_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bulk_upload_jobs table to track large uploads
CREATE TABLE public.bulk_upload_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL,
  processed_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  error_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add Row Level Security (RLS) policies
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_upload_jobs ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Users can view their own products" ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own products" ON public.products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own products" ON public.products FOR DELETE USING (auth.uid() = user_id);

-- Sales data policies
CREATE POLICY "Users can view their own sales data" ON public.sales_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sales data" ON public.sales_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sales data" ON public.sales_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sales data" ON public.sales_data FOR DELETE USING (auth.uid() = user_id);

-- Competitor prices policies
CREATE POLICY "Users can view their own competitor prices" ON public.competitor_prices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own competitor prices" ON public.competitor_prices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own competitor prices" ON public.competitor_prices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own competitor prices" ON public.competitor_prices FOR DELETE USING (auth.uid() = user_id);

-- Marketing events policies
CREATE POLICY "Users can view their own marketing events" ON public.marketing_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own marketing events" ON public.marketing_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own marketing events" ON public.marketing_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own marketing events" ON public.marketing_events FOR DELETE USING (auth.uid() = user_id);

-- Price recommendations policies
CREATE POLICY "Users can view their own price recommendations" ON public.price_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own price recommendations" ON public.price_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own price recommendations" ON public.price_recommendations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own price recommendations" ON public.price_recommendations FOR DELETE USING (auth.uid() = user_id);

-- Notification settings policies
CREATE POLICY "Users can view their own notification settings" ON public.notification_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notification settings" ON public.notification_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notification settings" ON public.notification_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notification settings" ON public.notification_settings FOR DELETE USING (auth.uid() = user_id);

-- Bulk upload jobs policies
CREATE POLICY "Users can view their own bulk upload jobs" ON public.bulk_upload_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own bulk upload jobs" ON public.bulk_upload_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bulk upload jobs" ON public.bulk_upload_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bulk upload jobs" ON public.bulk_upload_jobs FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_products_user_id ON public.products(user_id);
CREATE INDEX idx_sales_data_user_id ON public.sales_data(user_id);
CREATE INDEX idx_sales_data_product_id ON public.sales_data(product_id);
CREATE INDEX idx_sales_data_date ON public.sales_data(date);
CREATE INDEX idx_competitor_prices_product_id ON public.competitor_prices(product_id);
CREATE INDEX idx_marketing_events_date ON public.marketing_events(event_date);
