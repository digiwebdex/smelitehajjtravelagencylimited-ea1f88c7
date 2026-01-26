import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  applicationId: string;
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

const visaStatusLabels: Record<string, string> = {
  pending: 'Application Submitted',
  processing: 'Under Processing',
  approved: 'Visa Approved',
  rejected: 'Visa Rejected',
  completed: 'Visa Completed',
};

const getStatusEmoji = (status: string): string => {
  const emojis: Record<string, string> = {
    pending: '📝',
    processing: '⏳',
    approved: '✅',
    rejected: '❌',
    completed: '🎉',
  };
  return emojis[status] || '📋';
};

// Helper to format phone number for WhatsApp
const formatWhatsAppNumber = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '880' + cleaned.substring(1);
  }
  return `whatsapp:+${cleaned}`;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-visa-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { applicationId, newStatus, notes }: NotificationRequest = await req.json();
    console.log("Processing visa notification for application:", applicationId, "Status:", newStatus);

    // Fetch visa application details with country info
    const { data: application, error: applicationError } = await supabase
      .from("visa_applications")
      .select(`
        *,
        visa_countries (
          country_name,
          flag_emoji,
          processing_time
        )
      `)
      .eq("id", applicationId)
      .single();

    if (applicationError || !application) {
      console.error("Error fetching visa application:", applicationError);
      throw new Error("Visa application not found");
    }

    console.log("Application found:", application.id);

    // Get customer details from application
    const customerName = application.applicant_name || "Customer";
    const customerEmail = application.applicant_email;
    const customerPhone = application.applicant_phone;

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

    const statusLabel = visaStatusLabels[newStatus] || newStatus;
    const statusEmoji = getStatusEmoji(newStatus);
    const countryName = application.visa_countries?.country_name || 'Unknown';
    const countryFlag = application.visa_countries?.flag_emoji || '🌍';

    // Send WhatsApp if enabled and phone exists
    if (whatsappSettings?.is_enabled && customerPhone) {
      try {
        const whatsappConfig = whatsappSettings.config as unknown as WhatsAppConfig;
        console.log("Sending WhatsApp to:", customerPhone);
        
        let message = `${statusEmoji} Hello ${customerName}!\n\nYour ${countryFlag} ${countryName} visa application status has been updated to: *${statusLabel}*\n\nApplication ID: ${application.id.slice(0, 8).toUpperCase()}`;
        
        if (notes) {
          message += `\n\nNote: ${notes}`;
        }

        if (newStatus === 'approved') {
          message += `\n\n🎊 Congratulations! Your visa has been approved. Please contact us for next steps.`;
        } else if (newStatus === 'rejected') {
          message += `\n\nPlease contact us for more information about the rejection.`;
        }

        const toNumber = formatWhatsAppNumber(customerPhone);
        
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
          notification_type: "whatsapp_visa",
          recipient: customerPhone,
          status: "sent",
        });
      } catch (whatsappError: any) {
        console.error("WhatsApp sending error:", whatsappError);
        results.whatsapp.error = whatsappError.message;

        await supabase.from("notification_logs").insert({
          notification_type: "whatsapp_visa",
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
        
        let smsMessage = `${statusEmoji} Dear ${customerName}, your ${countryName} visa application status: ${statusLabel}.`;
        if (notes) {
          smsMessage += ` Note: ${notes}`;
        }
        smsMessage += ` App ID: ${application.id.slice(0, 8).toUpperCase()}`;

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
          notification_type: "sms_visa",
          recipient: customerPhone,
          status: "sent",
        });
      } catch (smsError: any) {
        console.error("SMS sending error:", smsError);
        results.sms.error = smsError.message;

        await supabase.from("notification_logs").insert({
          notification_type: "sms_visa",
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

        const statusColor = newStatus === 'approved' ? '#22c55e' : 
                           newStatus === 'rejected' ? '#ef4444' : '#d4a853';

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Visa Application Status Update</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #d4a853, #c4963e); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0;">${statusEmoji} Visa Application Update</h1>
                <p style="margin: 10px 0 0 0;">${countryFlag} ${countryName} Visa</p>
              </div>
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Dear ${customerName},</p>
                <p>We wanted to let you know that your visa application status has been updated.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
                  <strong style="font-size: 1.2em; color: ${statusColor};">Current Status: ${statusLabel}</strong>
                  ${notes ? `<p style="margin-top: 10px; color: #666; font-style: italic;">"${notes}"</p>` : ''}
                </div>

                ${newStatus === 'approved' ? `
                <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #22c55e;">
                  <h3 style="margin: 0 0 10px 0; color: #22c55e;">🎊 Congratulations!</h3>
                  <p style="margin: 0; color: #166534;">Your visa has been approved! Please contact us for the next steps to collect your visa documents.</p>
                </div>
                ` : ''}

                ${newStatus === 'rejected' ? `
                <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ef4444;">
                  <h3 style="margin: 0 0 10px 0; color: #ef4444;">Application Status</h3>
                  <p style="margin: 0; color: #991b1b;">Unfortunately, your visa application was not approved. Please contact us for more information and possible next steps.</p>
                </div>
                ` : ''}
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Application Details</h3>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="color: #666;">Application ID:</span>
                    <span style="font-weight: bold;">${application.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="color: #666;">Country:</span>
                    <span style="font-weight: bold;">${countryFlag} ${countryName}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="color: #666;">Number of Applicants:</span>
                    <span style="font-weight: bold;">${application.applicant_count}</span>
                  </div>
                  ${application.travel_date ? `
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="color: #666;">Travel Date:</span>
                    <span style="font-weight: bold;">${application.travel_date}</span>
                  </div>
                  ` : ''}
                </div>
                
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
          subject: `${statusEmoji} Visa Application Update: ${statusLabel} - ${countryName}`,
          content: `Your visa application status has been updated to: ${statusLabel}`,
          html: emailHtml,
        });

        await client.close();
        results.email.sent = true;
        console.log("Email sent successfully");

        await supabase.from("notification_logs").insert({
          notification_type: "email_visa",
          recipient: customerEmail,
          status: "sent",
        });
      } catch (emailError: any) {
        console.error("Email sending error:", emailError);
        results.email.error = emailError.message;

        await supabase.from("notification_logs").insert({
          notification_type: "email_visa",
          recipient: customerEmail,
          status: "failed",
          error_message: emailError.message,
        });
      }
    }

    console.log("Visa notification results:", results);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-visa-notification:", error);
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
