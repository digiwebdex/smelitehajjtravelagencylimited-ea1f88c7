import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Copy, Check, Users, DollarSign, TrendingUp, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";

interface Agent {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  commission_rate: number;
  referral_link_code: string;
  is_approved: boolean;
  is_active: boolean;
  total_leads: number;
  total_conversions: number;
  total_commission: number;
  pending_commission: number;
  created_at: string;
}

const AdminAgents = () => {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Agent | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    commission_rate: 5,
  });

  // Stats
  const [stats, setStats] = useState({
    totalAgents: 0,
    activeAgents: 0,
    totalLeads: 0,
    totalCommission: 0,
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [agents]);

  const fetchAgents = async () => {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setAgents(data);
    setLoading(false);
  };

  const calculateStats = () => {
    setStats({
      totalAgents: agents.length,
      activeAgents: agents.filter((a) => a.is_active && a.is_approved).length,
      totalLeads: agents.reduce((sum, a) => sum + a.total_leads, 0),
      totalCommission: agents.reduce((sum, a) => sum + Number(a.total_commission), 0),
    });
  };

  const generateReferralCode = () => {
    const prefix = "AGT";
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingItem) {
      const { error } = await supabase
        .from("agents")
        .update({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          commission_rate: formData.commission_rate,
        })
        .eq("id", editingItem.id);

      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Agent updated" });
    } else {
      const { error } = await supabase.from("agents").insert({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        commission_rate: formData.commission_rate,
        referral_link_code: generateReferralCode(),
      });

      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Agent created" });
    }

    setIsDialogOpen(false);
    setEditingItem(null);
    resetForm();
    fetchAgents();
  };

  const resetForm = () => {
    setFormData({ name: "", phone: "", email: "", commission_rate: 5 });
  };

  const handleEdit = (item: Agent) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      phone: item.phone,
      email: item.email || "",
      commission_rate: item.commission_rate,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Success", description: "Agent deleted" });
      fetchAgents();
    }
  };

  const toggleApproved = async (agent: Agent) => {
    await supabase.from("agents").update({ is_approved: !agent.is_approved }).eq("id", agent.id);
    fetchAgents();
  };

  const toggleActive = async (agent: Agent) => {
    await supabase.from("agents").update({ is_active: !agent.is_active }).eq("id", agent.id);
    fetchAgents();
  };

  const copyReferralLink = (code: string) => {
    const link = `${window.location.origin}?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: "Copied", description: "Referral link copied to clipboard" });
  };

  const markCommissionPaid = async (agent: Agent) => {
    await supabase
      .from("agents")
      .update({
        total_commission: Number(agent.total_commission) + Number(agent.pending_commission),
        pending_commission: 0,
      })
      .eq("id", agent.id);

    toast({ title: "Success", description: "Commission marked as paid" });
    fetchAgents();
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
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Agents</p>
                <p className="text-2xl font-bold">{stats.totalAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Agents</p>
                <p className="text-2xl font-bold">{stats.activeAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{stats.totalLeads}</p>
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
                <p className="text-sm text-muted-foreground">Total Commission</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalCommission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Agent / Sub-Agent Management
            </CardTitle>
            <CardDescription>
              Manage agents, set commission rates, and track performance
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingItem(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Agent</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Agent" : "Add New Agent"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Agent full name"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone *</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+880..."
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="agent@example.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Commission Rate (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingItem ? "Update" : "Create"} Agent
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-xs text-muted-foreground">{agent.phone}</div>
                      {agent.email && <div className="text-xs text-muted-foreground">{agent.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded font-mono text-xs">
                        {agent.referral_link_code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyReferralLink(agent.referral_link_code)}
                      >
                        {copiedCode === agent.referral_link_code ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{agent.commission_rate}%</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{agent.total_leads} leads</div>
                      <div className="text-muted-foreground">{agent.total_conversions} converted</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{formatCurrency(agent.total_commission)} paid</div>
                      {agent.pending_commission > 0 && (
                        <div className="text-yellow-600">{formatCurrency(agent.pending_commission)} pending</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={agent.is_approved}
                          onCheckedChange={() => toggleApproved(agent)}
                          className="scale-75"
                        />
                        <span className="text-xs">{agent.is_approved ? "Approved" : "Pending"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={agent.is_active}
                          onCheckedChange={() => toggleActive(agent)}
                          className="scale-75"
                        />
                        <span className="text-xs">{agent.is_active ? "Active" : "Inactive"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {agent.pending_commission > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markCommissionPaid(agent)}
                        >
                          Pay
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(agent)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(agent.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {agents.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No agents yet. Add the first one!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAgents;
