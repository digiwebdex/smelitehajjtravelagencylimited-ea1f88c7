import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  bookingId: string;
  newStatus: string;
  notes?: string;
}

interface SMSConfig {
  provider: string;
  api_url: string;
  api_key: string;
  sender_id: string;
}

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
}

interface WhatsAppConfig {
  provider: string;
  account_sid: string;
  auth_token: string;
  from_number: string;
  message_template: string;
}

const trackingStatusLabels: Record<string, string> = {
  order_submitted: 'Order Submitted',
  documents_received: 'Documents Received',
  under_review: 'Under Review',
  approved: 'Approved',
  processing: 'Processing',
  completed: 'Completed',
};

const getStatusEmoji = (status: string): string => {
  const emojis: Record<string, string> = {
    order_submitted: '📝',
    documents_received: '📄',
    under_review: '🔍',
    approved: '✅',
    processing: '⚙️',
    completed: '🎉',
  };
  return emojis[status] || '📋';
};

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
  console.log("send-tracking-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bookingId, newStatus, notes }: NotificationRequest = await req.json();
    console.log("Processing tracking notification for booking:", bookingId, "Status:", newStatus);

    // Fetch booking details with package info
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        package:packages(title, duration_days, type)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Error fetching booking:", bookingError);
      throw new Error("Booking not found");
    }

    console.log("Booking found:", booking.id);

    // Fetch profile if user_id exists
    let profile = null;
    if (booking.user_id) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", booking.user_id)
        .single();
      profile = profileData;
    }

    // Get customer details
    const customerName = profile?.full_name || booking.guest_name || "Customer";
    const customerEmail = profile?.email || booking.guest_email;
    const customerPhone = profile?.phone || booking.guest_phone;

    console.log("Customer details:", { customerName, customerEmail, customerPhone });

    // Fetch notification settings
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*");

    if (settingsError) {
      console.error("Error fetching notification settings:", settingsError);
      throw new Error("Could not fetch notification settings");
    }

    const smsSettings = settings?.find(s => s.setting_type === "sms");
    const emailSettings = settings?.find(s => s.setting_type === "email");
    const whatsappSettings = settings?.find(s => s.setting_type === "whatsapp");

    console.log("SMS enabled:", smsSettings?.is_enabled);
    console.log("Email enabled:", emailSettings?.is_enabled);
    console.log("WhatsApp enabled:", whatsappSettings?.is_enabled);

    const results = {
      sms: { sent: false, error: null as string | null },
      email: { sent: false, error: null as string | null },
      whatsapp: { sent: false, error: null as string | null },
    };

    const statusLabel = trackingStatusLabels[newStatus] || newStatus;
    const statusEmoji = getStatusEmoji(newStatus);

    // Send WhatsApp if enabled and phone exists
    if (whatsappSettings?.is_enabled && customerPhone) {
      try {
        const whatsappConfig = whatsappSettings.config as unknown as WhatsAppConfig;
        console.log("Sending WhatsApp to:", customerPhone);
        
        // Format the message from template
        let message = whatsappConfig.message_template || 
          "Hello {{name}}, your booking status has been updated to: {{status}}. Booking ID: {{booking_id}}";
        
        message = message
          .replace(/\{\{name\}\}/g, customerName)
          .replace(/\{\{status\}\}/g, `${statusEmoji} ${statusLabel}`)
          .replace(/\{\{booking_id\}\}/g, booking.id.slice(0, 8).toUpperCase())
          .replace(/\{\{package\}\}/g, booking.package?.title || 'N/A')
          .replace(/\{\{notes\}\}/g, notes || '');

        const toNumber = formatWhatsAppNumber(customerPhone);
        
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
        console.log("WhatsApp message sent, SID:", responseData.sid);

        results.whatsapp.sent = true;
        console.log("WhatsApp sent successfully");

        await supabase.from("notification_logs").insert({
          booking_id: bookingId,
          notification_type: "whatsapp",
          recipient: customerPhone,
          status: "sent",
        });
      } catch (whatsappError: any) {
        console.error("WhatsApp sending error:", whatsappError);
        results.whatsapp.error = whatsappError.message;

        await supabase.from("notification_logs").insert({
          booking_id: bookingId,
          notification_type: "whatsapp",
          recipient: customerPhone,
          status: "failed",
          error_message: whatsappError.message,
        });
      }
    }

    // Send SMS if enabled and phone exists
    if (smsSettings?.is_enabled && customerPhone) {
      try {
        const smsConfig = smsSettings.config as unknown as SMSConfig;
        console.log("Sending SMS to:", customerPhone);
        
        let smsMessage = `${statusEmoji} Dear ${customerName}, your ${booking.package.title} booking status has been updated to: ${statusLabel}.`;
        if (notes) {
          smsMessage += ` Note: ${notes}`;
        }
        smsMessage += ` Booking ID: ${booking.id.slice(0, 8).toUpperCase()}. Track your order at our website.`;

        const smsResponse = await fetch(smsConfig.api_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${smsConfig.api_key}`,
          },
          body: JSON.stringify({
            to: customerPhone,
            from: smsConfig.sender_id,
            message: smsMessage,
          }),
        });

        if (!smsResponse.ok) {
          const errorText = await smsResponse.text();
          throw new Error(`SMS API error: ${errorText}`);
        }

        results.sms.sent = true;
        console.log("SMS sent successfully");

        await supabase.from("notification_logs").insert({
          booking_id: bookingId,
          notification_type: "sms",
          recipient: customerPhone,
          status: "sent",
        });
      } catch (smsError: any) {
        console.error("SMS sending error:", smsError);
        results.sms.error = smsError.message;

        await supabase.from("notification_logs").insert({
          booking_id: bookingId,
          notification_type: "sms",
          recipient: customerPhone,
          status: "failed",
          error_message: smsError.message,
        });
      }
    }

    // Send Email if enabled and email exists
    if (emailSettings?.is_enabled && customerEmail) {
      try {
        const emailConfig = emailSettings.config as unknown as EmailConfig;
        console.log("Sending email to:", customerEmail);

        const client = new SMTPClient({
          connection: {
            hostname: emailConfig.smtp_host,
            port: emailConfig.smtp_port,
            tls: emailConfig.smtp_port === 465,
            auth: {
              username: emailConfig.smtp_user,
              password: emailConfig.smtp_password,
            },
          },
        });

        const progressSteps = [
          { key: 'order_submitted', label: 'Order Submitted' },
          { key: 'documents_received', label: 'Documents Received' },
          { key: 'under_review', label: 'Under Review' },
          { key: 'approved', label: 'Approved' },
          { key: 'processing', label: 'Processing' },
          { key: 'completed', label: 'Completed' },
        ];

        const currentIndex = progressSteps.findIndex(s => s.key === newStatus);

        const progressHtml = progressSteps.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          return `
            <div style="display: flex; align-items: center; margin: 8px 0;">
              <div style="
                width: 24px; 
                height: 24px; 
                border-radius: 50%; 
                background: ${isCompleted ? '#d4a853' : '#e5e5e5'}; 
                color: ${isCompleted ? 'white' : '#999'};
                display: flex; 
                align-items: center; 
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                ${isCurrent ? 'box-shadow: 0 0 0 4px rgba(212, 168, 83, 0.3);' : ''}
              ">
                ${isCompleted ? '✓' : index + 1}
              </div>
              <span style="
                margin-left: 12px; 
                color: ${isCompleted ? '#333' : '#999'};
                font-weight: ${isCurrent ? 'bold' : 'normal'};
              ">${step.label}</span>
            </div>
          `;
        }).join('');

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Order Status Update</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #d4a853, #c4963e); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0;">${statusEmoji} Status Update</h1>
                <p style="margin: 10px 0 0 0;">Your order status has been updated</p>
              </div>
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Dear ${customerName},</p>
                <p>We wanted to let you know that your booking status has been updated.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d4a853;">
                  <strong style="font-size: 1.2em; color: #d4a853;">Current Status: ${statusLabel}</strong>
                  ${notes ? `<p style="margin-top: 10px; color: #666; font-style: italic;">"${notes}"</p>` : ''}
                </div>

                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Order Progress</h3>
                  ${progressHtml}
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="color: #666;">Booking ID:</span>
                    <span style="font-weight: bold;">${booking.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="color: #666;">Package:</span>
                    <span style="font-weight: bold;">${booking.package.title}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="color: #666;">Travel Date:</span>
                    <span style="font-weight: bold;">${booking.travel_date || 'To be confirmed'}</span>
                  </div>
                </div>
                
                <p>You can track your order status anytime by logging into your account on our website.</p>
                <p>If you have any questions, please don't hesitate to contact us.</p>
              </div>
              <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
                <p>This is an automated notification. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await client.send({
          from: `${emailConfig.from_name} <${emailConfig.from_email}>`,
          to: customerEmail,
          subject: `${statusEmoji} Order Update: ${statusLabel} - ${booking.package.title}`,
          content: `Your order status has been updated to: ${statusLabel}`,
          html: emailHtml,
        });

        await client.close();
        results.email.sent = true;
        console.log("Email sent successfully");

        await supabase.from("notification_logs").insert({
          booking_id: bookingId,
          notification_type: "email",
          recipient: customerEmail,
          status: "sent",
        });
      } catch (emailError: any) {
        console.error("Email sending error:", emailError);
        results.email.error = emailError.message;

        await supabase.from("notification_logs").insert({
          booking_id: bookingId,
          notification_type: "email",
          recipient: customerEmail,
          status: "failed",
          error_message: emailError.message,
        });
      }
    }

    console.log("Tracking notification results:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-tracking-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);