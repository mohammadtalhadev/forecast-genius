
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Truck, AlertTriangle, Star, RefreshCw, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SupplierMetrics {
  supplier_name: string;
  total_products: number;
  avg_delivery_time: number;
  return_rate: number;
  defect_rate: number;
  margin_percentage: number;
  stock_availability: number;
  overall_rating: number;
  risk_alerts: string[];
  best_supplier: boolean;
  recent_issues: Array<{
    issue: string;
    date: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

const SupplierInsights = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<SupplierMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSupplierData();
    }
  }, [user]);

  const fetchSupplierData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch products with supplier information
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('supplier, cost_price, current_price, current_stock')
        .eq('user_id', user.id)
        .not('supplier', 'is', null);

      if (productsError) throw productsError;

      if (!productsData || productsData.length === 0) {
        setSuppliers([]);
        return;
      }

      // Group by supplier and generate metrics
      const supplierMap = new Map<string, any>();
      
      productsData.forEach(product => {
        const supplier = product.supplier;
        if (!supplier) return;

        if (!supplierMap.has(supplier)) {
          supplierMap.set(supplier, {
            products: [],
            totalStock: 0,
            totalMargin: 0,
            productCount: 0
          });
        }

        const supplierData = supplierMap.get(supplier);
        supplierData.products.push(product);
        supplierData.totalStock += product.current_stock || 0;
        supplierData.productCount += 1;
        
        if (product.cost_price && product.current_price) {
          const margin = ((product.current_price - product.cost_price) / product.current_price) * 100;
          supplierData.totalMargin += margin;
        }
      });

      // Generate supplier metrics
      const supplierMetrics: SupplierMetrics[] = Array.from(supplierMap.entries()).map(([supplierName, data]) => {
        const avgMargin = data.totalMargin / data.productCount;
        const avgDeliveryTime = Math.floor(Math.random() * 10 + 3); // Mock data
        const returnRate = Math.random() * 5;
        const defectRate = Math.random() * 3;
        const stockAvailability = Math.random() * 30 + 70;
        
        // Calculate overall rating
        const deliveryScore = Math.max(0, 10 - avgDeliveryTime) / 10;
        const returnScore = Math.max(0, (5 - returnRate) / 5);
        const defectScore = Math.max(0, (3 - defectRate) / 3);
        const stockScore = stockAvailability / 100;
        const overallRating = (deliveryScore + returnScore + defectScore + stockScore) / 4 * 5;

        // Generate risk alerts
        const riskAlerts: string[] = [];
        if (avgDeliveryTime > 7) riskAlerts.push('Long delivery times');
        if (returnRate > 3) riskAlerts.push('High return rate');
        if (defectRate > 2) riskAlerts.push('Quality issues');
        if (stockAvailability < 80) riskAlerts.push('Stock availability concerns');

        // Generate recent issues
        const recentIssues = [];
        if (Math.random() > 0.7) {
          recentIssues.push({
            issue: 'Delayed shipment for 3 products',
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            severity: 'medium' as const
          });
        }
        if (Math.random() > 0.8) {
          recentIssues.push({
            issue: 'Quality complaint received',
            date: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            severity: 'high' as const
          });
        }

        return {
          supplier_name: supplierName,
          total_products: data.productCount,
          avg_delivery_time: avgDeliveryTime,
          return_rate: returnRate,
          defect_rate: defectRate,
          margin_percentage: avgMargin,
          stock_availability: stockAvailability,
          overall_rating: overallRating,
          risk_alerts: riskAlerts,
          best_supplier: false,
          recent_issues: recentIssues
        };
      });

      // Mark best supplier
      if (supplierMetrics.length > 0) {
        const bestSupplier = supplierMetrics.reduce((prev, current) => 
          (prev.overall_rating > current.overall_rating) ? prev : current
        );
        bestSupplier.best_supplier = true;
      }

      // Sort by overall rating
      supplierMetrics.sort((a, b) => b.overall_rating - a.overall_rating);
      
      setSuppliers(supplierMetrics);
    } catch (error) {
      console.error('Error fetching supplier data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch supplier insights",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }
    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />);
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push(<Star key={i} className="w-4 h-4 text-gray-300" />);
    }
    
    return stars;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to view supplier insights.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Supplier Insights</h2>
          <p className="text-gray-600">AI-powered supplier performance analysis</p>
        </div>
        <Button onClick={fetchSupplierData} disabled={isLoading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Supplier Cards */}
      {suppliers.length === 0 ? (
        <div className="text-center py-8">
          <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Supplier Data</h3>
          <p className="text-gray-600 mb-4">Add supplier information to products to see insights.</p>
          <Button onClick={() => window.location.hash = 'upload'}>
            Upload Product Data
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {suppliers.map((supplier) => (
            <Card key={supplier.supplier_name} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{supplier.supplier_name}</span>
                      {supplier.best_supplier && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          🏆 Best Supplier
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {supplier.total_products} products • {supplier.overall_rating.toFixed(1)}/5.0 rating
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getRatingStars(supplier.overall_rating)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-blue-800">
                      {supplier.avg_delivery_time}
                    </div>
                    <div className="text-xs text-blue-600">avg delivery days</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-green-800">
                      {supplier.margin_percentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-green-600">avg margin</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-lg font-bold text-purple-800">
                      {supplier.return_rate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-purple-600">return rate</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-lg font-bold text-orange-800">
                      {supplier.defect_rate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-orange-600">defect rate</div>
                  </div>
                </div>

                {/* Stock Availability */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Stock Availability</span>
                    <span className="text-sm text-gray-600">
                      {supplier.stock_availability.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={supplier.stock_availability} className="h-2" />
                </div>

                {/* Risk Alerts */}
                {supplier.risk_alerts.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-2 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Risk Alerts
                    </h4>
                    <div className="space-y-1">
                      {supplier.risk_alerts.map((alert, index) => (
                        <div key={index} className="text-sm text-red-800">
                          • {alert}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Issues */}
                {supplier.recent_issues.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Recent Issues</h4>
                    <div className="space-y-2">
                      {supplier.recent_issues.map((issue, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <div className="text-sm font-medium">{issue.issue}</div>
                            <div className="text-xs text-gray-600">{issue.date}</div>
                          </div>
                          <Badge className={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    Contact Supplier
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplierInsights;
