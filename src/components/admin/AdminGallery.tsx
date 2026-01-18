import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, Plus, Trash2, Edit2, ChevronUp, ChevronDown, 
  Image as ImageIcon, Settings, Palette, Layout, Eye, 
  Grid3X3, Play, Monitor, Tablet, Smartphone, Sparkles,
  X, Tag
} from "lucide-react";
import { useImageUpload } from "@/hooks/useImageUpload";

interface GalleryImage {
  id: string;
  image_url: string;
  alt_text: string;
  caption: string | null;
  order_index: number;
  is_active: boolean;
  category: string | null;
  tags: string[] | null;
}

interface GallerySettings {
  id: string;
  title: string;
  subtitle: string | null;
  background_color: string | null;
  is_enabled: boolean;
  columns_desktop: number;
  columns_tablet: number;
  columns_mobile: number;
  image_aspect_ratio: string;
  image_border_radius: string;
  show_captions: boolean;
  hover_effect: string;
  lightbox_enabled: boolean;
  autoplay_carousel: boolean;
  autoplay_speed: number;
  show_thumbnails: boolean;
  title_color: string | null;
  subtitle_color: string | null;
  overlay_color: string;
  default_view: string;
}

const ASPECT_RATIOS = [
  { value: "square", label: "Square (1:1)" },
  { value: "landscape", label: "Landscape (4:3)" },
  { value: "portrait", label: "Portrait (3:4)" },
  { value: "wide", label: "Wide (16:9)" },
  { value: "auto", label: "Auto (Original)" },
];

const BORDER_RADIUS = [
  { value: "none", label: "None" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "Extra Large" },
  { value: "full", label: "Full (Circle)" },
];

const HOVER_EFFECTS = [
  { value: "none", label: "None" },
  { value: "zoom", label: "Zoom" },
  { value: "lift", label: "Lift & Shadow" },
  { value: "glow", label: "Glow Effect" },
  { value: "grayscale", label: "Grayscale to Color" },
  { value: "blur", label: "Blur Reveal" },
];

const CATEGORIES = [
  "general",
  "hajj",
  "umrah",
  "makkah",
  "madinah",
  "travel",
  "hotel",
  "group",
];

const AdminGallery = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [settings, setSettings] = useState<GallerySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [tagInput, setTagInput] = useState("");
  
  // Form state for image
  const [imageUrl, setImageUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState<string[]>([]);
  
  const { uploadImage, uploading } = useImageUpload({ bucket: "admin-uploads", folder: "gallery" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from("gallery_settings")
        .select("*")
        .single();

      if (settingsError && settingsError.code !== "PGRST116") {
        console.error("Error fetching settings:", settingsError);
      }
      
      if (settingsData) {
        setSettings({
          ...settingsData,
          columns_desktop: settingsData.columns_desktop || 4,
          columns_tablet: settingsData.columns_tablet || 3,
          columns_mobile: settingsData.columns_mobile || 2,
          image_aspect_ratio: settingsData.image_aspect_ratio || "square",
          image_border_radius: settingsData.image_border_radius || "lg",
          show_captions: settingsData.show_captions ?? true,
          hover_effect: settingsData.hover_effect || "zoom",
          lightbox_enabled: settingsData.lightbox_enabled ?? true,
          autoplay_carousel: settingsData.autoplay_carousel ?? true,
          autoplay_speed: settingsData.autoplay_speed || 4000,
          show_thumbnails: settingsData.show_thumbnails ?? true,
          overlay_color: settingsData.overlay_color || "rgba(0,0,0,0.6)",
          default_view: settingsData.default_view || "grid",
        });
      }

      const { data: imagesData } = await supabase
        .from("gallery_images")
        .select("*")
        .order("order_index");

      if (imagesData) {
        setImages(imagesData);
      }
    } catch (error) {
      console.error("Error fetching gallery data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("gallery_settings")
        .update({
          title: settings.title,
          subtitle: settings.subtitle,
          background_color: settings.background_color,
          is_enabled: settings.is_enabled,
          columns_desktop: settings.columns_desktop,
          columns_tablet: settings.columns_tablet,
          columns_mobile: settings.columns_mobile,
          image_aspect_ratio: settings.image_aspect_ratio,
          image_border_radius: settings.image_border_radius,
          show_captions: settings.show_captions,
          hover_effect: settings.hover_effect,
          lightbox_enabled: settings.lightbox_enabled,
          autoplay_carousel: settings.autoplay_carousel,
          autoplay_speed: settings.autoplay_speed,
          show_thumbnails: settings.show_thumbnails,
          title_color: settings.title_color,
          subtitle_color: settings.subtitle_color,
          overlay_color: settings.overlay_color,
          default_view: settings.default_view,
        })
        .eq("id", settings.id);

      if (error) throw error;
      toast.success("Gallery settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    const url = await uploadImage(file);
    if (url) {
      setImageUrl(url);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmitImage = async () => {
    if (!imageUrl.trim()) {
      toast.error("Please provide an image URL");
      return;
    }

    setSaving(true);
    try {
      if (editingImage) {
        const { error } = await supabase
          .from("gallery_images")
          .update({
            image_url: imageUrl,
            alt_text: altText,
            caption: caption || null,
            category: category,
            tags: tags,
          })
          .eq("id", editingImage.id);

        if (error) throw error;
        toast.success("Image updated successfully");
      } else {
        const maxOrder = images.length > 0 ? Math.max(...images.map(i => i.order_index)) : -1;
        const { error } = await supabase
          .from("gallery_images")
          .insert({
            image_url: imageUrl,
            alt_text: altText,
            caption: caption || null,
            order_index: maxOrder + 1,
            category: category,
            tags: tags,
          });

        if (error) throw error;
        toast.success("Image added successfully");
      }
      
      resetForm();
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving image:", error);
      toast.error("Failed to save image");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      const { error } = await supabase
        .from("gallery_images")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Image deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    }
  };

  const toggleImageActive = async (image: GalleryImage) => {
    try {
      const { error } = await supabase
        .from("gallery_images")
        .update({ is_active: !image.is_active })
        .eq("id", image.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error toggling image:", error);
      toast.error("Failed to update image");
    }
  };

  const moveImage = async (image: GalleryImage, direction: "up" | "down") => {
    const currentIndex = images.findIndex(i => i.id === image.id);
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    
    if (swapIndex < 0 || swapIndex >= images.length) return;

    const swapImage = images[swapIndex];
    
    try {
      await supabase.from("gallery_images").update({ order_index: swapImage.order_index }).eq("id", image.id);
      await supabase.from("gallery_images").update({ order_index: image.order_index }).eq("id", swapImage.id);
      fetchData();
    } catch (error) {
      console.error("Error reordering images:", error);
      toast.error("Failed to reorder images");
    }
  };

  const resetForm = () => {
    setImageUrl("");
    setAltText("");
    setCaption("");
    setCategory("general");
    setTags([]);
    setTagInput("");
    setEditingImage(null);
  };

  const openEditDialog = (image: GalleryImage) => {
    setEditingImage(image);
    setImageUrl(image.image_url);
    setAltText(image.alt_text);
    setCaption(image.caption || "");
    setCategory(image.category || "general");
    setTags(image.tags || []);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Card with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gallery Configuration
          </CardTitle>
          <CardDescription>
            Customize every aspect of your gallery appearance and behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="general" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger value="layout" className="gap-2">
                <Layout className="h-4 w-4" />
                <span className="hidden sm:inline">Layout</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Appearance</span>
              </TabsTrigger>
              <TabsTrigger value="behavior" className="gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Behavior</span>
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                <div>
                  <Label className="text-base font-medium">Enable Gallery</Label>
                  <p className="text-sm text-muted-foreground">Show the gallery section on the homepage</p>
                </div>
                <Switch
                  checked={settings?.is_enabled ?? true}
                  onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, is_enabled: checked } : null)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Gallery Title</Label>
                  <Input
                    id="title"
                    value={settings?.title || ""}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, title: e.target.value } : null)}
                    placeholder="Our Gallery"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_view">Default View</Label>
                  <Select
                    value={settings?.default_view || "grid"}
                    onValueChange={(value) => setSettings(prev => prev ? { ...prev, default_view: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">
                        <div className="flex items-center gap-2">
                          <Grid3X3 className="h-4 w-4" />
                          Grid View
                        </div>
                      </SelectItem>
                      <SelectItem value="carousel">
                        <div className="flex items-center gap-2">
                          <Play className="h-4 w-4" />
                          Carousel View
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Gallery Subtitle</Label>
                <Textarea
                  id="subtitle"
                  value={settings?.subtitle || ""}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, subtitle: e.target.value } : null)}
                  placeholder="Capturing beautiful moments from our sacred journeys"
                  rows={2}
                />
              </div>
            </TabsContent>

            {/* Layout Tab */}
            <TabsContent value="layout" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Monitor className="h-4 w-4" />
                    Desktop Columns
                  </div>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[settings?.columns_desktop || 4]}
                      onValueChange={(value) => setSettings(prev => prev ? { ...prev, columns_desktop: value[0] } : null)}
                      min={2}
                      max={6}
                      step={1}
                      className="flex-1"
                    />
                    <Badge variant="secondary" className="min-w-[2rem] justify-center">
                      {settings?.columns_desktop || 4}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Tablet className="h-4 w-4" />
                    Tablet Columns
                  </div>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[settings?.columns_tablet || 3]}
                      onValueChange={(value) => setSettings(prev => prev ? { ...prev, columns_tablet: value[0] } : null)}
                      min={1}
                      max={4}
                      step={1}
                      className="flex-1"
                    />
                    <Badge variant="secondary" className="min-w-[2rem] justify-center">
                      {settings?.columns_tablet || 3}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Smartphone className="h-4 w-4" />
                    Mobile Columns
                  </div>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[settings?.columns_mobile || 2]}
                      onValueChange={(value) => setSettings(prev => prev ? { ...prev, columns_mobile: value[0] } : null)}
                      min={1}
                      max={3}
                      step={1}
                      className="flex-1"
                    />
                    <Badge variant="secondary" className="min-w-[2rem] justify-center">
                      {settings?.columns_mobile || 2}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Image Aspect Ratio</Label>
                  <Select
                    value={settings?.image_aspect_ratio || "square"}
                    onValueChange={(value) => setSettings(prev => prev ? { ...prev, image_aspect_ratio: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIOS.map((ratio) => (
                        <SelectItem key={ratio.value} value={ratio.value}>
                          {ratio.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Image Border Radius</Label>
                  <Select
                    value={settings?.image_border_radius || "lg"}
                    onValueChange={(value) => setSettings(prev => prev ? { ...prev, image_border_radius: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BORDER_RADIUS.map((radius) => (
                        <SelectItem key={radius.value} value={radius.value}>
                          {radius.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Background Color
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings?.background_color || "#f8fafc"}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, background_color: e.target.value } : null)}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings?.background_color || ""}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, background_color: e.target.value } : null)}
                      placeholder="#f8fafc"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Overlay Color (Hex with opacity)
                  </Label>
                  <Input
                    value={settings?.overlay_color || "rgba(0,0,0,0.6)"}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, overlay_color: e.target.value } : null)}
                    placeholder="rgba(0,0,0,0.6)"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title Color (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings?.title_color || "#000000"}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, title_color: e.target.value } : null)}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings?.title_color || ""}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, title_color: e.target.value } : null)}
                      placeholder="Leave empty for default"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Subtitle Color (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings?.subtitle_color || "#666666"}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, subtitle_color: e.target.value } : null)}
                      className="w-14 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings?.subtitle_color || ""}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, subtitle_color: e.target.value } : null)}
                      placeholder="Leave empty for default"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hover Effect</Label>
                <Select
                  value={settings?.hover_effect || "zoom"}
                  onValueChange={(value) => setSettings(prev => prev ? { ...prev, hover_effect: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOVER_EFFECTS.map((effect) => (
                      <SelectItem key={effect.value} value={effect.value}>
                        {effect.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Behavior Tab */}
            <TabsContent value="behavior" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label className="text-base font-medium">Show Captions</Label>
                    <p className="text-sm text-muted-foreground">Display image captions on hover</p>
                  </div>
                  <Switch
                    checked={settings?.show_captions ?? true}
                    onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, show_captions: checked } : null)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label className="text-base font-medium">Enable Lightbox</Label>
                    <p className="text-sm text-muted-foreground">Open images in fullscreen viewer</p>
                  </div>
                  <Switch
                    checked={settings?.lightbox_enabled ?? true}
                    onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, lightbox_enabled: checked } : null)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label className="text-base font-medium">Carousel Autoplay</Label>
                    <p className="text-sm text-muted-foreground">Auto-slide in carousel view</p>
                  </div>
                  <Switch
                    checked={settings?.autoplay_carousel ?? true}
                    onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, autoplay_carousel: checked } : null)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label className="text-base font-medium">Show Thumbnails</Label>
                    <p className="text-sm text-muted-foreground">Display thumbnail navigation</p>
                  </div>
                  <Switch
                    checked={settings?.show_thumbnails ?? true}
                    onCheckedChange={(checked) => setSettings(prev => prev ? { ...prev, show_thumbnails: checked } : null)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Play className="h-4 w-4" />
                  Autoplay Speed: {((settings?.autoplay_speed || 4000) / 1000).toFixed(1)}s
                </div>
                <Slider
                  value={[settings?.autoplay_speed || 4000]}
                  onValueChange={(value) => setSettings(prev => prev ? { ...prev, autoplay_speed: value[0] } : null)}
                  min={1000}
                  max={10000}
                  step={500}
                />
                <p className="text-xs text-muted-foreground">
                  Time between slides in carousel autoplay mode
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-6 border-t">
            <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save All Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Images Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Gallery Images
            </CardTitle>
            <CardDescription>
              Manage your gallery images - add, edit, categorize, and reorder
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Image
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingImage ? "Edit Image" : "Add New Image"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Image</Label>
                  <div className="flex gap-2">
                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Enter image URL or upload"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => document.getElementById("gallery-image-upload")?.click()}
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
                    </Button>
                    <input
                      id="gallery-image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                    />
                  </div>
                  {imageUrl && (
                    <img src={imageUrl} alt="Preview" className="w-full h-40 object-cover rounded-lg mt-2" />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="altText">Alt Text (for accessibility)</Label>
                  <Input
                    id="altText"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Describe the image"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="caption">Caption (optional)</Label>
                  <Textarea
                    id="caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption for this image"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitImage} disabled={saving || !imageUrl}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingImage ? "Update" : "Add"} Image
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No images in the gallery yet.</p>
              <p className="text-sm">Click "Add Image" to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Order</TableHead>
                    <TableHead className="w-20">Preview</TableHead>
                    <TableHead>Alt Text</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="w-20">Active</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {images.map((image, index) => (
                    <TableRow key={image.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={index === 0}
                            onClick={() => moveImage(image, "up")}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={index === images.length - 1}
                            onClick={() => moveImage(image, "down")}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <img
                          src={image.image_url}
                          alt={image.alt_text}
                          className="w-14 h-14 object-cover rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder.svg";
                          }}
                        />
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">
                        {image.alt_text || <span className="text-muted-foreground italic">No alt text</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {image.category || "general"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <div className="flex flex-wrap gap-1">
                          {image.tags?.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {(image.tags?.length || 0) > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(image.tags?.length || 0) - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={image.is_active}
                          onCheckedChange={() => toggleImageActive(image)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(image)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteImage(image.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Live Preview
          </CardTitle>
          <CardDescription>
            Preview how your gallery will look with current settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="rounded-lg p-6 border"
            style={{ backgroundColor: settings?.background_color || "#f8fafc" }}
          >
            <div className="text-center mb-6">
              <h3 
                className="text-2xl font-bold"
                style={{ color: settings?.title_color || undefined }}
              >
                {settings?.title || "Our Gallery"}
              </h3>
              {settings?.subtitle && (
                <p 
                  className="mt-2"
                  style={{ color: settings?.subtitle_color || undefined }}
                >
                  {settings.subtitle}
                </p>
              )}
            </div>
            <div 
              className="grid gap-4"
              style={{ 
                gridTemplateColumns: `repeat(${Math.min(settings?.columns_desktop || 4, 4)}, 1fr)` 
              }}
            >
              {images.filter(i => i.is_active).slice(0, 8).map((image) => (
                <div 
                  key={image.id}
                  className={`overflow-hidden transition-all duration-300 ${
                    settings?.hover_effect === "lift" ? "hover:-translate-y-2 hover:shadow-xl" :
                    settings?.hover_effect === "glow" ? "hover:shadow-lg hover:shadow-primary/30" :
                    ""
                  }`}
                  style={{
                    borderRadius: 
                      settings?.image_border_radius === "none" ? "0" :
                      settings?.image_border_radius === "sm" ? "0.25rem" :
                      settings?.image_border_radius === "md" ? "0.5rem" :
                      settings?.image_border_radius === "lg" ? "0.75rem" :
                      settings?.image_border_radius === "xl" ? "1rem" :
                      settings?.image_border_radius === "full" ? "9999px" : "0.75rem"
                  }}
                >
                  <div 
                    className="overflow-hidden"
                    style={{
                      aspectRatio: 
                        settings?.image_aspect_ratio === "square" ? "1/1" :
                        settings?.image_aspect_ratio === "landscape" ? "4/3" :
                        settings?.image_aspect_ratio === "portrait" ? "3/4" :
                        settings?.image_aspect_ratio === "wide" ? "16/9" : "auto"
                    }}
                  >
                    <img 
                      src={image.image_url} 
                      alt={image.alt_text}
                      className={`w-full h-full object-cover transition-all duration-500 ${
                        settings?.hover_effect === "zoom" ? "hover:scale-110" :
                        settings?.hover_effect === "grayscale" ? "grayscale hover:grayscale-0" :
                        settings?.hover_effect === "blur" ? "blur-sm hover:blur-0" :
                        ""
                      }`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.svg";
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGallery;
