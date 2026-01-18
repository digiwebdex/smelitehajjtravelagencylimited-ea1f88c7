import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";
import { Palette, Save, RefreshCw, Type, Moon, Sun, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ThemeSettings {
  id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_family: string;
  heading_font: string;
  dark_mode_enabled: boolean;
  border_radius: string;
}

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter (Modern)" },
  { value: "Roboto", label: "Roboto (Clean)" },
  { value: "Open Sans", label: "Open Sans (Readable)" },
  { value: "Lato", label: "Lato (Elegant)" },
  { value: "Poppins", label: "Poppins (Geometric)" },
  { value: "Montserrat", label: "Montserrat (Bold)" },
  { value: "Source Sans Pro", label: "Source Sans Pro" },
  { value: "Nunito", label: "Nunito (Rounded)" },
];

const HEADING_FONT_OPTIONS = [
  { value: "Playfair Display", label: "Playfair Display (Elegant)" },
  { value: "Merriweather", label: "Merriweather (Classic)" },
  { value: "Lora", label: "Lora (Book)" },
  { value: "Libre Baskerville", label: "Libre Baskerville (Traditional)" },
  { value: "Montserrat", label: "Montserrat (Modern)" },
  { value: "Raleway", label: "Raleway (Stylish)" },
  { value: "Oswald", label: "Oswald (Strong)" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond (Luxurious)" },
];

const BORDER_RADIUS_OPTIONS = [
  { value: "none", label: "None (0px)" },
  { value: "sm", label: "Small (4px)" },
  { value: "md", label: "Medium (8px)" },
  { value: "lg", label: "Large (12px)" },
  { value: "xl", label: "Extra Large (16px)" },
  { value: "2xl", label: "2XL (24px)" },
  { value: "full", label: "Full (Rounded)" },
];

const AdminThemeSettings = () => {
  const { toast } = useToast();
  const { refreshTheme } = useDynamicTheme();
  const [theme, setTheme] = useState<ThemeSettings>({
    id: "",
    primary_color: "#1e3a5f",
    secondary_color: "#c9a227",
    accent_color: "#2e7d32",
    background_color: "#ffffff",
    text_color: "#1a1a1a",
    font_family: "Inter",
    heading_font: "Playfair Display",
    dark_mode_enabled: false,
    border_radius: "lg",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    fetchThemeSettings();
  }, []);

  const fetchThemeSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("theme_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching theme:", error);
    } else if (data) {
      setTheme(data as ThemeSettings);
    }
    setLoading(false);
  };

  const handleChange = (field: keyof ThemeSettings, value: string | boolean) => {
    setTheme(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("theme_settings")
        .update({
          primary_color: theme.primary_color,
          secondary_color: theme.secondary_color,
          accent_color: theme.accent_color,
          background_color: theme.background_color,
          text_color: theme.text_color,
          font_family: theme.font_family,
          heading_font: theme.heading_font,
          dark_mode_enabled: theme.dark_mode_enabled,
          border_radius: theme.border_radius,
        })
        .eq("id", theme.id);

      if (error) throw error;

      // Refresh the theme across the app
      await refreshTheme();

      toast({
        title: "✅ Theme Saved",
        description: "Global theme settings updated and applied across the website",
      });
    } catch (error) {
      console.error("Error saving theme:", error);
      toast({
        title: "Error",
        description: "Failed to save theme settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    setPreviewing(true);
    // Open the homepage in a new tab to preview changes
    window.open("/", "_blank");
    setTimeout(() => setPreviewing(false), 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Global Theme Settings
            </CardTitle>
            <CardDescription>
              Configure colors, fonts, and appearance for the entire website. Changes apply instantly after saving.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePreview} variant="outline" disabled={previewing} className="gap-2">
              <Eye className="w-4 h-4" />
              {previewing ? "Opening..." : "Preview"}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Theme"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="colors" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors" className="gap-2">
              <Palette className="w-4 h-4" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="typography" className="gap-2">
              <Type className="w-4 h-4" />
              Typography
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Moon className="w-4 h-4" />
              Appearance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={theme.primary_color}
                    onChange={(e) => handleChange("primary_color", e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={theme.primary_color}
                    onChange={(e) => handleChange("primary_color", e.target.value)}
                    placeholder="#1e3a5f"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Main brand color for buttons, links</p>
              </div>

              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={theme.secondary_color}
                    onChange={(e) => handleChange("secondary_color", e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={theme.secondary_color}
                    onChange={(e) => handleChange("secondary_color", e.target.value)}
                    placeholder="#c9a227"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Accent color for highlights</p>
              </div>

              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={theme.accent_color}
                    onChange={(e) => handleChange("accent_color", e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={theme.accent_color}
                    onChange={(e) => handleChange("accent_color", e.target.value)}
                    placeholder="#2e7d32"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Additional accent color</p>
              </div>

              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={theme.background_color}
                    onChange={(e) => handleChange("background_color", e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={theme.background_color}
                    onChange={(e) => handleChange("background_color", e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Page background color</p>
              </div>

              <div className="space-y-2">
                <Label>Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={theme.text_color}
                    onChange={(e) => handleChange("text_color", e.target.value)}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={theme.text_color}
                    onChange={(e) => handleChange("text_color", e.target.value)}
                    placeholder="#1a1a1a"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Default text color</p>
              </div>
            </div>

            {/* Color Preview */}
            <div className="border rounded-lg p-6 space-y-4">
              <h4 className="font-medium">Color Preview</h4>
              <div className="flex gap-4 flex-wrap">
                <div 
                  className="w-20 h-20 rounded-lg shadow-md flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: theme.primary_color }}
                >
                  Primary
                </div>
                <div 
                  className="w-20 h-20 rounded-lg shadow-md flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: theme.secondary_color }}
                >
                  Secondary
                </div>
                <div 
                  className="w-20 h-20 rounded-lg shadow-md flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: theme.accent_color }}
                >
                  Accent
                </div>
                <div 
                  className="w-20 h-20 rounded-lg shadow-md flex items-center justify-center border text-xs"
                  style={{ backgroundColor: theme.background_color, color: theme.text_color }}
                >
                  Background
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="typography" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Body Font Family</Label>
                <Select
                  value={theme.font_family}
                  onValueChange={(value) => handleChange("font_family", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.value }}>{font.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Font used for body text</p>
              </div>

              <div className="space-y-2">
                <Label>Heading Font Family</Label>
                <Select
                  value={theme.heading_font}
                  onValueChange={(value) => handleChange("heading_font", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HEADING_FONT_OPTIONS.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.value }}>{font.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Font used for headings</p>
              </div>
            </div>

            {/* Typography Preview */}
            <div className="border rounded-lg p-6 space-y-4">
              <h4 className="font-medium">Typography Preview</h4>
              <div className="space-y-3">
                <h1 
                  className="text-3xl font-bold"
                  style={{ fontFamily: theme.heading_font }}
                >
                  Heading Example
                </h1>
                <p 
                  className="text-base"
                  style={{ fontFamily: theme.font_family }}
                >
                  This is body text using the selected font family. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {theme.dark_mode_enabled ? (
                      <Moon className="w-5 h-5" />
                    ) : (
                      <Sun className="w-5 h-5" />
                    )}
                    <div>
                      <Label>Dark Mode</Label>
                      <p className="text-xs text-muted-foreground">Enable dark theme</p>
                    </div>
                  </div>
                  <Switch
                    checked={theme.dark_mode_enabled}
                    onCheckedChange={(checked) => handleChange("dark_mode_enabled", checked)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Border Radius</Label>
                <Select
                  value={theme.border_radius}
                  onValueChange={(value) => handleChange("border_radius", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BORDER_RADIUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Default corner rounding</p>
              </div>
            </div>

            {/* Border Radius Preview */}
            <div className="border rounded-lg p-6 space-y-4">
              <h4 className="font-medium">Border Radius Preview</h4>
              <div className="flex gap-4">
                <div 
                  className="w-24 h-24 bg-primary flex items-center justify-center text-primary-foreground text-xs"
                  style={{ 
                    borderRadius: theme.border_radius === 'full' ? '9999px' : 
                      theme.border_radius === 'none' ? '0' :
                      theme.border_radius === 'sm' ? '4px' :
                      theme.border_radius === 'md' ? '8px' :
                      theme.border_radius === 'lg' ? '12px' :
                      theme.border_radius === 'xl' ? '16px' : '24px'
                  }}
                >
                  {theme.border_radius}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminThemeSettings;
