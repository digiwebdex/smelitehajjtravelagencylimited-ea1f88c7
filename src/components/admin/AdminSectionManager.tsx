import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  GripVertical, 
  Save, 
  RefreshCw, 
  Layers,
  Eye,
  EyeOff,
  Palette,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SectionSetting {
  id: string;
  section_key: string;
  title: string | null;
  subtitle: string | null;
  is_active: boolean;
  order_index: number;
  bg_color: string | null;
  text_color: string | null;
  custom_css: string | null;
}

const DEFAULT_SECTIONS = [
  { section_key: 'hero', title: 'Hero Section', subtitle: 'Main banner area', order_index: 1 },
  { section_key: 'services', title: 'Our Services', subtitle: 'What we offer', order_index: 2 },
  { section_key: 'hajj', title: 'Hajj Packages', subtitle: 'Sacred pilgrimage packages', order_index: 3 },
  { section_key: 'umrah', title: 'Umrah Packages', subtitle: 'Year-round pilgrimage', order_index: 4 },
  { section_key: 'visa', title: 'Visa Services', subtitle: 'Visa processing', order_index: 5 },
  { section_key: 'gallery', title: 'Gallery', subtitle: 'Photo gallery', order_index: 6 },
  { section_key: 'testimonials', title: 'Testimonials', subtitle: 'Customer reviews', order_index: 7 },
  { section_key: 'team', title: 'Our Team', subtitle: 'Meet our experts', order_index: 8 },
  { section_key: 'faq', title: 'FAQ', subtitle: 'Frequently asked questions', order_index: 9 },
  { section_key: 'terminal', title: 'Terminal', subtitle: 'Interactive terminal', order_index: 10 },
  { section_key: 'contact', title: 'Contact', subtitle: 'Get in touch', order_index: 11 },
];

const AdminSectionManager = () => {
  const { toast } = useToast();
  const [sections, setSections] = useState<SectionSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("section_settings")
      .select("*")
      .order("order_index");

    if (error) {
      console.error("Error fetching sections:", error);
      toast({
        title: "Error",
        description: "Failed to load sections",
        variant: "destructive",
      });
    } else if (data) {
      // Merge with defaults for any missing sections
      const existingKeys = data.map(s => s.section_key);
      const missingDefaults = DEFAULT_SECTIONS.filter(d => !existingKeys.includes(d.section_key));
      
      const allSections = [
        ...data.map(s => ({
          ...s,
          bg_color: s.bg_color || null,
          text_color: s.text_color || null,
          custom_css: s.custom_css || null,
        })),
        ...missingDefaults.map(d => ({
          id: `temp-${d.section_key}`,
          section_key: d.section_key,
          title: d.title,
          subtitle: d.subtitle,
          is_active: true,
          order_index: d.order_index,
          bg_color: null,
          text_color: null,
          custom_css: null,
        }))
      ].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      
      setSections(allSections);
    }
    setLoading(false);
  };

  const handleToggle = (sectionKey: string, enabled: boolean) => {
    setSections(prev => 
      prev.map(s => 
        s.section_key === sectionKey ? { ...s, is_active: enabled } : s
      )
    );
  };

  const handleStyleChange = (sectionKey: string, field: keyof SectionSetting, value: string | null) => {
    setSections(prev => 
      prev.map(s => 
        s.section_key === sectionKey ? { ...s, [field]: value || null } : s
      )
    );
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    
    // Update order_index for all
    newSections.forEach((s, i) => {
      s.order_index = i + 1;
    });
    
    setSections(newSections);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const section of sections) {
        if (section.id.startsWith('temp-')) {
          // Insert new section
          await supabase.from("section_settings").insert({
            section_key: section.section_key,
            title: section.title,
            subtitle: section.subtitle,
            is_active: section.is_active,
            order_index: section.order_index,
            bg_color: section.bg_color,
            text_color: section.text_color,
            custom_css: section.custom_css,
          });
        } else {
          // Update existing
          await supabase
            .from("section_settings")
            .update({
              is_active: section.is_active,
              order_index: section.order_index,
              bg_color: section.bg_color,
              text_color: section.text_color,
              custom_css: section.custom_css,
            })
            .eq("id", section.id);
        }
      }
      
      toast({
        title: "✅ Saved",
        description: "Section settings updated successfully",
      });
      
      fetchSections();
    } catch (error) {
      console.error("Error saving sections:", error);
      toast({
        title: "Error",
        description: "Failed to save section settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
              <Layers className="w-5 h-5" />
              Section Manager
            </CardTitle>
            <CardDescription>
              Enable/disable, reorder, and style website sections
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sections.map((section, index) => (
          <Collapsible
            key={section.section_key}
            open={expandedSection === section.section_key}
            onOpenChange={(open) => setExpandedSection(open ? section.section_key : null)}
          >
            <div className="border rounded-lg bg-card overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveSection(index, 'up')}
                    disabled={index === 0}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveSection(index, 'down')}
                    disabled={index === sections.length - 1}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
                
                <GripVertical className="w-5 h-5 text-muted-foreground" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{section.title || section.section_key}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {section.section_key}
                    </span>
                  </div>
                  {section.subtitle && (
                    <p className="text-sm text-muted-foreground truncate">{section.subtitle}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {section.is_active ? (
                      <Eye className="w-4 h-4 text-green-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Switch
                      checked={section.is_active}
                      onCheckedChange={(checked) => handleToggle(section.section_key, checked)}
                    />
                  </div>
                  
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Palette className="w-4 h-4" />
                      Style
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              
              <CollapsibleContent>
                <div className="border-t p-4 bg-muted/30 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`bg-${section.section_key}`}>Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`bg-${section.section_key}`}
                        type="color"
                        value={section.bg_color || "#ffffff"}
                        onChange={(e) => handleStyleChange(section.section_key, 'bg_color', e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={section.bg_color || ""}
                        onChange={(e) => handleStyleChange(section.section_key, 'bg_color', e.target.value)}
                        placeholder="#ffffff or transparent"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`text-${section.section_key}`}>Text Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`text-${section.section_key}`}
                        type="color"
                        value={section.text_color || "#1a1a1a"}
                        onChange={(e) => handleStyleChange(section.section_key, 'text_color', e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={section.text_color || ""}
                        onChange={(e) => handleStyleChange(section.section_key, 'text_color', e.target.value)}
                        placeholder="#1a1a1a"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`css-${section.section_key}`}>Custom CSS Class</Label>
                    <Input
                      id={`css-${section.section_key}`}
                      value={section.custom_css || ""}
                      onChange={(e) => handleStyleChange(section.section_key, 'custom_css', e.target.value)}
                      placeholder="e.g., py-24 bg-gradient-to-b"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
};

export default AdminSectionManager;
