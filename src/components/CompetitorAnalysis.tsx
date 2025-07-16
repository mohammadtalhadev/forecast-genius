
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Search, Brain, RefreshCw, Store, Globe, Truck, Edit2, Trash2, Plus, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CompetitorAnalysis {
  id: string;
  product_name: string;
  market_price_min: number;
  market_price_max: number;
  dominant_brands: string[];
  customer_expectations: string;
  seasonal_insights: string;
  market_position: string;
  ai_analysis: string;
  created_at: string;
}

interface CompetitorEntry {
  id: string;
  product_name: string;
  competitor_name: string;
  price: number;
  currency: string;
  features: string[];
  seller_name: string;
  source_platform: string;
  url: string;
  last_updated: string;
  user_id: string;
}

const CompetitorAnalysis = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<CompetitorAnalysis[]>([]);
  const [competitorEntries, setCompetitorEntries] = useState<CompetitorEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [marketRegion, setMarketRegion] = useState('pakistan');
  const [newCompetitorUrl, setNewCompetitorUrl] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAnalyses();
      fetchCompetitorEntries();
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('products')
      .select('id, name, current_price, category')
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
  };

  const fetchAnalyses = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('competitor_analysis')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Error fetching competitor analyses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch competitor analyses",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompetitorEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('competitor_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('last_updated', { ascending: false });

      if (error) throw error;
      setCompetitorEntries(data || []);
    } catch (error) {
      console.error('Error fetching competitor entries:', error);
    }
  };

  const generateCompetitorAnalysis = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      console.log('Starting Groq competitor analysis for market:', marketRegion);
      
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, current_price, category')
        .eq('user_id', user.id);

      if (productsError) {
        console.error('Error fetching products:', productsError);
        throw new Error(`Failed to fetch products: ${productsError.message}`);
      }

      if (!products || products.length === 0) {
        toast({
          title: "No Products Found",
          description: "Upload some product data first to generate competitor analysis",
          variant: "destructive"
        });
        return;
      }

      const productData = products.map(product => ({
        id: product.id,
        name: product.name,
        current_price: product.current_price || 0,
        category: product.category || 'General'
      }));

      const { data, error } = await supabase.functions.invoke('chatgpt-insights', {
        body: {
          user_id: user.id,
          action: 'competitor_search',
          product_data: productData,
          market_region: marketRegion
        }
      });

      if (error) {
        console.error('Groq function error:', error);
        throw new Error(error.message || 'Failed to generate competitor analysis');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Competitor Analysis Complete",
        description: `Found ${data.competitors_found || 0} competitors for ${marketRegion} market`,
      });

      fetchAnalyses();
      fetchCompetitorEntries();
    } catch (error) {
      console.error('Error generating competitor analysis:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate competitor analysis",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const addCompetitorFromUrl = async () => {
    if (!user || !newCompetitorUrl || !selectedProduct) {
      toast({
        title: "Missing Information",
        description: "Please select a product and enter a competitor URL",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chatgpt-insights', {
        body: {
          user_id: user.id,
          action: 'scrape_competitor',
          url: newCompetitorUrl,
          product_id: selectedProduct,
          market_region: marketRegion
        }
      });

      if (error) throw error;

      toast({
        title: "Competitor Added",
        description: "Successfully scraped and added competitor data",
      });

      setNewCompetitorUrl('');
      setSelectedProduct('');
      fetchCompetitorEntries();
    } catch (error) {
      console.error('Error adding competitor:', error);
      toast({
        title: "Error",
        description: "Failed to add competitor",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCompetitorEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('competitor_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Competitor Deleted",
        description: "Competitor entry has been removed",
      });

      fetchCompetitorEntries();
    } catch (error) {
      console.error('Error deleting competitor:', error);
      toast({
        title: "Error",
        description: "Failed to delete competitor entry",
        variant: "destructive"
      });
    }
  };

  const refreshCompetitorPrice = async (entryId: string, url: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chatgpt-insights', {
        body: {
          user_id: user.id,
          action: 'refresh_price',
          url: url,
          entry_id: entryId
        }
      });

      if (error) throw error;

      toast({
        title: "Price Updated",
        description: "Competitor price has been refreshed",
      });

      fetchCompetitorEntries();
    } catch (error) {
      console.error('Error refreshing price:', error);
      toast({
        title: "Error",
        description: "Failed to refresh competitor price",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string = 'PKR') => {
    return new Intl.NumberFormat(marketRegion === 'pakistan' ? 'en-PK' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: currency === 'PKR' ? 0 : 2
    }).format(price);
  };

  const getFeatureBadgeColor = (feature: string) => {
    if (feature.toLowerCase().includes('free')) return 'bg-green-100 text-green-800';
    if (feature.toLowerCase().includes('discount')) return 'bg-red-100 text-red-800';
    if (feature.toLowerCase().includes('warranty')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to view competitor analysis.</p>
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
                <Search className="w-5 h-5 text-orange-600" />
                <span>AI Competitor Analysis</span>
              </CardTitle>
              <CardDescription>
                Groq-powered competitor tracking with live pricing and feature comparison
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
              <Button onClick={fetchAnalyses} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={generateCompetitorAnalysis} disabled={isGenerating}>
                <Brain className="w-4 h-4 mr-2" />
                {isGenerating ? 'Searching...' : 'Auto-Find Competitors'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Competitor URL Section */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-3">Add Competitor URL</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="md:col-span-2">
                <Input
                  placeholder="Paste competitor product URL..."
                  value={newCompetitorUrl}
                  onChange={(e) => setNewCompetitorUrl(e.target.value)}
                />
              </div>
              <Button onClick={addCompetitorFromUrl} disabled={isLoading}>
                <Plus className="w-4 h-4 mr-2" />
                Add Competitor
              </Button>
            </div>
          </div>

          {/* Competitor Entries */}
          {competitorEntries.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">Live Competitor Tracking</h3>
              <div className="space-y-3">
                {competitorEntries.map((entry) => (
                  <Card key={entry.id} className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium">{entry.product_name}</h4>
                          <Badge variant="outline">{entry.source_platform}</Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => refreshCompetitorPrice(entry.id, entry.url)}
                            disabled={isLoading}
                          >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setEditingEntry(entry.id)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteCompetitorEntry(entry.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={entry.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-600">Price</p>
                          <p className="text-lg font-semibold text-green-900">
                            {formatPrice(entry.price, entry.currency)}
                          </p>
                          <p className="text-xs text-green-600">by {entry.seller_name}</p>
                        </div>
                        
                        <div className="md:col-span-2">
                          <p className="text-sm text-gray-600 mb-2">Features & Benefits:</p>
                          <div className="flex flex-wrap gap-1">
                            {entry.features.map((feature, index) => (
                              <Badge 
                                key={index} 
                                className={getFeatureBadgeColor(feature)}
                                variant="secondary"
                              >
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-3">
                        Last updated: {new Date(entry.last_updated).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis Results */}
          {analyses.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Competitor Analysis</h3>
              <p className="text-gray-600 mb-4">
                Use AI to automatically find and analyze competitors in the selected market
              </p>
              <Button onClick={generateCompetitorAnalysis} disabled={isGenerating}>
                <Brain className="w-4 h-4 mr-2" />
                Start AI Analysis
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="font-semibold text-lg">AI Market Analysis</h3>
              {analyses.map((analysis) => (
                <Card key={analysis.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg text-gray-900">{analysis.product_name}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge className={
                          analysis.market_position === 'competitive' ? 'bg-green-100 text-green-800' :
                          analysis.market_position === 'too_high' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {analysis.market_position.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="flex items-center space-x-1">
                          <Globe className="w-3 h-3" />
                          <span>{marketRegion === 'pakistan' ? 'Pakistan' : 'International'}</span>
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Market Price Range</h4>
                        <div className="flex items-center justify-between">
                          <div className="text-center">
                            <p className="text-sm text-blue-600">Min Price</p>
                            <p className="text-lg font-semibold text-blue-900">
                              {formatPrice(analysis.market_price_min)}
                            </p>
                          </div>
                          <TrendingUp className="w-6 h-6 text-blue-600" />
                          <div className="text-center">
                            <p className="text-sm text-blue-600">Max Price</p>
                            <p className="text-lg font-semibold text-blue-900">
                              {formatPrice(analysis.market_price_max)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {analysis.dominant_brands && analysis.dominant_brands.length > 0 && (
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <h4 className="font-medium text-purple-900 mb-2 flex items-center">
                            <Store className="w-4 h-4 mr-2" />
                            Top Platforms
                          </h4>
                          <div className="space-y-2">
                            {analysis.dominant_brands.map((platform, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                                <span className="font-medium text-purple-800">{platform}</span>
                                <div className="flex items-center space-x-2 text-sm text-purple-600">
                                  <Truck className="w-3 h-3" />
                                  <span>
                                    {marketRegion === 'pakistan' ? 
                                      (platform.includes('Daraz') ? '1-3 days' : 
                                       platform.includes('Amazon') ? '3-7 days' : '1-5 days') :
                                      (platform.includes('Amazon') ? '1-2 days' : 
                                       platform.includes('eBay') ? '3-7 days' : '2-5 days')
                                    }
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {analysis.ai_analysis && (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-3">
                          <Brain className="w-5 h-5 text-blue-600" />
                          <h4 className="font-medium text-blue-900">Groq AI Sales Strategy</h4>
                        </div>
                        <p className="text-sm text-blue-800 leading-relaxed">{analysis.ai_analysis}</p>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-4">
                      Generated: {new Date(analysis.created_at).toLocaleString()}
                    </p>
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

export default CompetitorAnalysis;
