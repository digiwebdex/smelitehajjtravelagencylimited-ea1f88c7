import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Languages, Download, Upload, Search } from "lucide-react";

interface Translation {
  id: string;
  language_code: string;
  section: string;
  key: string;
  value: string;
}

const languageOptions = [
  { value: "en", label: "English" },
  { value: "bn", label: "বাংলা (Bangla)" },
];

const sectionOptions = [
  "header",
  "hero",
  "packages",
  "services",
  "testimonials",
  "faq",
  "contact",
  "footer",
  "booking",
  "common",
];

const AdminTranslations = () => {
  const { toast } = useToast();
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Translation | null>(null);
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    language_code: "en",
    section: "common",
    key: "",
    value: "",
  });

  useEffect(() => {
    fetchTranslations();
  }, []);

  const fetchTranslations = async () => {
    const { data, error } = await supabase
      .from("translations")
      .select("*")
      .order("section", { ascending: true })
      .order("key", { ascending: true });

    if (!error && data) setTranslations(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingItem) {
      const { error } = await supabase
        .from("translations")
        .update({
          language_code: formData.language_code,
          section: formData.section,
          key: formData.key,
          value: formData.value,
        })
        .eq("id", editingItem.id);

      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Translation updated" });
    } else {
      const { error } = await supabase.from("translations").insert({
        language_code: formData.language_code,
        section: formData.section,
        key: formData.key,
        value: formData.value,
      });

      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Translation added" });
    }

    setIsDialogOpen(false);
    setEditingItem(null);
    resetForm();
    fetchTranslations();
  };

  const resetForm = () => {
    setFormData({ language_code: "en", section: "common", key: "", value: "" });
  };

  const handleEdit = (item: Translation) => {
    setEditingItem(item);
    setFormData({
      language_code: item.language_code,
      section: item.section,
      key: item.key,
      value: item.value,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this translation?")) return;
    const { error } = await supabase.from("translations").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Success", description: "Translation deleted" });
      fetchTranslations();
    }
  };

  const exportTranslations = () => {
    const exportData = translations.reduce((acc, t) => {
      if (!acc[t.language_code]) acc[t.language_code] = {};
      if (!acc[t.language_code][t.section]) acc[t.language_code][t.section] = {};
      acc[t.language_code][t.section][t.key] = t.value;
      return acc;
    }, {} as any);

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "translations.json";
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Success", description: "Translations exported" });
  };

  const filteredTranslations = translations.filter((t) => {
    if (filterLanguage !== "all" && t.language_code !== filterLanguage) return false;
    if (filterSection !== "all" && t.section !== filterSection) return false;
    if (searchQuery && !t.key.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.value.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group by section
  const groupedTranslations = filteredTranslations.reduce((acc, t) => {
    if (!acc[t.section]) acc[t.section] = [];
    acc[t.section].push(t);
    return acc;
  }, {} as { [key: string]: Translation[] });

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
              <Languages className="w-5 h-5" />
              Multi-Language Translations
            </CardTitle>
            <CardDescription>
              Manage content translations for multiple languages
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportTranslations}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingItem(null); resetForm(); } }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Add Translation</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Edit Translation" : "Add Translation"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Language *</label>
                      <Select
                        value={formData.language_code}
                        onValueChange={(value) => setFormData({ ...formData, language_code: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languageOptions.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Section *</label>
                      <Select
                        value={formData.section}
                        onValueChange={(value) => setFormData({ ...formData, section: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sectionOptions.map((sec) => (
                            <SelectItem key={sec} value={sec}>
                              {sec.charAt(0).toUpperCase() + sec.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Key *</label>
                    <Input
                      value={formData.key}
                      onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                      placeholder="e.g., hero_title, submit_button"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Value *</label>
                    <Input
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder="Translation text"
                      required
                      dir={formData.language_code === "bn" ? "rtl" : "ltr"}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingItem ? "Update" : "Add"} Translation
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search translations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
            <Select value={filterLanguage} onValueChange={setFilterLanguage}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {languageOptions.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sectionOptions.map((sec) => (
                  <SelectItem key={sec} value={sec}>
                    {sec.charAt(0).toUpperCase() + sec.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grouped Translations */}
          {Object.entries(groupedTranslations).map(([section, items]) => (
            <div key={section} className="mb-6">
              <h3 className="font-medium text-lg mb-3 capitalize flex items-center gap-2">
                {section}
                <Badge variant="secondary">{items.length}</Badge>
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Lang</TableHead>
                    <TableHead className="w-48">Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {item.language_code.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1 rounded">
                          {item.key}
                        </code>
                      </TableCell>
                      <TableCell
                        dir={item.language_code === "bn" ? "rtl" : "ltr"}
                        className="max-w-md truncate"
                      >
                        {item.value}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
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
            </div>
          ))}

          {Object.keys(groupedTranslations).length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No translations found. Add your first translation!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTranslations;
