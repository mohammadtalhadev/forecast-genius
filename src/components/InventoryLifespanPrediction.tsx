
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, AlertTriangle, TrendingDown, Package, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LifespanPrediction {
  product_id: string;
  product_name: string;
  current_stock: number;
  daily_consumption: number;
  days_remaining: number;
  stockout_date: string;
  risk_level: 'low' | 'medium' | 'high';
  forecast_data: Array<{
    date: string;
    projected_stock: number;
    consumption: number;
  }>;
}

const InventoryLifespanPrediction = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [predictions, setPredictions] = useState<LifespanPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLifespanPredictions();
    }
  }, [user]);

  const fetchLifespanPredictions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch inventory metrics and products
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_metrics')
        .select(`
          *,
          products!inner (
            id,
            name,
            current_stock
          )
        `)
        .eq('user_id', user.id);

      if (inventoryError) throw inventoryError;

      if (!inventoryData || inventoryData.length === 0) {
        setPredictions([]);
        return;
      }

      // Generate lifespan predictions
      const lifespanPredictions: LifespanPrediction[] = inventoryData.map(item => {
        const product = item.products;
        const dailyConsumption = item.daily_avg_sales || 1;
        const currentStock = item.current_stock || 0;
        const daysRemaining = Math.max(0, Math.floor(currentStock / dailyConsumption));
        
        // Calculate stockout date
        const stockoutDate = new Date();
        stockoutDate.setDate(stockoutDate.getDate() + daysRemaining);
        
        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (daysRemaining <= 7) riskLevel = 'high';
        else if (daysRemaining <= 14) riskLevel = 'medium';
        
        // Generate forecast data for next 30 days
        const forecastData = [];
        for (let day = 0; day <= 30; day++) {
          const date = new Date();
          date.setDate(date.getDate() + day);
          
          const projectedStock = Math.max(0, currentStock - (dailyConsumption * day));
          const consumption = day === 0 ? 0 : dailyConsumption;
          
          forecastData.push({
            date: date.toISOString().split('T')[0],
            projected_stock: projectedStock,
            consumption: consumption
          });
        }

        return {
          product_id: product.id,
          product_name: product.name,
          current_stock: currentStock,
          daily_consumption: dailyConsumption,
          days_remaining: daysRemaining,
          stockout_date: stockoutDate.toISOString().split('T')[0],
          risk_level: riskLevel,
          forecast_data: forecastData
        };
      });

      // Sort by days remaining (most urgent first)
      lifespanPredictions.sort((a, b) => a.days_remaining - b.days_remaining);
      
      setPredictions(lifespanPredictions);
    } catch (error) {
      console.error('Error fetching lifespan predictions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory lifespan predictions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  // Prepare data for days until depletion chart
  const depletionData = predictions.map(p => ({
    name: p.product_name.length > 15 ? p.product_name.substring(0, 15) + '...' : p.product_name,
    days: p.days_remaining,
    risk: p.risk_level
  }));

  // Function to get color based on risk level
  const getBarColor = (risk: string) => {
    if (risk === 'high') return '#ef4444';
    if (risk === 'medium') return '#f59e0b';
    return '#10b981';
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to view inventory lifespan predictions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Lifespan Prediction</h2>
          <p className="text-gray-600">AI-powered stockout forecasting and depletion analysis</p>
        </div>
        <Button onClick={fetchLifespanPredictions} disabled={isLoading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-gray-600">High Risk</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-red-600">
                {predictions.filter(p => p.risk_level === 'high').length}
              </div>
              <div className="text-xs text-gray-600">products ≤ 7 days</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-gray-600">Medium Risk</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-yellow-600">
                {predictions.filter(p => p.risk_level === 'medium').length}
              </div>
              <div className="text-xs text-gray-600">products 8-14 days</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Low Risk</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-green-600">
                {predictions.filter(p => p.risk_level === 'low').length}
              </div>
              <div className="text-xs text-gray-600">products &gt; 14 days</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Days Until Depletion Chart */}
      {predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Days Until Depletion</CardTitle>
            <CardDescription>Current stock will last based on consumption patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={depletionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="days" 
                    fill="#3b82f6"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Product Predictions */}
      {predictions.length === 0 ? (
        <div className="text-center py-8">
          <TrendingDown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Inventory Data</h3>
          <p className="text-gray-600 mb-4">Upload your sales data to get inventory lifespan predictions.</p>
          <Button onClick={() => window.location.hash = 'upload'}>
            Upload Sales Data
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {predictions.map((prediction) => (
            <Card key={prediction.product_id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{prediction.product_name}</CardTitle>
                    <CardDescription>
                      {prediction.current_stock} units • {prediction.daily_consumption.toFixed(1)} units/day consumption
                    </CardDescription>
                  </div>
                  <Badge className={getRiskColor(prediction.risk_level)}>
                    {getRiskIcon(prediction.risk_level)}
                    <span className="ml-1 capitalize">{prediction.risk_level} Risk</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm text-blue-600">Days Remaining</div>
                    <div className="text-2xl font-bold text-blue-800">
                      {prediction.days_remaining}
                    </div>
                    <div className="text-xs text-blue-600">at current rate</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-sm text-red-600">Stockout Date</div>
                    <div className="text-lg font-bold text-red-800">
                      {new Date(prediction.stockout_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-red-600">projected</div>
                  </div>
                </div>

                {/* Forecast Chart */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={prediction.forecast_data.slice(0, 30)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value, name) => [value, name === 'projected_stock' ? 'Stock Level' : 'Daily Consumption']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="projected_stock" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Stock Level"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary */}
                <div className={`p-4 rounded-lg ${
                  prediction.risk_level === 'high' ? 'bg-red-50' :
                  prediction.risk_level === 'medium' ? 'bg-yellow-50' : 'bg-green-50'
                }`}>
                  <h4 className={`font-medium mb-2 ${
                    prediction.risk_level === 'high' ? 'text-red-900' :
                    prediction.risk_level === 'medium' ? 'text-yellow-900' : 'text-green-900'
                  }`}>
                    📊 Lifespan Summary
                  </h4>
                  <p className={`text-sm ${
                    prediction.risk_level === 'high' ? 'text-red-800' :
                    prediction.risk_level === 'medium' ? 'text-yellow-800' : 'text-green-800'
                  }`}>
                    Stock for <strong>{prediction.product_name}</strong> will last approximately <strong>{prediction.days_remaining} days</strong> based on current consumption of {prediction.daily_consumption.toFixed(1)} units per day.
                    {prediction.days_remaining <= 10 && (
                      <span className="block mt-1 font-medium">
                        ⚠️ Consider reordering soon to avoid stockout on {new Date(prediction.stockout_date).toLocaleDateString()}.
                      </span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InventoryLifespanPrediction;
