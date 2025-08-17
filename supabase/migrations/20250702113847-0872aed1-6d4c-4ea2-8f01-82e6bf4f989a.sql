
-- Create alerts table to store AI-generated alerts
CREATE TABLE IF NOT EXISTS public.smart_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'critical_stock', 'overstock', 'demand_surge', 'expiry_risk'
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  ai_explanation TEXT, -- ChatGPT explanation
  action_recommended TEXT, -- What user should do
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days')
);

-- Create AI pricing recommendations table
CREATE TABLE IF NOT EXISTS public.ai_pricing_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  current_price NUMERIC,
  recommended_price NUMERIC NOT NULL,
  min_price NUMERIC,
  max_price NUMERIC,
  confidence_score NUMERIC DEFAULT 0.5, -- 0-1 scale
  reasoning TEXT, -- ChatGPT explanation
  price_action TEXT, -- 'increase', 'decrease', 'maintain', 'discount'
  market_position TEXT, -- 'competitive', 'too_high', 'below_market'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '3 days')
);

-- Create competitor analysis table
CREATE TABLE IF NOT EXISTS public.competitor_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  market_price_min NUMERIC,
  market_price_max NUMERIC,
  dominant_brands TEXT[], -- Array of brand names
  customer_expectations TEXT, -- What customers expect
  seasonal_insights TEXT, -- Seasonal trends
  market_position TEXT, -- 'competitive', 'too_high', 'below_market'
  ai_analysis TEXT, -- Full ChatGPT analysis
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days')
);

-- Create marketing events table
CREATE TABLE IF NOT EXISTS public.marketing_events_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_date DATE,
  campaign_suggestion TEXT, -- ChatGPT campaign idea
  estimated_sales_boost NUMERIC, -- Percentage increase
  suggested_discount NUMERIC, -- Recommended discount %
  ai_reasoning TEXT, -- Why this event matters
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_pricing_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_events_ai ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for smart_alerts
CREATE POLICY "Users can view their own alerts" ON public.smart_alerts
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own alerts" ON public.smart_alerts
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own alerts" ON public.smart_alerts
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own alerts" ON public.smart_alerts
  FOR DELETE USING (user_id = auth.uid());

-- Create RLS policies for ai_pricing_recommendations
CREATE POLICY "Users can view their own pricing recs" ON public.ai_pricing_recommendations
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own pricing recs" ON public.ai_pricing_recommendations
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own pricing recs" ON public.ai_pricing_recommendations
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own pricing recs" ON public.ai_pricing_recommendations
  FOR DELETE USING (user_id = auth.uid());

-- Create RLS policies for competitor_analysis
CREATE POLICY "Users can view their own competitor analysis" ON public.competitor_analysis
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own competitor analysis" ON public.competitor_analysis
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own competitor analysis" ON public.competitor_analysis
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own competitor analysis" ON public.competitor_analysis
  FOR DELETE USING (user_id = auth.uid());

-- Create RLS policies for marketing_events_ai
CREATE POLICY "Users can view their own marketing events" ON public.marketing_events_ai
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own marketing events" ON public.marketing_events_ai
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own marketing events" ON public.marketing_events_ai
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own marketing events" ON public.marketing_events_ai
  FOR DELETE USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_smart_alerts_user_active ON public.smart_alerts(user_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_user_product ON public.ai_pricing_recommendations(user_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_user ON public.competitor_analysis(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_events_user ON public.marketing_events_ai(user_id, event_date DESC);
