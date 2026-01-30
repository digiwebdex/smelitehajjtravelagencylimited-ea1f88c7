import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, MessageSquare, Mail, Zap, Settings } from "lucide-react";

interface CRMSequence {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  channel: string;
  created_at: string;
}

interface SequenceStep {
  id: string;
  sequence_id: string;
  step_number: number;
  day_offset: number;
  message_template: string;
  is_active: boolean;
}

const channelOptions = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "both", label: "Both" },
];

const AdminCRMAutomation = () => {
  const { toast } = useToast();
  const [sequences, setSequences] = useState<CRMSequence[]>([]);
  const [steps, setSteps] = useState<{ [key: string]: SequenceStep[] }>({});
  const [loading, setLoading] = useState(true);
  const [isSequenceDialogOpen, setIsSequenceDialogOpen] = useState(false);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState<CRMSequence | null>(null);
  const [editingStep, setEditingStep] = useState<SequenceStep | null>(null);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);

  const [sequenceForm, setSequenceForm] = useState({
    name: "",
    description: "",
    channel: "whatsapp",
  });

  const [stepForm, setStepForm] = useState({
    step_number: 1,
    day_offset: 0,
    message_template: "",
  });

  useEffect(() => {
    fetchSequences();
  }, []);

  const fetchSequences = async () => {
    const { data, error } = await supabase
      .from("crm_sequences")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setSequences(data);
      // Fetch steps for each sequence
      for (const seq of data) {
        fetchSteps(seq.id);
      }
    }
    setLoading(false);
  };

  const fetchSteps = async (sequenceId: string) => {
    const { data, error } = await supabase
      .from("crm_sequence_steps")
      .select("*")
      .eq("sequence_id", sequenceId)
      .order("step_number", { ascending: true });

    if (!error && data) {
      setSteps((prev) => ({ ...prev, [sequenceId]: data }));
    }
  };

  const handleSequenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSequence) {
      const { error } = await supabase
        .from("crm_sequences")
        .update({
          name: sequenceForm.name,
          description: sequenceForm.description || null,
          channel: sequenceForm.channel,
        })
        .eq("id", editingSequence.id);

      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Sequence updated" });
    } else {
      const { error } = await supabase.from("crm_sequences").insert({
        name: sequenceForm.name,
        description: sequenceForm.description || null,
        channel: sequenceForm.channel,
      });

      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Sequence created" });
    }

    setIsSequenceDialogOpen(false);
    setEditingSequence(null);
    setSequenceForm({ name: "", description: "", channel: "whatsapp" });
    fetchSequences();
  };

  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSequenceId) return;

    if (editingStep) {
      const { error } = await supabase
        .from("crm_sequence_steps")
        .update({
          step_number: stepForm.step_number,
          day_offset: stepForm.day_offset,
          message_template: stepForm.message_template,
        })
        .eq("id", editingStep.id);

      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Step updated" });
    } else {
      const { error } = await supabase.from("crm_sequence_steps").insert({
        sequence_id: selectedSequenceId,
        step_number: stepForm.step_number,
        day_offset: stepForm.day_offset,
        message_template: stepForm.message_template,
      });

      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Success", description: "Step added" });
    }

    setIsStepDialogOpen(false);
    setEditingStep(null);
    setStepForm({ step_number: 1, day_offset: 0, message_template: "" });
    fetchSteps(selectedSequenceId);
  };

  const editSequence = (seq: CRMSequence) => {
    setEditingSequence(seq);
    setSequenceForm({
      name: seq.name,
      description: seq.description || "",
      channel: seq.channel,
    });
    setIsSequenceDialogOpen(true);
  };

  const deleteSequence = async (id: string) => {
    if (!confirm("Delete this sequence and all its steps?")) return;
    await supabase.from("crm_sequences").delete().eq("id", id);
    toast({ title: "Success", description: "Sequence deleted" });
    fetchSequences();
  };

  const toggleSequenceActive = async (seq: CRMSequence) => {
    await supabase.from("crm_sequences").update({ is_active: !seq.is_active }).eq("id", seq.id);
    fetchSequences();
  };

  const editStep = (step: SequenceStep, sequenceId: string) => {
    setSelectedSequenceId(sequenceId);
    setEditingStep(step);
    setStepForm({
      step_number: step.step_number,
      day_offset: step.day_offset,
      message_template: step.message_template,
    });
    setIsStepDialogOpen(true);
  };

  const deleteStep = async (stepId: string, sequenceId: string) => {
    if (!confirm("Delete this step?")) return;
    await supabase.from("crm_sequence_steps").delete().eq("id", stepId);
    toast({ title: "Success", description: "Step deleted" });
    fetchSteps(sequenceId);
  };

  const addStep = (sequenceId: string) => {
    setSelectedSequenceId(sequenceId);
    const existingSteps = steps[sequenceId] || [];
    const nextStepNumber = existingSteps.length > 0 ? Math.max(...existingSteps.map((s) => s.step_number)) + 1 : 1;
    const lastDayOffset = existingSteps.length > 0 ? Math.max(...existingSteps.map((s) => s.day_offset)) : 0;
    
    setStepForm({
      step_number: nextStepNumber,
      day_offset: lastDayOffset + 3,
      message_template: "",
    });
    setIsStepDialogOpen(true);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp":
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case "email":
        return <Mail className="w-4 h-4 text-blue-500" />;
      default:
        return <Zap className="w-4 h-4 text-purple-500" />;
    }
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              CRM Follow-up Automation
            </CardTitle>
            <CardDescription>
              Create automated message sequences for lead follow-up
            </CardDescription>
          </div>
          <Dialog open={isSequenceDialogOpen} onOpenChange={(open) => { setIsSequenceDialogOpen(open); if (!open) { setEditingSequence(null); setSequenceForm({ name: "", description: "", channel: "whatsapp" }); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Create Sequence</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingSequence ? "Edit Sequence" : "Create Sequence"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSequenceSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Sequence Name *</label>
                  <Input
                    value={sequenceForm.name}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, name: e.target.value })}
                    placeholder="e.g., Lead Follow-up"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={sequenceForm.description}
                    onChange={(e) => setSequenceForm({ ...sequenceForm, description: e.target.value })}
                    placeholder="Brief description..."
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Channel</label>
                  <Select
                    value={sequenceForm.channel}
                    onValueChange={(value) => setSequenceForm({ ...sequenceForm, channel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {channelOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  {editingSequence ? "Update" : "Create"} Sequence
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Available Template Variables</h4>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">{"{{name}}"}</Badge>
                <Badge variant="outline">{"{{phone}}"}</Badge>
                <Badge variant="outline">{"{{email}}"}</Badge>
                <Badge variant="outline">{"{{package}}"}</Badge>
                <Badge variant="outline">{"{{travel_month}}"}</Badge>
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {sequences.map((seq) => (
                <AccordionItem key={seq.id} value={seq.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 w-full">
                      {getChannelIcon(seq.channel)}
                      <span className="font-medium">{seq.name}</span>
                      <Badge variant={seq.is_active ? "default" : "secondary"} className="ml-2">
                        {seq.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-sm text-muted-foreground ml-auto mr-4">
                        {steps[seq.id]?.length || 0} steps
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={seq.is_active}
                            onCheckedChange={() => toggleSequenceActive(seq)}
                          />
                          <span className="text-sm">
                            {seq.is_active ? "Automation Active" : "Automation Paused"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => addStep(seq.id)}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add Step
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => editSequence(seq)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteSequence(seq.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Step</TableHead>
                            <TableHead className="w-24">Day</TableHead>
                            <TableHead>Message Template</TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(steps[seq.id] || []).map((step) => (
                            <TableRow key={step.id}>
                              <TableCell>
                                <Badge variant="outline">#{step.step_number}</Badge>
                              </TableCell>
                              <TableCell>Day {step.day_offset}</TableCell>
                              <TableCell>
                                <p className="text-sm line-clamp-2">{step.message_template}</p>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => editStep(step, seq.id)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => deleteStep(step.id, seq.id)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {(!steps[seq.id] || steps[seq.id].length === 0) && (
                        <p className="text-center text-muted-foreground py-4">
                          No steps yet. Add your first message.
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {sequences.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No sequences yet. Create your first automation!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step Dialog */}
      <Dialog open={isStepDialogOpen} onOpenChange={(open) => { setIsStepDialogOpen(open); if (!open) { setEditingStep(null); setStepForm({ step_number: 1, day_offset: 0, message_template: "" }); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStep ? "Edit Step" : "Add Step"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStepSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Step Number</label>
                <Input
                  type="number"
                  min={1}
                  value={stepForm.step_number}
                  onChange={(e) => setStepForm({ ...stepForm, step_number: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Day Offset</label>
                <Input
                  type="number"
                  min={0}
                  value={stepForm.day_offset}
                  onChange={(e) => setStepForm({ ...stepForm, day_offset: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Days after lead submission
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Message Template *</label>
              <Textarea
                value={stepForm.message_template}
                onChange={(e) => setStepForm({ ...stepForm, message_template: e.target.value })}
                placeholder="Use {{name}}, {{package}} etc. for personalization"
                rows={5}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              {editingStep ? "Update" : "Add"} Step
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCRMAutomation;
