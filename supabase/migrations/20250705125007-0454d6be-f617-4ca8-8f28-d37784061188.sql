
-- Create competitor_entries table for detailed competitor tracking
CREATE TABLE public.competitor_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  competitor_name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'PKR',
  features TEXT[] DEFAULT '{}',
  seller_name TEXT,
  source_platform TEXT,
  url TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create competitor_price_history table for tracking price changes
CREATE TABLE public.competitor_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_price_id UUID NOT NULL,
  price NUMERIC NOT NULL,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add missing columns to competitor_prices table
ALTER TABLE public.competitor_prices 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'PKR',
ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS seller_name TEXT,
ADD COLUMN IF NOT EXISTS source_platform TEXT;

-- Add RLS policies for competitor_entries
ALTER TABLE public.competitor_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own competitor entries" 
  ON public.competitor_entries 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own competitor entries" 
  ON public.competitor_entries 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own competitor entries" 
  ON public.competitor_entries 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own competitor entries" 
  ON public.competitor_entries 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add RLS policies for competitor_price_history
ALTER TABLE public.competitor_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view price history for their competitors" 
  ON public.competitor_price_history 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.competitor_prices cp 
    WHERE cp.id = competitor_price_id AND cp.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert price history for their competitors" 
  ON public.competitor_price_history 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.competitor_prices cp 
    WHERE cp.id = competitor_price_id AND cp.user_id = auth.uid()
  ));

-- Add is_active column to marketing_events_ai if not exists
ALTER TABLE public.marketing_events_ai 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
