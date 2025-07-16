
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, MessageSquare, Save, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface NotificationSettings {
  id?: string;
  email_notifications: boolean;
  whatsapp_notifications: boolean;
  whatsapp_number: string;
  low_stock_threshold: number;
  overstock_threshold: number;
  expiry_warning_days: number;
  alert_types: {
    critical_stock: boolean;
    overstock: boolean;
    price_changes: boolean;
    competitor_alerts: boolean;
    marketing_events: boolean;
    reorder_reminders: boolean;
  };
}

const NotificationSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    whatsapp_notifications: false,
    whatsapp_number: "",
    low_stock_threshold: 10,
    overstock_threshold: 100,
    expiry_warning_days: 30,
    alert_types: {
      critical_stock: true,
      overstock: true,
      price_changes: false,
      competitor_alerts: false,
      marketing_events: true,
      reorder_reminders: true,
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching notification settings:', error);
        return;
      }

      if (data) {
        setSettings({
          id: data.id,
          email_notifications: data.email_notifications ?? true,
          whatsapp_notifications: data.whatsapp_notifications ?? false,
          whatsapp_number: data.whatsapp_number || "",
          low_stock_threshold: data.low_stock_threshold ?? 10,
          overstock_threshold: data.overstock_threshold ?? 100,
          expiry_warning_days: data.expiry_warning_days ?? 30,
          alert_types: {
            critical_stock: true,
            overstock: true,
            price_changes: false,
            competitor_alerts: false,
            marketing_events: true,
            reorder_reminders: true,
          }
        });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to save notification settings",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const settingsData = {
        user_id: user.id,
        email_notifications: settings.email_notifications,
        whatsapp_notifications: settings.whatsapp_notifications,
        whatsapp_number: settings.whatsapp_number,
        low_stock_threshold: settings.low_stock_threshold,
        overstock_threshold: settings.overstock_threshold,
        expiry_warning_days: settings.expiry_warning_days,
        updated_at: new Date().toISOString()
      };

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('notification_settings')
          .update(settingsData)
          .eq('id', settings.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('notification_settings')
          .insert([settingsData])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setSettings(prev => ({ ...prev, id: data.id }));
        }
      }

      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated successfully",
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to save notification settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateAlertType = (alertType: keyof typeof settings.alert_types, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      alert_types: {
        ...prev.alert_types,
        [alertType]: enabled
      }
    }));
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to access notification settings.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notification Channels</span>
          </CardTitle>
          <CardDescription>
            Choose how you want to receive alerts and notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="font-medium">Email Notifications</h4>
                <p className="text-sm text-gray-600">Receive alerts via email</p>
              </div>
            </div>
            <Switch
              checked={settings.email_notifications}
              onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <div>
                <h4 className="font-medium">WhatsApp Notifications</h4>
                <p className="text-sm text-gray-600">Receive alerts via WhatsApp</p>
              </div>
            </div>
            <Switch
              checked={settings.whatsapp_notifications}
              onCheckedChange={(checked) => updateSetting('whatsapp_notifications', checked)}
            />
          </div>

          {settings.whatsapp_notifications && (
            <div className="ml-8 space-y-2">
              <Label htmlFor="whatsapp">WhatsApp Number</Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="+92 300 1234567"
                value={settings.whatsapp_number}
                onChange={(e) => updateSetting('whatsapp_number', e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Alert Types</span>
          </CardTitle>
          <CardDescription>
            Select which types of alerts you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-red-600">Critical Stock Alerts</h4>
              <p className="text-sm text-gray-600">When stock is critically low</p>
            </div>
            <Switch
              checked={settings.alert_types.critical_stock}
              onCheckedChange={(checked) => updateAlertType('critical_stock', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-orange-600">Overstock Alerts</h4>
              <p className="text-sm text-gray-600">When inventory is too high</p>
            </div>
            <Switch
              checked={settings.alert_types.overstock}
              onCheckedChange={(checked) => updateAlertType('overstock', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-600">Price Change Alerts</h4>
              <p className="text-sm text-gray-600">When AI suggests price changes</p>
            </div>
            <Switch
              checked={settings.alert_types.price_changes}
              onCheckedChange={(checked) => updateAlertType('price_changes', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-purple-600">Competitor Alerts</h4>
              <p className="text-sm text-gray-600">When competitor prices change</p>
            </div>
            <Switch
              checked={settings.alert_types.competitor_alerts}
              onCheckedChange={(checked) => updateAlertType('competitor_alerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-green-600">Marketing Events</h4>
              <p className="text-sm text-gray-600">Upcoming marketing opportunities</p>
            </div>
            <Switch
              checked={settings.alert_types.marketing_events}
              onCheckedChange={(checked) => updateAlertType('marketing_events', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-indigo-600">Reorder Reminders</h4>
              <p className="text-sm text-gray-600">When it's time to reorder products</p>
            </div>
            <Switch
              checked={settings.alert_types.reorder_reminders}
              onCheckedChange={(checked) => updateAlertType('reorder_reminders', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Threshold Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Thresholds</CardTitle>
          <CardDescription>
            Configure when you want to receive specific alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="lowStock">Low Stock Threshold</Label>
              <Input
                id="lowStock"
                type="number"
                min="1"
                value={settings.low_stock_threshold}
                onChange={(e) => updateSetting('low_stock_threshold', parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-500">Alert when stock falls below this number</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="overStock">Overstock Threshold</Label>
              <Input
                id="overStock"
                type="number"
                min="1"
                value={settings.overstock_threshold}
                onChange={(e) => updateSetting('overstock_threshold', parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-500">Alert when stock exceeds this number</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryWarning">Expiry Warning (Days)</Label>
              <Input
                id="expiryWarning"
                type="number"
                min="1"
                value={settings.expiry_warning_days}
                onChange={(e) => updateSetting('expiry_warning_days', parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-500">Alert this many days before expiry</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;
