import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, RefreshCw, Package, Zap, Star, Target, ChartLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ProductForecastChart from "./ProductForecastChart";

interface ForecastData {
  product_id: string;
  product_name: string;
  forecast_7d: number;
  forecast_30d: number;
  forecast_90d: number;
  forecast_365d: number;
  trend_status: 'trending' | 'seasonal' | 'declining' | 'stable';
  confidence_score: number;
  generated_at: string;
  gemini_price?: number;
  competitor_min?: number;
  competitor_max?: number;
  is_trending?: boolean;
  is_seasonal?: boolean;
  price_analysis?: string;
  trend_score?: number;
  currency: 'USD' | 'PKR';
}

const SmartForecastChart = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'PKR'>('USD');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [showDetailedChart, setShowDetailedChart] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserCurrency();
      fetchForecastData();
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

  const fetchForecastData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch forecast data with Gemini insights
      const { data: forecasts, error: forecastError } = await supabase
        .from('forecast_data')
        .select(`
          *,
          products!inner (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false });

      if (forecastError) throw forecastError;

      if (!forecasts || forecasts.length === 0) {
        setForecastData([]);
        return;
      }

      // Fetch Gemini insights
      const { data: geminiData } = await supabase
        .from('gemini_insights')
        .select('*')
        .eq('user_id', user.id);

      // Fetch Google Trends data
      const { data: trendsData } = await supabase
        .from('google_trends_data')
        .select('*')
        .eq('user_id', user.id);

      // Combine the data
      const combinedData = forecasts.map(forecast => {
        const productName = forecast.products?.name || 'Unknown Product';
        const geminiInsight = geminiData?.find(g => g.product_name === productName);
        const trendData = trendsData?.find(t => t.product_name === productName);

        return {
          product_id: forecast.product_id,
          product_name: productName,
          forecast_7d: forecast.forecast_7d || 0,
          forecast_30d: forecast.forecast_30d || 0,
          forecast_90d: forecast.forecast_90d || 0,
          forecast_365d: forecast.forecast_365d || 0,
          trend_status: forecast.trend_status || 'stable',
          confidence_score: Math.round((forecast.confidence_score || 0.5) * 100),
          generated_at: forecast.generated_at,
          gemini_price: geminiInsight?.suggested_price || 0,
          competitor_min: geminiInsight?.competitor_min_price || 0,
          competitor_max: geminiInsight?.competitor_max_price || 0,
          is_trending: geminiInsight?.is_trending || false,
          is_seasonal: geminiInsight?.is_seasonal || false,
          price_analysis: geminiInsight?.price_analysis || 'No analysis available',
          trend_score: trendData?.trend_score || 0,
          currency: currency
        } as ForecastData;
      });

      setForecastData(combinedData);
    } catch (error) {
      console.error('Error fetching forecast data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch forecast data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (status: string) => {
    switch (status) {
      case 'trending': return TrendingUp;
      case 'declining': return TrendingDown;
      default: return Package;
    }
  };

  const getTrendColor = (status: string) => {
    switch (status) {
      case 'trending': return 'text-green-600 bg-green-100';
      case 'declining': return 'text-red-600 bg-red-100';
      case 'seasonal': return 'text-purple-600 bg-purple-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const formatCurrency = (amount: number) => {
    const symbol = currency === 'PKR' ? 'Rs.' : '$';
    const multiplier = currency === 'PKR' ? 280 : 1;
    return `${symbol}${(amount * multiplier).toLocaleString()}`;
  };

  const getProductTag = (item: ForecastData) => {
    if (item.is_trending) return { icon: '🔥', text: 'Trending Now', color: 'bg-red-100 text-red-800' };
    if (item.is_seasonal) return { icon: '🍂', text: 'Seasonal', color: 'bg-orange-100 text-orange-800' };
    return { icon: '📦', text: 'Regular', color: 'bg-gray-100 text-gray-800' };
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to view forecasts.</p>
      </div>
    );
  }

  if (forecastData.length === 0 && !isLoading) {
    return (
      <div className="text-center py-8">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Forecasts Available</h3>
        <p className="text-gray-600 mb-4">Upload your sales data first to generate AI-powered forecasts.</p>
        <Button onClick={() => window.location.hash = 'upload'}>
          Upload Sales Data
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={currency} onValueChange={(value: 'USD' | 'PKR') => setCurrency(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="PKR">PKR (Rs.)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {forecastData.map((product) => (
                <SelectItem key={product.product_id} value={product.product_id}>
                  {product.product_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={fetchForecastData} disabled={isLoading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Detailed Chart Modal */}
      {showDetailedChart && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <ChartLine className="w-5 h-5" />
                <span>Detailed Forecast Chart</span>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowDetailedChart(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {forecastData
              .filter(product => product.product_id === showDetailedChart)
              .map(product => (
                <ProductForecastChart 
                  key={product.product_id}
                  product={product}
                  currency={currency}
                />
              ))}
          </CardContent>
        </Card>
      )}

      {/* Forecast Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {forecastData
          .filter(product => selectedProduct === 'all' || product.product_id === selectedProduct)
          .map((product) => {
            const TrendIcon = getTrendIcon(product.trend_status);
            const productTag = getProductTag(product);
            
            return (
              <Card key={product.product_id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{product.product_name}</CardTitle>
                      <CardDescription>
                        Forecast Generated: {new Date(product.generated_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={getTrendColor(product.trend_status)}>
                        <TrendIcon className="w-3 h-3 mr-1" />
                        {product.trend_status}
                      </Badge>
                      <Badge className={productTag.color}>
                        {productTag.icon} {productTag.text}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Forecast Numbers */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-blue-600">7 Days</div>
                      <div className="text-lg font-bold text-blue-800">{product.forecast_7d} units</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm text-green-600">30 Days</div>
                      <div className="text-lg font-bold text-green-800">{product.forecast_30d} units</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-sm text-purple-600">90 Days</div>
                      <div className="text-lg font-bold text-purple-800">{product.forecast_90d} units</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="text-sm text-orange-600">1 Year</div>
                      <div className="text-lg font-bold text-orange-800">{product.forecast_365d} units</div>
                    </div>
                  </div>

                  {/* AI Pricing Insights */}
                  {product.gemini_price > 0 && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border">
                      <div className="flex items-center space-x-2 mb-2">
                        <Star className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-purple-900">Gemini AI Pricing</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-purple-600">Suggested Price</div>
                          <div className="text-lg font-bold text-purple-800">
                            {formatCurrency(product.gemini_price)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-purple-600">Competitor Range</div>
                          <div className="text-sm font-bold text-purple-800">
                            {formatCurrency(product.competitor_min)} - {formatCurrency(product.competitor_max)}
                          </div>
                        </div>
                      </div>
                      {product.price_analysis && (
                        <div className="mt-2 text-xs text-purple-700 italic">
                          {product.price_analysis}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Insights */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span>Confidence: {product.confidence_score}%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span>Trend Score: {product.trend_score || 0}/100</span>
                    </div>
                  </div>

                  {/* Chart Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setShowDetailedChart(product.product_id)}
                  >
                    <ChartLine className="w-4 h-4 mr-2" />
                    View Detailed Chart
                  </Button>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
};

export default SmartForecastChart;
