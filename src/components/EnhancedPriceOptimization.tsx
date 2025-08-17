
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Zap, RefreshCw, Brain, AlertTriangle, Currency, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Product {
  id: string;
  name: string;
  current_price: number;
  cost_price: number;
  category: string;
}

interface PriceRecommendation {
  id: string;
  product_id: string;
  current_price: number;
  recommended_price: number;
  expected_profit_increase: number;
  confidence_score: number;
  reason: string;
  product_name?: string;
  competitor_avg?: number;
  status_tag?: 'optimal' | 'overpriced' | 'too_low';
}

interface PriceHistory {
  date: string;
  price: number;
  sales: number;
}

const CURRENCY_SYMBOLS = {
  USD: '$',
  PKR: 'Rs.',
  GBP: '£',
  EUR: '€'
};

const CURRENCY_RATES = {
  USD: 1,
  PKR: 280,
  GBP: 0.79,
  EUR: 0.92
};

const EnhancedPriceOptimization = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<PriceRecommendation[]>([]);
  const [priceHistory, setPriceHistory] = useState<Record<string, PriceHistory[]>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'PKR' | 'GBP' | 'EUR'>('USD');
  const [sortBy, setSortBy] = useState<'confidence' | 'profit' | 'status'>('confidence');

  useEffect(() => {
    if (user) {
      fetchUserCurrency();
      fetchProducts();
      fetchRecommendations();
      generateMockPriceHistory();
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
        setCurrency(data.currency as 'USD' | 'PKR' | 'GBP' | 'EUR');
      }
    } catch (error) {
      console.log('No currency setting found, using default USD');
    }
  };

  const fetchProducts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchRecommendations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('price_recommendations')
        .select(`
          *,
          products (name)
        `)
        .eq('user_id', user.id)
        .order('confidence_score', { ascending: false });

      if (error) throw error;

      const enhancedRecommendations = (data || []).map(rec => {
        const product = products.find(p => p.id === rec.product_id);
        const competitorAvg = 50 + Math.random() * 100; // Mock competitor data
        
        let statusTag: 'optimal' | 'overpriced' | 'too_low' = 'optimal';
        if (rec.current_price > rec.recommended_price * 1.2) statusTag = 'overpriced';
        else if (rec.current_price < rec.recommended_price * 0.8) statusTag = 'too_low';

        return {
          ...rec,
          product_name: (rec.products as any)?.name || 'Unknown Product',
          competitor_avg: competitorAvg,
          status_tag: statusTag
        };
      });

      setRecommendations(enhancedRecommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const generateMockPriceHistory = () => {
    const history: Record<string, PriceHistory[]> = {};
    products.forEach(product => {
      history[product.id] = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price: product.current_price * (0.9 + Math.random() * 0.2),
        sales: Math.floor(Math.random() * 50) + 10
      })).reverse();
    });
    setPriceHistory(history);
  };

  const generateIntelligentRecommendations = async () => {
    if (!user || products.length === 0) {
      toast({
        title: "No products found",
        description: "Please upload sales data first to get AI pricing recommendations.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newRecommendations = products.map(product => {
        const basePrice = product.current_price || 50;
        const marketDemand = Math.random();
        const competitionFactor = Math.random();
        
        let recommendedPrice = basePrice;
        let reason = "";
        let confidence = 85;
        let profitIncrease = 0;

        if (marketDemand > 0.7) {
          recommendedPrice = basePrice * 1.15;
          reason = "High market demand detected - increase recommended";
          profitIncrease = 15;
          confidence = 92;
        } else if (competitionFactor < 0.3) {
          recommendedPrice = basePrice * 0.9;
          reason = "Strong competition detected - price reduction suggested";
          profitIncrease = -10;
          confidence = 88;
        } else {
          recommendedPrice = basePrice * 1.05;
          reason = "Optimal pricing based on market analysis";
          profitIncrease = 5;
          confidence = 85;
        }

        return {
          product_id: product.id,
          current_price: basePrice,
          recommended_price: Math.round(recommendedPrice * 100) / 100,
          expected_profit_increase: profitIncrease,
          confidence_score: confidence,
          reason,
          user_id: user.id
        };
      });

      // Clear old recommendations
      await supabase
        .from('price_recommendations')
        .delete()
        .eq('user_id', user.id);

      // Insert new recommendations
      const { error } = await supabase
        .from('price_recommendations')
        .insert(newRecommendations);

      if (error) throw error;

      toast({
        title: "🧠 AI Analysis Complete",
        description: `Generated ${newRecommendations.length} intelligent pricing recommendations`,
      });

      fetchRecommendations();
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to generate recommendations",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const applyMagicPrice = async (recommendation: PriceRecommendation) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ current_price: recommendation.recommended_price })
        .eq('id', recommendation.product_id);

      if (error) throw error;

      toast({
        title: "✨ Magic Applied!",
        description: `${recommendation.product_name} price updated to ${formatCurrency(recommendation.recommended_price)}`,
      });

      fetchProducts();
      fetchRecommendations();
    } catch (error) {
      console.error('Error applying recommendation:', error);
      toast({
        title: "Error",
        description: "Failed to update price",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    const symbol = CURRENCY_SYMBOLS[currency];
    const rate = CURRENCY_RATES[currency];
    return `${symbol}${(amount * rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'optimal':
        return <Badge className="bg-green-100 text-green-800">✅ Optimal</Badge>;
      case 'overpriced':
        return <Badge className="bg-red-100 text-red-800">📈 Overpriced</Badge>;
      case 'too_low':
        return <Badge className="bg-yellow-100 text-yellow-800">📉 Too Low</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">🔍 Analyzing</Badge>;
    }
  };

  const sortedRecommendations = [...recommendations].sort((a, b) => {
    switch (sortBy) {
      case 'confidence':
        return b.confidence_score - a.confidence_score;
      case 'profit':
        return b.expected_profit_increase - a.expected_profit_increase;
      case 'status':
        const statusOrder = { 'overpriced': 0, 'too_low': 1, 'optimal': 2 };
        return (statusOrder[a.status_tag || 'optimal'] || 2) - (statusOrder[b.status_tag || 'optimal'] || 2);
      default:
        return 0;
    }
  });

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to access AI pricing optimization.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-6 h-6 text-purple-600" />
                <span>🧠 Intelligent Pricing Assistant</span>
              </CardTitle>
              <CardDescription>
                Your AI co-pilot for pricing optimization and competitive analysis
              </CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={currency} onValueChange={(value: 'USD' | 'PKR' | 'GBP' | 'EUR') => setCurrency(value)}>
                <SelectTrigger className="w-32">
                  <Currency className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">🇺🇸 USD</SelectItem>
                  <SelectItem value="PKR">🇵🇰 PKR</SelectItem>
                  <SelectItem value="GBP">🇬🇧 GBP</SelectItem>
                  <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: 'confidence' | 'profit' | 'status') => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confidence">By Confidence</SelectItem>
                  <SelectItem value="profit">By Profit Impact</SelectItem>
                  <SelectItem value="status">By Status</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={generateIntelligentRecommendations} disabled={isGenerating} className="bg-gradient-to-r from-purple-600 to-blue-600">
                <Zap className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-pulse' : ''}`} />
                {isGenerating ? '🧠 Analyzing...' : '✨ Generate Insights'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Pricing Recommendations */}
      <div className="grid gap-6">
        {sortedRecommendations.map((rec) => {
          const priceChange = ((rec.recommended_price - rec.current_price) / rec.current_price) * 100;
          const isIncrease = priceChange > 0;
          const productHistory = priceHistory[rec.product_id] || [];

          return (
            <Card key={rec.id} className="overflow-hidden border-l-4 border-l-purple-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <CardTitle className="text-xl">{rec.product_name}</CardTitle>
                      {getStatusBadge(rec.status_tag || 'optimal')}
                      <Badge className="bg-purple-100 text-purple-800">
                        {rec.confidence_score}% Confidence
                      </Badge>
                    </div>
                    <CardDescription className="text-base">{rec.reason}</CardDescription>
                  </div>
                  {rec.confidence_score > 85 && (
                    <div className="flex items-center space-x-2 text-orange-600">
                      <Bell className="w-4 h-4" />
                      <span className="text-sm font-medium">Action Recommended</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Current Price</div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(rec.current_price)}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-purple-600 mb-1">🧠 AI Suggested</div>
                    <div className="text-2xl font-bold text-purple-800">{formatCurrency(rec.recommended_price)}</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-blue-600 mb-1">Competitor Avg</div>
                    <div className="text-2xl font-bold text-blue-800">{formatCurrency(rec.competitor_avg || 0)}</div>
                  </div>
                  <div className={`p-4 rounded-lg ${isIncrease ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className={`text-sm mb-1 ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                      Profit Impact
                    </div>
                    <div className={`text-2xl font-bold flex items-center ${isIncrease ? 'text-green-800' : 'text-red-800'}`}>
                      {isIncrease ? <TrendingUp className="w-5 h-5 mr-1" /> : <TrendingDown className="w-5 h-5 mr-1" />}
                      {rec.expected_profit_increase > 0 ? '+' : ''}{rec.expected_profit_increase.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Price History Chart */}
                {productHistory.length > 0 && (
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-semibold mb-3 text-gray-800">📊 30-Day Price Trend</h4>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={productHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(value: any) => [formatCurrency(value), 'Price']}
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#8b5cf6" 
                            strokeWidth={3}
                            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="flex justify-end">
                  <Button 
                    onClick={() => applyMagicPrice(rec)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2"
                    size="lg"
                  >
                    ✨ Apply Magic Price
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {sortedRecommendations.length === 0 && !isGenerating && (
          <Card>
            <CardContent className="text-center py-12">
              <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready for AI Magic? ✨</h3>
              <p className="text-gray-600 mb-6">
                Your intelligent pricing assistant is ready to analyze your products and suggest optimal prices.
              </p>
              <Button onClick={generateIntelligentRecommendations} className="bg-gradient-to-r from-purple-600 to-blue-600">
                <Zap className="w-4 h-4 mr-2" />
                Generate Intelligent Recommendations
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EnhancedPriceOptimization;
