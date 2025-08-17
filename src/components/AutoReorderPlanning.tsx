
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Clock, Package, RefreshCw, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ReorderSuggestion {
  product_id: string;
  product_name: string;
  current_stock: number;
  daily_avg_sales: number;
  days_until_stockout: number;
  suggested_reorder_date: string;
  suggested_quantity: number;
  urgency: 'low' | 'moderate' | 'high';
  lead_time: number;
  min_stock: number;
  max_stock: number;
}

const AutoReorderPlanning = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultLeadTime, setDefaultLeadTime] = useState(7);
  const [safetyStockDays, setSafetyStockDays] = useState(5);

  useEffect(() => {
    if (user) {
      fetchReorderSuggestions();
    }
  }, [user]);

  const fetchReorderSuggestions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch inventory metrics and forecast data
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_metrics')
        .select(`
          *,
          products!inner (
            id,
            name,
            current_stock,
            min_stock_level,
            max_stock_level
          )
        `)
        .eq('user_id', user.id);

      if (inventoryError) throw inventoryError;

      if (!inventoryData || inventoryData.length === 0) {
        setSuggestions([]);
        return;
      }

      // Generate reorder suggestions
      const reorderSuggestions: ReorderSuggestion[] = inventoryData.map(item => {
        const product = item.products;
        const dailySales = item.daily_avg_sales || 1;
        const currentStock = item.current_stock || 0;
        const daysUntilStockout = Math.max(0, Math.floor(currentStock / dailySales));
        
        // Calculate reorder date (stockout date - lead time)
        const reorderDate = new Date();
        reorderDate.setDate(reorderDate.getDate() + daysUntilStockout - defaultLeadTime);
        
        // Calculate suggested quantity (safety stock + expected sales during lead time)
        const expectedSalesDuringLeadTime = dailySales * defaultLeadTime;
        const safetyStock = dailySales * safetyStockDays;
        const suggestedQuantity = Math.ceil(expectedSalesDuringLeadTime + safetyStock);
        
        // Determine urgency
        let urgency: 'low' | 'moderate' | 'high' = 'low';
        if (daysUntilStockout <= defaultLeadTime) urgency = 'high';
        else if (daysUntilStockout <= defaultLeadTime + 5) urgency = 'moderate';

        return {
          product_id: product.id,
          product_name: product.name,
          current_stock: currentStock,
          daily_avg_sales: dailySales,
          days_until_stockout: daysUntilStockout,
          suggested_reorder_date: reorderDate.toISOString().split('T')[0],
          suggested_quantity: suggestedQuantity,
          urgency,
          lead_time: defaultLeadTime,
          min_stock: product.min_stock_level || 10,
          max_stock: product.max_stock_level || 100
        };
      });

      // Sort by urgency and days until stockout
      reorderSuggestions.sort((a, b) => {
        const urgencyOrder = { high: 3, moderate: 2, low: 1 };
        if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
          return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
        }
        return a.days_until_stockout - b.days_until_stockout;
      });

      setSuggestions(reorderSuggestions);
    } catch (error) {
      console.error('Error fetching reorder suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reorder suggestions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'moderate': return <Clock className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to view auto reorder planning.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Settings */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Auto Reorder Planning</h2>
          <p className="text-gray-600">AI-powered inventory replenishment suggestions</p>
        </div>
        <Button onClick={fetchReorderSuggestions} disabled={isLoading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Settings Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Reorder Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="leadTime">Default Lead Time (days)</Label>
              <Input
                id="leadTime"
                type="number"
                value={defaultLeadTime}
                onChange={(e) => setDefaultLeadTime(parseInt(e.target.value))}
                min="1"
                max="30"
              />
            </div>
            <div>
              <Label htmlFor="safetyStock">Safety Stock (days)</Label>
              <Input
                id="safetyStock"
                type="number"
                value={safetyStockDays}
                onChange={(e) => setSafetyStockDays(parseInt(e.target.value))}
                min="1"
                max="14"
              />
            </div>
          </div>
          <Button 
            className="mt-4" 
            onClick={fetchReorderSuggestions}
            variant="outline"
          >
            Apply Settings
          </Button>
        </CardContent>
      </Card>

      {/* Reorder Suggestions */}
      {suggestions.length === 0 ? (
        <div className="text-center py-8">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reorder Suggestions</h3>
          <p className="text-gray-600 mb-4">Upload your sales data to get AI-powered reorder suggestions.</p>
          <Button onClick={() => window.location.hash = 'upload'}>
            Upload Sales Data
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.product_id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {suggestion.product_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Current Stock: {suggestion.current_stock} units
                    </p>
                  </div>
                  <Badge className={getUrgencyColor(suggestion.urgency)}>
                    {getUrgencyIcon(suggestion.urgency)}
                    <span className="ml-1 capitalize">{suggestion.urgency}</span>
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm text-blue-600">Days Until Stockout</div>
                    <div className="text-xl font-bold text-blue-800">
                      {suggestion.days_until_stockout}
                    </div>
                    <div className="text-xs text-blue-600">
                      at {suggestion.daily_avg_sales.toFixed(1)} units/day
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-sm text-green-600">Suggested Reorder Date</div>
                    <div className="text-xl font-bold text-green-800">
                      {new Date(suggestion.suggested_reorder_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-green-600">
                      {defaultLeadTime} days lead time
                    </div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-sm text-purple-600">Suggested Quantity</div>
                    <div className="text-xl font-bold text-purple-800">
                      {suggestion.suggested_quantity}
                    </div>
                    <div className="text-xs text-purple-600">
                      units to reorder
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">📋 Reorder Summary</h4>
                  <p className="text-sm text-gray-700">
                    <strong>Reorder {suggestion.suggested_quantity} units of {suggestion.product_name} by {new Date(suggestion.suggested_reorder_date).toLocaleDateString()}</strong>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {suggestion.urgency === 'high' && '⚠️ High Priority: '}
                    {suggestion.urgency === 'moderate' && '⚡ Moderate Priority: '}
                    {suggestion.urgency === 'low' && '✅ Low Priority: '}
                    Stockout risk in {suggestion.days_until_stockout} days
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

export default AutoReorderPlanning;
