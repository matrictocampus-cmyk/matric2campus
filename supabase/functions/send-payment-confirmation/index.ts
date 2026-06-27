import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!RESEND_KEY) {
    console.warn("RESEND_API_KEY not set — skipping payment confirmation email");
    return new Response(
      JSON.stringify({ success: true, warning: "RESEND_API_KEY not configured" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const FROM    = Deno.env.get("FROM_EMAIL") ?? "Matric2Campus <onboarding@resend.dev>";
  const APP_URL = Deno.env.get("APP_URL")    ?? "https://matric2campus.co.za";

  try {
    const { email, name, amount, package: pkg, reference } = await req.json();

    if (!email || !name || !amount || !pkg) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, name, amount, package" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const year = new Date().getFullYear();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Payment Confirmed</title>
  <style>
    *{box-sizing:border-box}body{margin:0;padding:0;background:#f1f5f9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
    @media(max-width:600px){.wrap{padding:12px!important}.card{padding:28px 22px!important}}
  </style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">

  <div style="display:none;max-height:0;overflow:hidden;">Your payment is confirmed. Your application package is now active.&nbsp;&zwnj;&nbsp;</div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" class="wrap" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#04040A;border-radius:20px 20px 0 0;padding:32px 44px;text-align:center;">
            <p style="margin:0 0 4px;font-size:26px;font-weight:900;letter-spacing:-0.03em;color:#fff;">Matric<span style="color:#6366f1;">2</span>Campus</p>
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">Your student roadmap platform</p>
          </td>
        </tr>
        <tr><td style="height:3px;background:linear-gradient(90deg,#6366f1,#818cf8);"></td></tr>

        <!-- Card -->
        <tr>
          <td class="card" style="background:#fff;padding:44px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

            <!-- Success badge -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
              <tr>
                <td style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:16px;padding:24px 32px;text-align:center;">
                  <p style="margin:0 0 8px;font-size:36px;line-height:1;">&#10003;</p>
                  <p style="margin:0 0 4px;font-size:20px;font-weight:900;color:#14532d;">Payment Confirmed</p>
                  <p style="margin:0;font-size:14px;color:#16a34a;">Your application package is now active.</p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 28px;font-size:16px;color:#475569;line-height:1.7;">Hi ${name}, your payment has gone through successfully. Here is a summary of what you have activated.</p>

            <!-- Payment details -->
            <p style="margin:0 0 12px;font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.1em;">Payment Summary</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:14px;margin-bottom:32px;">
              <tr>
                <td style="padding:24px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding-bottom:14px;border-bottom:1px solid #e2e8f0;">
                        <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.09em;">Package</p>
                        <p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${pkg}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top:14px;${reference ? "padding-bottom:14px;border-bottom:1px solid #e2e8f0;" : ""}">
                        <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.09em;">Amount Paid</p>
                        <p style="margin:0;font-size:22px;font-weight:900;color:#059669;">R${amount}</p>
                      </td>
                    </tr>
                    ${reference ? `<tr><td style="padding-top:14px;"><p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.09em;">Reference</p><p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;font-family:'Courier New',monospace;">${reference}</p></td></tr>` : ""}
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:32px;">
              <tr>
                <td style="border-radius:13px;background:linear-gradient(135deg,#6366f1,#818cf8);box-shadow:0 4px 24px rgba(99,102,241,0.4);text-align:center;">
                  <a href="${APP_URL}/apply" style="display:block;padding:16px 40px;font-size:16px;font-weight:800;color:#fff;text-decoration:none;border-radius:13px;font-family:Inter,-apple-system,sans-serif;">
                    Start Your Applications &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.7;text-align:center;">
              Questions? Email us at <a href="mailto:support@matric2campus.co.za" style="color:#6366f1;">support@matric2campus.co.za</a>
            </p>

          </td>
        </tr>

        <tr><td style="height:3px;background:linear-gradient(90deg,#818cf8,#6366f1);"></td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#04040A;border-radius:0 0 20px 20px;padding:28px 44px;text-align:center;">
            <p style="margin:0 0 6px;font-size:16px;font-weight:900;color:#fff;">Matric<span style="color:#6366f1;">2</span>Campus</p>
            <p style="margin:0 0 14px;font-size:12px;color:rgba(255,255,255,0.3);">Built for South African learners &middot; Free, always.</p>
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.18);line-height:1.7;">
              You received this because you made a payment at Matric2Campus.<br/>
              Not you? <a href="mailto:support@matric2campus.co.za" style="color:rgba(255,255,255,0.35);">support@matric2campus.co.za</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 0 6px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; ${year} Matric2Campus. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: email,
        subject: `Payment confirmed, ${name}. Your application package is active.`,
        html,
      }),
    });

    const resendBody = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", JSON.stringify(resendBody));
      return new Response(JSON.stringify({ error: resendBody }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Non-fatal log
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("email_logs").insert({
        recipient: email,
        subject: "Payment Confirmed",
        sent_at: new Date().toISOString(),
      });
    } catch (_) { /* table may not exist — non-fatal */ }

    return new Response(JSON.stringify({ success: true, id: resendBody.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("send-payment-confirmation error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
