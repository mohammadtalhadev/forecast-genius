import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, TrendingUp, Package, Clock, X, RefreshCw, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SmartAlert {
  id: string;
  product_name: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  ai_explanation: string;
  action_recommended: string;
  created_at: string;
  is_active: boolean;
}

const SmartAlertsPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  const fetchAlerts = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('smart_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch smart alerts",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateAlerts = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      console.log('Starting Groq alert generation...');
      
      // Fetch products with forecast data
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          current_stock,
          current_price,
          category,
          forecast_data!inner (
            forecast_7d,
            forecast_30d,
            forecast_90d,
            forecast_365d
          )
        `)
        .eq('user_id', user.id);

      if (productsError) {
        console.error('Error fetching products:', productsError);
        throw new Error(`Failed to fetch products: ${productsError.message}`);
      }

      if (!products || products.length === 0) {
        toast({
          title: "No Products Found",
          description: "Upload some product data and generate forecasts first to generate alerts",
          variant: "destructive"
        });
        return;
      }

      console.log('Found', products.length, 'products with forecast data');

      // Prepare product data for AI analysis
      const productData = products.map(product => ({
        id: product.id,
        name: product.name,
        current_stock: product.current_stock || 0,
        current_price: product.current_price || 0,
        category: product.category || 'General',
        forecast_7d: product.forecast_data?.[0]?.forecast_7d || 0,
        forecast_30d: product.forecast_data?.[0]?.forecast_30d || 0,
        forecast_90d: product.forecast_data?.[0]?.forecast_90d || 0,
        forecast_365d: product.forecast_data?.[0]?.forecast_365d || 0
      }));

      console.log('Sample product data:', productData[0]);
      console.log('Calling Groq function for alert generation...');

      // Call Groq function
      const { data, error } = await supabase.functions.invoke('chatgpt-insights', {
        body: {
          user_id: user.id,
          action: 'generate_alerts',
          product_data: productData
        }
      });

      if (error) {
        console.error('Groq function error:', error);
        throw new Error(error.message || 'Failed to generate alerts');
      }

      console.log('Groq function response:', data);

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "⚡ Groq AI Alerts Generated",
        description: `Generated ${data.alerts_generated || 0} ultra-fast alerts using Groq LLMs`,
      });

      fetchAlerts();
    } catch (error) {
      console.error('Error generating alerts:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate smart alerts. Please check your data and try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('smart_alerts')
        .update({ is_active: false })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(alerts.filter(alert => alert.id !== alertId));
      toast({
        title: "Alert Dismissed",
        description: "Alert has been marked as resolved",
      });
    } catch (error) {
      console.error('Error dismissing alert:', error);
      toast({
        title: "Error",
        description: "Failed to dismiss alert",
        variant: "destructive"
      });
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'critical_stock':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'demand_surge':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'overstock':
        return <Package className="w-5 h-5 text-orange-600" />;
      case 'expiry_risk':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to view smart alerts.</p>
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
                <Zap className="w-5 h-5 text-blue-600" />
                <span>Groq AI Smart Alerts</span>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  Ultra-Fast
                </Badge>
              </CardTitle>
              <CardDescription>
                Lightning-fast intelligent alerts powered by Groq LLMs (Mixtral & LLaMA)
              </CardDescription>
            </div>
            <div className="space-x-2">
              <Button onClick={fetchAlerts} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={generateAlerts} disabled={isGenerating}>
                <Zap className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate Groq Alerts'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Alerts</h3>
              <p className="text-gray-600 mb-4">
                Generate ultra-fast AI alerts powered by Groq's lightning-speed LLMs
              </p>
              <Button onClick={generateAlerts} disabled={isGenerating}>
                <Zap className="w-4 h-4 mr-2" />
                Generate Groq Smart Alerts
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className={`border-l-4 ${getSeverityColor(alert.severity)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getAlertIcon(alert.alert_type)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-gray-700 mb-2">{alert.message}</p>
                          
                          {alert.ai_explanation && (
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3 mb-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <Zap className="w-4 h-4 text-purple-600" />
                                <span className="text-sm font-medium text-purple-900">Groq AI Analysis</span>
                              </div>
                              <p className="text-sm text-purple-800">{alert.ai_explanation}</p>
                            </div>
                          )}
                          
                          {alert.action_recommended && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <p className="text-sm font-medium text-green-900">
                                💡 Recommended Action: {alert.action_recommended}
                              </p>
                            </div>
                          )}
                          
                          <p className="text-xs text-gray-500 mt-2">
                            Generated: {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissAlert(alert.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
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

export default SmartAlertsPanel;
