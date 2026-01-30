import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, Check, Gift, Users, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";

interface ReferralCode {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  lead_id: string | null;
  reward_amount: number;
  is_paid: boolean;
  created_at: string;
}

interface ReferralConversion {
  id: string;
  referral_code_id: string;
  referred_booking_id: string | null;
  conversion_value: number;
  status: string;
  created_at: string;
}

const AdminReferrals = () => {
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<ReferralCode[]>([]);
  const [conversions, setConversions] = useState<ReferralConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    reward_amount: 500,
  });

  // Stats
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalConversions: 0,
    totalRewardsPaid: 0,
    pendingRewards: 0,
  });

  useEffect(() => {
    fetchReferrals();
    fetchConversions();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [referrals, conversions]);

  const fetchReferrals = async () => {
    const { data, error } = await supabase
      .from("referral_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setReferrals(data);
    setLoading(false);
  };

  const fetchConversions = async () => {
    const { data, error } = await supabase
      .from("referral_conversions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setConversions(data);
  };

  const calculateStats = () => {
    const totalConversions = conversions.filter((c) => c.status === "confirmed" || c.status === "paid").length;
    const totalRewardsPaid = referrals.filter((r) => r.is_paid).reduce((sum, r) => sum + Number(r.reward_amount), 0);
    const pendingRewards = referrals.filter((r) => !r.is_paid && conversions.some((c) => c.referral_code_id === r.id && c.status === "confirmed"))
      .reduce((sum, r) => sum + Number(r.reward_amount), 0);

    setStats({
      totalReferrals: referrals.length,
      totalConversions,
      totalRewardsPaid,
      pendingRewards,
    });
  };

  const generateCode = () => {
    const prefix = "REF";
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = generateCode();

    const { error } = await supabase.from("referral_codes").insert({
      code,
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      reward_amount: formData.reward_amount,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Referral code ${code} created` });
      setIsDialogOpen(false);
      setFormData({ customer_name: "", customer_phone: "", reward_amount: 500 });
      fetchReferrals();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: "Copied", description: `Code ${code} copied to clipboard` });
  };

  const markAsPaid = async (referral: ReferralCode) => {
    const { error } = await supabase
      .from("referral_codes")
      .update({ is_paid: true })
      .eq("id", referral.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Reward marked as paid" });
      fetchReferrals();
    }
  };

  const getConversionCount = (referralId: string) => {
    return conversions.filter((c) => c.referral_code_id === referralId).length;
  };

  const getConversionStatus = (referralId: string) => {
    const refConversions = conversions.filter((c) => c.referral_code_id === referralId);
    if (refConversions.length === 0) return null;
    const confirmed = refConversions.filter((c) => c.status === "confirmed" || c.status === "paid").length;
    return confirmed > 0 ? "converted" : "pending";
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Gift className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Codes</p>
                <p className="text-2xl font-bold">{stats.totalReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversions</p>
                <p className="text-2xl font-bold">{stats.totalConversions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rewards Paid</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRewardsPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Users className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.pendingRewards)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Referral System
            </CardTitle>
            <CardDescription>
              Manage customer referral codes and track conversions
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Generate Code</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Generate Referral Code</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Customer Name *</label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="Customer full name"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Customer Phone *</label>
                  <Input
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="+880..."
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Reward Amount (BDT)</label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.reward_amount}
                    onChange={(e) => setFormData({ ...formData, reward_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <Button type="submit" className="w-full">Generate Code</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Conversions</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.map((referral) => {
                const conversionStatus = getConversionStatus(referral.id);
                const convCount = getConversionCount(referral.id);

                return (
                  <TableRow key={referral.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                          {referral.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyCode(referral.code)}
                        >
                          {copiedCode === referral.code ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{referral.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{referral.customer_phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={convCount > 0 ? "default" : "secondary"}>
                        {convCount} {convCount === 1 ? "referral" : "referrals"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(referral.reward_amount)}</TableCell>
                    <TableCell>
                      {referral.is_paid ? (
                        <Badge variant="default" className="bg-green-500">Paid</Badge>
                      ) : conversionStatus === "converted" ? (
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">
                          Pending Payment
                        </Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(referral.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {!referral.is_paid && conversionStatus === "converted" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsPaid(referral)}
                        >
                          Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {referrals.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No referral codes yet. Generate the first one!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReferrals;
