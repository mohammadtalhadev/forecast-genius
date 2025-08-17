
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Package, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, ShoppingCart, Clock, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface InventoryItem {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  max_capacity: number;
  stock_percentage: number;
  days_until_sellout: number;
  reorder_quantity: number;
  forecast_30d: number;
  daily_avg_sales: number;
  status: 'critical' | 'low' | 'optimal' | 'overstock';
  trend_data: Array<{ date: string; sales: number; }>;
  ai_recommendation: 'reorder_now' | 'hold' | 'reduce_stock';
  currency: 'USD' | 'PKR';
}

const InventoryManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'PKR'>('USD');
  const [sortBy, setSortBy] = useState<'critical' | 'turnover' | 'sellout'>('critical');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (user) {
      fetchUserCurrency();
      fetchInventoryData();
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

  const fetchInventoryData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch inventory metrics from database
      const { data: metricsData, error: metricsError } = await supabase
        .from('inventory_metrics')
        .select(`
          *,
          products!inner (
            id,
            name,
            sku,
            current_price,
            current_stock,
            min_stock_level,
            max_stock_level,
            reorder_quantity
          )
        `)
        .eq('user_id', user.id);

      if (metricsError) throw metricsError;

      if (!metricsData || metricsData.length === 0) {
        // If no metrics, try to fetch products directly
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', user.id);

        if (productsError) throw productsError;

        if (!productsData || productsData.length === 0) {
          setInventoryItems([]);
          return;
        }

        // Create basic inventory items from products
        const basicInventory = productsData.map(product => ({
          product_id: product.id,
          product_name: product.name,
          sku: product.sku || 'N/A',
          current_stock: product.current_stock || 0,
          max_capacity: product.max_stock_level || 100,
          stock_percentage: Math.round(((product.current_stock || 0) / (product.max_stock_level || 100)) * 100),
          days_until_sellout: 30, // Default value
          reorder_quantity: product.reorder_quantity || 20,
          forecast_30d: 0,
          daily_avg_sales: 0,
          status: 'optimal' as const,
          trend_data: [],
          ai_recommendation: 'hold' as const,
          currency: currency
        }));

        setInventoryItems(basicInventory);
        return;
      }

      // Process metrics data
      const inventory: InventoryItem[] = metricsData.map(metric => {
        const product = metric.products;
        const stockPercentage = product.max_stock_level > 0 
          ? Math.round((metric.current_stock / product.max_stock_level) * 100)
          : 0;

        // Generate trend data (simplified)
        const trendData = Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          sales: Math.max(0, metric.daily_avg_sales + (Math.random() - 0.5) * metric.daily_avg_sales * 0.3)
        })).reverse();

        // Determine AI recommendation
        let aiRecommendation: 'reorder_now' | 'hold' | 'reduce_stock' = 'hold';
        if (metric.stock_status === 'critical' || metric.stock_status === 'low') {
          aiRecommendation = 'reorder_now';
        } else if (metric.stock_status === 'overstock') {
          aiRecommendation = 'reduce_stock';
        }

        return {
          product_id: product.id,
          product_name: product.name,
          sku: product.sku || 'N/A',
          current_stock: metric.current_stock,
          max_capacity: product.max_stock_level || 100,
          stock_percentage: stockPercentage,
          days_until_sellout: metric.days_until_sellout,
          reorder_quantity: metric.reorder_quantity,
          forecast_30d: Math.round(metric.daily_avg_sales * 30),
          daily_avg_sales: Math.round(metric.daily_avg_sales * 10) / 10,
          status: metric.stock_status as 'critical' | 'low' | 'optimal' | 'overstock',
          trend_data: trendData,
          ai_recommendation: aiRecommendation,
          currency: currency
        };
      });

      setInventoryItems(inventory);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sortItems = (items: InventoryItem[]) => {
    switch (sortBy) {
      case 'critical':
        return [...items].sort((a, b) => {
          const statusOrder = { critical: 0, low: 1, optimal: 2, overstock: 3 };
          return statusOrder[a.status] - statusOrder[b.status];
        });
      case 'turnover':
        return [...items].sort((a, b) => b.daily_avg_sales - a.daily_avg_sales);
      case 'sellout':
        return [...items].sort((a, b) => a.days_until_sellout - b.days_until_sellout);
      default:
        return items;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'optimal': return 'bg-green-100 text-green-800';
      case 'overstock': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return AlertTriangle;
      case 'low': return TrendingDown;
      case 'optimal': return TrendingUp;
      case 'overstock': return Package;
      default: return Package;
    }
  };

  const getRecommendationText = (recommendation: string) => {
    switch (recommendation) {
      case 'reorder_now': return 'Reorder Now';
      case 'reduce_stock': return 'Reduce Stock';
      default: return 'Hold';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'reorder_now': return 'bg-red-50 text-red-700 border-red-200';
      case 'reduce_stock': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-green-50 text-green-700 border-green-200';
    }
  };

  const formatCurrency = (amount: number) => {
    const symbol = currency === 'PKR' ? 'Rs.' : '$';
    const multiplier = currency === 'PKR' ? 280 : 1;
    return `${symbol}${(amount * multiplier).toLocaleString()}`;
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to view inventory management.</p>
      </div>
    );
  }

  const sortedItems = sortItems(inventoryItems);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Inventory Management</h2>
          <p className="text-gray-600">Last updated: {lastRefresh.toLocaleTimeString()}</p>
        </div>
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
          <Select value={sortBy} onValueChange={(value: 'critical' | 'turnover' | 'sellout') => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">Critical Stock</SelectItem>
              <SelectItem value="turnover">Highest Turnover</SelectItem>
              <SelectItem value="sellout">Soonest Sellout</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchInventoryData} disabled={isLoading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-gray-600">Critical Items</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-red-600">
                {sortedItems.filter(item => item.status === 'critical').length}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-gray-600">Low Stock</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-yellow-600">
                {sortedItems.filter(item => item.status === 'low').length}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Optimal</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-green-600">
                {sortedItems.filter(item => item.status === 'optimal').length}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Overstock</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-blue-600">
                {sortedItems.filter(item => item.status === 'overstock').length}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Items */}
      {sortedItems.length === 0 ? (
        <div className="text-center py-8">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Inventory Data</h3>
          <p className="text-gray-600 mb-4">Upload your sales data to get started with inventory management.</p>
          <Button onClick={() => window.location.hash = 'upload'}>
            Upload Sales Data
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedItems.map((item) => {
            const StatusIcon = getStatusIcon(item.status);
            
            return (
              <Card key={item.product_id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.product_name}</CardTitle>
                      <CardDescription>SKU: {item.sku}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={getStatusColor(item.status)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {item.status.toUpperCase()}
                      </Badge>
                      <div className={`px-2 py-1 rounded text-xs border ${getRecommendationColor(item.ai_recommendation)}`}>
                        🤖 {getRecommendationText(item.ai_recommendation)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-blue-600">Current Stock</div>
                      <div className="text-lg font-bold text-blue-800">{item.current_stock}</div>
                      <div className="text-xs text-blue-600">{item.stock_percentage}% of capacity</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="text-sm text-red-600">Days Until Sellout</div>
                      <div className="text-lg font-bold text-red-800">{item.days_until_sellout}</div>
                      <div className="text-xs text-red-600">at current rate</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm text-green-600">Reorder Quantity</div>
                      <div className="text-lg font-bold text-green-800">{item.reorder_quantity}</div>
                      <div className="text-xs text-green-600">safety stock</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-sm text-purple-600">30-Day Forecast</div>
                      <div className="text-lg font-bold text-purple-800">{item.forecast_30d}</div>
                      <div className="text-xs text-purple-600">units expected</div>
                    </div>
                  </div>

                  {/* Sales Trend Chart */}
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={item.trend_data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="sales" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={{ r: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Additional Metrics */}
                  <div className="flex justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Daily Avg: {item.daily_avg_sales} units</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Target className="w-4 h-4" />
                      <span>Max: {item.max_capacity} units</span>
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

export default InventoryManagement;
