import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Clock, FileText, DollarSign, Calendar, ArrowRight, X, Globe, Shield, Plane } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VisaCountry {
  id: string;
  country_name: string;
  flag_emoji: string;
  processing_time: string;
  price: number;
  order_index: number;
  requirements?: string[] | null;
  documents_needed?: string[] | null;
  description?: string | null;
  validity_period?: string | null;
}

interface VisaDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  country: VisaCountry | null;
  onApply: (country: VisaCountry) => void;
  getCountryCode: (countryName: string) => string;
}

// Formatted section component similar to PackageDetailsModal
const FormattedSection = ({ 
  title, 
  icon: Icon, 
  items, 
  iconColor = "text-primary" 
}: { 
  title: string; 
  icon: React.ElementType; 
  items: string[]; 
  iconColor?: string;
}) => (
  <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
    <h5 className="font-semibold text-primary text-sm mb-3 flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-secondary"></span>
      {title}
    </h5>
    <div className="space-y-2 ml-4">
      {items.map((item, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.03 }}
          className="flex items-start gap-2 text-sm text-foreground/85"
        >
          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
          <span>{item}</span>
        </motion.div>
      ))}
    </div>
  </div>
);

const VisaDetailsModal = ({ isOpen, onClose, country, onApply, getCountryCode }: VisaDetailsModalProps) => {
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

  if (!country) return null;

  const handleApply = () => {
    onApply(country);
    onClose();
  };

  // Default requirements if none provided
  const requirements = country.requirements?.length 
    ? country.requirements 
    : [
        'Valid passport with 6+ months validity',
        'Completed visa application form',
        'Recent passport-sized photos',
        'Proof of accommodation',
        'Travel itinerary'
      ];

  // Default documents if none provided
  const documents = country.documents_needed?.length 
    ? country.documents_needed 
    : [
        'Original passport',
        'Passport copy',
        'Bank statements (last 3 months)',
        'Employment letter',
        'Hotel booking confirmation',
        'Flight reservation'
      ];

  // Services included
  const servicesIncluded = [
    'Complete visa application processing',
    'Document verification and review',
    'Embassy submission handling',
    'Application status tracking',
    'Visa collection and delivery',
    'Expert consultation support'
  ];

  // Important notes
  const importantNotes = [
    'Processing times may vary based on embassy workload',
    'Additional documents may be required based on your specific case',
    'Visa approval is at the sole discretion of the embassy',
    'All fees are non-refundable once application is submitted'
  ];

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
          >
            {/* Header with gradient */}
            <div className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 pb-10 flex-shrink-0">
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <img 
                    src={`https://flagcdn.com/w80/${getCountryCode(country.country_name)}.png`}
                    alt={`${country.country_name} flag`}
                    className="w-16 h-12 object-cover rounded shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div>
                    <Badge className="bg-white/20 text-white border-0 mb-2">
                      Visa Services
                    </Badge>
                    <DialogTitle className="text-2xl font-heading font-bold text-white">
                      {country.country_name} Visa
                    </DialogTitle>
                  </div>
                </div>
              </DialogHeader>
              
              {/* Price badge */}
              <div className="absolute -bottom-5 right-6 bg-secondary text-secondary-foreground px-5 py-3 rounded-lg shadow-gold">
                <span className="text-2xl font-bold">৳{country.price.toLocaleString()}</span>
                <span className="text-xs block opacity-80">starting from</span>
              </div>
            </div>

            <ScrollArea className="flex-1 overflow-auto">
              <div className="p-6 pt-8 space-y-4">
                {/* Quick Info Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <span className="text-xs text-muted-foreground">Processing</span>
                    <span className="text-sm font-medium block">{country.processing_time}</span>
                  </div>
                  {country.validity_period && (
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <Calendar className="w-5 h-5 mx-auto mb-1 text-primary" />
                      <span className="text-xs text-muted-foreground">Validity</span>
                      <span className="text-sm font-medium block">{country.validity_period}</span>
                    </div>
                  )}
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Globe className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <span className="text-xs text-muted-foreground">Type</span>
                    <span className="text-sm font-medium block">Tourist</span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Plane className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <span className="text-xs text-muted-foreground">Entry</span>
                    <span className="text-sm font-medium block">Single/Multiple</span>
                  </div>
                </div>

                {/* Description */}
                {country.description && (
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                    <h5 className="font-semibold text-primary text-sm mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-secondary"></span>
                      About This Visa
                    </h5>
                    <p className="text-sm text-foreground/85 leading-relaxed ml-4">
                      {country.description}
                    </p>
                  </div>
                )}

                {/* Services Included */}
                <FormattedSection
                  title="Services Included"
                  icon={Check}
                  items={servicesIncluded}
                  iconColor="text-green-500"
                />

                {/* Requirements */}
                <FormattedSection
                  title="Eligibility Requirements"
                  icon={Shield}
                  items={requirements}
                  iconColor="text-blue-500"
                />

                {/* Documents Needed */}
                <FormattedSection
                  title="Documents Required"
                  icon={FileText}
                  items={documents}
                  iconColor="text-primary"
                />

                {/* Important Notes */}
                <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                  <h5 className="font-semibold text-primary text-sm mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-secondary"></span>
                    Important Notes
                  </h5>
                  <div className="space-y-2 ml-4">
                    {importantNotes.map((note, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex items-start gap-2 text-sm text-foreground/85"
                      >
                        <X className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                        <span>{note}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Fee Breakdown */}
                <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-xl p-4 border border-secondary/20">
                  <h5 className="font-semibold text-secondary text-sm mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Fee Breakdown
                  </h5>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/70">Visa Fee</span>
                      <span className="font-medium">Included</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/70">Service Charge</span>
                      <span className="font-medium">Included</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/70">Processing Fee</span>
                      <span className="font-medium">Included</span>
                    </div>
                    <div className="border-t border-border/50 pt-2 mt-2 flex justify-between text-sm font-semibold">
                      <span>Total Package</span>
                      <span className="text-secondary">৳{country.price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Footer with CTA */}
            <div className="p-6 pt-4 border-t bg-background flex-shrink-0">
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Close
                </Button>
                <Button 
                  onClick={handleApply}
                  className="flex-1 bg-gradient-primary hover:opacity-90 shadow-gold"
                >
                  Apply Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default VisaDetailsModal;
