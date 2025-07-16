
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, ExternalLink, Plus, RefreshCw, Edit2, Trash2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CompetitorPrice {
  id: string;
  competitor_name: string;
  competitor_url: string;
  price: number;
  currency: string;
  scraped_at: string;
  product_id: string;
  product_name: string;
  features: string[];
  is_active: boolean;
  seller_name: string;
  source_platform: string;
}

interface PriceHistory {
  id: string;
  competitor_price_id: string;
  price: number;
  scraped_at: string;
}

interface Product {
  id: string;
  name: string;
  current_price: number;
}

const CompetitorPricing = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [competitorPrices, setCompetitorPrices] = useState<CompetitorPrice[]>([]);
  const [priceHistories, setPriceHistories] = useState<Record<string, PriceHistory[]>>({});
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [competitorName, setCompetitorName] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [showChart, setShowChart] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchCompetitorPrices();
    }
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('products')
      .select('id, name, current_price')
      .eq('user_id', user.id);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive"
      });
    } else {
      setProducts(data || []);
    }
  };

  const fetchCompetitorPrices = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('competitor_prices')
        .select(`
          *,
          products!inner(name)
        `)
        .eq('user_id', user.id)
        .order('scraped_at', { ascending: false });
      
      if (error) throw error;
      
      const formattedData = data.map(item => ({
        ...item,
        product_name: item.products.name,
        currency: item.currency || 'PKR',
        features: item.features || [],
        is_active: item.is_active !== false,
        seller_name: item.seller_name || '',
        source_platform: item.source_platform || ''
      }));
      
      setCompetitorPrices(formattedData);
      
      // Fetch price histories for each competitor
      const histories: Record<string, PriceHistory[]> = {};
      for (const comp of formattedData) {
        const { data: historyData } = await supabase
          .from('competitor_price_history')
          .select('*')
          .eq('competitor_price_id', comp.id)
          .order('scraped_at', { ascending: true });
        
        if (historyData) {
          histories[comp.id] = historyData;
        }
      }
      setPriceHistories(histories);
      
    } catch (error) {
      console.error('Error fetching competitor prices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch competitor prices",
        variant: "destructive"
      });
    }
  };

  const addCompetitorPrice = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to add competitor prices",
        variant: "destructive"
      });
      return;
    }

    if (!selectedProduct || !competitorName || !competitorUrl) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Use Groq AI to scrape the URL
      const { data, error } = await supabase.functions.invoke('chatgpt-insights', {
        body: {
          user_id: user.id,
          action: 'scrape_competitor_url',
          url: competitorUrl,
          competitor_name: competitorName,
          product_id: selectedProduct
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Competitor added with price: ${data.price} ${data.currency}`,
      });
      
      setCompetitorName("");
      setCompetitorUrl("");
      setSelectedProduct("");
      fetchCompetitorPrices();
    } catch (error) {
      console.error('Error adding competitor:', error);
      toast({
        title: "Error",
        description: "Failed to add competitor price",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPrice = async (competitorId: string, url: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chatgpt-insights', {
        body: {
          user_id: user.id,
          action: 'refresh_competitor_price',
          competitor_id: competitorId,
          url: url
        }
      });

      if (error) throw error;

      toast({
        title: "Price Updated",
        description: `New price: ${data.price} ${data.currency}`,
      });

      fetchCompetitorPrices();
    } catch (error) {
      console.error('Error refreshing price:', error);
      toast({
        title: "Error",
        description: "Failed to refresh price",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const editCompetitorPrice = async (competitorId: string) => {
    try {
      const { error } = await supabase
        .from('competitor_prices')
        .update({ 
          price: editPrice,
          scraped_at: new Date().toISOString()
        })
        .eq('id', competitorId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Add to price history
      await supabase
        .from('competitor_price_history')
        .insert({
          competitor_price_id: competitorId,
          price: editPrice,
          scraped_at: new Date().toISOString()
        });

      toast({
        title: "Price Updated",
        description: "Competitor price has been updated manually",
      });

      setEditingPrice(null);
      fetchCompetitorPrices();
    } catch (error) {
      console.error('Error updating price:', error);
      toast({
        title: "Error",
        description: "Failed to update price",
        variant: "destructive"
      });
    }
  };

  const deleteCompetitor = async (competitorId: string) => {
    try {
      // Delete price history first
      await supabase
        .from('competitor_price_history')
        .delete()
        .eq('competitor_price_id', competitorId);

      // Delete competitor price
      const { error } = await supabase
        .from('competitor_prices')
        .delete()
        .eq('id', competitorId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Competitor Deleted",
        description: "Competitor and all price history removed",
      });

      fetchCompetitorPrices();
    } catch (error) {
      console.error('Error deleting competitor:', error);
      toast({
        title: "Error",
        description: "Failed to delete competitor",
        variant: "destructive"
      });
    }
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || "Unknown Product";
  };

  const getProductPrice = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.current_price || 0;
  };

  const getPriceComparison = (productId: string, competitorPrice: number) => {
    const productPrice = getProductPrice(productId);
    if (productPrice === 0) return { status: 'neutral', percentage: 0 };
    
    const difference = ((productPrice - competitorPrice) / competitorPrice) * 100;
    
    if (difference > 5) return { status: 'higher', percentage: difference };
    if (difference < -5) return { status: 'lower', percentage: Math.abs(difference) };
    return { status: 'similar', percentage: Math.abs(difference) };
  };

  const formatPrice = (price: number, currency: string = 'PKR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'PKR' ? 0 : 2,
      maximumFractionDigits: currency === 'PKR' ? 0 : 2
    }).format(price);
  };

  const renderPriceChart = (competitorId: string) => {
    const history = priceHistories[competitorId] || [];
    if (history.length < 2) return null;

    const chartData = history.map(item => ({
      date: new Date(item.scraped_at).toLocaleDateString(),
      price: item.price,
      fullDate: new Date(item.scraped_at).toLocaleString()
    }));

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h5 className="font-medium mb-3">30-Day Price Trend</h5>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => [formatPrice(Number(value)), 'Price']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to access competitor pricing features.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Live Competitor Price Tracking</CardTitle>
              <CardDescription>
                Monitor competitor prices with AI-powered URL scraping and historical tracking
              </CardDescription>
            </div>
            <Button onClick={fetchCompetitorPrices} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <select
                id="product"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="competitor">Competitor Name</Label>
              <Input
                id="competitor"
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                placeholder="Amazon, Daraz, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Product Page URL</Label>
              <Input
                id="url"
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addCompetitorPrice} disabled={isLoading} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {isLoading ? 'Scraping...' : 'Add & Scrape'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Price Tracking Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {competitorPrices.map((comp) => {
              const comparison = getPriceComparison(comp.product_id, comp.price);
              return (
                <div key={comp.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold">{comp.product_name}</h4>
                      <p className="text-sm text-gray-600">{comp.competitor_name}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {editingPrice === comp.id ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(Number(e.target.value))}
                              className="w-24"
                            />
                            <Button size="sm" onClick={() => editCompetitorPrice(comp.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingPrice(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Badge variant="outline">
                              {formatPrice(comp.price, comp.currency)}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              vs Your Price: {formatPrice(getProductPrice(comp.product_id))}
                            </span>
                          </>
                        )}
                      </div>
                      
                      {comp.features && comp.features.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {comp.features.map((feature, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        {comparison.status === 'higher' && (
                          <Badge className="bg-red-100 text-red-800">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {comparison.percentage.toFixed(1)}% Higher
                          </Badge>
                        )}
                        {comparison.status === 'lower' && (
                          <Badge className="bg-green-100 text-green-800">
                            <TrendingDown className="w-3 h-3 mr-1" />
                            {comparison.percentage.toFixed(1)}% Lower
                          </Badge>
                        )}
                        {comparison.status === 'similar' && (
                          <Badge className="bg-gray-100 text-gray-800">
                            Similar Price
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => refreshPrice(comp.id, comp.competitor_url)}
                          disabled={isLoading}
                        >
                          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingPrice(comp.id);
                            setEditPrice(comp.price);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowChart(showChart === comp.id ? null : comp.id)}
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteCompetitor(comp.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={comp.competitor_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {showChart === comp.id && renderPriceChart(comp.id)}
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Last updated: {new Date(comp.scraped_at).toLocaleString()}
                  </p>
                </div>
              );
            })}
            {competitorPrices.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No competitor prices tracked yet. Add competitor URLs to get started with AI-powered price tracking.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompetitorPricing;
