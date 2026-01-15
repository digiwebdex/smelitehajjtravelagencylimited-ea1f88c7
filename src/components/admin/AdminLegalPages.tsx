import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, FileText, Eye, EyeOff } from "lucide-react";

interface LegalPage {
  id: string;
  page_key: string;
  title: string;
  content: string;
  is_active: boolean;
}

const AdminLegalPages = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [pages, setPages] = useState<LegalPage[]>([]);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    const { data, error } = await supabase
      .from("legal_pages")
      .select("*")
      .order("page_key");

    if (!error && data) {
      setPages(data as LegalPage[]);
    }
    setLoading(false);
  };

  const handleSave = async (page: LegalPage) => {
    setSaving(page.id);

    const { error } = await supabase
      .from("legal_pages")
      .update({
        title: page.title,
        content: page.content,
        is_active: page.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", page.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${page.title} updated successfully` });
    }
    setSaving(null);
  };

  const updatePage = (id: string, field: keyof LegalPage, value: string | boolean) => {
    setPages(pages.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const getPageLabel = (key: string) => {
    switch (key) {
      case "privacy-policy":
        return "Privacy Policy";
      case "terms-of-service":
        return "Terms of Service";
      case "refund-policy":
        return "Refund Policy";
      default:
        return key;
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Legal Pages
        </CardTitle>
        <CardDescription>
          Manage Privacy Policy, Terms of Service, and Refund Policy content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={pages[0]?.page_key || "privacy-policy"}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            {pages.map((page) => (
              <TabsTrigger key={page.page_key} value={page.page_key} className="text-xs sm:text-sm">
                {getPageLabel(page.page_key)}
              </TabsTrigger>
            ))}
          </TabsList>

          {pages.map((page) => (
            <TabsContent key={page.page_key} value={page.page_key} className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {page.is_active ? (
                    <Eye className="w-5 h-5 text-green-600" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Page Status</p>
                    <p className="text-sm text-muted-foreground">
                      {page.is_active ? "Visible on website" : "Hidden from website"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={page.is_active}
                  onCheckedChange={(checked) => updatePage(page.id, "is_active", checked)}
                />
              </div>

              <div>
                <Label htmlFor={`title-${page.id}`}>Page Title</Label>
                <Input
                  id={`title-${page.id}`}
                  value={page.title}
                  onChange={(e) => updatePage(page.id, "title", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`content-${page.id}`}>
                  Content{" "}
                  <span className="text-muted-foreground font-normal">
                    (Supports Markdown: ## for headings, **bold**, - for lists)
                  </span>
                </Label>
                <Textarea
                  id={`content-${page.id}`}
                  value={page.content}
                  onChange={(e) => updatePage(page.id, "content", e.target.value)}
                  rows={20}
                  className="mt-1 font-mono text-sm"
                />
              </div>

              <Button
                onClick={() => handleSave(page)}
                disabled={saving === page.id}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving === page.id ? "Saving..." : `Save ${getPageLabel(page.page_key)}`}
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminLegalPages;