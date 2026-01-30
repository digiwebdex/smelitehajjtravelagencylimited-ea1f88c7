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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useImageUpload } from "@/hooks/useImageUpload";
import { Plus, Edit, Trash2, Download, FileText, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface DownloadableResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  file_url: string;
  download_count: number;
  is_active: boolean;
  created_at: string;
}

interface ResourceDownload {
  id: string;
  resource_id: string;
  lead_id: string | null;
  source: string | null;
  downloaded_at: string;
  lead?: { name: string; phone: string };
}

const resourceTypes = [
  { value: "umrah_guide", label: "Umrah Guide" },
  { value: "hajj_checklist", label: "Hajj Checklist" },
  { value: "ramadan_guide", label: "Ramadan Guide" },
  { value: "visa_guide", label: "Visa Guide" },
  { value: "other", label: "Other" },
];

const AdminLeadMagnets = () => {
  const { toast } = useToast();
  const [resources, setResources] = useState<DownloadableResource[]>([]);
  const [downloads, setDownloads] = useState<ResourceDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<DownloadableResource | null>(null);
  const [editingItem, setEditingItem] = useState<DownloadableResource | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    resource_type: "umrah_guide",
    file_url: "",
  });

  const { uploadImage, uploading } = useImageUpload({
    bucket: "admin-uploads",
    folder: "resources",
  });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from("downloadable_resources")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setResources(data);
    setLoading(false);
  };

  const fetchDownloads = async (resourceId: string) => {
    const { data, error } = await supabase
      .from("resource_downloads")
      .select(`
        *,
        lead:leads(name, phone)
      `)
      .eq("resource_id", resourceId)
      .order("downloaded_at", { ascending: false })
      .limit(50);

    if (!error && data) setDownloads(data as ResourceDownload[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const resourceData = {
      title: formData.title,
      description: formData.description || null,
      resource_type: formData.resource_type,
      file_url: formData.file_url,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("downloadable_resources")
        .update(resourceData)
        .eq("id", editingItem.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Resource updated" });
    } else {
      const { error } = await supabase
        .from("downloadable_resources")
        .insert(resourceData);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Resource created" });
    }

    setIsDialogOpen(false);
    setEditingItem(null);
    resetForm();
    fetchResources();
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", resource_type: "umrah_guide", file_url: "" });
  };

  const handleEdit = (item: DownloadableResource) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || "",
      resource_type: item.resource_type,
      file_url: item.file_url,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    const { error } = await supabase.from("downloadable_resources").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Success", description: "Resource deleted" });
      fetchResources();
    }
  };

  const toggleActive = async (item: DownloadableResource) => {
    await supabase
      .from("downloadable_resources")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);
    fetchResources();
  };

  const viewDownloads = async (resource: DownloadableResource) => {
    setSelectedResource(resource);
    await fetchDownloads(resource.id);
    setIsDownloadsOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (url) {
      setFormData({ ...formData, file_url: url });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Lead Magnets / Downloadable Resources
            </CardTitle>
            <CardDescription>
              Manage PDF guides and resources that users can download after submitting lead form
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingItem(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Resource</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Resource" : "Add Resource"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Complete Umrah Preparation Guide"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the resource..."
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Resource Type *</label>
                  <Select
                    value={formData.resource_type}
                    onValueChange={(value) => setFormData({ ...formData, resource_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {resourceTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">File Upload</label>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </div>
                    )}
                    {formData.file_url && (
                      <div className="text-sm text-green-600 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        File uploaded successfully
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Or File URL</label>
                  <Input
                    value={formData.file_url}
                    onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={uploading || !formData.file_url}>
                  {editingItem ? "Update" : "Create"} Resource
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Downloads</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.title}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {resourceTypes.find((t) => t.value === item.resource_type)?.label || item.resource_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewDownloads(item)}
                      className="gap-1"
                    >
                      <Download className="w-4 h-4" />
                      {item.download_count}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Switch checked={item.is_active} onCheckedChange={() => toggleActive(item)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => viewDownloads(item)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {resources.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No resources yet. Add your first lead magnet!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Downloads Dialog */}
      <Dialog open={isDownloadsOpen} onOpenChange={setIsDownloadsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Download History: {selectedResource?.title}</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Downloaded At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {downloads.map((download) => (
                <TableRow key={download.id}>
                  <TableCell>{download.lead?.name || "Anonymous"}</TableCell>
                  <TableCell>{download.lead?.phone || "-"}</TableCell>
                  <TableCell>{download.source || "Direct"}</TableCell>
                  <TableCell>
                    {format(new Date(download.downloaded_at), "MMM d, yyyy h:mm a")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {downloads.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No downloads yet</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeadMagnets;
