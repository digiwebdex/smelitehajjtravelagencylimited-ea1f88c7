import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plane, User, Phone, Plus, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const passengerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  gender: z.enum(["male", "female", "other"]),
  date_of_birth: z.date({ required_error: "Date of birth is required" }),
  nationality: z.string().min(1, "Nationality is required"),
  passport_number: z.string().optional(),
  passport_expiry: z.date().optional(),
  frequent_flyer_number: z.string().optional(),
  special_service_request: z.string().optional(),
});

const formSchema = z.object({
  // Flight Details
  from_city: z.string().min(1, "Departure city is required"),
  to_city: z.string().min(1, "Destination city is required"),
  travel_date: z.date({ required_error: "Travel date is required" }),
  return_date: z.date().optional(),
  is_round_trip: z.boolean().default(false),
  
  // Contact Details
  contact_email: z.string().email("Valid email is required"),
  contact_phone: z.string().min(10, "Valid phone number is required"),
  country_code: z.string().default("+880"),
  remarks: z.string().optional(),
  
  // Passengers
  passengers: z.array(passengerSchema).min(1, "At least one passenger is required"),
});

type FormData = z.infer<typeof formSchema>;

interface AirTicketBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const specialServices = [
  "Wheelchair Assistance",
  "VIP Services",
  "Unaccompanied Minor",
  "Meal Preference - Vegetarian",
  "Meal Preference - Halal",
  "Extra Legroom",
  "Priority Boarding",
  "Airport Lounge Access",
];

const nationalities = [
  "Bangladeshi",
  "Indian",
  "Pakistani",
  "Nepali",
  "Sri Lankan",
  "Malaysian",
  "Indonesian",
  "Saudi Arabian",
  "Emirati",
  "Qatari",
  "Kuwaiti",
  "British",
  "American",
  "Canadian",
  "Australian",
  "Other",
];

export default function AirTicketBookingModal({ open, onOpenChange }: AirTicketBookingModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      from_city: "",
      to_city: "",
      is_round_trip: false,
      contact_email: user?.email || "",
      contact_phone: "",
      country_code: "+880",
      remarks: "",
      passengers: [
        {
          first_name: "",
          last_name: "",
          gender: "male",
          nationality: "Bangladeshi",
          passport_number: "",
          frequent_flyer_number: "",
          special_service_request: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "passengers",
  });

  const isRoundTrip = form.watch("is_round_trip");

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Insert booking
      const bookingData = {
        user_id: user?.id || null,
        from_city: data.from_city,
        to_city: data.to_city,
        travel_date: format(data.travel_date, "yyyy-MM-dd"),
        return_date: data.return_date ? format(data.return_date, "yyyy-MM-dd") : null,
        is_round_trip: data.is_round_trip,
        passenger_count: data.passengers.length,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        country_code: data.country_code,
        remarks: data.remarks || null,
        guest_name: !user ? data.passengers[0].first_name + " " + data.passengers[0].last_name : null,
        guest_email: !user ? data.contact_email : null,
        guest_phone: !user ? data.contact_phone : null,
      };

      const { data: booking, error: bookingError } = await supabase
        .from("air_ticket_bookings")
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Insert passengers
      const passengersData = data.passengers.map((p) => ({
        booking_id: booking.id,
        first_name: p.first_name,
        last_name: p.last_name,
        gender: p.gender,
        date_of_birth: format(p.date_of_birth, "yyyy-MM-dd"),
        nationality: p.nationality,
        passport_number: p.passport_number || null,
        passport_expiry: p.passport_expiry ? format(p.passport_expiry, "yyyy-MM-dd") : null,
        frequent_flyer_number: p.frequent_flyer_number || null,
        special_service_request: p.special_service_request || null,
      }));

      const { error: passengersError } = await supabase
        .from("air_ticket_passengers")
        .insert(passengersData);

      if (passengersError) throw passengersError;

      setBookingSuccess(booking.booking_id);
      toast({
        title: "Booking Submitted!",
        description: `Your booking ID is ${booking.booking_id}. We will process it shortly.`,
      });

      // Trigger notification (edge function would handle SMS/Email)
      try {
        await supabase.functions.invoke("send-air-ticket-notification", {
          body: {
            bookingId: booking.id,
            type: "submitted",
          },
        });
      } catch (notifError) {
        console.log("Notification error (non-critical):", notifError);
      }

    } catch (error: any) {
      console.error("Booking error:", error);
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to submit booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setBookingSuccess(null);
      form.reset();
      onOpenChange(false);
    }
  };

  if (bookingSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600">Booking Submitted Successfully!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Plane className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">Booking ID</p>
              <p className="text-2xl font-bold text-primary">{bookingSuccess}</p>
            </div>
            <p className="text-muted-foreground text-sm">
              Your booking request has been submitted. Our team will review it and get back to you shortly via email and SMS.
            </p>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Plane className="w-6 h-6 text-primary" />
            Air Ticket Booking Request
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
              {/* Section 1: Flight Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">1</span>
                  Flight Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="from_city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From (Departure City) *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Dhaka" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="to_city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To (Destination City) *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Dubai" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="travel_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Travel Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : "Select date"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_round_trip"
                    render={({ field }) => (
                      <FormItem className="flex flex-col justify-end">
                        <div className="flex items-center space-x-2 h-10">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">Round Trip</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {isRoundTrip && (
                    <FormField
                      control={form.control}
                      name="return_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Return Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? format(field.value, "PPP") : "Select date"}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <Separator />

              {/* Section 2: Traveler Information */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                    <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">2</span>
                    Traveler Information
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        first_name: "",
                        last_name: "",
                        gender: "male",
                        date_of_birth: undefined as any,
                        nationality: "Bangladeshi",
                        passport_number: "",
                        frequent_flyer_number: "",
                        special_service_request: "",
                      })
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Passenger
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Passenger {index + 1}
                      </h4>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`passengers.${index}.first_name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="First name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`passengers.${index}.last_name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`passengers.${index}.gender`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`passengers.${index}.date_of_birth`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Date of Birth *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? format(field.value, "PPP") : "Select date"}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date > new Date()}
                                  initialFocus
                                  captionLayout="dropdown-buttons"
                                  fromYear={1920}
                                  toYear={new Date().getFullYear()}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`passengers.${index}.nationality`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nationality *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select nationality" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {nationalities.map((nat) => (
                                  <SelectItem key={nat} value={nat}>
                                    {nat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`passengers.${index}.passport_number`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Passport Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`passengers.${index}.frequent_flyer_number`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frequent Flyer Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`passengers.${index}.special_service_request`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Special Service Request</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select if needed" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {specialServices.map((service) => (
                                  <SelectItem key={service} value={service}>
                                    {service}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Section 3: Contact Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">3</span>
                  Contact Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="country_code"
                      render={({ field }) => (
                        <FormItem className="w-24">
                          <FormLabel>Code</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="+880">+880</SelectItem>
                              <SelectItem value="+91">+91</SelectItem>
                              <SelectItem value="+971">+971</SelectItem>
                              <SelectItem value="+966">+966</SelectItem>
                              <SelectItem value="+1">+1</SelectItem>
                              <SelectItem value="+44">+44</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contact_phone"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Phone *</FormLabel>
                          <FormControl>
                            <Input placeholder="1XXXXXXXXX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks / Special Requests</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional information or special requests..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Plane className="w-4 h-4 mr-2" />
                      Submit Booking Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
