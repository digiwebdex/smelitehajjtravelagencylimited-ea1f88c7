import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Terminal, Save, RefreshCw, Eye } from "lucide-react";

interface TerminalContent {
  id: string;
  title: string;
  terminal_text: string;
  bg_color: string;
  text_color: string;
  font_size: string;
  typing_animation: boolean;
  is_enabled: boolean;
  order_index: number;
}

const AdminTerminal = () => {
  const { toast } = useToast();
  const [content, setContent] = useState<TerminalContent>({
    id: "",
    title: "Terminal",
    terminal_text: "",
    bg_color: "#1a1a2e",
    text_color: "#00ff00",
    font_size: "14px",
    typing_animation: true,
    is_enabled: true,
    order_index: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("terminal_content")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching terminal content:", error);
    } else if (data) {
      setContent(data as TerminalContent);
    }
    setLoading(false);
  };

  const handleChange = (field: keyof TerminalContent, value: string | boolean | number) => {
    setContent(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (content.id) {
        const { error } = await supabase
          .from("terminal_content")
          .update({
            title: content.title,
            terminal_text: content.terminal_text,
            bg_color: content.bg_color,
            text_color: content.text_color,
            font_size: content.font_size,
            typing_animation: content.typing_animation,
            is_enabled: content.is_enabled,
          })
          .eq("id", content.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("terminal_content")
          .insert({
            title: content.title,
            terminal_text: content.terminal_text,
            bg_color: content.bg_color,
            text_color: content.text_color,
            font_size: content.font_size,
            typing_animation: content.typing_animation,
            is_enabled: content.is_enabled,
          });

        if (error) throw error;
      }

      toast({
        title: "✅ Saved",
        description: "Terminal section updated successfully",
      });
      
      fetchContent();
    } catch (error) {
      console.error("Error saving terminal:", error);
      toast({
        title: "Error",
        description: "Failed to save terminal settings",
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Terminal Section
              </CardTitle>
              <CardDescription>
                Configure the terminal-style section on the website
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="terminal-enabled">Enabled</Label>
                <Switch
                  id="terminal-enabled"
                  checked={content.is_enabled}
                  onCheckedChange={(checked) => handleChange("is_enabled", checked)}
                />
              </div>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Section Title</Label>
              <Input
                id="title"
                value={content.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Terminal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="font-size">Font Size</Label>
              <Input
                id="font-size"
                value={content.font_size}
                onChange={(e) => handleChange("font_size", e.target.value)}
                placeholder="14px"
              />
            </div>

            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={content.bg_color}
                  onChange={(e) => handleChange("bg_color", e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={content.bg_color}
                  onChange={(e) => handleChange("bg_color", e.target.value)}
                  placeholder="#1a1a2e"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Text Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={content.text_color}
                  onChange={(e) => handleChange("text_color", e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={content.text_color}
                  onChange={(e) => handleChange("text_color", e.target.value)}
                  placeholder="#00ff00"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="typing-animation"
              checked={content.typing_animation}
              onCheckedChange={(checked) => handleChange("typing_animation", checked)}
            />
            <Label htmlFor="typing-animation">Enable Typing Animation</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="terminal-text">Terminal Text</Label>
            <Textarea
              id="terminal-text"
              value={content.terminal_text}
              onChange={(e) => handleChange("terminal_text", e.target.value)}
              placeholder="Enter the text to display in the terminal..."
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Each line will appear sequentially if typing animation is enabled
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="rounded-lg p-6 min-h-[200px] font-mono overflow-auto"
            style={{ 
              backgroundColor: content.bg_color,
              color: content.text_color,
              fontSize: content.font_size,
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 opacity-70">terminal</span>
            </div>
            <pre className="whitespace-pre-wrap">{content.terminal_text || "No content..."}</pre>
            <span className="animate-pulse">▋</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTerminal;
