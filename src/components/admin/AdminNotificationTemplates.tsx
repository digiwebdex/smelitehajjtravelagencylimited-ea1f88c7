import { useState, useEffect } from "react";
import { MessageSquare, Mail, Save, Loader2, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationTemplate {
  id: string;
  template_key: string;
  template_name: string;
  sms_template: string | null;
  email_subject: string | null;
  email_template: string | null;
  is_active: boolean;
  variables: string[];
}

export default function AdminNotificationTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedTemplates, setEditedTemplates] = useState<Record<string, Partial<NotificationTemplate>>>({});

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notification_templates")
        .select("*")
        .order("template_name");

      if (error) throw error;
      setTemplates(data || []);
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
    fetchTemplates();
  }, []);

  const updateLocalTemplate = (id: string, field: string, value: any) => {
    setEditedTemplates((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }));
  };

  const getTemplateValue = (template: NotificationTemplate, field: keyof NotificationTemplate) => {
    const edited = editedTemplates[template.id];
    if (edited && field in edited) {
      return edited[field as keyof typeof edited];
    }
    return template[field];
  };

  const saveTemplate = async (template: NotificationTemplate) => {
    const edited = editedTemplates[template.id];
    if (!edited) return;

    setSaving(template.id);
    try {
      const { error } = await supabase
        .from("notification_templates")
        .update(edited)
        .eq("id", template.id);

      if (error) throw error;

      toast({
        title: "Saved",
        description: `${template.template_name} has been updated.`,
      });

      // Clear edited state
      setEditedTemplates((prev) => {
        const newState = { ...prev };
        delete newState[template.id];
        return newState;
      });

      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const hasChanges = (templateId: string) => {
    return !!editedTemplates[templateId] && Object.keys(editedTemplates[templateId]).length > 0;
  };

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
          <h2 className="text-lg font-semibold">Notification Templates</h2>
          <p className="text-sm text-muted-foreground">
            Manage SMS and Email templates for bookings
          </p>
        </div>
        <Button variant="outline" onClick={fetchTemplates}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-6">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{template.template_name}</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    Key: {template.template_key}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={getTemplateValue(template, "is_active") as boolean}
                      onCheckedChange={(checked) =>
                        updateLocalTemplate(template.id, "is_active", checked)
                      }
                    />
                    <Label>Active</Label>
                  </div>
                  {hasChanges(template.id) && (
                    <Button
                      size="sm"
                      onClick={() => saveTemplate(template)}
                      disabled={saving === template.id}
                    >
                      {saving === template.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {template.variables && template.variables.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Available Variables:
                  </span>
                  {template.variables.map((v) => (
                    <Badge key={v} variant="secondary" className="font-mono text-xs">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              )}

              <Tabs defaultValue="sms">
                <TabsList>
                  <TabsTrigger value="sms">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    SMS Template
                  </TabsTrigger>
                  <TabsTrigger value="email">
                    <Mail className="w-4 h-4 mr-2" />
                    Email Template
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="sms" className="space-y-3">
                  <div>
                    <Label>SMS Message</Label>
                    <Textarea
                      value={(getTemplateValue(template, "sms_template") as string) || ""}
                      onChange={(e) =>
                        updateLocalTemplate(template.id, "sms_template", e.target.value)
                      }
                      placeholder="Enter SMS template..."
                      rows={3}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Keep SMS under 160 characters for single message
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="email" className="space-y-3">
                  <div>
                    <Label>Email Subject</Label>
                    <Input
                      value={(getTemplateValue(template, "email_subject") as string) || ""}
                      onChange={(e) =>
                        updateLocalTemplate(template.id, "email_subject", e.target.value)
                      }
                      placeholder="Enter email subject..."
                    />
                  </div>
                  <div>
                    <Label>Email Body (HTML)</Label>
                    <Textarea
                      value={(getTemplateValue(template, "email_template") as string) || ""}
                      onChange={(e) =>
                        updateLocalTemplate(template.id, "email_template", e.target.value)
                      }
                      placeholder="Enter email HTML template..."
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
