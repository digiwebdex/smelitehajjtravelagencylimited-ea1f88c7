import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Management notification number
const MANAGEMENT_PHONE = "8801867666888";

// Simple SMTP helper for sending emails
const sendSMTPEmail = async (
  config: { host: string; port: number; user: string; password: string; fromEmail: string; fromName: string },
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const conn = await Deno.connect({ hostname: config.host, port: config.port });
  
  const readResponse = async (): Promise<string> => {
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    return n ? decoder.decode(buffer.subarray(0, n)) : "";
  };

  const writeCommand = async (cmd: string): Promise<string> => {
    await conn.write(encoder.encode(cmd + "\r\n"));
    return await readResponse();
  };

  try {
    await readResponse();
    await writeCommand(`EHLO localhost`);
    
    const starttlsResp = await writeCommand("STARTTLS");
    if (starttlsResp.startsWith("220")) {
      const tlsConn = await Deno.startTls(conn, { hostname: config.host });
      
      const tlsReadResponse = async (): Promise<string> => {
        const buffer = new Uint8Array(2048);
        const n = await tlsConn.read(buffer);
        return n ? decoder.decode(buffer.subarray(0, n)) : "";
      };

      const tlsWriteCommand = async (cmd: string): Promise<string> => {
        await tlsConn.write(encoder.encode(cmd + "\r\n"));
        return await tlsReadResponse();
      };

      await tlsWriteCommand(`EHLO localhost`);
      await tlsWriteCommand("AUTH LOGIN");
      await tlsWriteCommand(btoa(config.user));
      const authResp = await tlsWriteCommand(btoa(config.password));
      
      if (!authResp.startsWith("235")) {
        throw new Error("SMTP authentication failed: " + authResp);
      }
      
      await tlsWriteCommand(`MAIL FROM:<${config.fromEmail}>`);
      await tlsWriteCommand(`RCPT TO:<${to}>`);
      await tlsWriteCommand("DATA");
      
      const emailContent = [
        `From: ${config.fromName} <${config.fromEmail}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        ``,
        htmlContent,
        `.`
      ].join("\r\n");
      
      const dataResp = await tlsWriteCommand(emailContent);
      
      if (!dataResp.startsWith("250")) {
        throw new Error("Failed to send email: " + dataResp);
      }
      
      await tlsWriteCommand("QUIT");
      tlsConn.close();
    } else {
      throw new Error("STARTTLS not supported: " + starttlsResp);
    }
  } catch (error) {
    conn.close();
    throw error;
  }
};

// BulkSMSBD SMS sender helper
const sendBulkSMS = async (
  apiKey: string,
  senderId: string,
  phone: string,
  message: string
): Promise<{ success: boolean; response?: string; error?: string }> => {
  try {
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '880' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('880')) {
      formattedPhone = '880' + formattedPhone;
    }

    const encodedMessage = encodeURIComponent(message);
    const apiUrl = `http://bulksmsbd.net/api/smsapi?api_key=${apiKey}&type=text&number=${formattedPhone}&senderid=${senderId}&message=${encodedMessage}`;
    
    console.log("Sending SMS to:", formattedPhone);
    
    const response = await fetch(apiUrl, { method: "GET" });
    const responseText = await response.text();
    
    console.log("BulkSMSBD response:", responseText);
    
    try {
      const jsonResponse = JSON.parse(responseText);
      if (jsonResponse.response_code === 202 || jsonResponse.response_code === "202") {
        return { success: true, response: responseText };
      } else {
        return { success: false, error: responseText };
      }
    } catch {
      if (responseText.toLowerCase().includes('success') || response.ok) {
        return { success: true, response: responseText };
      }
      return { success: false, error: responseText };
    }
  } catch (error: any) {
    console.error("SMS sending error:", error);
    return { success: false, error: error.message };
  }
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

const formatCurrency = (amount: number): string => {
  return `৳${amount.toLocaleString("en-BD")}`;
};

const formatWhatsAppNumber = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '880' + cleaned.substring(1);
  }
  return `whatsapp:+${cleaned}`;
};

// Status-specific SMS messages for CUSTOMER
const getCustomerSmsMessage = (
  status: string,
  customerName: string,
  packageTitle: string,
  bookingIdShort: string,
  totalPrice: number,
  notes?: string
): string => {
  switch (status) {
    case 'order_submitted':
      return `Dear ${customerName}, your booking for ${packageTitle} has been submitted successfully and is awaiting document review. Booking ID: ${bookingIdShort}. - SM Elite Hajj`;
    
    case 'documents_received':
      return `Dear ${customerName}, your documents for ${packageTitle} have been received successfully. We will begin reviewing them shortly. Booking ID: ${bookingIdShort}. - SM Elite Hajj`;
    
    case 'under_review':
      return `Dear ${customerName}, your documents for ${packageTitle} are under review. We will update you shortly. Booking ID: ${bookingIdShort}. - SM Elite Hajj`;
    
    case 'approved':
      return `Dear ${customerName}, CONGRATULATIONS! Your booking for ${packageTitle} has been APPROVED by S M Elite Hajj Limited. Total Amount: ${formatCurrency(totalPrice)}. Please complete your payment. Booking ID: ${bookingIdShort}. Contact us for next steps. - SM Elite Hajj`;
    
    case 'processing':
      return `Dear ${customerName}, your booking for ${packageTitle} is now being processed. Booking ID: ${bookingIdShort}. - SM Elite Hajj`;
    
    case 'completed':
      return `Dear ${customerName}, your booking process for ${packageTitle} has been completed successfully. Thank you for choosing S M Elite Hajj Limited! Booking ID: ${bookingIdShort}. - SM Elite Hajj`;
    
    default:
      return `Dear ${customerName}, your booking status has been updated to: ${status}. Booking ID: ${bookingIdShort}. - SM Elite Hajj`;
  }
};

// Status-specific Email templates for CUSTOMER
const getCustomerEmailTemplate = (
  status: string,
  customerName: string,
  packageTitle: string,
  bookingIdShort: string,
  totalPrice: number,
  passengerCount: number,
  travelDate: string | null,
  durationDays: number,
  packageType: string,
  notes?: string
): { subject: string; html: string } => {
  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
      .details-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
      .detail-row { padding: 10px 0; border-bottom: 1px solid #eee; }
      .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      .highlight { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d4a853; }
      .success-highlight { background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
    </style>
  `;

  const bookingDetailsHtml = `
    <div class="details-box">
      <div class="detail-row"><span style="color: #666;">Booking ID:</span> <strong>${bookingIdShort}</strong></div>
      <div class="detail-row"><span style="color: #666;">Package:</span> <strong>${packageTitle}</strong></div>
      <div class="detail-row"><span style="color: #666;">Type:</span> <strong>${packageType}</strong></div>
      <div class="detail-row"><span style="color: #666;">Duration:</span> <strong>${durationDays} Days</strong></div>
      <div class="detail-row"><span style="color: #666;">Passengers:</span> <strong>${passengerCount}</strong></div>
      <div class="detail-row"><span style="color: #666;">Travel Date:</span> <strong>${travelDate || "To be confirmed"}</strong></div>
      <div class="detail-row"><span style="color: #666;">Total Amount:</span> <strong style="color: #d4a853; font-size: 1.2em;">${formatCurrency(totalPrice)}</strong></div>
    </div>
  `;

  switch (status) {
    case 'order_submitted':
      return {
        subject: `📝 Booking Submitted - ${packageTitle}`,
        html: `
          <!DOCTYPE html>
          <html><head><meta charset="utf-8"><title>Booking Submitted</title>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #d4a853, #c4963e); color: white;">
                <h1>📝 Booking Submitted</h1>
                <p>Your booking is awaiting document review</p>
              </div>
              <div class="content">
                <p>Dear ${customerName},</p>
                <p>Thank you for submitting your booking with S M Elite Hajj Limited. Your booking has been received and is <strong>awaiting document review</strong>.</p>
                <div class="highlight">
                  <strong>What's Next?</strong><br>
                  Please upload your required documents (passport, photos, etc.) so we can proceed with the review process.
                </div>
                ${bookingDetailsHtml}
                ${notes ? `<p><strong>Note:</strong> ${notes}</p>` : ''}
                <p>We will notify you once your documents have been reviewed.</p>
              </div>
              <div class="footer"><p>S M Elite Hajj Limited - Your Trusted Partner for Hajj & Umrah</p></div>
            </div>
          </body></html>
        `
      };

    case 'documents_received':
      return {
        subject: `📄 Documents Received - ${packageTitle}`,
        html: `
          <!DOCTYPE html>
          <html><head><meta charset="utf-8"><title>Documents Received</title>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #17a2b8, #138496); color: white;">
                <h1>📄 Documents Received</h1>
                <p>We have received your documents</p>
              </div>
              <div class="content">
                <p>Dear ${customerName},</p>
                <p>We are pleased to inform you that your documents have been <strong>received successfully</strong>.</p>
                <div class="highlight">
                  <strong>What's Next?</strong><br>
                  Our team will begin reviewing your documents shortly. You will receive an update once the review is complete.
                </div>
                ${bookingDetailsHtml}
                ${notes ? `<p><strong>Note:</strong> ${notes}</p>` : ''}
              </div>
              <div class="footer"><p>S M Elite Hajj Limited - Your Trusted Partner for Hajj & Umrah</p></div>
            </div>
          </body></html>
        `
      };

    case 'under_review':
      return {
        subject: `🔍 Documents Under Review - ${packageTitle}`,
        html: `
          <!DOCTYPE html>
          <html><head><meta charset="utf-8"><title>Under Review</title>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #6c757d, #5a6268); color: white;">
                <h1>🔍 Under Review</h1>
                <p>Your documents are being reviewed</p>
              </div>
              <div class="content">
                <p>Dear ${customerName},</p>
                <p>Your documents are currently <strong>under review</strong> by our team.</p>
                <div class="highlight">
                  <strong>Please Note:</strong><br>
                  This process typically takes 1-3 business days. We will notify you as soon as the review is complete.
                </div>
                ${bookingDetailsHtml}
                ${notes ? `<p><strong>Note:</strong> ${notes}</p>` : ''}
              </div>
              <div class="footer"><p>S M Elite Hajj Limited - Your Trusted Partner for Hajj & Umrah</p></div>
            </div>
          </body></html>
        `
      };

    case 'approved':
      return {
        subject: `✅ APPROVED - ${packageTitle} - Payment Required`,
        html: `
          <!DOCTYPE html>
          <html><head><meta charset="utf-8"><title>Booking Approved</title>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #28a745, #218838); color: white;">
                <h1>✅ Booking Approved!</h1>
                <p>Congratulations! Your booking has been approved</p>
              </div>
              <div class="content">
                <p>Dear ${customerName},</p>
                <p>We are delighted to inform you that your booking has been <strong>APPROVED</strong> by S M Elite Hajj Limited!</p>
                <div class="success-highlight">
                  <strong>🎉 Congratulations!</strong><br>
                  Your application has been successfully approved. Please proceed with the payment to confirm your reservation.
                </div>
                ${bookingDetailsHtml}
                <div class="highlight">
                  <strong>💳 Payment Required</strong><br>
                  Please complete your payment of <strong style="color: #d4a853;">${formatCurrency(totalPrice)}</strong> to secure your booking.<br><br>
                  <strong>Payment Options:</strong><br>
                  • Bank Transfer<br>
                  • bKash / Nagad<br>
                  • Online Payment (SSLCommerz)<br>
                  • Installment Plan Available
                </div>
                ${notes ? `<p><strong>Note:</strong> ${notes}</p>` : ''}
                <p>If you have any questions, please contact us immediately.</p>
              </div>
              <div class="footer"><p>S M Elite Hajj Limited - Your Trusted Partner for Hajj & Umrah</p></div>
            </div>
          </body></html>
        `
      };

    case 'processing':
      return {
        subject: `⚙️ Booking Processing - ${packageTitle}`,
        html: `
          <!DOCTYPE html>
          <html><head><meta charset="utf-8"><title>Processing</title>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #fd7e14, #e96b0a); color: white;">
                <h1>⚙️ Processing</h1>
                <p>Your booking is being processed</p>
              </div>
              <div class="content">
                <p>Dear ${customerName},</p>
                <p>Your booking is now <strong>being processed</strong>. We are preparing everything for your journey.</p>
                ${bookingDetailsHtml}
                ${notes ? `<p><strong>Note:</strong> ${notes}</p>` : ''}
                <p>We will notify you once everything is ready.</p>
              </div>
              <div class="footer"><p>S M Elite Hajj Limited - Your Trusted Partner for Hajj & Umrah</p></div>
            </div>
          </body></html>
        `
      };

    case 'completed':
      return {
        subject: `🎉 Booking Completed - ${packageTitle}`,
        html: `
          <!DOCTYPE html>
          <html><head><meta charset="utf-8"><title>Completed</title>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #6f42c1, #5a32a3); color: white;">
                <h1>🎉 Completed!</h1>
                <p>Your booking process is complete</p>
              </div>
              <div class="content">
                <p>Dear ${customerName},</p>
                <p>We are pleased to inform you that your booking process has been <strong>completed successfully</strong>!</p>
                <div class="success-highlight">
                  <strong>🙏 Thank You!</strong><br>
                  Thank you for choosing S M Elite Hajj Limited for your spiritual journey. May Allah accept your Hajj/Umrah.
                </div>
                ${bookingDetailsHtml}
                ${notes ? `<p><strong>Note:</strong> ${notes}</p>` : ''}
                <p>We look forward to serving you again in the future.</p>
              </div>
              <div class="footer"><p>S M Elite Hajj Limited - Your Trusted Partner for Hajj & Umrah</p></div>
            </div>
          </body></html>
        `
      };

    default:
      return {
        subject: `📋 Status Update - ${packageTitle}`,
        html: `
          <!DOCTYPE html>
          <html><head><meta charset="utf-8"><title>Status Update</title>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #d4a853, #c4963e); color: white;">
                <h1>📋 Status Update</h1>
              </div>
              <div class="content">
                <p>Dear ${customerName},</p>
                <p>Your booking status has been updated to: <strong>${status}</strong></p>
                ${bookingDetailsHtml}
                ${notes ? `<p><strong>Note:</strong> ${notes}</p>` : ''}
              </div>
              <div class="footer"><p>S M Elite Hajj Limited - Your Trusted Partner for Hajj & Umrah</p></div>
            </div>
          </body></html>
        `
      };
  }
};

// Management SMS for order_submitted ONLY
const getManagementSmsMessage = (
  customerName: string,
  customerPhone: string,
  packageTitle: string,
  bookingIdShort: string,
  passengerCount: number,
  totalPrice: number
): string => {
  return `NEW BOOKING! Customer: ${customerName}, Phone: ${customerPhone}, Package: ${packageTitle}, Passengers: ${passengerCount}, Amount: ${formatCurrency(totalPrice)}, ID: ${bookingIdShort}. Please review documents.`;
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

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`*, package:packages(title, duration_days, type)`)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Error fetching booking:", bookingError);
      throw new Error("Booking not found");
    }

    let profile = null;
    if (booking.user_id) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", booking.user_id)
        .single();
      profile = profileData;
    }

    const customerName = profile?.full_name || booking.guest_name || "Customer";
    const customerEmail = profile?.email || booking.guest_email;
    const customerPhone = profile?.phone || booking.guest_phone;
    const bookingIdShort = booking.id.slice(0, 8).toUpperCase();

    console.log("Customer details:", { customerName, customerEmail, customerPhone });

    const { data: settings } = await supabase.from("notification_settings").select("*");

    const smsSettings = settings?.find(s => s.setting_type === "sms");
    const emailSettings = settings?.find(s => s.setting_type === "email");
    const whatsappSettings = settings?.find(s => s.setting_type === "whatsapp");

    const results = {
      sms: { sent: false, error: null as string | null },
      email: { sent: false, error: null as string | null },
      whatsapp: { sent: false, error: null as string | null },
      managementSms: { sent: false, error: null as string | null },
    };

    // Send WhatsApp if enabled
    if (whatsappSettings?.is_enabled && customerPhone) {
      try {
        const whatsappConfig = whatsappSettings.config as unknown as WhatsAppConfig;
        const smsMessage = getCustomerSmsMessage(
          newStatus,
          customerName,
          booking.package.title,
          bookingIdShort,
          booking.total_price,
          notes
        );

        const toNumber = formatWhatsAppNumber(customerPhone);
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${whatsappConfig.account_sid}/Messages.json`;
        
        const formData = new URLSearchParams();
        formData.append('To', toNumber);
        formData.append('From', whatsappConfig.from_number);
        formData.append('Body', smsMessage);

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

        results.whatsapp.sent = true;
        await supabase.from("notification_logs").insert({
          booking_id: bookingId,
          notification_type: `whatsapp_${newStatus}`,
          recipient: customerPhone,
          status: "sent",
        });
      } catch (whatsappError: any) {
        results.whatsapp.error = whatsappError.message;
        await supabase.from("notification_logs").insert({
          booking_id: bookingId,
          notification_type: `whatsapp_${newStatus}`,
          recipient: customerPhone,
          status: "failed",
          error_message: whatsappError.message,
        });
      }
    }

    // Send SMS to CUSTOMER
    if (smsSettings?.is_enabled && customerPhone) {
      try {
        const smsConfig = smsSettings.config as unknown as SMSConfig;
        const smsMessage = getCustomerSmsMessage(
          newStatus,
          customerName,
          booking.package.title,
          bookingIdShort,
          booking.total_price,
          notes
        );

        console.log("Sending tracking SMS to CUSTOMER:", customerPhone);
        const smsResult = await sendBulkSMS(smsConfig.api_key, smsConfig.sender_id, customerPhone, smsMessage);
        
        if (smsResult.success) {
          results.sms.sent = true;
          console.log("Customer SMS sent successfully");
          
          await supabase.from("notification_logs").insert({
            booking_id: bookingId,
            notification_type: `sms_customer_${newStatus}`,
            recipient: customerPhone,
            status: "sent",
          });
        } else {
          throw new Error(smsResult.error || "SMS failed");
        }
      } catch (smsError: any) {
        results.sms.error = smsError.message;
        await supabase.from("notification_logs").insert({
          booking_id: bookingId,
          notification_type: `sms_customer_${newStatus}`,
          recipient: customerPhone,
          status: "failed",
          error_message: smsError.message,
        });
      }
    }

    // Send SMS to MANAGEMENT only for order_submitted
    if (newStatus === 'order_submitted' && smsSettings?.is_enabled) {
      try {
        const smsConfig = smsSettings.config as unknown as SMSConfig;
        const managementMessage = getManagementSmsMessage(
          customerName,
          customerPhone || "N/A",
          booking.package.title,
          bookingIdShort,
          booking.passenger_count,
          booking.total_price
        );

        console.log("Sending SMS to MANAGEMENT:", MANAGEMENT_PHONE);
        const smsResult = await sendBulkSMS(smsConfig.api_key, smsConfig.sender_id, MANAGEMENT_PHONE, managementMessage);
        
        if (smsResult.success) {
          results.managementSms.sent = true;
          console.log("Management SMS sent successfully");
          
          await supabase.from("notification_logs").insert({
            booking_id: bookingId,
            notification_type: "sms_management_new_booking",
            recipient: MANAGEMENT_PHONE,
            status: "sent",
          });
        } else {
          throw new Error(smsResult.error || "Management SMS failed");
        }
      } catch (smsError: any) {
        results.managementSms.error = smsError.message;
        await supabase.from("notification_logs").insert({
          booking_id: bookingId,
          notification_type: "sms_management_new_booking",
          recipient: MANAGEMENT_PHONE,
          status: "failed",
          error_message: smsError.message,
        });
      }
    }

    // Send Email to CUSTOMER
    if (emailSettings?.is_enabled && customerEmail) {
      try {
        const emailConfig = emailSettings.config as unknown as EmailConfig;
        console.log("Sending email to:", customerEmail);

        const { subject, html } = getCustomerEmailTemplate(
          newStatus,
          customerName,
          booking.package.title,
          bookingIdShort,
          booking.total_price,
          booking.passenger_count,
          booking.travel_date,
          booking.package.duration_days,
          booking.package.type.charAt(0).toUpperCase() + booking.package.type.slice(1),
          notes
        );

        await sendSMTPEmail(
          {
            host: emailConfig.smtp_host,
            port: emailConfig.smtp_port,
            user: emailConfig.smtp_user,
            password: emailConfig.smtp_password,
            fromEmail: emailConfig.from_email,
            fromName: emailConfig.from_name,
          },
          customerEmail,
          subject,
          html
        );

        results.email.sent = true;
        console.log("Email sent successfully");

        await supabase.from("notification_logs").insert({
          booking_id: bookingId,
          notification_type: `email_${newStatus}`,
          recipient: customerEmail,
          status: "sent",
        });
      } catch (emailError: any) {
        console.error("Email sending error:", emailError);
        results.email.error = emailError.message;

        await supabase.from("notification_logs").insert({
          booking_id: bookingId,
          notification_type: `email_${newStatus}`,
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
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
