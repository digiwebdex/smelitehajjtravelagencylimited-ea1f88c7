import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  bookingId: string;
  type: "submitted" | "confirmed" | "rejected";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bookingId, type }: NotificationRequest = await req.json();

    if (!bookingId || !type) {
      throw new Error("Missing bookingId or type");
    }

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from("air_ticket_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    // Fetch first passenger for name
    const { data: passengers } = await supabase
      .from("air_ticket_passengers")
      .select("first_name, last_name")
      .eq("booking_id", bookingId)
      .limit(1);

    const passengerName = passengers?.[0] 
      ? `${passengers[0].first_name} ${passengers[0].last_name}`
      : booking.guest_name || "Valued Customer";

    // Fetch notification template
    const templateKey = `air_ticket_${type}`;
    const { data: template } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("template_key", templateKey)
      .eq("is_active", true)
      .single();

    // Fetch notification settings
    const { data: smsSettings } = await supabase
      .from("booking_settings")
      .select("setting_value")
      .eq("setting_key", "sms_notifications")
      .single();

    const { data: emailSettings } = await supabase
      .from("booking_settings")
      .select("setting_value")
      .eq("setting_key", "email_notifications")
      .single();

    const smsEnabled = smsSettings?.setting_value?.enabled ?? true;
    const emailEnabled = emailSettings?.setting_value?.enabled ?? true;

    // Prepare variables for template replacement
    const variables: Record<string, string> = {
      booking_id: booking.booking_id,
      name: passengerName,
      from_city: booking.from_city,
      to_city: booking.to_city,
      travel_date: new Date(booking.travel_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      pnr_number: booking.pnr_number || "",
      ticket_number: booking.ticket_number || "",
      price: booking.price?.toLocaleString() || "",
      rejection_reason: booking.rejection_reason || "",
    };

    // Replace variables in templates
    const replaceVariables = (text: string | null): string => {
      if (!text) return "";
      let result = text;
      for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
      }
      return result;
    };

    const notifications: { type: string; recipient: string; content: string; status: string }[] = [];

    // Process SMS notification
    if (smsEnabled && template?.sms_template) {
      const smsContent = replaceVariables(template.sms_template);
      const recipient = `${booking.country_code}${booking.contact_phone}`;
      
      // Log the SMS (actual SMS integration would go here)
      notifications.push({
        type: "sms",
        recipient,
        content: smsContent,
        status: "logged", // Would be "sent" with actual SMS API
      });

      console.log(`SMS to ${recipient}: ${smsContent}`);
    }

    // Process Email notification
    if (emailEnabled && template?.email_template) {
      const emailSubject = replaceVariables(template.email_subject);
      const emailContent = replaceVariables(template.email_template);
      const recipient = booking.contact_email;

      // Log the email (actual email integration would go here)
      notifications.push({
        type: "email",
        recipient,
        content: emailSubject,
        status: "logged", // Would be "sent" with actual email API
      });

      console.log(`Email to ${recipient}: Subject - ${emailSubject}`);
    }

    // Log notifications to database
    for (const notif of notifications) {
      await supabase.from("notification_logs").insert({
        booking_id: bookingId,
        booking_type: "air_ticket",
        notification_type: notif.type,
        recipient: notif.recipient,
        message_content: notif.content,
        status: notif.status,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notifications processed for ${type}`,
        notifications: notifications.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Notification error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
