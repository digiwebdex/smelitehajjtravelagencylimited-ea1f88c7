import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeRequest {
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
}

interface WhatsAppConfig {
  provider: string;
  account_sid: string;
  auth_token: string;
  from_number: string;
  message_template: string;
  welcome_message_enabled?: boolean;
  welcome_message_template?: string;
}

// Helper to format phone number for WhatsApp
const formatWhatsAppNumber = (phone: string): string => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, assume Bangladesh and replace with 880
  if (cleaned.startsWith('0')) {
    cleaned = '880' + cleaned.substring(1);
  }
  
  // Add whatsapp: prefix if not present
  return `whatsapp:+${cleaned}`;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-welcome-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, fullName, phone, email }: WelcomeRequest = await req.json();
    console.log("Processing welcome notification for user:", userId, "Phone:", phone);

    if (!phone) {
      console.log("No phone number provided, skipping welcome notification");
      return new Response(
        JSON.stringify({ success: false, message: "No phone number provided" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch WhatsApp notification settings
    const { data: whatsappSettings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("setting_type", "whatsapp")
      .single();

    if (settingsError || !whatsappSettings) {
      console.log("WhatsApp settings not found");
      return new Response(
        JSON.stringify({ success: false, message: "WhatsApp settings not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const whatsappConfig = whatsappSettings.config as unknown as WhatsAppConfig;

    // Check if WhatsApp and welcome messages are enabled
    if (!whatsappSettings.is_enabled) {
      console.log("WhatsApp notifications are disabled");
      return new Response(
        JSON.stringify({ success: false, message: "WhatsApp notifications disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!whatsappConfig.welcome_message_enabled) {
      console.log("Welcome messages are disabled");
      return new Response(
        JSON.stringify({ success: false, message: "Welcome messages disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format the welcome message from template
    const defaultTemplate = "🌟 Assalamu Alaikum {{name}}! Welcome to SM Elite Hajj. We're honored to have you join our family. May your journey with us be blessed. Contact us anytime for Hajj, Umrah, or Visa services. JazakAllah Khair! 🕋";
    
    let message = whatsappConfig.welcome_message_template || defaultTemplate;
    message = message.replace(/\{\{name\}\}/g, fullName || 'Valued Customer');

    const toNumber = formatWhatsAppNumber(phone);
    console.log("Sending WhatsApp welcome message to:", toNumber);

    // Use Twilio API to send WhatsApp message
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${whatsappConfig.account_sid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', toNumber);
    formData.append('From', whatsappConfig.from_number);
    formData.append('Body', message);

    const authHeader = btoa(`${whatsappConfig.account_sid}:${whatsappConfig.auth_token}`);

    const whatsappResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${authHeader}`,
      },
      body: formData.toString(),
    });

    if (!whatsappResponse.ok) {
      const errorData = await whatsappResponse.json();
      throw new Error(`WhatsApp API error: ${errorData.message || JSON.stringify(errorData)}`);
    }

    const responseData = await whatsappResponse.json();
    console.log("WhatsApp welcome message sent, SID:", responseData.sid);

    // Log the notification
    await supabase.from("notification_logs").insert({
      booking_id: null,
      notification_type: "whatsapp_welcome",
      recipient: phone,
      status: "sent",
    });

    return new Response(
      JSON.stringify({ success: true, message: "Welcome notification sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-notification:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
