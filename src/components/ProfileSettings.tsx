import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User, Building, Mail, Phone, MapPin, Save, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UserProfile {
  id?: string;
  first_name: string;
  last_name: string;
  company: string;
  bio: string;
  phone: string;
  location: string;
  currency: string;
  timezone: string;
}

const ProfileSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile>({
    first_name: "",
    last_name: "",
    company: "",
    bio: "",
    phone: "",
    location: "",
    currency: "PKR",
    timezone: "Asia/Karachi"
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile({
          id: data.id,
          first_name: "", // These don't exist in notification_settings table
          last_name: "",  // These don't exist in notification_settings table
          company: data.company || "",
          bio: data.bio || "",
          phone: data.whatsapp_number || "",
          location: "",
          currency: data.currency || "PKR",
          timezone: "Asia/Karachi"
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to save profile settings",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const profileData = {
        user_id: user.id,
        company: profile.company,
        bio: profile.bio,
        whatsapp_number: profile.phone,
        currency: profile.currency,
        updated_at: new Date().toISOString()
      };

      if (profile.id) {
        // Update existing profile
        const { error } = await supabase
          .from('notification_settings')
          .update(profileData)
          .eq('id', profile.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('notification_settings')
          .insert([{
            ...profileData,
            email_notifications: true,
            whatsapp_notifications: false,
            low_stock_threshold: 10,
            overstock_threshold: 100,
            expiry_warning_days: 30
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setProfile(prev => ({ ...prev, id: data.id }));
        }
      }

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile information",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateProfile = (key: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to access profile settings.</p>
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
      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Account Information</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAccountDetails(!showAccountDetails)}
            >
              {showAccountDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showAccountDetails ? 'Hide' : 'Show'} Details
            </Button>
          </CardTitle>
          <CardDescription>
            Your basic account information from authentication
          </CardDescription>
        </CardHeader>
        {showAccountDetails && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{user.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>User ID</Label>
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700 font-mono text-sm">{user.id.substring(0, 8)}...</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account Created</Label>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Personal Information</span>
          </CardTitle>
          <CardDescription>
            Update your personal details and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={profile.first_name}
                onChange={(e) => updateProfile('first_name', e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={profile.last_name}
                onChange={(e) => updateProfile('last_name', e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company/Business Name</Label>
            <div className="relative">
              <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="company"
                className="pl-10"
                value={profile.company}
                onChange={(e) => updateProfile('company', e.target.value)}
                placeholder="Enter your company name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                className="pl-10"
                value={profile.phone}
                onChange={(e) => updateProfile('phone', e.target.value)}
                placeholder="+92 300 1234567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="location"
                className="pl-10"
                value={profile.location}
                onChange={(e) => updateProfile('location', e.target.value)}
                placeholder="City, Country"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => updateProfile('bio', e.target.value)}
              placeholder="Tell us about yourself and your business..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Business Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Business Preferences</CardTitle>
          <CardDescription>
            Configure your business settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Preferred Currency</Label>
              <select
                id="currency"
                value={profile.currency}
                onChange={(e) => updateProfile('currency', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="PKR">PKR - Pakistani Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="INR">INR - Indian Rupee</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Time Zone</Label>
              <select
                id="timezone"
                value={profile.timezone}
                onChange={(e) => updateProfile('timezone', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveProfile} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
};

export default ProfileSettings;
