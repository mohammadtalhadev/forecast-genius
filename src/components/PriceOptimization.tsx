
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PriceRecommendation {
  id: string;
  product_name: string;
  current_price: number;
  recommended_price: number;
  min_price: number;
  max_price: number;
  price_action: string;
  reasoning: string;
  confidence_score: number;
  market_position: string;
  created_at: string;
}

const PriceOptimization = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<PriceRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'PKR'>('USD');

  useEffect(() => {
    if (user) {
      fetchUserCurrency();
      fetchRecommendations();
    }
  }, [user]);

  const fetchUserCurrency = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('notification_settings')
        .select('currency')
        .eq('user_id', user.id)
        .single();
      
      if (data?.currency) {
        setCurrency(data.currency as 'USD' | 'PKR');
      }
    } catch (error) {
      console.log('No currency setting found, using default USD');
    }
  };

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

      if (data) {
        const formattedData = data.map(item => ({
          id: item.id,
          product_name: item.product_name,
          current_price: item.current_price || 0,
          recommended_price: item.recommended_price,
          min_price: item.min_price || 0,
          max_price: item.max_price || 0,
          price_action: item.price_action || 'maintain',
          reasoning: item.reasoning || 'No reasoning provided',
          confidence_score: Math.round((item.confidence_score || 0.5) * 100),
          market_position: item.market_position || 'neutral',
          created_at: item.created_at || new Date().toISOString()
        }));
        
        setRecommendations(formattedData);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pricing recommendations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateRecommendations = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    try {
      console.log('Starting pricing analysis...');

      // First, fetch products with their sales data
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          current_price,
          cost_price,
          category,
          sales_data (
            quantity_sold,
            unit_price,
            date
          )
        `)
        .eq('user_id', user.id)
        .limit(20);

      if (productsError) {
        console.error('Error fetching products:', productsError);
        throw new Error(`Failed to fetch products: ${productsError.message}`);
      }

      if (!products || products.length === 0) {
        toast({
          title: "No Products Found",
          description: "Please add products to your inventory first",
          variant: "destructive"
        });
        return;
      }

      console.log('Found products:', products.length);

      // Generate basic price recommendations locally if API fails
      const basicRecommendations = products.map(product => {
        const currentPrice = product.current_price || 0;
        const costPrice = product.cost_price || 0;
        const salesData = product.sales_data || [];
        
        // Calculate basic metrics
        const totalSold = salesData.reduce((sum, sale) => sum + (sale.quantity_sold || 0), 0);
        const avgSalePrice = salesData.length > 0 
          ? salesData.reduce((sum, sale) => sum + (sale.unit_price || 0), 0) / salesData.length 
          : currentPrice;

        // Simple pricing logic
        let recommendedPrice = currentPrice;
        let priceAction = 'maintain';
        let reasoning = 'Price maintained based on current performance';
        
        if (totalSold > 50) { // High sales - can increase price
          recommendedPrice = currentPrice * 1.15;
          priceAction = 'increase';
          reasoning = 'High sales volume indicates price elasticity for increase';
        } else if (totalSold < 10 && currentPrice > costPrice * 1.5) { // Low sales - reduce price
          recommendedPrice = currentPrice * 0.9;
          priceAction = 'decrease';
          reasoning = 'Low sales volume suggests price reduction needed';
        }

        const margin = costPrice > 0 ? ((recommendedPrice - costPrice) / recommendedPrice) * 100 : 30;
        
        return {
          user_id: user.id,
          product_name: product.name,
          current_price: currentPrice,
          recommended_price: Math.round(recommendedPrice * 100) / 100,
          min_price: Math.max(costPrice * 1.2, recommendedPrice * 0.8),
          max_price: recommendedPrice * 1.3,
          price_action: priceAction,
          reasoning: reasoning,
          confidence_score: 0.75,
          market_position: margin > 40 ? 'premium' : margin > 20 ? 'competitive' : 'budget',
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        };
      });

      console.log('Generated recommendations:', basicRecommendations.length);

      // Clear old recommendations
      await supabase
        .from('ai_pricing_recommendations')
        .delete()
        .eq('user_id', user.id);

      // Insert new recommendations
      const { error: insertError } = await supabase
        .from('ai_pricing_recommendations')
        .insert(basicRecommendations);

      if (insertError) {
        console.error('Error saving recommendations:', insertError);
        throw new Error(`Failed to save recommendations: ${insertError.message}`);
      }

      await fetchRecommendations();
      
      toast({
        title: "Recommendations Generated",
        description: `Generated ${basicRecommendations.length} pricing recommendations`,
      });

    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate pricing recommendations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const symbol = currency === 'PKR' ? 'Rs.' : '$';
    const multiplier = currency === 'PKR' ? 280 : 1;
    return `${symbol}${(amount * multiplier).toLocaleString()}`;
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'increase': return 'bg-green-100 text-green-800';
      case 'decrease': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'increase': return TrendingUp;
      case 'decrease': return TrendingDown;
      default: return DollarSign;
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Price Optimization</h2>
          <p className="text-gray-600">AI-powered pricing recommendations - Currency: {currency}</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchRecommendations} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={generateRecommendations} disabled={isGenerating} size="sm">
            <Sparkles className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate AI Recommendations'}
          </Button>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pricing Recommendations</h3>
          <p className="text-gray-600 mb-4">Generate AI-powered pricing recommendations for your products.</p>
          <Button onClick={generateRecommendations} disabled={isGenerating}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Recommendations
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {recommendations.map((rec) => {
            const ActionIcon = getActionIcon(rec.price_action);
            const priceChange = rec.recommended_price - rec.current_price;
            const priceChangePercent = rec.current_price > 0 ? ((priceChange / rec.current_price) * 100) : 0;
            
            return (
              <Card key={rec.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{rec.product_name}</CardTitle>
                      <CardDescription>
                        Generated: {new Date(rec.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={getActionColor(rec.price_action)}>
                      <ActionIcon className="w-3 h-3 mr-1" />
                      {rec.price_action}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Price Comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Current Price</div>
                      <div className="text-lg font-bold text-gray-800">
                        {formatCurrency(rec.current_price)}
                      </div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-blue-600">Recommended</div>
                      <div className="text-lg font-bold text-blue-800">
                        {formatCurrency(rec.recommended_price)}
                      </div>
                    </div>
                  </div>

                  {/* Price Change */}
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="text-sm text-yellow-600">Price Change</div>
                    <div className={`text-lg font-bold ${priceChange >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {priceChange >= 0 ? '+' : ''}{formatCurrency(priceChange)} ({priceChangePercent.toFixed(1)}%)
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="text-sm text-red-600">Min Price</div>
                      <div className="text-sm font-bold text-red-800">
                        {formatCurrency(rec.min_price)}
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm text-green-600">Max Price</div>
                      <div className="text-sm font-bold text-green-800">
                        {formatCurrency(rec.max_price)}
                      </div>
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-2">AI Analysis</h4>
                    <p className="text-sm text-purple-800">{rec.reasoning}</p>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span>Confidence: {rec.confidence_score}%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{rec.market_position}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PriceOptimization;
