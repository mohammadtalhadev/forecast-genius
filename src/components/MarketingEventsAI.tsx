
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Brain, TrendingUp, Percent, RefreshCw, Sparkles, Globe, Edit2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MarketingEvent {
  id: string;
  product_name: string;
  event_name: string;
  event_date: string;
  campaign_suggestion: string;
  estimated_sales_boost: number;
  suggested_discount: number;
  ai_reasoning: string;
  created_at: string;
  is_active: boolean;
}

const MarketingEventsAI = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<MarketingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [marketRegion, setMarketRegion] = useState('pakistan');
  const [editingEvent, setEditingEvent] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketing_events_ai')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching marketing events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch marketing events",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateMarketingEvents = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      console.log('Starting Groq marketing events generation for market:', marketRegion);
      
      // Fetch products with forecast data
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id, 
          name, 
          category, 
          current_price,
          current_stock,
          forecast_data (
            forecast_30d,
            forecast_7d
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
          description: "Upload some product data first to generate marketing events",
          variant: "destructive"
        });
        return;
      }

      // Prepare product data for AI analysis
      const productData = products.map(product => ({
        id: product.id,
        name: product.name,
        category: product.category || 'General',
        current_price: product.current_price || 0,
        current_stock: product.current_stock || 0,
        forecast_30d: product.forecast_data?.[0]?.forecast_30d || 0,
        forecast_7d: product.forecast_data?.[0]?.forecast_7d || 0
      }));

      console.log('Calling Groq function for marketing events...');

      // Call Groq function
      const { data, error } = await supabase.functions.invoke('chatgpt-insights', {
        body: {
          user_id: user.id,
          action: 'marketing_events_enhanced',
          product_data: productData,
          market_region: marketRegion
        }
      });

      if (error) {
        console.error('Groq function error:', error);
        throw new Error(error.message || 'Failed to generate marketing events');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Marketing Events Generated",
        description: `Generated ${data.events_generated || 0} marketing event recommendations for ${marketRegion} market`,
      });

      fetchEvents();
    } catch (error) {
      console.error('Error generating marketing events:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate marketing events. Please check your data and try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('marketing_events_ai')
        .delete()
        .eq('id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Event Deleted",
        description: "Marketing event has been removed",
      });

      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete marketing event",
        variant: "destructive"
      });
    }
  };

  const toggleEventStatus = async (eventId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('marketing_events_ai')
        .update({ is_active: !isActive })
        .eq('id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: isActive ? "Event Deactivated" : "Event Activated",
        description: `Marketing event has been ${isActive ? 'deactivated' : 'activated'}`,
      });

      fetchEvents();
    } catch (error) {
      console.error('Error updating event status:', error);
      toast({
        title: "Error",
        description: "Failed to update event status",
        variant: "destructive"
      });
    }
  };

  const getEventTypeColor = (eventName: string) => {
    if (eventName.toLowerCase().includes('eid') || eventName.toLowerCase().includes('ramadan')) {
      return 'bg-green-100 text-green-800';
    }
    if (eventName.toLowerCase().includes('black friday') || eventName.toLowerCase().includes('sale')) {
      return 'bg-red-100 text-red-800';
    }
    if (eventName.toLowerCase().includes('summer') || eventName.toLowerCase().includes('winter')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (eventName.toLowerCase().includes('independence') || eventName.toLowerCase().includes('pakistan')) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-purple-100 text-purple-800';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isUpcoming = (dateStr: string) => {
    if (!dateStr) return false;
    return new Date(dateStr) > new Date();
  };

  const getSalesImpactColor = (boost: number) => {
    if (boost >= 40) return 'text-green-900 bg-green-50';
    if (boost >= 25) return 'text-blue-900 bg-blue-50';
    return 'text-yellow-900 bg-yellow-50';
  };

  const getMarketSpecificEvents = () => {
    return events.filter(event => {
      if (marketRegion === 'pakistan') {
        return event.event_name.toLowerCase().includes('eid') || 
               event.event_name.toLowerCase().includes('pakistan') ||
               event.event_name.toLowerCase().includes('ramadan');
      } else {
        return event.event_name.toLowerCase().includes('black friday') ||
               event.event_name.toLowerCase().includes('christmas') ||
               event.event_name.toLowerCase().includes('summer');
      }
    });
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to view marketing events.</p>
      </div>
    );
  }

  const filteredEvents = events.length > 0 ? getMarketSpecificEvents() : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-pink-600" />
                <span>AI Marketing Events</span>
              </CardTitle>
              <CardDescription>
                Groq-powered marketing event recommendations with sales predictions
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
              <Button onClick={fetchEvents} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={generateMarketingEvents} disabled={isGenerating}>
                <Brain className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate Events'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Marketing Events</h3>
              <p className="text-gray-600 mb-4">
                Generate AI-powered marketing event recommendations based on your product data and market analysis for {marketRegion === 'pakistan' ? 'Pakistani' : 'international'} market
              </p>
              <Button onClick={generateMarketingEvents} disabled={isGenerating}>
                <Brain className="w-4 h-4 mr-2" />
                Generate Marketing Events
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">
                  {marketRegion === 'pakistan' ? 'Pakistani' : 'International'} Market Events
                </h3>
                <Badge variant="outline">
                  {filteredEvents.length} events found
                </Badge>
              </div>
              
              {filteredEvents.map((event) => (
                <Card 
                  key={event.id} 
                  className={`border-l-4 ${isUpcoming(event.event_date) ? 'border-l-pink-500' : 'border-l-gray-400'} ${event.is_active === false ? 'opacity-60' : ''}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900">{event.product_name}</h3>
                          <Badge className={getEventTypeColor(event.event_name)}>
                            {event.event_name}
                          </Badge>
                          {isUpcoming(event.event_date) && (
                            <Badge className="bg-pink-100 text-pink-800">
                              Upcoming
                            </Badge>
                          )}
                          <Badge variant="outline" className="flex items-center space-x-1">
                            <Globe className="w-3 h-3" />
                            <span>{marketRegion === 'pakistan' ? 'PK' : 'INT'}</span>
                          </Badge>
                          {event.is_active === false && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(event.event_date)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEventStatus(event.id, event.is_active !== false)}
                        >
                          {event.is_active === false ? 'Activate' : 'Deactivate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingEvent(event.id)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEvent(event.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* Estimated Sales Boost */}
                      <div className={`text-center p-3 rounded-lg ${getSalesImpactColor(event.estimated_sales_boost)}`}>
                        <TrendingUp className="w-6 h-6 mx-auto mb-1" />
                        <p className="text-sm">Predicted Sales Increase</p>
                        <p className="text-lg font-semibold">
                          +{event.estimated_sales_boost}%
                        </p>
                      </div>
                      
                      {/* Suggested Discount */}
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <Percent className="w-6 h-6 text-red-600 mx-auto mb-1" />
                        <p className="text-sm text-red-600">Recommended Discount</p>
                        <p className="text-lg font-semibold text-red-900">
                          {event.suggested_discount}% OFF
                        </p>
                      </div>
                      
                      {/* Event Date */}
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                        <p className="text-sm text-blue-600">Event Date</p>
                        <p className="text-lg font-semibold text-blue-900">
                          {formatDate(event.event_date)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Campaign Suggestion */}
                    {event.campaign_suggestion && (
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg mb-4">
                        <h4 className="font-medium text-purple-900 mb-2 flex items-center">
                          <Sparkles className="w-4 h-4 mr-2" />
                          AI Campaign Strategy
                        </h4>
                        <p className="text-sm text-purple-800">{event.campaign_suggestion}</p>
                      </div>
                    )}
                    
                    {/* AI Reasoning */}
                    {event.ai_reasoning && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Brain className="w-4 h-4 text-blue-600" />
                          <h4 className="font-medium text-blue-900">Groq AI Market Analysis</h4>
                        </div>
                        <p className="text-sm text-blue-800">{event.ai_reasoning}</p>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-4">
                      Generated: {new Date(event.created_at).toLocaleString()} • 
                      Market: {marketRegion === 'pakistan' ? 'Pakistan' : 'International'} • 
                      Status: {event.is_active === false ? 'Inactive' : 'Active'}
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

export default MarketingEventsAI;
