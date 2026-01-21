import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Share2, 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  RefreshCw,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  MessageCircle,
  Send,
  Music,
  Globe,
  Link as LinkIcon,
  Phone,
  Mail,
  Camera,
  Video,
  Rss,
  Twitch,
  Github,
  ExternalLink
} from "lucide-react";
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

interface SocialNetwork {
  id: string;
  platform_name: string;
  icon_name: string;
  url: string;
  is_active: boolean;
  order_index: number;
}

// Available icons mapping
const ICON_OPTIONS = [
  { value: "Facebook", label: "Facebook", icon: Facebook },
  { value: "Instagram", label: "Instagram", icon: Instagram },
  { value: "Youtube", label: "YouTube", icon: Youtube },
  { value: "Twitter", label: "Twitter/X", icon: Twitter },
  { value: "Linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "MessageCircle", label: "WhatsApp", icon: MessageCircle },
  { value: "Send", label: "Telegram", icon: Send },
  { value: "Music", label: "TikTok", icon: Music },
  { value: "Twitch", label: "Twitch", icon: Twitch },
  { value: "Github", label: "GitHub", icon: Github },
  { value: "Camera", label: "Snapchat", icon: Camera },
  { value: "Video", label: "Vimeo", icon: Video },
  { value: "Rss", label: "RSS", icon: Rss },
  { value: "Mail", label: "Email", icon: Mail },
  { value: "Phone", label: "Phone", icon: Phone },
  { value: "Globe", label: "Website", icon: Globe },
  { value: "ExternalLink", label: "Other", icon: ExternalLink },
];

const getIconComponent = (iconName: string) => {
  const iconOption = ICON_OPTIONS.find(opt => opt.value === iconName);
  return iconOption?.icon || Globe;
};

interface SortableSocialItemProps {
  network: SocialNetwork;
  onUpdate: (id: string, field: keyof SocialNetwork, value: string | boolean) => void;
  onDelete: (id: string) => void;
}

const SortableSocialItem = ({ network, onUpdate, onDelete }: SortableSocialItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: network.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = getIconComponent(network.icon_name);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-card border rounded-lg p-4"
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <IconComponent className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Platform Name</Label>
            <Input
              value={network.platform_name}
              onChange={(e) => onUpdate(network.id, "platform_name", e.target.value)}
              placeholder="Platform name"
              className="h-9"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Icon</Label>
            <Select
              value={network.icon_name}
              onValueChange={(value) => onUpdate(network.id, "icon_name", value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select icon" />
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="w-4 h-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">URL</Label>
            <Input
              value={network.url}
              onChange={(e) => onUpdate(network.id, "url", e.target.value)}
              placeholder="https://..."
              className="h-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={network.is_active}
            onCheckedChange={(checked) => onUpdate(network.id, "is_active", checked)}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(network.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

const AdminSocialNetworks = () => {
  const [networks, setNetworks] = useState<SocialNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchNetworks();
  }, []);

  const fetchNetworks = async () => {
    try {
      const { data, error } = await supabase
        .from("social_networks")
        .select("*")
        .order("order_index");

      if (error) throw error;
      setNetworks(data || []);
    } catch (error) {
      console.error("Error fetching social networks:", error);
      toast.error("Failed to load social networks");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setNetworks((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      return newItems.map((item, index) => ({ ...item, order_index: index }));
    });
  };

  const handleUpdate = (id: string, field: keyof SocialNetwork, value: string | boolean) => {
    setNetworks((prev) =>
      prev.map((network) =>
        network.id === id ? { ...network, [field]: value } : network
      )
    );
  };

  const handleAdd = () => {
    const newNetwork: SocialNetwork = {
      id: `temp-${Date.now()}`,
      platform_name: "",
      icon_name: "Globe",
      url: "",
      is_active: true,
      order_index: networks.length,
    };
    setNetworks([...networks, newNetwork]);
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith("temp-")) {
      setNetworks((prev) => prev.filter((n) => n.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from("social_networks")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setNetworks((prev) => prev.filter((n) => n.id !== id));
      toast.success("Social network deleted");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Separate new and existing networks
      const newNetworks = networks.filter((n) => n.id.startsWith("temp-"));
      const existingNetworks = networks.filter((n) => !n.id.startsWith("temp-"));

      // Insert new networks
      if (newNetworks.length > 0) {
        const { error: insertError } = await supabase
          .from("social_networks")
          .insert(
            newNetworks.map((n) => ({
              platform_name: n.platform_name,
              icon_name: n.icon_name,
              url: n.url,
              is_active: n.is_active,
              order_index: n.order_index,
            }))
          );
        if (insertError) throw insertError;
      }

      // Update existing networks
      for (const network of existingNetworks) {
        const { error: updateError } = await supabase
          .from("social_networks")
          .update({
            platform_name: network.platform_name,
            icon_name: network.icon_name,
            url: network.url,
            is_active: network.is_active,
            order_index: network.order_index,
          })
          .eq("id", network.id);
        if (updateError) throw updateError;
      }

      toast.success("Social networks saved successfully!");
      fetchNetworks(); // Refresh to get proper IDs
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save social networks");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          Social Networks
        </CardTitle>
        <CardDescription>
          Manage your social media links that appear in the footer. Drag to reorder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={networks.map((n) => n.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {networks.map((network) => (
                  <SortableSocialItem
                    key={network.id}
                    network={network}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>
        </DndContext>

        {networks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Share2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No social networks added yet.</p>
            <p className="text-sm">Click the button below to add your first social link.</p>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Social Network
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSocialNetworks;
