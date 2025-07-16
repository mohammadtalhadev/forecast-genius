
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
    const { user_id, product_name } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Generating Gemini insights for product:', product_name);

    let geminiInsights = null;

    if (geminiApiKey) {
      try {
        // Call Gemini API for product analysis
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analyze this product for pricing and market insights: "${product_name}"
                
                Please provide:
                1. Suggested optimal price in USD (just the number)
                2. Estimated competitor price range (min and max in USD)
                3. Product category (Electronics, Footwear, Clothing, etc.)
                4. Is this product trending, seasonal, or regular?
                5. Brief market analysis (2-3 sentences)
                
                Format your response as JSON:
                {
                  "suggested_price": 99.99,
                  "competitor_min_price": 89.99,
                  "competitor_max_price": 119.99,
                  "category": "Electronics",
                  "trend_type": "trending|seasonal|regular",
                  "market_analysis": "Brief analysis here..."
                }`
              }]
            }]
          })
        });

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (content) {
            try {
              // Extract JSON from the response
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                geminiInsights = JSON.parse(jsonMatch[0]);
              }
            } catch (parseError) {
              console.error('Error parsing Gemini response:', parseError);
            }
          }
        }
      } catch (geminiError) {
        console.error('Gemini API error:', geminiError);
      }
    }

    // Fallback values if Gemini API fails
    if (!geminiInsights) {
      geminiInsights = {
        suggested_price: 50 + Math.random() * 200,
        competitor_min_price: 40 + Math.random() * 150,
        competitor_max_price: 80 + Math.random() * 300,
        category: 'General',
        trend_type: 'regular',
        market_analysis: 'Market analysis unavailable - please configure Gemini API key for detailed insights.'
      };
    }

    // Get product ID
    const { data: productData } = await supabase
      .from('products')
      .select('id')
      .eq('user_id', user_id)
      .eq('name', product_name)
      .single();

    const productId = productData?.id;

    // Prepare insight data
    const insightData = {
      user_id,
      product_id: productId,
      product_name,
      category_type: geminiInsights.category || 'General',
      suggested_price: geminiInsights.suggested_price || 0,
      competitor_min_price: geminiInsights.competitor_min_price || 0,
      competitor_max_price: geminiInsights.competitor_max_price || 0,
      price_analysis: geminiInsights.market_analysis || 'No analysis available',
      is_trending: geminiInsights.trend_type === 'trending',
      is_seasonal: geminiInsights.trend_type === 'seasonal',
      confidence: geminiApiKey ? 0.8 : 0.4,
      currency: 'USD',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    // Save to database
    const { error } = await supabase
      .from('gemini_insights')
      .upsert(insightData, {
        onConflict: 'user_id,product_name'
      });

    if (error) {
      console.error('Error saving Gemini insights:', error);
      throw error;
    }

    console.log('Successfully saved Gemini insights for:', product_name);

    return new Response(JSON.stringify({ 
      message: 'Gemini insights generated successfully',
      insights: insightData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gemini-insights function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
