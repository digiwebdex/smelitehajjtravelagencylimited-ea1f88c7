import { useState, useRef, useEffect } from "react";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoThumbnailProps {
  videoUrl: string;
  thumbnailUrl?: string | null;
  alt: string;
  className?: string;
  iconSize?: "sm" | "md" | "lg";
}

/**
 * VideoThumbnail component that auto-generates thumbnails from video URLs
 * Falls back to provided thumbnail URL or generates one from the video itself
 */
const VideoThumbnail = ({
  videoUrl,
  thumbnailUrl,
  alt,
  className,
  iconSize = "md",
}: VideoThumbnailProps) => {
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const iconSizeClasses = {
    sm: "w-6 h-6",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  };

  useEffect(() => {
    // If we already have a thumbnail URL, use it directly
    if (thumbnailUrl) {
      setIsLoading(false);
      return;
    }

    // Generate thumbnail from video
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    videoRef.current = video;
    canvasRef.current = canvas;

    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";

    const handleLoadedData = () => {
      // Seek to 1 second or 10% of duration (whichever is less)
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    const handleSeeked = () => {
      try {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          setGeneratedThumbnail(dataUrl);
        }
      } catch (error) {
        console.warn("Could not generate thumbnail:", error);
        setHasError(true);
      } finally {
        setIsLoading(false);
        // Cleanup
        video.pause();
        video.src = "";
        video.load();
      }
    };

    const handleError = () => {
      console.warn("Video load error for thumbnail generation");
      setHasError(true);
      setIsLoading(false);
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);

    // Start loading
    video.src = videoUrl;
    video.load();

    // Cleanup
    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
      video.pause();
      video.src = "";
    };
  }, [videoUrl, thumbnailUrl]);

  // Use provided thumbnail
  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={alt}
        className={cn("w-full h-full object-cover", className)}
      />
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center animate-pulse">
        <Video className={cn(iconSizeClasses[iconSize], "text-muted-foreground/50")} />
      </div>
    );
  }

  // Show generated thumbnail
  if (generatedThumbnail && !hasError) {
    return (
      <img
        src={generatedThumbnail}
        alt={alt}
        className={cn("w-full h-full object-cover", className)}
      />
    );
  }

  // Fallback to gradient with icon
  return (
    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
      <Video className={cn(iconSizeClasses[iconSize], "text-muted-foreground/50")} />
    </div>
  );
};

export default VideoThumbnail;
