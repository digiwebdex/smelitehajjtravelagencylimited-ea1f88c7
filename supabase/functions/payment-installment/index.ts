import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SSLCommerzCredentials {
  store_id: string;
  store_password: string;
  test_store_id?: string;
  test_store_password?: string;
}

interface InitiateInstallmentPaymentRequest {
  installmentId: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("payment-installment function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    // Handle IPN callback (POST from SSLCommerz)
    if (action === "ipn" || req.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
      return await handleIPN(req, supabase);
    }

    const body = await req.json();

    if (body.action === "initiate") {
      return await initiatePayment(body, supabase);
    }

    if (body.action === "mark_paid") {
      return await markAsPaid(body, supabase);
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in payment-installment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

async function getSSLCommerzConfig(supabase: any) {
  const { data: paymentMethod, error } = await supabase
    .from("payment_methods")
    .select("credentials, is_live_mode")
    .eq("slug", "sslcommerz")
    .single();

  if (error || !paymentMethod) {
    throw new Error("SSLCommerz payment method not configured");
  }

  const credentials = paymentMethod.credentials as SSLCommerzCredentials;
  const isLive = paymentMethod.is_live_mode;

  const storeId = isLive ? credentials.store_id : (credentials.test_store_id || credentials.store_id);
  const storePassword = isLive ? credentials.store_password : (credentials.test_store_password || credentials.store_password);

  if (!storeId || !storePassword) {
    throw new Error("SSLCommerz credentials not configured");
  }

  return {
    storeId,
    storePassword,
    apiUrl: isLive 
      ? "https://securepay.sslcommerz.com" 
      : "https://sandbox.sslcommerz.com",
    isLive,
  };
}

async function initiatePayment(body: InitiateInstallmentPaymentRequest, supabase: any): Promise<Response> {
  console.log("Initiating installment payment for:", body.installmentId);

  const config = await getSSLCommerzConfig(supabase);

  // Fetch installment details with EMI payment and booking info
  const { data: installment, error: installmentError } = await supabase
    .from("emi_installments")
    .select("*, emi_payment:emi_payments(*, booking:bookings(*, package:packages(title)))")
    .eq("id", body.installmentId)
    .single();

  if (installmentError || !installment) {
    console.error("Installment fetch error:", installmentError);
    throw new Error("Installment not found");
  }

  const booking = installment.emi_payment?.booking;
  if (!booking) {
    throw new Error("Booking not found for this installment");
  }

  const transactionId = `INST_${installment.id.slice(0, 8)}_${Date.now()}`;

  // Prepare SSLCommerz payload
  const sslPayload = new URLSearchParams({
    store_id: config.storeId,
    store_passwd: config.storePassword,
    total_amount: installment.amount.toString(),
    currency: "BDT",
    tran_id: transactionId,
    success_url: body.successUrl,
    fail_url: body.failUrl,
    cancel_url: body.cancelUrl,
    ipn_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-installment/ipn`,
    cus_name: booking.guest_name || "Customer",
    cus_email: booking.guest_email || "customer@example.com",
    cus_phone: booking.guest_phone || "01700000000",
    cus_add1: "Bangladesh",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    shipping_method: "NO",
    product_name: `Installment #${installment.installment_number} - ${booking.package?.title || "Package Booking"}`,
    product_category: "Travel",
    product_profile: "non-physical-goods",
    value_a: installment.id, // Store installment ID for reference
    value_b: booking.id, // Store booking ID
    value_c: installment.emi_payment.id, // Store EMI payment ID
  });

  console.log("Calling SSLCommerz API for installment payment");

  const response = await fetch(`${config.apiUrl}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: sslPayload.toString(),
  });

  const result = await response.json();
  console.log("SSLCommerz response:", result);

  if (result.status === "SUCCESS") {
    // Update installment with transaction ID
    await supabase
      .from("emi_installments")
      .update({ 
        transaction_id: transactionId,
      })
      .eq("id", installment.id);

    return new Response(JSON.stringify({
      success: true,
      gatewayUrl: result.GatewayPageURL,
      sessionKey: result.sessionkey,
      transactionId,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } else {
    console.error("SSLCommerz initiation failed:", result);
    return new Response(JSON.stringify({
      success: false,
      error: result.failedreason || "Payment initiation failed",
    }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

async function handleIPN(req: Request, supabase: any): Promise<Response> {
  console.log("Processing installment payment IPN callback");

  const formData = await req.formData();
  const data: Record<string, string> = {};
  formData.forEach((value, key) => {
    data[key] = value.toString();
  });

  console.log("IPN data received:", data);

  const { 
    val_id, 
    tran_id, 
    status, 
    value_a: installmentId, 
    value_b: bookingId,
    value_c: emiPaymentId,
  } = data;

  if (!installmentId) {
    console.error("No installment ID in IPN");
    return new Response("OK", { status: 200 });
  }

  // Validate the transaction with SSLCommerz
  const config = await getSSLCommerzConfig(supabase);
  
  const validationUrl = `${config.apiUrl}/validator/api/validationserverAPI.php`;
  const validationParams = new URLSearchParams({
    val_id,
    store_id: config.storeId,
    store_passwd: config.storePassword,
    format: "json",
  });

  const validationResponse = await fetch(`${validationUrl}?${validationParams}`);
  const validationResult = await validationResponse.json();

  console.log("Validation result:", validationResult);

  const isValid = validationResult.status === "VALID" || validationResult.status === "VALIDATED";

  if (isValid) {
    // Update installment status
    await supabase
      .from("emi_installments")
      .update({
        status: "paid",
        paid_date: new Date().toISOString(),
        transaction_id: tran_id,
        payment_method: "sslcommerz",
      })
      .eq("id", installmentId);

    // Update EMI payment record
    if (emiPaymentId) {
      const { data: emiPayment } = await supabase
        .from("emi_payments")
        .select("paid_emis, remaining_amount, emi_amount")
        .eq("id", emiPaymentId)
        .single();

      if (emiPayment) {
        const { data: installment } = await supabase
          .from("emi_installments")
          .select("amount")
          .eq("id", installmentId)
          .single();

        const paidAmount = installment?.amount || emiPayment.emi_amount;

        await supabase
          .from("emi_payments")
          .update({
            paid_emis: emiPayment.paid_emis + 1,
            remaining_amount: Math.max(0, emiPayment.remaining_amount - paidAmount),
          })
          .eq("id", emiPaymentId);
      }
    }

    console.log(`Installment ${installmentId} marked as paid`);
  }

  // Log the payment notification
  await supabase.from("notification_logs").insert({
    booking_id: bookingId || null,
    notification_type: "installment_payment",
    recipient: "sslcommerz",
    status: isValid ? "sent" : "failed",
    error_message: !isValid ? `Payment ${status}` : null,
  });

  return new Response("OK", { status: 200, headers: corsHeaders });
}

async function markAsPaid(body: { installmentId: string; paymentMethod: string; transactionId?: string }, supabase: any): Promise<Response> {
  console.log("Marking installment as paid (cash):", body.installmentId);

  // Get installment and EMI payment info
  const { data: installment, error } = await supabase
    .from("emi_installments")
    .select("*, emi_payment:emi_payments(*)")
    .eq("id", body.installmentId)
    .single();

  if (error || !installment) {
    return new Response(JSON.stringify({ success: false, error: "Installment not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Update installment status
  await supabase
    .from("emi_installments")
    .update({
      status: "paid",
      paid_date: new Date().toISOString(),
      payment_method: body.paymentMethod,
      transaction_id: body.transactionId || `CASH_${body.installmentId.slice(0, 8)}`,
    })
    .eq("id", body.installmentId);

  // Update EMI payment record
  const emiPayment = installment.emi_payment;
  if (emiPayment) {
    await supabase
      .from("emi_payments")
      .update({
        paid_emis: emiPayment.paid_emis + 1,
        remaining_amount: Math.max(0, emiPayment.remaining_amount - installment.amount),
      })
      .eq("id", emiPayment.id);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(handler);
