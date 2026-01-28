import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  Database, 
  FileJson, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  RotateCcw,
  Shield,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

interface BackupHistory {
  id: string;
  backup_name: string;
  backup_type: string;
  file_path: string;
  file_size: number | null;
  tables_included: string[];
  record_counts: Record<string, number>;
  created_by: string | null;
  created_at: string;
  notes: string | null;
  status: string;
}

interface RestoreHistory {
  id: string;
  backup_id: string | null;
  restore_type: string;
  tables_restored: string[];
  restored_by: string | null;
  restored_at: string;
  status: string;
  notes: string | null;
}

const CMS_TABLES = [
  'about_content', 'contact_info', 'faq_items', 'footer_content',
  'gallery_images', 'gallery_settings', 'gallery_videos', 'hero_content',
  'legal_pages', 'menu_items', 'notices', 'office_locations', 'packages',
  'payment_methods', 'section_settings', 'services', 'site_settings',
  'social_networks', 'team_members', 'terminal_content', 'testimonials',
  'theme_settings', 'visa_countries', 'notification_settings'
];

const TRANSACTION_TABLES = [
  'bookings', 'booking_documents', 'booking_status_history',
  'emi_payments', 'emi_installments', 'visa_applications',
  'notification_logs', 'profiles', 'staff_members', 'staff_activity_log'
];

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const AdminBackupRestore = () => {
  const queryClient = useQueryClient();
  const [createBackupOpen, setCreateBackupOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupHistory | null>(null);
  const [backupType, setBackupType] = useState<string>("full");
  const [backupNotes, setBackupNotes] = useState("");
  const [restoreType, setRestoreType] = useState<"full" | "selective">("full");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [restoreNotes, setRestoreNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch backup history
  const { data: backups, isLoading: backupsLoading, refetch: refetchBackups } = useQuery({
    queryKey: ["backup-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_history")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as BackupHistory[];
    }
  });

  // Fetch restore history
  const { data: restoreHistory, isLoading: restoreLoading } = useQuery({
    queryKey: ["restore-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restore_history")
        .select("*")
        .order("restored_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as RestoreHistory[];
    }
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("backup-restore", {
        body: {
          action: "create_backup",
          backupType,
          notes: backupNotes
        }
      });

      if (response.error) throw response.error;
      if (!response.data.success) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Backup Created",
        description: data.message
      });
      setCreateBackupOpen(false);
      setBackupNotes("");
      queryClient.invalidateQueries({ queryKey: ["backup-history"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Backup Failed",
        description: error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBackup) throw new Error("No backup selected");
      setIsProcessing(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("backup-restore", {
        body: {
          action: "restore_backup",
          backupId: selectedBackup.id,
          tables: restoreType === "selective" ? selectedTables : [],
          notes: restoreNotes
        }
      });

      if (response.error) throw response.error;
      if (!response.data.success) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Restore Complete",
        description: data.message
      });
      setRestoreDialogOpen(false);
      setRestoreNotes("");
      setSelectedTables([]);
      queryClient.invalidateQueries({ queryKey: ["restore-history"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBackup) throw new Error("No backup selected");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("backup-restore", {
        body: {
          action: "delete_backup",
          backupId: selectedBackup.id
        }
      });

      if (response.error) throw response.error;
      if (!response.data.success) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Backup Deleted",
        description: "The backup has been removed"
      });
      setDeleteConfirmOpen(false);
      setSelectedBackup(null);
      queryClient.invalidateQueries({ queryKey: ["backup-history"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Download backup
  const handleDownload = async (backup: BackupHistory) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("backup-restore", {
        body: {
          action: "download_backup",
          backupId: backup.id
        }
      });

      if (response.error) throw response.error;
      if (!response.data.success) throw new Error(response.data.error);

      // Trigger download
      const link = document.createElement("a");
      link.href = response.data.url;
      link.download = response.data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Started",
        description: "Your backup file is downloading"
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openRestoreDialog = (backup: BackupHistory) => {
    setSelectedBackup(backup);
    setSelectedTables([]);
    setRestoreType("full");
    setRestoreNotes("");
    setRestoreDialogOpen(true);
  };

  const openDeleteConfirm = (backup: BackupHistory) => {
    setSelectedBackup(backup);
    setDeleteConfirmOpen(true);
  };

  const toggleTableSelection = (table: string) => {
    setSelectedTables(prev => 
      prev.includes(table) 
        ? prev.filter(t => t !== table)
        : [...prev, table]
    );
  };

  const getBackupTypeBadge = (type: string) => {
    switch (type) {
      case "full":
        return <Badge className="bg-blue-500">Full Backup</Badge>;
      case "cms":
        return <Badge className="bg-green-500">CMS Only</Badge>;
      case "transactions":
        return <Badge className="bg-orange-500">Transactions</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Enterprise Backup & Restore
          </h2>
          <p className="text-muted-foreground mt-1">
            Secure backup and restore system for your entire platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchBackups()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setCreateBackupOpen(true)}>
            <Database className="h-4 w-4 mr-2" />
            Create Backup
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <HardDrive className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{backups?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Backups</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{restoreHistory?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Restores Performed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <FileJson className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatFileSize(backups?.reduce((acc, b) => acc + (b.file_size || 0), 0) || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Storage</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>All your database backups stored securely in the cloud</CardDescription>
        </CardHeader>
        <CardContent>
          {backupsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : backups && backups.length > 0 ? (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div 
                  key={backup.id} 
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <FileJson className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{backup.backup_name}</p>
                        {getBackupTypeBadge(backup.backup_type)}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(backup.created_at), "MMM dd, yyyy HH:mm")}
                        </span>
                        <span>{formatFileSize(backup.file_size)}</span>
                        <span>{backup.tables_included.length} tables</span>
                      </div>
                      {backup.notes && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          {backup.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(backup)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openRestoreDialog(backup)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => openDeleteConfirm(backup)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No backups found</p>
              <p className="text-sm">Create your first backup to protect your data</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Restores */}
      {restoreHistory && restoreHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Restores</CardTitle>
            <CardDescription>History of restore operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {restoreHistory.map((restore) => (
                <div key={restore.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {restore.restore_type === "full" ? "Full Restore" : "Selective Restore"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {restore.tables_restored.length} tables • {format(new Date(restore.restored_at), "MMM dd, yyyy HH:mm")}
                    </p>
                  </div>
                  <Badge variant={restore.status === "completed" ? "default" : "destructive"}>
                    {restore.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Backup Dialog */}
      <Dialog open={createBackupOpen} onOpenChange={setCreateBackupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Backup</DialogTitle>
            <DialogDescription>
              Choose what data to include in your backup
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Backup Type</Label>
              <Select value={backupType} onValueChange={setBackupType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">
                    <div className="flex flex-col">
                      <span>Full Backup</span>
                      <span className="text-xs text-muted-foreground">All CMS + Transactions</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cms">
                    <div className="flex flex-col">
                      <span>CMS Content Only</span>
                      <span className="text-xs text-muted-foreground">Packages, Hero, FAQ, etc.</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="transactions">
                    <div className="flex flex-col">
                      <span>Transactions Only</span>
                      <span className="text-xs text-muted-foreground">Bookings, Payments, Users</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea 
                placeholder="Add notes about this backup..."
                value={backupNotes}
                onChange={(e) => setBackupNotes(e.target.value)}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Tables to backup:</p>
              <p className="text-muted-foreground">
                {backupType === "full" && `${CMS_TABLES.length + TRANSACTION_TABLES.length} tables`}
                {backupType === "cms" && `${CMS_TABLES.length} CMS tables`}
                {backupType === "transactions" && `${TRANSACTION_TABLES.length} transaction tables`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateBackupOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createBackupMutation.mutate()}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Create Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Restore Backup</DialogTitle>
            <DialogDescription>
              Restore data from: {selectedBackup?.backup_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">Warning</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    This will replace existing data with the backup. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Restore Type</Label>
              <Select 
                value={restoreType} 
                onValueChange={(v) => setRestoreType(v as "full" | "selective")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Restore (all tables)</SelectItem>
                  <SelectItem value="selective">Selective Restore (choose tables)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {restoreType === "selective" && selectedBackup && (
              <div className="space-y-2">
                <Label>Select Tables to Restore</Label>
                <ScrollArea className="h-48 border rounded-lg p-3">
                  <div className="space-y-2">
                    {selectedBackup.tables_included.map((table) => (
                      <div key={table} className="flex items-center gap-2">
                        <Checkbox 
                          id={table}
                          checked={selectedTables.includes(table)}
                          onCheckedChange={() => toggleTableSelection(table)}
                        />
                        <label 
                          htmlFor={table} 
                          className="text-sm flex-1 cursor-pointer flex justify-between"
                        >
                          <span>{table}</span>
                          <span className="text-muted-foreground">
                            {selectedBackup.record_counts?.[table] || 0} records
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedTables.length} tables
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea 
                placeholder="Add notes about this restore..."
                value={restoreNotes}
                onChange={(e) => setRestoreNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => restoreBackupMutation.mutate()}
              disabled={isProcessing || (restoreType === "selective" && selectedTables.length === 0)}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedBackup?.backup_name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteBackupMutation.mutate()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBackupRestore;
