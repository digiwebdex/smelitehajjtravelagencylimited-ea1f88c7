import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables to backup grouped by category
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

const ALL_TABLES = [...CMS_TABLES, ...TRANSACTION_TABLES];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      throw new Error("Admin access required");
    }

    const { action, backupType, backupId, tables, notes } = await req.json();

    if (action === "create_backup") {
      // Determine which tables to backup
      let tablesToBackup: string[] = [];
      if (backupType === "cms") {
        tablesToBackup = CMS_TABLES;
      } else if (backupType === "transactions") {
        tablesToBackup = TRANSACTION_TABLES;
      } else {
        tablesToBackup = ALL_TABLES;
      }

      // Collect data from all tables
      const backupData: Record<string, any[]> = {};
      const recordCounts: Record<string, number> = {};

      for (const table of tablesToBackup) {
        const { data, error } = await supabase.from(table).select("*");
        if (!error && data) {
          backupData[table] = data;
          recordCounts[table] = data.length;
        }
      }

      // Create backup file
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `backup_${backupType}_${timestamp}.json`;
      const backupContent = JSON.stringify({
        version: "1.0",
        created_at: new Date().toISOString(),
        backup_type: backupType,
        tables: tablesToBackup,
        data: backupData
      }, null, 2);

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("backups")
        .upload(fileName, new Blob([backupContent], { type: "application/json" }), {
          contentType: "application/json"
        });

      if (uploadError) {
        throw new Error(`Failed to upload backup: ${uploadError.message}`);
      }

      // Record backup history
      const { data: historyData, error: historyError } = await supabase
        .from("backup_history")
        .insert({
          backup_name: fileName,
          backup_type: backupType,
          file_path: uploadData.path,
          file_size: new Blob([backupContent]).size,
          tables_included: tablesToBackup,
          record_counts: recordCounts,
          created_by: user.id,
          notes: notes || null,
          status: "completed"
        })
        .select()
        .single();

      if (historyError) {
        throw new Error(`Failed to record backup: ${historyError.message}`);
      }

      return new Response(JSON.stringify({
        success: true,
        backup: historyData,
        message: `Backup created successfully with ${Object.keys(backupData).length} tables`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "restore_backup") {
      if (!backupId) {
        throw new Error("Backup ID is required");
      }

      // Get backup info
      const { data: backup, error: backupError } = await supabase
        .from("backup_history")
        .select("*")
        .eq("id", backupId)
        .single();

      if (backupError || !backup) {
        throw new Error("Backup not found");
      }

      // Download backup file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("backups")
        .download(backup.file_path);

      if (downloadError) {
        throw new Error(`Failed to download backup: ${downloadError.message}`);
      }

      const backupContent = JSON.parse(await fileData.text());
      const tablesToRestore = tables && tables.length > 0 ? tables : Object.keys(backupContent.data);
      const restoredTables: string[] = [];

      // Restore each table
      for (const table of tablesToRestore) {
        if (backupContent.data[table]) {
          // Delete existing data
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

          if (deleteError) {
            console.error(`Error deleting from ${table}:`, deleteError);
            continue;
          }

          // Insert backup data
          if (backupContent.data[table].length > 0) {
            const { error: insertError } = await supabase
              .from(table)
              .insert(backupContent.data[table]);

            if (insertError) {
              console.error(`Error inserting into ${table}:`, insertError);
              continue;
            }
          }

          restoredTables.push(table);
        }
      }

      // Record restore history
      const { data: restoreHistory, error: restoreError } = await supabase
        .from("restore_history")
        .insert({
          backup_id: backupId,
          restore_type: tables && tables.length > 0 ? "selective" : "full",
          tables_restored: restoredTables,
          restored_by: user.id,
          notes: notes || null,
          status: "completed"
        })
        .select()
        .single();

      if (restoreError) {
        throw new Error(`Failed to record restore: ${restoreError.message}`);
      }

      return new Response(JSON.stringify({
        success: true,
        restore: restoreHistory,
        message: `Restored ${restoredTables.length} tables successfully`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "delete_backup") {
      if (!backupId) {
        throw new Error("Backup ID is required");
      }

      // Get backup info
      const { data: backup, error: backupError } = await supabase
        .from("backup_history")
        .select("*")
        .eq("id", backupId)
        .single();

      if (backupError || !backup) {
        throw new Error("Backup not found");
      }

      // Delete from storage
      const { error: deleteStorageError } = await supabase.storage
        .from("backups")
        .remove([backup.file_path]);

      if (deleteStorageError) {
        console.error("Storage delete error:", deleteStorageError);
      }

      // Delete backup record
      const { error: deleteError } = await supabase
        .from("backup_history")
        .delete()
        .eq("id", backupId);

      if (deleteError) {
        throw new Error(`Failed to delete backup: ${deleteError.message}`);
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Backup deleted successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "download_backup") {
      if (!backupId) {
        throw new Error("Backup ID is required");
      }

      // Get backup info
      const { data: backup, error: backupError } = await supabase
        .from("backup_history")
        .select("*")
        .eq("id", backupId)
        .single();

      if (backupError || !backup) {
        throw new Error("Backup not found");
      }

      // Generate signed URL
      const { data: signedUrl, error: signedError } = await supabase.storage
        .from("backups")
        .createSignedUrl(backup.file_path, 3600); // 1 hour

      if (signedError) {
        throw new Error(`Failed to generate download URL: ${signedError.message}`);
      }

      return new Response(JSON.stringify({
        success: true,
        url: signedUrl.signedUrl,
        fileName: backup.backup_name
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    throw new Error("Invalid action");

  } catch (error: unknown) {
    console.error("Backup/Restore error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
