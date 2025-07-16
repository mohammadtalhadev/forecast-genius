import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Zap, TrendingUp, TrendingDown, Minus, RefreshCw, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PricingRecommendation {
  id: string;
  product_name: string;
  current_price: number;
  recommended_price: number;
  min_price: number;
  max_price: number;
  confidence_score: number;
  reasoning: string;
  price_action: string;
  market_position: string;
  created_at: string;
}

const AIPricingAssistant = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<PricingRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [marketRegion, setMarketRegion] = useState('pakistan');

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_pricing_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error) {
      console.error('Error fetching pricing recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pricing recommendations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePricingRecommendations = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      console.log('Starting Groq pricing analysis for market:', marketRegion);
      
      // Fetch products with forecast data
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          current_price,
          current_stock,
          category,
          forecast_data!inner (
            forecast_7d,
            forecast_30d,
            forecast_90d,
            forecast_365d
          )
        `)
        .eq('user_id', user.id);

      if (productsError) {
        console.error('Error fetching products:', productsError);
        throw new Error(`Failed to fetch products: ${productsError.message}`);
      }

      if (!products || products.length === 0) {
        toast({
          title: "No Products Found",
          description: "Upload some product data and generate forecasts first to get pricing recommendations",
          variant: "destructive"
        });
        return;
      }

      console.log('Found', products.length, 'products for pricing analysis');

      // Prepare product data for AI analysis
      const productData = products.map(product => ({
        id: product.id,
        name: product.name,
        current_price: product.current_price || 0,
        current_stock: product.current_stock || 0,
        category: product.category || 'General',
        forecast_7d: product.forecast_data?.[0]?.forecast_7d || 0,
        forecast_30d: product.forecast_data?.[0]?.forecast_30d || 0,
        forecast_90d: product.forecast_data?.[0]?.forecast_90d || 0,
        forecast_365d: product.forecast_data?.[0]?.forecast_365d || 0
      }));

      console.log('Sample product data:', productData[0]);
      console.log('Calling Groq function for pricing analysis...');

      // Call Groq function
      const { data, error } = await supabase.functions.invoke('chatgpt-insights', {
        body: {
          user_id: user.id,
          action: 'analyze_pricing',
          product_data: productData,
          market_region: marketRegion
        }
      });

      if (error) {
        console.error('Groq function error:', error);
        throw new Error(error.message || 'Failed to generate pricing recommendations');
      }

      console.log('Groq function response:', data);

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "⚡ Groq AI Pricing Complete",
        description: `Generated ${data.recommendations_generated || 0} ultra-fast pricing recommendations for ${marketRegion} market`,
      });

      fetchRecommendations();
    } catch (error) {
      console.error('Error generating pricing recommendations:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate pricing recommendations. Please check your data and try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getPriceActionIcon = (action: string) => {
    switch (action) {
      case 'increase':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'decrease':
      case 'discount':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'maintain':
        return <Minus className="w-4 h-4 text-blue-600" />;
      default:
        return <DollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMarketPositionColor = (position: string) => {
    switch (position) {
      case 'competitive':
        return 'bg-green-100 text-green-800';
      case 'too_high':
        return 'bg-red-100 text-red-800';
      case 'below_market':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (price: number) => {
    const currency = marketRegion === 'pakistan' ? 'PKR' : 'USD';
    return new Intl.NumberFormat(marketRegion === 'pakistan' ? 'en-PK' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: marketRegion === 'pakistan' ? 0 : 2
    }).format(price);
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to view pricing recommendations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-purple-600" />
                <span>Groq AI Pricing Assistant</span>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  LLaMA 3 Powered
                </Badge>
              </CardTitle>
              <CardDescription>
                Ultra-fast pricing recommendations powered by Groq's LLaMA 3 & Mixtral models
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={marketRegion} onValueChange={setMarketRegion}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pakistan">🇵🇰 Pakistan</SelectItem>
                  <SelectItem value="international">🌍 International</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchRecommendations} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={generatePricingRecommendations} disabled={isGenerating}>
                <Zap className="w-4 h-4 mr-2" />
                {isGenerating ? 'Analyzing...' : 'Generate Groq Pricing'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pricing Recommendations</h3>
              <p className="text-gray-600 mb-4">
                Generate lightning-fast AI pricing recommendations using Groq LLMs for your selected market
              </p>
              <Button onClick={generatePricingRecommendations} disabled={isGenerating}>
                <Zap className="w-4 h-4 mr-2" />
                Generate Groq Pricing Analysis
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations.map((rec) => (
                <Card key={rec.id} className="border-l-4 border-l-purple-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg text-gray-900">{rec.product_name}</h3>
                      <Badge className={getMarketPositionColor(rec.market_position)}>
                        {rec.market_position.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Current vs Recommended Price */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">Current Price</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatPrice(rec.current_price)}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                          <p className="text-sm text-purple-600">Groq Recommended</p>
                          <p className="text-lg font-semibold text-purple-900">
                            {formatPrice(rec.recommended_price)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Price Action */}
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          {getPriceActionIcon(rec.price_action)}
                          <span className="font-medium text-blue-900">
                            {rec.price_action.charAt(0).toUpperCase() + rec.price_action.slice(1)}
                          </span>
                        </div>
                        <div className="text-sm text-blue-700">
                          {rec.price_action === 'increase' && 
                            `+${formatPrice(rec.recommended_price - rec.current_price)}`}
                          {rec.price_action === 'decrease' && 
                            `-${formatPrice(rec.current_price - rec.recommended_price)}`}
                          {rec.price_action === 'maintain' && 'No change'}
                        </div>
                      </div>
                      
                      {/* Price Range */}
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">Market Price Range</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {formatPrice(rec.min_price)}
                          </span>
                          <div className="flex-1 mx-3 h-2 bg-gray-200 rounded-full relative">
                            <div 
                              className="absolute h-2 bg-purple-500 rounded-full"
                              style={{
                                left: `${((rec.recommended_price - rec.min_price) / (rec.max_price - rec.min_price)) * 100}%`,
                                width: '4px'
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {formatPrice(rec.max_price)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Confidence Score */}
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm font-medium text-green-900">Groq Confidence</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-green-500 rounded-full"
                              style={{ width: `${rec.confidence_score * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-green-900">
                            {Math.round(rec.confidence_score * 100)}%
                          </span>
                        </div>
                      </div>
                      
                      {/* AI Reasoning */}
                      {rec.reasoning && (
                        <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Zap className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-900">Groq LLM Analysis</span>
                          </div>
                          <p className="text-sm text-purple-800">{rec.reasoning}</p>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500">
                        Generated: {new Date(rec.created_at).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIPricingAssistant;
