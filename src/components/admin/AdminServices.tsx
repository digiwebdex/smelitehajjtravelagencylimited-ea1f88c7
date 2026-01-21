import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Service {
  id: string;
  icon_name: string;
  title: string;
  description: string;
  link_url: string | null;
  order_index: number;
  is_active: boolean;
}

const AVAILABLE_ICONS = [
  "Plane", "PlaneTakeoff", "Hotel", "Shield", "Users", "Clock", "HeartHandshake",
  "Star", "Map", "Globe", "Award", "CheckCircle", "Compass", "Ticket", "Bus", "Headset", "FileCheck"
];

interface ParentCompanySettings {
  button_text: string;
  button_link: string;
  is_enabled: boolean;
}

interface SectionHeaderSettings {
  badge_text: string;
  title: string;
  arabic_text: string;
}

interface SortableRowProps {
  item: Service;
  onEdit: (item: Service) => void;
  onDelete: (id: string) => void;
  onToggleActive: (item: Service) => void;
  onMoveUp: (item: Service) => void;
  onMoveDown: (item: Service) => void;
  isFirst: boolean;
  isLast: boolean;
}

const SortableRow = ({ item, onEdit, onDelete, onToggleActive, onMoveUp, onMoveDown, isFirst, isLast }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div className="flex items-center gap-2">
          <button
            className="cursor-grab hover:bg-muted p-1 rounded touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex flex-col gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => onMoveUp(item)}
              disabled={isFirst}
            >
              <ArrowUp className="w-3 h-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => onMoveDown(item)}
              disabled={isLast}
            >
              <ArrowDown className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </TableCell>
      <TableCell>{item.icon_name}</TableCell>
      <TableCell className="font-medium">{item.title}</TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[100px]">{item.link_url || "-"}</TableCell>
      <TableCell className="hidden lg:table-cell text-muted-foreground truncate max-w-xs">{item.description}</TableCell>
      <TableCell><Switch checked={item.is_active} onCheckedChange={() => onToggleActive(item)} /></TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(item)}><Edit className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const AdminServices = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Service | null>(null);
  const [formData, setFormData] = useState({ icon_name: "Star", title: "", description: "", link_url: "" });
  const [parentCompany, setParentCompany] = useState<ParentCompanySettings>({
    button_text: "Visit Parent Company",
    button_link: "",
    is_enabled: false
  });
  const [savingParentCompany, setSavingParentCompany] = useState(false);
  const [sectionHeader, setSectionHeader] = useState<SectionHeaderSettings>({
    badge_text: "Why Choose Us",
    title: "Complete Hajj & Umrah Services",
    arabic_text: "خدماتنا"
  });
  const [savingSectionHeader, setSavingSectionHeader] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchServices();
    fetchParentCompanySettings();
    fetchSectionHeaderSettings();
  }, []);

  const fetchSectionHeaderSettings = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("*")
      .eq("setting_key", "services_section_header")
      .single();
    
    if (data?.setting_value) {
      const settings = data.setting_value as unknown as SectionHeaderSettings;
      setSectionHeader({
        badge_text: settings.badge_text || "Why Choose Us",
        title: settings.title || "Complete Hajj & Umrah Services",
        arabic_text: settings.arabic_text || "خدماتنا"
      });
    }
  };

  const saveSectionHeaderSettings = async () => {
    setSavingSectionHeader(true);
    
    const settingValue = {
      badge_text: sectionHeader.badge_text,
      title: sectionHeader.title,
      arabic_text: sectionHeader.arabic_text
    };
    
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("setting_key", "services_section_header")
      .single();
    
    if (existing) {
      const { error } = await supabase
        .from("site_settings")
        .update({ setting_value: settingValue })
        .eq("setting_key", "services_section_header");
      
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Section header settings saved" });
      }
    } else {
      const { error } = await supabase
        .from("site_settings")
        .insert([{ 
          setting_key: "services_section_header", 
          category: "services",
          setting_value: settingValue
        }]);
      
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Section header settings saved" });
      }
    }
    
    setSavingSectionHeader(false);
  };

  const fetchParentCompanySettings = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("*")
      .eq("setting_key", "parent_company")
      .single();
    
    if (data?.setting_value) {
      const settings = data.setting_value as unknown as ParentCompanySettings;
      setParentCompany({
        button_text: settings.button_text || "Visit Parent Company",
        button_link: settings.button_link || "",
        is_enabled: settings.is_enabled ?? false
      });
    }
  };

  const saveParentCompanySettings = async () => {
    setSavingParentCompany(true);
    
    const settingValue = {
      button_text: parentCompany.button_text,
      button_link: parentCompany.button_link,
      is_enabled: parentCompany.is_enabled
    };
    
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("setting_key", "parent_company")
      .single();
    
    if (existing) {
      const { error } = await supabase
        .from("site_settings")
        .update({ setting_value: settingValue })
        .eq("setting_key", "parent_company");
      
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Parent company settings saved" });
      }
    } else {
      const { error } = await supabase
        .from("site_settings")
        .insert([{ 
          setting_key: "parent_company", 
          category: "services",
          setting_value: settingValue
        }]);
      
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Parent company settings saved" });
      }
    }
    
    setSavingParentCompany(false);
  };

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("order_index");
    
    if (!error && data) {
      setServices(data);
    }
    setLoading(false);
  };

  const updateOrderInDatabase = async (reorderedServices: Service[]) => {
    const updates = reorderedServices.map((service, index) => ({
      id: service.id,
      order_index: index
    }));

    for (const update of updates) {
      await supabase
        .from("services")
        .update({ order_index: update.order_index })
        .eq("id", update.id);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = services.findIndex((item) => item.id === active.id);
      const newIndex = services.findIndex((item) => item.id === over.id);

      const reorderedServices = arrayMove(services, oldIndex, newIndex);
      setServices(reorderedServices);
      
      await updateOrderInDatabase(reorderedServices);
      toast({ title: "Success", description: "Service order updated" });
    }
  };

  const handleMoveUp = async (item: Service) => {
    const currentIndex = services.findIndex((s) => s.id === item.id);
    if (currentIndex > 0) {
      const reorderedServices = arrayMove(services, currentIndex, currentIndex - 1);
      setServices(reorderedServices);
      await updateOrderInDatabase(reorderedServices);
      toast({ title: "Success", description: "Service moved up" });
    }
  };

  const handleMoveDown = async (item: Service) => {
    const currentIndex = services.findIndex((s) => s.id === item.id);
    if (currentIndex < services.length - 1) {
      const reorderedServices = arrayMove(services, currentIndex, currentIndex + 1);
      setServices(reorderedServices);
      await updateOrderInDatabase(reorderedServices);
      toast({ title: "Success", description: "Service moved down" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingItem) {
      const { error } = await supabase
        .from("services")
        .update(formData)
        .eq("id", editingItem.id);
      
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Service updated" });
      }
    } else {
      const maxOrder = Math.max(...services.map(s => s.order_index), -1);
      const { error } = await supabase
        .from("services")
        .insert({ ...formData, order_index: maxOrder + 1 });
      
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Service created" });
      }
    }
    
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({ icon_name: "Star", title: "", description: "", link_url: "" });
    fetchServices();
  };

  const handleEdit = (item: Service) => {
    setEditingItem(item);
    setFormData({ 
      icon_name: item.icon_name, 
      title: item.title, 
      description: item.description,
      link_url: item.link_url || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    
    const { error } = await supabase.from("services").delete().eq("id", id);
    
    if (!error) {
      toast({ title: "Success", description: "Service deleted" });
      fetchServices();
    }
  };

  const toggleActive = async (item: Service) => {
    await supabase.from("services").update({ is_active: !item.is_active }).eq("id", item.id);
    fetchServices();
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Section Header Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Section Header</CardTitle>
          <CardDescription>Edit the "Why Choose Us" section title and subtitle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Badge Text (Subtitle)</label>
              <Input
                value={sectionHeader.badge_text}
                onChange={(e) => setSectionHeader({ ...sectionHeader, badge_text: e.target.value })}
                placeholder="Why Choose Us"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Main Title</label>
              <Input
                value={sectionHeader.title}
                onChange={(e) => setSectionHeader({ ...sectionHeader, title: e.target.value })}
                placeholder="Complete Hajj & Umrah Services"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Arabic Text</label>
              <Input
                value={sectionHeader.arabic_text}
                onChange={(e) => setSectionHeader({ ...sectionHeader, arabic_text: e.target.value })}
                placeholder="خدماتنا"
                dir="rtl"
              />
            </div>
          </div>
          <Button onClick={saveSectionHeaderSettings} disabled={savingSectionHeader}>
            {savingSectionHeader ? "Saving..." : "Save Section Header"}
          </Button>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Services</CardTitle>
            <CardDescription>Manage individual service items. Drag to reorder or use arrow buttons.</CardDescription>
          </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingItem(null);
            setFormData({ icon_name: "Star", title: "", description: "", link_url: "" });
          }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Service" : "Add Service"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Icon</label>
                <Select value={formData.icon_name} onValueChange={(v) => setFormData({ ...formData, icon_name: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map(icon => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Link URL</label>
                <Input
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  placeholder="#hajj, #umrah, #visa, or external URL"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use section IDs like #hajj, #umrah, #visa, #services, #contact or full URLs
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingItem ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Order</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Link</TableHead>
                <TableHead className="hidden lg:table-cell">Description</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext items={services.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {services.map((item, index) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleActive={toggleActive}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    isFirst={index === 0}
                    isLast={index === services.length - 1}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
        {services.length === 0 && <p className="text-center text-muted-foreground py-8">No services yet.</p>}
      </CardContent>

      {/* Parent Company Settings */}
      <CardHeader className="border-t">
        <CardTitle className="text-lg">Parent Company Button</CardTitle>
        <CardDescription>Configure the "Visit Parent Company" button shown below services</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch 
            checked={parentCompany.is_enabled} 
            onCheckedChange={(checked) => setParentCompany({ ...parentCompany, is_enabled: checked })}
          />
          <span className="text-sm font-medium">Show Parent Company Button</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Button Text</label>
            <Input
              value={parentCompany.button_text}
              onChange={(e) => setParentCompany({ ...parentCompany, button_text: e.target.value })}
              placeholder="Visit Parent Company"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Website Link</label>
            <Input
              value={parentCompany.button_link}
              onChange={(e) => setParentCompany({ ...parentCompany, button_link: e.target.value })}
              placeholder="https://example.com"
              type="url"
            />
          </div>
        </div>
        <Button onClick={saveParentCompanySettings} disabled={savingParentCompany}>
          {savingParentCompany ? "Saving..." : "Save Parent Company Settings"}
        </Button>
      </CardContent>
    </Card>
    </div>
  );
};

export default AdminServices;