import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Gift, Megaphone, Star, TrendingUp, Edit2, Trash2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MarketingEvent {
  id: string;
  event_name: string;
  event_date: string;
  event_type: string;
  impact_multiplier: number;
  created_at: string;
}

const MarketingCalendar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<MarketingEvent[]>([]);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("sale");
  const [impactMultiplier, setImpactMultiplier] = useState(1.5);
  const [isLoading, setIsLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<MarketingEvent>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchEvents();
      loadDefaultEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('marketing_events')
      .select('*')
      .eq('user_id', user.id)
      .order('event_date', { ascending: true });
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch marketing events",
        variant: "destructive"
      });
    } else {
      setEvents(data || []);
    }
  };

  const loadDefaultEvents = async () => {
    if (!user) return;
    
    // Check if default events already exist
    const { data: existingEvents } = await supabase
      .from('marketing_events')
      .select('event_name')
      .eq('user_id', user.id)
      .in('event_name', ['Black Friday', 'Cyber Monday', 'Christmas', 'New Year Sale', 'Valentine\'s Day']);

    if (existingEvents && existingEvents.length === 0) {
      // Add default marketing events
      const defaultEvents = [
        { event_name: 'Black Friday', event_date: '2024-11-29', event_type: 'sale', impact_multiplier: 2.5, user_id: user.id },
        { event_name: 'Cyber Monday', event_date: '2024-12-02', event_type: 'sale', impact_multiplier: 2.2, user_id: user.id },
        { event_name: 'Christmas', event_date: '2024-12-25', event_type: 'holiday', impact_multiplier: 1.8, user_id: user.id },
        { event_name: 'New Year Sale', event_date: '2025-01-01', event_type: 'sale', impact_multiplier: 1.6, user_id: user.id },
        { event_name: 'Valentine\'s Day', event_date: '2025-02-14', event_type: 'holiday', impact_multiplier: 1.4, user_id: user.id }
      ];

      await supabase.from('marketing_events').insert(defaultEvents);
      fetchEvents();
    }
  };

  const addEvent = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to add marketing events",
        variant: "destructive"
      });
      return;
    }

    if (!eventName || !eventDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase
      .from('marketing_events')
      .insert([{
        event_name: eventName,
        event_date: eventDate,
        event_type: eventType,
        impact_multiplier: impactMultiplier,
        user_id: user.id
      }]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add marketing event",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Marketing event added successfully",
      });
      setEventName("");
      setEventDate("");
      setEventType("sale");
      setImpactMultiplier(1.5);
      fetchEvents();
    }
    
    setIsLoading(false);
  };

  const deleteEvent = async (eventId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('marketing_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete marketing event",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Marketing event deleted successfully",
      });
      fetchEvents();
    }
  };

  const startEditing = (event: MarketingEvent) => {
    setEditingEvent(event.id);
    setEditData({
      event_name: event.event_name,
      event_date: event.event_date,
      event_type: event.event_type,
      impact_multiplier: event.impact_multiplier
    });
  };

  const saveEdit = async () => {
    if (!user || !editingEvent) return;

    const { error } = await supabase
      .from('marketing_events')
      .update(editData)
      .eq('id', editingEvent)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update marketing event",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Marketing event updated successfully",
      });
      setEditingEvent(null);
      setEditData({});
      fetchEvents();
    }
  };

  const cancelEdit = () => {
    setEditingEvent(null);
    setEditData({});
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'sale': return Gift;
      case 'promotion': return Megaphone;
      case 'holiday': return Star;
      default: return Calendar;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-red-100 text-red-800';
      case 'promotion': return 'bg-blue-100 text-blue-800';
      case 'holiday': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (multiplier: number) => {
    if (multiplier >= 2) return 'text-red-600';
    if (multiplier >= 1.5) return 'text-orange-600';
    if (multiplier >= 1.2) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date();
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to access marketing calendar features.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total Events</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{events.length}</div>
              <p className="text-xs text-gray-500">marketing events</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Upcoming Events</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">
                {events.filter(event => isUpcoming(event.event_date)).length}
              </div>
              <p className="text-xs text-gray-500">this year</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Gift className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-gray-600">Sales Events</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">
                {events.filter(event => event.event_type === 'sale').length}
              </div>
              <p className="text-xs text-gray-500">major sales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Avg Impact</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">
                {events.length > 0 
                  ? (events.reduce((sum, event) => sum + event.impact_multiplier, 0) / events.length).toFixed(1)
                  : 0}x
              </div>
              <p className="text-xs text-gray-500">demand multiplier</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Event */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Add Marketing Event</span>
          </CardTitle>
          <CardDescription>
            Track important dates that impact demand forecasting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Summer Sale, Easter, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventDate">Date</Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventType">Type</Label>
              <select
                id="eventType"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="sale">Sale</option>
                <option value="holiday">Holiday</option>
                <option value="promotion">Promotion</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="impact">Impact Multiplier</Label>
              <Input
                id="impact"
                type="number"
                step="0.1"
                min="0.5"
                max="5"
                value={impactMultiplier}
                onChange={(e) => setImpactMultiplier(parseFloat(e.target.value))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addEvent} disabled={isLoading} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing Calendar</CardTitle>
          <CardDescription>
            Important dates and their expected impact on demand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event) => {
              const Icon = getEventIcon(event.event_type);
              const upcoming = isUpcoming(event.event_date);
              const isEditing = editingEvent === event.id;
              
              return (
                <div key={event.id} className={`flex items-center justify-between p-4 border rounded-lg ${upcoming ? 'border-blue-200 bg-blue-50' : ''}`}>
                  {isEditing ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                      <Input
                        value={editData.event_name || ''}
                        onChange={(e) => setEditData({...editData, event_name: e.target.value})}
                        placeholder="Event Name"
                      />
                      <Input
                        type="date"
                        value={editData.event_date || ''}
                        onChange={(e) => setEditData({...editData, event_date: e.target.value})}
                      />
                      <select
                        value={editData.event_type || 'sale'}
                        onChange={(e) => setEditData({...editData, event_type: e.target.value})}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="sale">Sale</option>
                        <option value="holiday">Holiday</option>
                        <option value="promotion">Promotion</option>
                      </select>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="5"
                        value={editData.impact_multiplier || 1}
                        onChange={(e) => setEditData({...editData, impact_multiplier: parseFloat(e.target.value)})}
                      />
                      <div className="flex space-x-2">
                        <Button onClick={saveEdit} size="sm">
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button onClick={cancelEdit} variant="outline" size="sm">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getEventColor(event.event_type)}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{event.event_name}</h4>
                          <p className="text-sm text-gray-600">{formatDate(event.event_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge className={getEventColor(event.event_type)}>
                          {event.event_type}
                        </Badge>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${getImpactColor(event.impact_multiplier)}`}>
                            {event.impact_multiplier}x Impact
                          </div>
                          <div className="text-xs text-gray-500">demand multiplier</div>
                        </div>
                        {upcoming && (
                          <Badge className="bg-blue-100 text-blue-800">
                            Upcoming
                          </Badge>
                        )}
                        <div className="flex space-x-2">
                          <Button onClick={() => startEditing(event)} variant="outline" size="sm">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button onClick={() => deleteEvent(event.id)} variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {events.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No marketing events added yet. Add events to improve forecast accuracy.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingCalendar;
