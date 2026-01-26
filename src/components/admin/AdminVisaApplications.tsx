import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Globe,
  Eye,
  Search,
  Calendar,
  Phone,
  Mail,
  User,
  CreditCard,
  FileText,
  Check,
  X,
  Clock,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";

interface VisaApplication {
  id: string;
  visa_country_id: string;
  applicant_name: string;
  applicant_email: string | null;
  applicant_phone: string;
  applicant_count: number;
  travel_date: string | null;
  passport_number: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  notes: string | null;
  total_price: number;
  payment_method: string | null;
  payment_status: string;
  transaction_id: string | null;
  bank_transaction_number: string | null;
  bank_transfer_screenshot_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  visa_countries?: {
    country_name: string;
    flag_emoji: string;
    processing_time: string;
  };
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  pending_cash: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  pending_verification: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const AdminVisaApplications = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<VisaApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] = useState<VisaApplication | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newPaymentStatus, setNewPaymentStatus] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("visa_applications")
        .select(`
          *,
          visa_countries (
            country_name,
            flag_emoji,
            processing_time
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications((data as VisaApplication[]) || []);
    } catch (error) {
      console.error("Error fetching visa applications:", error);
      toast({
        title: "Error",
        description: "Failed to fetch visa applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openDetails = (application: VisaApplication) => {
    setSelectedApplication(application);
    setAdminNotes(application.admin_notes || "");
    setNewStatus(application.status);
    setNewPaymentStatus(application.payment_status);
    setIsDetailsOpen(true);
  };

  const handleUpdateApplication = async () => {
    if (!selectedApplication) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("visa_applications")
        .update({
          status: newStatus,
          payment_status: newPaymentStatus,
          admin_notes: adminNotes || null,
        })
        .eq("id", selectedApplication.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Application updated successfully",
      });

      setIsDetailsOpen(false);
      fetchApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update application",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicant_phone.includes(searchTerm) ||
      app.visa_countries?.country_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Visa Applications
            </CardTitle>
            <Button onClick={fetchApplications} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Applications Table */}
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No visa applications found</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Applicants</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(app.created_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{app.applicant_name}</p>
                          <p className="text-xs text-muted-foreground">{app.applicant_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{app.visa_countries?.flag_emoji}</span>
                          <span>{app.visa_countries?.country_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{app.applicant_count}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(app.total_price)}
                      </TableCell>
                      <TableCell>
                        <Badge className={paymentStatusColors[app.payment_status] || "bg-muted"}>
                          {app.payment_status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[app.status] || "bg-muted"}>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetails(app)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Visa Application Details
            </DialogTitle>
            <DialogDescription>
              Review and manage this visa application
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              {/* Country Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedApplication.visa_countries?.flag_emoji}</span>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedApplication.visa_countries?.country_name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Processing: {selectedApplication.visa_countries?.processing_time}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(selectedApplication.total_price)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedApplication.applicant_count} applicant(s)
                    </p>
                  </div>
                </div>
              </div>

              {/* Applicant Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> Name
                  </Label>
                  <p className="font-medium">{selectedApplication.applicant_name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone
                  </Label>
                  <p className="font-medium">{selectedApplication.applicant_phone}</p>
                </div>
                {selectedApplication.applicant_email && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email
                    </Label>
                    <p className="font-medium">{selectedApplication.applicant_email}</p>
                  </div>
                )}
                {selectedApplication.travel_date && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Travel Date
                    </Label>
                    <p className="font-medium">
                      {format(new Date(selectedApplication.travel_date), "dd MMM yyyy")}
                    </p>
                  </div>
                )}
                {selectedApplication.passport_number && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Passport Number</Label>
                    <p className="font-medium">{selectedApplication.passport_number}</p>
                  </div>
                )}
                {selectedApplication.date_of_birth && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Date of Birth</Label>
                    <p className="font-medium">
                      {format(new Date(selectedApplication.date_of_birth), "dd MMM yyyy")}
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Info */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payment Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Method</p>
                    <p className="font-medium capitalize">
                      {selectedApplication.payment_method?.replace("_", " ") || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge className={paymentStatusColors[selectedApplication.payment_status] || "bg-muted"}>
                      {selectedApplication.payment_status.replace("_", " ")}
                    </Badge>
                  </div>
                  {selectedApplication.bank_transaction_number && (
                    <div>
                      <p className="text-muted-foreground">Transaction #</p>
                      <p className="font-medium">{selectedApplication.bank_transaction_number}</p>
                    </div>
                  )}
                  {selectedApplication.bank_transfer_screenshot_url && (
                    <div>
                      <p className="text-muted-foreground">Screenshot</p>
                      <a
                        href={selectedApplication.bank_transfer_screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedApplication.notes && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Applicant Notes
                  </Label>
                  <p className="text-sm bg-muted/30 p-3 rounded-lg">{selectedApplication.notes}</p>
                </div>
              )}

              {/* Admin Controls */}
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">Update Application</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Application Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Status</Label>
                    <Select value={newPaymentStatus} onValueChange={setNewPaymentStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="pending_cash">Pending Cash</SelectItem>
                        <SelectItem value="pending_verification">Pending Verification</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Admin Notes</Label>
                  <Textarea
                    placeholder="Add internal notes about this application..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsDetailsOpen(false)}
                    className="flex-1"
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateApplication}
                    className="flex-1"
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Update Application
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVisaApplications;