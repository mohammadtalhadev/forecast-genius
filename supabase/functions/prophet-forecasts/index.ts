
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, products } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Generating Prophet forecasts for user:', user_id);
    console.log('Products:', products);

    // Get sales data for forecasting
    const { data: salesData, error: salesError } = await supabase
      .from('sales_data')
      .select(`
        *,
        products!inner (
          id,
          name
        )
      `)
      .eq('user_id', user_id);

    if (salesError) {
      console.error('Error fetching sales data:', salesError);
      throw salesError;
    }

    if (!salesData || salesData.length === 0) {
      console.log('No sales data found for forecasting');
      return new Response(JSON.stringify({ message: 'No sales data available' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group sales data by product
    const productSalesMap = new Map();
    salesData.forEach(sale => {
      const productId = sale.product_id;
      const productName = sale.products?.name;
      
      if (!productSalesMap.has(productId)) {
        productSalesMap.set(productId, {
          product_name: productName,
          sales: []
        });
      }
      
      productSalesMap.get(productId).sales.push({
        date: sale.date,
        quantity: sale.quantity_sold
      });
    });

    // Generate forecasts for each product
    const forecasts = [];
    
    for (const [productId, data] of productSalesMap.entries()) {
      const { product_name, sales } = data;
      
      // Sort sales by date
      sales.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Simple forecasting algorithm (replacement for Prophet)
      // Calculate trend and seasonality
      const quantities = sales.map(s => s.quantity);
      const avgQuantity = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
      
      // Calculate trend (simple linear regression slope)
      let trend = 0;
      if (quantities.length > 1) {
        const n = quantities.length;
        const sumX = (n * (n - 1)) / 2; // sum of indices
        const sumY = quantities.reduce((sum, q) => sum + q, 0);
        const sumXY = quantities.reduce((sum, q, i) => sum + (q * i), 0);
        const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // sum of squares of indices
        
        trend = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      }
      
      // Apply growth factor for different time periods
      const baseGrowth = Math.max(0.8, Math.min(1.2, 1 + (trend * 0.1)));
      
      const forecast_7d = Math.max(0, Math.round(avgQuantity * 7 * baseGrowth));
      const forecast_30d = Math.max(0, Math.round(avgQuantity * 30 * Math.pow(baseGrowth, 0.9)));
      const forecast_90d = Math.max(0, Math.round(avgQuantity * 90 * Math.pow(baseGrowth, 0.8)));
      const forecast_365d = Math.max(0, Math.round(avgQuantity * 365 * Math.pow(baseGrowth, 0.7)));
      
      // Determine trend status
      let trendStatus = 'stable';
      if (trend > 0.1) trendStatus = 'trending';
      else if (trend < -0.1) trendStatus = 'declining';
      
      // Calculate confidence score based on data consistency
      const variance = quantities.reduce((sum, q) => sum + Math.pow(q - avgQuantity, 2), 0) / quantities.length;
      const coefficientOfVariation = Math.sqrt(variance) / avgQuantity;
      const confidenceScore = Math.max(0.3, Math.min(0.95, 1 - coefficientOfVariation));
      
      forecasts.push({
        user_id,
        product_id: productId,
        forecast_7d,
        forecast_30d,
        forecast_90d,
        forecast_365d,
        trend_status: trendStatus,
        confidence_score: confidenceScore,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      });
    }

    // Save forecasts to database
    if (forecasts.length > 0) {
      // Clear existing forecasts for this user
      await supabase
        .from('forecast_data')
        .delete()
        .eq('user_id', user_id);

      // Insert new forecasts
      const { error: insertError } = await supabase
        .from('forecast_data')
        .insert(forecasts);

      if (insertError) {
        console.error('Error saving forecasts:', insertError);
        throw insertError;
      }

      console.log('Successfully generated and saved', forecasts.length, 'forecasts');
    }

    return new Response(JSON.stringify({ 
      message: 'Forecasts generated successfully',
      forecasts_count: forecasts.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in prophet-forecasts function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
