import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Users, Calendar, Download, Video } from "lucide-react";
import { format } from "date-fns";

interface Webinar {
  id: string;
  title: string;
  description: string | null;
  session_date: string;
  max_capacity: number;
  registration_count: number;
  is_active: boolean;
  created_at: string;
}

interface Registration {
  id: string;
  webinar_id: string;
  name: string;
  email: string | null;
  phone: string;
  preferred_session: string | null;
  registered_at: string;
}

const AdminWebinars = () => {
  const { toast } = useToast();
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRegistrationsOpen, setIsRegistrationsOpen] = useState(false);
  const [selectedWebinar, setSelectedWebinar] = useState<Webinar | null>(null);
  const [editingItem, setEditingItem] = useState<Webinar | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    session_date: "",
    max_capacity: 100,
  });

  useEffect(() => {
    fetchWebinars();
  }, []);

  const fetchWebinars = async () => {
    const { data, error } = await supabase
      .from("webinars")
      .select("*")
      .order("session_date", { ascending: true });

    if (!error && data) setWebinars(data);
    setLoading(false);
  };

  const fetchRegistrations = async (webinarId: string) => {
    const { data, error } = await supabase
      .from("webinar_registrations")
      .select("*")
      .eq("webinar_id", webinarId)
      .order("registered_at", { ascending: false });

    if (!error && data) setRegistrations(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const webinarData = {
      title: formData.title,
      description: formData.description || null,
      session_date: formData.session_date,
      max_capacity: formData.max_capacity,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("webinars")
        .update(webinarData)
        .eq("id", editingItem.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Webinar updated" });
    } else {
      const { error } = await supabase.from("webinars").insert(webinarData);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Webinar created" });
    }

    setIsDialogOpen(false);
    setEditingItem(null);
    resetForm();
    fetchWebinars();
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", session_date: "", max_capacity: 100 });
  };

  const handleEdit = (item: Webinar) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || "",
      session_date: item.session_date.slice(0, 16),
      max_capacity: item.max_capacity,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webinar?")) return;
    const { error } = await supabase.from("webinars").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Success", description: "Webinar deleted" });
      fetchWebinars();
    }
  };

  const toggleActive = async (item: Webinar) => {
    await supabase.from("webinars").update({ is_active: !item.is_active }).eq("id", item.id);
    fetchWebinars();
  };

  const viewRegistrations = async (webinar: Webinar) => {
    setSelectedWebinar(webinar);
    await fetchRegistrations(webinar.id);
    setIsRegistrationsOpen(true);
  };

  const exportToCSV = () => {
    if (!registrations.length || !selectedWebinar) return;

    const headers = ["Name", "Email", "Phone", "Preferred Session", "Registered At"];
    const rows = registrations.map((r) => [
      r.name,
      r.email || "",
      r.phone,
      r.preferred_session || "",
      format(new Date(r.registered_at), "yyyy-MM-dd HH:mm"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedWebinar.title.replace(/\s+/g, "_")}_registrations.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
              <Video className="w-5 h-5" />
              Webinars / Live Sessions
            </CardTitle>
            <CardDescription>
              Create and manage webinar events for lead generation
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingItem(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Webinar</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Webinar" : "Create Webinar"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Hajj 2026 Information Session"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the webinar..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Session Date & Time *</label>
                    <Input
                      type="datetime-local"
                      value={formData.session_date}
                      onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Capacity</label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.max_capacity}
                      onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingItem ? "Update" : "Create"} Webinar
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
                <TableHead>Date & Time</TableHead>
                <TableHead>Registrations</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webinars.map((item) => (
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
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {format(new Date(item.session_date), "MMM d, yyyy h:mm a")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewRegistrations(item)}
                      className="gap-1"
                    >
                      <Users className="w-4 h-4" />
                      {item.registration_count}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.registration_count >= item.max_capacity ? "destructive" : "secondary"}>
                      {item.registration_count}/{item.max_capacity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch checked={item.is_active} onCheckedChange={() => toggleActive(item)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => viewRegistrations(item)}>
                        <Users className="w-4 h-4" />
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
          {webinars.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No webinars yet. Create your first event!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Registrations Dialog */}
      <Dialog open={isRegistrationsOpen} onOpenChange={setIsRegistrationsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Registrations: {selectedWebinar?.title}</span>
              <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!registrations.length}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Preferred Session</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell className="font-medium">{reg.name}</TableCell>
                  <TableCell>{reg.email || "-"}</TableCell>
                  <TableCell>{reg.phone}</TableCell>
                  <TableCell>{reg.preferred_session || "-"}</TableCell>
                  <TableCell>
                    {format(new Date(reg.registered_at), "MMM d, yyyy h:mm a")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {registrations.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No registrations yet</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWebinars;
