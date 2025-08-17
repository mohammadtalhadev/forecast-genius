
-- Add missing columns to products table for better inventory management
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS supplier TEXT,
ADD COLUMN IF NOT EXISTS last_reorder_date DATE,
ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Create upload_files table to track CSV uploads
CREATE TABLE IF NOT EXISTS public.upload_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  product_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processed',
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on upload_files
ALTER TABLE public.upload_files ENABLE ROW LEVEL SECURITY;

-- Create policies for upload_files
CREATE POLICY "Users can view their own files" ON public.upload_files
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own files" ON public.upload_files
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own files" ON public.upload_files
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own files" ON public.upload_files
  FOR DELETE USING (user_id = auth.uid());

-- Create inventory_metrics table for real-time calculations
CREATE TABLE IF NOT EXISTS public.inventory_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  current_stock INTEGER DEFAULT 0,
  daily_avg_sales NUMERIC DEFAULT 0,
  days_until_sellout INTEGER DEFAULT 0,
  reorder_quantity INTEGER DEFAULT 0,
  stock_status TEXT DEFAULT 'optimal',
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on inventory_metrics
ALTER TABLE public.inventory_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory_metrics
CREATE POLICY "Users can view their own metrics" ON public.inventory_metrics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own metrics" ON public.inventory_metrics
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own metrics" ON public.inventory_metrics
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own metrics" ON public.inventory_metrics
  FOR DELETE USING (user_id = auth.uid());

-- Update gemini_insights table for pricing data
ALTER TABLE public.gemini_insights 
ADD COLUMN IF NOT EXISTS suggested_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS competitor_min_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS competitor_max_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_analysis TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_metrics_user_product ON public.inventory_metrics(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_upload_files_user_date ON public.upload_files(user_id, upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_gemini_insights_product ON public.gemini_insights(product_id);
