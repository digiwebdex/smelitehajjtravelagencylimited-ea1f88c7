import { useState, useEffect } from "react";
import { Settings, Save, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookingSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string | null;
}

export default function AdminBookingSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<BookingSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Record<string, any>>({});

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("booking_settings")
        .select("*")
        .order("setting_key");

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const getSettingValue = (setting: BookingSetting): boolean => {
    if (editedSettings[setting.setting_key] !== undefined) {
      return editedSettings[setting.setting_key];
    }
    return setting.setting_value?.enabled ?? false;
  };

  const updateSetting = (key: string, enabled: boolean) => {
    setEditedSettings((prev) => ({
      ...prev,
      [key]: enabled,
    }));
  };

  const saveAllSettings = async () => {
    setSaving(true);
    try {
      for (const [key, enabled] of Object.entries(editedSettings)) {
        const { error } = await supabase
          .from("booking_settings")
          .update({ setting_value: { enabled } })
          .eq("setting_key", key);

        if (error) throw error;
      }

      toast({
        title: "Settings Saved",
        description: "All booking settings have been updated.",
      });

      setEditedSettings({});
      fetchSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const settingLabels: Record<string, { title: string; description: string }> = {
    approval_required: {
      title: "Admin Approval Required",
      description: "Require admin approval before confirming air ticket bookings",
    },
    auto_ticket_upload: {
      title: "Auto Ticket Upload",
      description: "Allow automatic ticket file upload after confirmation",
    },
    sms_notifications: {
      title: "SMS Notifications",
      description: "Send SMS notifications for booking status updates",
    },
    email_notifications: {
      title: "Email Notifications",
      description: "Send email notifications for booking status updates",
    },
  };

  const hasChanges = Object.keys(editedSettings).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Booking Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure air ticket booking workflow and notifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {hasChanges && (
            <Button onClick={saveAllSettings} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Settings</CardTitle>
          <CardDescription>Configure the booking approval and notification flow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings
            .filter((s) => settingLabels[s.setting_key])
            .map((setting) => (
              <div
                key={setting.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div>
                  <Label className="text-base font-medium">
                    {settingLabels[setting.setting_key]?.title || setting.setting_key}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {settingLabels[setting.setting_key]?.description || setting.description}
                  </p>
                </div>
                <Switch
                  checked={getSettingValue(setting)}
                  onCheckedChange={(checked) => updateSetting(setting.setting_key, checked)}
                />
              </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Flow</CardTitle>
          <CardDescription>Available booking status options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {["Pending", "Confirmed", "Rejected", "Cancelled"].map((status) => (
              <div
                key={status}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  status === "Pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : status === "Confirmed"
                    ? "bg-green-100 text-green-800"
                    : status === "Rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {status}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Bookings flow: Pending → Confirmed/Rejected → Cancelled (optional)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
