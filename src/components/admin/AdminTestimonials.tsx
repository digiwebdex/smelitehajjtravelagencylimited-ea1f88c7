import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useImageUpload } from "@/hooks/useImageUpload";
import ImageUpload from "./ImageUpload";
import { Plus, Edit, Trash2, Star, User, FileText, Loader2 } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  location: string;
  package_name: string;
  rating: number;
  quote: string;
  avatar_url: string;
  order_index: number;
  is_active: boolean;
}

interface SectionHeader {
  badge_text: string;
  title: string;
  arabic_text: string;
  description: string;
}

const AdminTestimonials = () => {
  const { toast } = useToast();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null);
  const [formData, setFormData] = useState({
    name: "", location: "", package_name: "", rating: 5, quote: "", avatar_url: ""
  });
  
  // Section header state
  const [sectionHeader, setSectionHeader] = useState<SectionHeader>({
    badge_text: "Testimonials",
    title: "What Our Pilgrims Say",
    arabic_text: "شهادات",
    description: "Read authentic experiences from our valued pilgrims who trusted us with their sacred journey."
  });
  const [savingHeader, setSavingHeader] = useState(false);

  const { uploadImage, uploading } = useImageUpload({
    bucket: "admin-uploads",
    folder: "testimonials",
  });

  useEffect(() => {
    fetchTestimonials();
    fetchSectionHeader();
  }, []);

  const fetchTestimonials = async () => {
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .order("order_index");
    
    if (!error && data) setTestimonials(data);
    setLoading(false);
  };

  const fetchSectionHeader = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "testimonials_section_header")
      .maybeSingle();
    
    if (data?.setting_value) {
      setSectionHeader(data.setting_value as unknown as SectionHeader);
    }
  };

  const saveSectionHeader = async () => {
    setSavingHeader(true);
    try {
      const settingValue = JSON.parse(JSON.stringify(sectionHeader));
      
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("setting_key", "testimonials_section_header")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("site_settings")
          .update({ setting_value: settingValue })
          .eq("setting_key", "testimonials_section_header");
      } else {
        await supabase
          .from("site_settings")
          .insert([{ setting_key: "testimonials_section_header", setting_value: settingValue, category: "sections" }]);
      }
      toast({ title: "Success", description: "Section header saved" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save header", variant: "destructive" });
    }
    setSavingHeader(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingItem) {
      const { error } = await supabase.from("testimonials").update(formData).eq("id", editingItem.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Testimonial updated" });
    } else {
      const maxOrder = Math.max(...testimonials.map(t => t.order_index), 0);
      const { error } = await supabase.from("testimonials").insert({ ...formData, order_index: maxOrder + 1 });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Testimonial created" });
    }
    
    setIsDialogOpen(false);
    setEditingItem(null);
    resetForm();
    fetchTestimonials();
  };

  const resetForm = () => {
    setFormData({ name: "", location: "", package_name: "", rating: 5, quote: "", avatar_url: "" });
  };

  const handleEdit = (item: Testimonial) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      location: item.location || "",
      package_name: item.package_name || "",
      rating: item.rating,
      quote: item.quote,
      avatar_url: item.avatar_url || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await supabase.from("testimonials").delete().eq("id", id);
    toast({ title: "Success", description: "Testimonial deleted" });
    fetchTestimonials();
  };

  const toggleActive = async (item: Testimonial) => {
    await supabase.from("testimonials").update({ is_active: !item.is_active }).eq("id", item.id);
    fetchTestimonials();
  };

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Section Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Section Header
          </CardTitle>
          <CardDescription>Customize the Testimonials section header text</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Badge Text</label>
              <Input
                value={sectionHeader.badge_text}
                onChange={(e) => setSectionHeader({ ...sectionHeader, badge_text: e.target.value })}
                placeholder="e.g., Testimonials"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Arabic Text</label>
              <Input
                value={sectionHeader.arabic_text}
                onChange={(e) => setSectionHeader({ ...sectionHeader, arabic_text: e.target.value })}
                placeholder="e.g., شهادات"
                dir="rtl"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={sectionHeader.title}
              onChange={(e) => setSectionHeader({ ...sectionHeader, title: e.target.value })}
              placeholder="e.g., What Our Pilgrims Say"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={sectionHeader.description}
              onChange={(e) => setSectionHeader({ ...sectionHeader, description: e.target.value })}
              placeholder="Section description..."
              rows={2}
            />
          </div>
          <Button onClick={saveSectionHeader} disabled={savingHeader}>
            {savingHeader && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Header
          </Button>
        </CardContent>
      </Card>

      {/* Testimonials Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Testimonials</CardTitle>
            <CardDescription>Manage customer reviews and testimonials</CardDescription>
          </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingItem(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Testimonial</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <ImageUpload
                value={formData.avatar_url}
                onChange={(url) => setFormData({ ...formData, avatar_url: url })}
                onUpload={uploadImage}
                uploading={uploading}
                label="Avatar Image"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="City, Country" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Package Name</label>
                  <Input value={formData.package_name} onChange={(e) => setFormData({ ...formData, package_name: e.target.value })} placeholder="e.g., Hajj Premium 2025" />
                </div>
                <div>
                  <label className="text-sm font-medium">Rating (1-5)</label>
                  <Input type="number" min={1} max={5} value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) || 5 })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Quote *</label>
                <Textarea value={formData.quote} onChange={(e) => setFormData({ ...formData, quote: e.target.value })} required rows={4} />
              </div>
              <Button type="submit" className="w-full" disabled={uploading}>
                {editingItem ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Avatar</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {testimonials.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={item.avatar_url} alt={item.name} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.location}</div>
                  </div>
                </TableCell>
                <TableCell>{item.package_name}</TableCell>
                <TableCell>
                  <div className="flex">
                    {[...Array(item.rating)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />)}
                  </div>
                </TableCell>
                <TableCell><Switch checked={item.is_active} onCheckedChange={() => toggleActive(item)} /></TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {testimonials.length === 0 && <p className="text-center text-muted-foreground py-8">No testimonials yet.</p>}
      </CardContent>
    </Card>
    </div>
  );
};

export default AdminTestimonials;
