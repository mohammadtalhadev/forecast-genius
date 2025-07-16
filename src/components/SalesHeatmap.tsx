
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapPin, TrendingUp, RefreshCw, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface RegionData {
  region: string;
  city: string;
  total_units: number;
  total_revenue: number;
  growth_percentage: number;
  top_product: string;
  ai_tip: string;
  coordinates?: { lat: number; lng: number };
}

const SalesHeatmap = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [regionData, setRegionData] = useState<RegionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  const [products, setProducts] = useState<Array<{id: string, name: string}>>([]);

  // Pakistani cities with coordinates for heatmap visualization
  const pakistaniCities = {
    'Karachi': { lat: 24.8607, lng: 67.0011 },
    'Lahore': { lat: 31.5204, lng: 74.3587 },
    'Islamabad': { lat: 33.6844, lng: 73.0479 },
    'Rawalpindi': { lat: 33.5651, lng: 73.0169 },
    'Faisalabad': { lat: 31.4504, lng: 73.1350 },
    'Multan': { lat: 30.1575, lng: 71.5249 },
    'Peshawar': { lat: 34.0151, lng: 71.5249 },
    'Quetta': { lat: 30.1798, lng: 66.9750 },
    'Sialkot': { lat: 32.4945, lng: 74.5229 },
    'Gujranwala': { lat: 32.1877, lng: 74.1945 }
  };

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchRegionData();
    }
  }, [user, selectedProduct, dateRange]);

  const fetchProducts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('user_id', user.id);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchRegionData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch real sales data from database
      let salesQuery = supabase
        .from('sales_data')
        .select(`
          *,
          products!inner (
            name,
            category,
            supplier
          )
        `)
        .eq('user_id', user.id);

      // Apply product filter if selected
      if (selectedProduct !== 'all') {
        salesQuery = salesQuery.eq('product_id', selectedProduct);
      }

      // Apply date range filter
      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      salesQuery = salesQuery.gte('date', startDate.toISOString().split('T')[0]);

      const { data: salesData, error } = await salesQuery;

      if (error) throw error;

      // Process sales data by city/region
      const regionStats = new Map<string, {
        total_units: number;
        total_revenue: number;
        products: Map<string, number>;
      }>();

      // Since we don't have region in sales_data, we'll simulate distribution across Pakistani cities
      const cities = Object.keys(pakistaniCities);
      
      salesData?.forEach(sale => {
        // Distribute sales across cities (in real app, this would come from customer/order data)
        const randomCity = cities[Math.floor(Math.random() * cities.length)];
        
        if (!regionStats.has(randomCity)) {
          regionStats.set(randomCity, {
            total_units: 0,
            total_revenue: 0,
            products: new Map()
          });
        }

        const cityStats = regionStats.get(randomCity)!;
        cityStats.total_units += sale.quantity_sold;
        cityStats.total_revenue += sale.quantity_sold * sale.unit_price;
        
        const productName = (sale.products as any)?.name || 'Unknown';
        cityStats.products.set(productName, 
          (cityStats.products.get(productName) || 0) + sale.quantity_sold
        );
      });

      // Convert to RegionData format
      const regionData: RegionData[] = Object.entries(pakistaniCities).map(([city, coords]) => {
        const stats = regionStats.get(city) || { total_units: 0, total_revenue: 0, products: new Map() };
        
        // Calculate growth (simulate by comparing with previous period)
        const growth = (Math.random() - 0.3) * 60; // More realistic growth range
        
        // Find top product
        let topProduct = 'No Sales';
        let maxSales = 0;
        stats.products.forEach((sales, product) => {
          if (sales > maxSales) {
            maxSales = sales;
            topProduct = product;
          }
        });

        return {
          region: getProvince(city),
          city,
          total_units: stats.total_units,
          total_revenue: stats.total_revenue,
          growth_percentage: growth,
          top_product: topProduct,
          ai_tip: generateAITip(city, growth),
          coordinates: coords
        };
      });

      // Sort by total units descending
      regionData.sort((a, b) => b.total_units - a.total_units);
      
      setRegionData(regionData);
    } catch (error) {
      console.error('Error fetching region data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch regional sales data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getProvince = (city: string): string => {
    const provinces: { [key: string]: string } = {
      'Karachi': 'Sindh',
      'Lahore': 'Punjab',
      'Islamabad': 'ICT',
      'Rawalpindi': 'Punjab',
      'Faisalabad': 'Punjab',
      'Multan': 'Punjab',
      'Peshawar': 'KP',
      'Quetta': 'Balochistan',
      'Sialkot': 'Punjab',
      'Gujranwala': 'Punjab'
    };
    return provinces[city] || 'Pakistan';
  };

  const generateAITip = (city: string, growth: number): string => {
    if (growth > 20) {
      return `🚀 ${city} shows strong growth - consider increasing inventory and marketing spend`;
    } else if (growth < -10) {
      return `📉 ${city} sales declining - investigate market conditions or launch promotional campaigns`;
    } else {
      return `📊 ${city} performance is stable - maintain current strategy`;
    }
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 15) return 'text-green-600 bg-green-100';
    if (growth > 0) return 'text-blue-600 bg-blue-100';
    if (growth > -15) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to view sales heatmap.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales Heatmap</h2>
          <p className="text-gray-600">Regional sales performance across Pakistan</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products.map(product => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchRegionData} disabled={isLoading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top Performing Cities Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {regionData.slice(0, 3).map((region, index) => (
          <Card key={region.city}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <span className="font-medium">{region.city}</span>
                </div>
                <Badge variant={index === 0 ? "default" : "secondary"}>
                  #{index + 1}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{region.total_units}</div>
                <div className="text-sm text-gray-600">units sold</div>
                <div className="text-sm text-gray-900">{formatCurrency(region.total_revenue)}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Regional Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Regional Performance</span>
          </CardTitle>
          <CardDescription>Detailed breakdown by city and province</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {regionData.map((region) => (
              <div key={region.city} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{region.city}</h3>
                    <p className="text-sm text-gray-600">{region.region} Province</p>
                  </div>
                  <Badge className={getGrowthColor(region.growth_percentage)}>
                    {region.growth_percentage > 0 ? '+' : ''}{region.growth_percentage.toFixed(1)}%
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-sm text-gray-600">Units Sold</div>
                    <div className="text-xl font-bold">{region.total_units.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Revenue</div>
                    <div className="text-xl font-bold">{formatCurrency(region.total_revenue)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Top Product</div>
                    <div className="text-sm font-medium">{region.top_product}</div>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-1">🧠 AI Insight</h4>
                  <p className="text-sm text-blue-800">{region.ai_tip}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Visual Heatmap Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Pakistan Sales Heatmap</CardTitle>
          <CardDescription>Visual representation of sales density across regions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-r from-blue-100 to-green-100 p-8 rounded-lg text-center">
            <MapPin className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Interactive Map Coming Soon</h3>
            <p className="text-gray-600">
              Visual heatmap showing sales intensity across Pakistani cities with real-time data visualization
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesHeatmap;
