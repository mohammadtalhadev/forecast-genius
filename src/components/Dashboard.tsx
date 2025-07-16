import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "./AuthModal";
import UploadData from "./UploadData";
import SalesDataTable from "./SalesDataTable";
import SmartForecastChart from "./SmartForecastChart";
import InventoryManagement from "./InventoryManagement";
import PriceOptimization from "./PriceOptimization";
import CompetitorAnalysis from "./CompetitorAnalysis";
import AlertsPanel from "./AlertsPanel";
import NotificationSettings from "./NotificationSettings";
import ProfileSettings from "./ProfileSettings";
import MarketingCalendar from "./MarketingCalendar";
import MarketingEventsAI from "./MarketingEventsAI";
import AutoReorderPlanning from "./AutoReorderPlanning";
import BundleIntelligence from "./BundleIntelligence";
import SalesHeatmap from "./SalesHeatmap";
import SupplierInsights from "./SupplierInsights";
import InventoryLifespanPrediction from "./InventoryLifespanPrediction";
import { Download, Upload, BarChart3, Package, TrendingUp, Users, Bell, Calendar, Settings, User, Zap, Gift, Map, Truck, Clock, Brain, LogOut, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("upload");
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthModal 
        isOpen={true} 
        onClose={() => setShowAuthModal(false)}
        mode="login"
        onSuccess={() => setShowAuthModal(false)}
      />
    );
  }

  const downloadSampleCSV = () => {
    const sampleData = [
      {
        Date: "2024-01-01",
        ProductName: "Whey Protein 2kg",
        Category: "Supplements",
        SKU: "WP001",
        QuantitySold: 15,
        UnitPrice: 8500,
        CurrentStock: 120,
        MinStockLevel: 20,
        MaxStockLevel: 200,
        ReorderQuantity: 50,
        Supplier: "NutriCorp Pakistan",
        CostPrice: 6000,
        Region: "Karachi",
        LeadTimeDays: 7,
        ExpiryDate: "2025-12-31",
        ShelfLifeDays: 730,
        IsPerishable: false
      },
      {
        Date: "2024-01-01", 
        ProductName: "Multivitamin Tablets",
        Category: "Vitamins",
        SKU: "MV002",
        QuantitySold: 25,
        UnitPrice: 2500,
        CurrentStock: 80,
        MinStockLevel: 15,
        MaxStockLevel: 150,
        ReorderQuantity: 40,
        Supplier: "HealthPlus Lahore",
        CostPrice: 1800,
        Region: "Lahore",
        LeadTimeDays: 5,
        ExpiryDate: "2026-06-30",
        ShelfLifeDays: 900,
        IsPerishable: false
      },
      {
        Date: "2024-01-01",
        ProductName: "Fish Oil Capsules",
        Category: "Supplements", 
        SKU: "FO003",
        QuantitySold: 12,
        UnitPrice: 3500,
        CurrentStock: 60,
        MinStockLevel: 10,
        MaxStockLevel: 100,
        ReorderQuantity: 30,
        Supplier: "Marine Nutrition",
        CostPrice: 2200,
        Region: "Islamabad",
        LeadTimeDays: 10,
        ExpiryDate: "2025-08-15",
        ShelfLifeDays: 600,
        IsPerishable: true
      }
    ];

    const csvContent = [
      Object.keys(sampleData[0]).join(','),
      ...sampleData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_inventory_data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getUserInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              ForecastGenius
            </h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-100">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-blue-600 text-white text-sm">
                    {getUserInitials(user.email || '')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:inline">
                  {user.email}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Account</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleTabChange('profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTabChange('settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Inventory Intelligence Dashboard
          </h1>
          <p className="text-gray-600">
            AI-powered inventory management and sales forecasting
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 xl:grid-cols-16 gap-1 h-auto p-1">
            <TabsTrigger value="upload" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Sales</span>
            </TabsTrigger>
            <TabsTrigger value="forecast" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Forecast</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Pricing</span>
            </TabsTrigger>
            <TabsTrigger value="competitors" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Competitors</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Marketing</span>
            </TabsTrigger>
            <TabsTrigger value="reorder" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Reorder</span>
            </TabsTrigger>
            <TabsTrigger value="bundles" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <Gift className="w-4 h-4" />
              <span className="hidden sm:inline">Bundles</span>
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">Heatmap</span>
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">Suppliers</span>
            </TabsTrigger>
            <TabsTrigger value="lifespan" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Lifespan</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex flex-col items-center space-y-1 text-xs py-2 px-1">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Sample Data Template</span>
                </CardTitle>
                <CardDescription>
                  Download our comprehensive sample CSV with all required fields for full functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={downloadSampleCSV} className="mb-4">
                  <Download className="w-4 h-4 mr-2" />
                  Download Enhanced Sample CSV
                </Button>
                <div className="text-sm text-gray-600">
                  <p className="mb-2"><strong>Required fields for all features:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Date, ProductName, Category, SKU, QuantitySold, UnitPrice</li>
                    <li>CurrentStock, MinStockLevel, MaxStockLevel, ReorderQuantity</li>
                    <li>Supplier, CostPrice, Region (for heatmap)</li>
                    <li>LeadTimeDays (for auto-reorder), ExpiryDate, ShelfLifeDays</li>
                    <li>IsPerishable (true/false for inventory lifespan)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            <UploadData />
          </TabsContent>

          <TabsContent value="sales">
            <SalesDataTable />
          </TabsContent>

          <TabsContent value="forecast">
            <SmartForecastChart />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryManagement />
          </TabsContent>

          <TabsContent value="pricing">
            <PriceOptimization />
          </TabsContent>

          <TabsContent value="competitors">
            <CompetitorAnalysis />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsPanel />
          </TabsContent>

          <TabsContent value="calendar">
            <MarketingCalendar />
          </TabsContent>

          <TabsContent value="marketing">
            <MarketingEventsAI />
          </TabsContent>

          <TabsContent value="reorder">
            <AutoReorderPlanning />
          </TabsContent>

          <TabsContent value="bundles">
            <BundleIntelligence />
          </TabsContent>

          <TabsContent value="heatmap">
            <SalesHeatmap />
          </TabsContent>

          <TabsContent value="suppliers">
            <SupplierInsights />
          </TabsContent>

          <TabsContent value="lifespan">
            <InventoryLifespanPrediction />
          </TabsContent>

          <TabsContent value="settings">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>
        </Tabs>
      </div>

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">ForecastGenius</h3>
              </div>
              <p className="text-gray-600 mb-4">
                AI-powered inventory management and sales forecasting for modern businesses.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-gray-900">Features</h4>
              <ul className="space-y-2 text-gray-600">
                <li><button onClick={() => handleTabChange('forecast')} className="hover:text-blue-600 transition-colors">Demand Forecasting</button></li>
                <li><button onClick={() => handleTabChange('pricing')} className="hover:text-blue-600 transition-colors">Price Optimization</button></li>
                <li><button onClick={() => handleTabChange('inventory')} className="hover:text-blue-600 transition-colors">Inventory Management</button></li>
                <li><button onClick={() => handleTabChange('sales')} className="hover:text-blue-600 transition-colors">Sales Analytics</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-gray-900">Analytics</h4>
              <ul className="space-y-2 text-gray-600">
                <li><button onClick={() => handleTabChange('competitors')} className="hover:text-blue-600 transition-colors">Competitor Analysis</button></li>
                <li><button onClick={() => handleTabChange('bundles')} className="hover:text-blue-600 transition-colors">Bundle Intelligence</button></li>
                <li><button onClick={() => handleTabChange('suppliers')} className="hover:text-blue-600 transition-colors">Supplier Insights</button></li>
                <li><button onClick={() => handleTabChange('heatmap')} className="hover:text-blue-600 transition-colors">Sales Heatmap</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-gray-900">Support</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="https://docs.lovable.dev" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Documentation</a></li>
                <li><button onClick={() => handleTabChange('alerts')} className="hover:text-blue-600 transition-colors">Help Center</button></li>
                <li><button onClick={() => handleTabChange('settings')} className="hover:text-blue-600 transition-colors">Contact Support</button></li>
                <li><a href="https://docs.lovable.dev" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">API Reference</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-8 mt-8 text-center text-gray-600">
            <p>&copy; 2024 ForecastGenius. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
