import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Plus, GripVertical } from "lucide-react";

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  onUpload?: (file: File) => Promise<string | null>;
  uploading?: boolean;
  label?: string;
  maxImages?: number;
}

const MultiImageUpload = ({
  value,
  onChange,
  onUpload,
  uploading = false,
  label = "Images",
  maxImages = 10,
}: MultiImageUploadProps) => {
  const [urlInput, setUrlInput] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    const url = await onUpload(file);
    if (url) {
      onChange([...value, url]);
    }
    e.target.value = "";
  };

  const handleAddUrl = () => {
    if (urlInput.trim() && !value.includes(urlInput.trim())) {
      onChange([...value, urlInput.trim()]);
      setUrlInput("");
    }
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newValue = [...value];
    [newValue[index - 1], newValue[index]] = [newValue[index], newValue[index - 1]];
    onChange(newValue);
  };

  const handleMoveDown = (index: number) => {
    if (index === value.length - 1) return;
    const newValue = [...value];
    [newValue[index], newValue[index + 1]] = [newValue[index + 1], newValue[index]];
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      <Label>{label} ({value.length}/{maxImages})</Label>
      
      {/* Image Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url, index) => (
            <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
              <img
                src={url}
                alt={`Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                >
                  <GripVertical className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-destructive/80"
                  onClick={() => handleRemove(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {index === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                  Main
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add More */}
      {value.length < maxImages && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={uploading}
            >
              <Upload className="w-4 h-4" />
              {uploading ? "Uploading..." : "Upload Image"}
            </Button>
          </div>
        </div>
      )}

      {/* URL Input */}
      {value.length < maxImages && (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Or paste image URL..."
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={handleAddUrl}
            disabled={!urlInput.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        First image will be the main/cover image. Drag to reorder.
      </p>
    </div>
  );
};

export default MultiImageUpload;
