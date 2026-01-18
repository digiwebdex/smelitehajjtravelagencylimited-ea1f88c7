import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Star, Calendar, Hotel, Plane, Bus, FileText, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface PackageDetails {
  id: string;
  title: string;
  description: string | null;
  full_description: string | null;
  type: string;
  price: number;
  duration_days: number;
  includes: string[] | null;
  exclusions: string[] | null;
  hotel_rating: number | null;
  hotel_type: string | null;
  transport_type: string | null;
  flight_type: string | null;
  special_notes: string | null;
  stock: number;
  show_book_now: boolean;
  hotel_image_url?: string | null;
  hotel_map_link?: string | null;
  hotel_images?: string[] | null;
}

interface PackageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  package_info: PackageDetails | null;
  onBookNow?: (pkg: PackageDetails) => void;
}

const PackageDetailsModal = ({ isOpen, onClose, package_info, onBookNow }: PackageDetailsModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get all hotel images (combine hotel_images array with legacy hotel_image_url)
  const hotelImages = package_info 
    ? (package_info.hotel_images && package_info.hotel_images.length > 0 
        ? package_info.hotel_images 
        : (package_info.hotel_image_url ? [package_info.hotel_image_url] : []))
    : [];

  // Reset image index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(0);
    }
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!package_info) return null;

  const handleBookNow = () => {
    if (onBookNow) {
      onBookNow(package_info);
    }
    onClose();
  };

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? hotelImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev === hotelImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col max-h-[90vh]"
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header with gradient */}
            <div className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 pb-10">
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge className="bg-white/20 text-white border-0 mb-2">
                      {package_info.type.charAt(0).toUpperCase() + package_info.type.slice(1)} Package
                    </Badge>
                    <DialogTitle className="text-2xl font-heading font-bold text-white">
                      {package_info.title}
                    </DialogTitle>
                  </div>
                </div>
              </DialogHeader>
              
              {/* Price badge */}
              <div className="absolute -bottom-5 right-6 bg-secondary text-secondary-foreground px-5 py-3 rounded-lg shadow-gold">
                <span className="text-2xl font-bold">{formatCurrency(package_info.price)}</span>
                <span className="text-xs block opacity-80">per person</span>
              </div>
            </div>

            <ScrollArea className="flex-1 overflow-auto">
              <div className="p-6 pt-8 space-y-6">
                {/* Quick Info Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Calendar className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <span className="text-sm font-medium">{package_info.duration_days} Days</span>
                  </div>
                  {package_info.hotel_rating && (
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <Hotel className="w-5 h-5 mx-auto mb-1 text-primary" />
                      <div className="flex items-center justify-center gap-0.5">
                        {Array.from({ length: package_info.hotel_rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 text-secondary fill-secondary" />
                        ))}
                      </div>
                    </div>
                  )}
                  {package_info.flight_type && (
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <Plane className="w-5 h-5 mx-auto mb-1 text-primary" />
                      <span className="text-sm font-medium">{package_info.flight_type}</span>
                    </div>
                  )}
                  {package_info.transport_type && (
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <Bus className="w-5 h-5 mx-auto mb-1 text-primary" />
                      <span className="text-sm font-medium">{package_info.transport_type}</span>
                    </div>
                  )}
                </div>

                {/* Hotel Section with Gallery Carousel */}
                {(package_info.hotel_type || hotelImages.length > 0) && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                      <Hotel className="w-4 h-4" />
                      Accommodation
                      {hotelImages.length > 1 && (
                        <span className="text-xs text-muted-foreground/70">
                          ({currentImageIndex + 1}/{hotelImages.length})
                        </span>
                      )}
                    </h4>
                    
                    {hotelImages.length > 0 && (
                      <div className="relative rounded-lg overflow-hidden group">
                        {/* Main Image */}
                        <AnimatePresence mode="wait">
                          <motion.img 
                            key={currentImageIndex}
                            src={hotelImages[currentImageIndex]} 
                            alt={`Hotel ${currentImageIndex + 1}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-full h-56 object-cover"
                          />
                        </AnimatePresence>

                        {/* Badge */}
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-primary/90 text-primary-foreground text-xs">
                            Hotels Near Masjid al-Haram
                          </Badge>
                        </div>

                        {/* Navigation Arrows */}
                        {hotelImages.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow"
                              onClick={goToPrevious}
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow"
                              onClick={goToNext}
                            >
                              <ChevronRight className="w-5 h-5" />
                            </Button>
                          </>
                        )}

                        {/* Dots Indicator */}
                        {hotelImages.length > 1 && (
                          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {hotelImages.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentImageIndex(index)}
                                className={cn(
                                  "w-2 h-2 rounded-full transition-all",
                                  index === currentImageIndex
                                    ? "bg-white w-4"
                                    : "bg-white/50 hover:bg-white/75"
                                )}
                              />
                            ))}
                          </div>
                        )}

                        {/* Map Link */}
                        {package_info.hotel_map_link && (
                          <a 
                            href={package_info.hotel_map_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-white/95 hover:bg-white text-primary px-3 py-2 rounded-full text-sm font-medium shadow-lg transition-all hover:shadow-xl"
                          >
                            <MapPin className="w-4 h-4" />
                            View on Map
                          </a>
                        )}
                      </div>
                    )}

                    {/* Thumbnail Strip */}
                    {hotelImages.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {hotelImages.map((url, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={cn(
                              "w-16 h-12 rounded-md overflow-hidden flex-shrink-0 border-2 transition-all",
                              index === currentImageIndex 
                                ? "border-primary ring-1 ring-primary" 
                                : "border-transparent opacity-70 hover:opacity-100"
                            )}
                          >
                            <img src={url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {package_info.hotel_type && (
                      <p className="text-foreground">{package_info.hotel_type}</p>
                    )}
                  </div>
                )}

                {/* Description */}
                {(package_info.full_description || package_info.description) && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">Description</h4>
                    <p className="text-foreground leading-relaxed">
                      {package_info.full_description || package_info.description}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Inclusions */}
                {package_info.includes && package_info.includes.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      What's Included
                    </h4>
                    <ul className="grid sm:grid-cols-2 gap-2">
                      {package_info.includes.map((item, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Exclusions */}
                {package_info.exclusions && package_info.exclusions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                      <X className="w-4 h-4 text-destructive" />
                      Not Included
                    </h4>
                    <ul className="grid sm:grid-cols-2 gap-2">
                      {package_info.exclusions.map((item, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <X className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Special Notes */}
                {package_info.special_notes && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Special Notes
                    </h4>
                    <p className="text-sm text-foreground whitespace-pre-line">
                      {package_info.special_notes}
                    </p>
                  </div>
                )}

                {/* Stock Warning */}
                {package_info.stock < 10 && (
                  <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-3 text-center">
                    <span className="text-sm font-medium text-secondary-foreground">
                      Only {package_info.stock} spots remaining!
                    </span>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer with CTA */}
            <div className="p-6 pt-4 border-t bg-background flex-shrink-0">
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Close
                </Button>
                {package_info.show_book_now !== false && (
                  <Button 
                    onClick={handleBookNow}
                    className="flex-1 bg-gradient-primary hover:opacity-90 shadow-gold"
                  >
                    Book Now
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default PackageDetailsModal;
