import { useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HotelImageCarouselProps {
  images: string[];
  hotelMapLink?: string | null;
  className?: string;
  showBadge?: boolean;
  badgeText?: string;
}

const HotelImageCarousel = ({
  images,
  hotelMapLink,
  className,
  showBadge = true,
  badgeText = "Hotels Near Masjid al-Haram",
}: HotelImageCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className={cn("relative w-full h-full group", className)}>
      {/* Current Image */}
      <img
        src={images[currentIndex]}
        alt={`Hotel image ${currentIndex + 1}`}
        className="w-full h-full object-cover"
      />

      {/* Badge */}
      {showBadge && (
        <div className="absolute top-2 left-2 z-10">
          <Badge className="bg-primary/90 text-primary-foreground text-[10px] px-2 py-1 shadow-md">
            {badgeText}
          </Badge>
        </div>
      )}

      {/* Navigation Arrows - only show if multiple images */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow"
            onClick={goToPrevious}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow"
            onClick={goToNext}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </>
      )}

      {/* Dots indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                index === currentIndex
                  ? "bg-white w-3"
                  : "bg-white/50 hover:bg-white/75"
              )}
            />
          ))}
        </div>
      )}

      {/* Map Link */}
      {hotelMapLink && (
        <a
          href={hotelMapLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white/90 hover:bg-white text-primary px-2 py-1 rounded-full text-[10px] font-medium shadow-md transition-all hover:shadow-lg"
        >
          <MapPin className="w-3 h-3" />
          View Map
        </a>
      )}
    </div>
  );
};

export default HotelImageCarousel;
