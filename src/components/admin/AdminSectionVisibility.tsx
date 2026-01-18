import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  Loader2, 
  Save, 
  Eye, 
  EyeOff,
  Image,
  Layers,
  Package,
  MessageSquare,
  Users,
  HelpCircle,
  Images,
  Globe,
  Phone,
  GripVertical
} from "lucide-react";

interface SectionConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  is_active: boolean;
  order_index: number;
}

const defaultSections: SectionConfig[] = [
  { key: "hero", label: "Hero Section", description: "Main banner with slideshow", icon: Image, is_active: true, order_index: 0 },
  { key: "services", label: "Services Overview", description: "Key services cards", icon: Layers, is_active: true, order_index: 1 },
  { key: "hajj_packages", label: "Hajj Packages", description: "Hajj package listings", icon: Package, is_active: true, order_index: 2 },
  { key: "umrah_packages", label: "Umrah Packages", description: "Umrah package listings", icon: Package, is_active: true, order_index: 3 },
  { key: "visa_services", label: "Visa Services", description: "Visa application services", icon: Globe, is_active: true, order_index: 4 },
  { key: "testimonials", label: "Testimonials", description: "Customer reviews", icon: MessageSquare, is_active: true, order_index: 5 },
  { key: "team", label: "Team Section", description: "Team members display", icon: Users, is_active: true, order_index: 6 },
  { key: "faq", label: "FAQ Section", description: "Frequently asked questions", icon: HelpCircle, is_active: true, order_index: 7 },
  { key: "gallery", label: "Gallery Section", description: "Photo gallery", icon: Images, is_active: true, order_index: 8 },
  { key: "contact", label: "Contact Section", description: "Contact form and info", icon: Phone, is_active: true, order_index: 9 },
];

const AdminSectionVisibility = () => {
  const [sections, setSections] = useState<SectionConfig[]>(defaultSections);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSectionSettings();
  }, []);

  const fetchSectionSettings = async () => {
    try {
      const { data } = await supabase
        .from("section_settings")
        .select("section_key, is_active, order_index")
        .order("order_index");

      if (data && data.length > 0) {
        // Merge database settings with default sections
        const mergedSections = defaultSections.map(section => {
          const dbSetting = data.find(d => d.section_key === section.key);
          return {
            ...section,
            is_active: dbSetting?.is_active ?? section.is_active,
            order_index: dbSetting?.order_index ?? section.order_index,
          };
        });
        setSections(mergedSections.sort((a, b) => a.order_index - b.order_index));
      }
    } catch (error) {
      console.error("Error fetching section settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key: string) => {
    setSections(prev => 
      prev.map(section => 
        section.key === key 
          ? { ...section, is_active: !section.is_active }
          : section
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert all section settings
      for (const section of sections) {
        const { data: existing } = await supabase
          .from("section_settings")
          .select("id")
          .eq("section_key", section.key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("section_settings")
            .update({ 
              is_active: section.is_active,
              order_index: section.order_index 
            })
            .eq("section_key", section.key);
        } else {
          await supabase
            .from("section_settings")
            .insert({
              section_key: section.key,
              is_active: section.is_active,
              order_index: section.order_index,
              title: section.label,
            });
        }
      }
      
      toast.success("Section visibility settings saved!");
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving section settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const activeCount = sections.filter(s => s.is_active).length;
  const totalCount = sections.length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Section Visibility
            </CardTitle>
            <CardDescription>
              Control which sections are visible on your homepage ({activeCount}/{totalCount} active)
            </CardDescription>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasChanges}
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                  section.is_active 
                    ? "bg-primary/5 border-primary/20" 
                    : "bg-muted/50 border-border opacity-60"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-muted-foreground cursor-grab">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className={`p-2 rounded-lg ${section.is_active ? "bg-primary/10" : "bg-muted"}`}>
                    <Icon className={`h-5 w-5 ${section.is_active ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{section.label}</h4>
                      {section.is_active ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <Switch
                  checked={section.is_active}
                  onCheckedChange={() => toggleSection(section.key)}
                />
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Disabling a section will hide it from the homepage but preserve all its content. 
            You can re-enable it anytime to show it again.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSectionVisibility;
