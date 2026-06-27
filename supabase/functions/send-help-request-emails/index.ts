const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  const FROM       = Deno.env.get("FROM_EMAIL")     ?? "Matric2Campus <team@matric2campus.co.za>";
  const ADMIN_EMAIL= Deno.env.get("ADMIN_EMAIL")    ?? "support@matric2campus.co.za";
  const APP_URL    = Deno.env.get("APP_URL")         ?? "https://matric2campus.co.za";

  if (!RESEND_KEY) {
    return new Response(
      JSON.stringify({ success: true, warning: "RESEND_API_KEY not configured" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let step = "init";
  try {
    step = "parse_body";
    const { studentEmail, studentName, studentPhone, courses, reference, price } = await req.json();

    if (!studentEmail || !studentName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: studentEmail, studentName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const year         = new Date().getFullYear();
    const courseList   = (courses || []) as { title: string; institution: string }[];
    const courseCount  = courseList.length;

    // ── Student confirmation email ────────────────────────────────────────────
    step = "build_student_html";
    const courseListHtml = courseCount > 0
      ? courseList.map((c, i) =>
          `<tr><td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;">${i+1}. <strong>${c.title}</strong>${c.institution ? ` — <span style="color:#64748b;">${c.institution}</span>` : ""}</td></tr>`
        ).join("")
      : `<tr><td style="padding:10px 16px;font-size:14px;color:#64748b;font-style:italic;">No specific courses listed</td></tr>`;

    const studentHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Application Help Request</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="display:none;">We've received your application help request and will be in touch soon.&nbsp;&zwnj;</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <tr><td style="background:#09090b;border-radius:20px 20px 0 0;padding:28px 40px;text-align:center;">
          <p style="margin:0;font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.03em;">Matric<span style="color:#FF7A18;">2</span>Campus</p>
          <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.1em;">Application Help</p>
        </td></tr>
        <tr><td style="height:3px;background:#FF7A18;"></td></tr>

        <tr><td style="background:#fff;padding:36px 40px;">
          <p style="margin:0 0 20px;font-size:20px;font-weight:800;color:#09090b;">Request received, ${studentName.split(" ")[0]}.</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
            We've got your application help request. Our team will review your details and get in touch with you personally within <strong style="color:#09090b;">24–48 hours</strong>.
          </p>

          <p style="margin:0 0 10px;font-size:11px;font-weight:800;color:#09090b;text-transform:uppercase;letter-spacing:0.1em;">Your Reference</p>
          <div style="background:#fff7ed;border:2px solid #fed7aa;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0;font-size:20px;font-weight:900;color:#FF7A18;font-family:'Courier New',monospace;">${reference || "N/A"}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#9a3412;">Keep this — you'll need it if you contact us</p>
          </div>

          ${courseCount > 0 ? `
          <p style="margin:0 0 10px;font-size:11px;font-weight:800;color:#09090b;text-transform:uppercase;letter-spacing:0.1em;">Courses Requested (${courseCount})</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
            <tbody>${courseListHtml}</tbody>
          </table>` : ""}

          <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.7;">
            In the meantime, make sure your profile on Matric2Campus is up to date — our team will use it to process your applications.
          </p>

          <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
            <tr><td style="background:#FF7A18;border-radius:12px;text-align:center;">
              <a href="${APP_URL}/dashboard" style="display:block;padding:14px 32px;font-size:15px;font-weight:800;color:#fff;text-decoration:none;">Go to Dashboard →</a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;">
            Questions? Reply to this email or contact us at <a href="mailto:support@matric2campus.co.za" style="color:#FF7A18;">support@matric2campus.co.za</a>
          </p>
        </td></tr>

        <tr><td style="height:3px;background:#FF7A18;"></td></tr>
        <tr><td style="background:#09090b;border-radius:0 0 20px 20px;padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.3);">&copy; ${year} Matric2Campus. Built for South African learners.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

    // ── Admin notification email ───────────────────────────────────────────────
    step = "build_admin_html";
    const adminHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>New Help Request</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="background:#09090b;border-radius:16px 16px 0 0;padding:24px 36px;">
          <p style="margin:0;font-size:18px;font-weight:800;color:#FF7A18;">🔔 New Application Help Request</p>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.4);">${new Date().toLocaleString("en-ZA")}</p>
        </td></tr>
        <tr><td style="background:#fff;padding:32px 36px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
            <tr><td style="background:#f8fafc;padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Student</td></tr>
            <tr><td style="padding:12px 16px;font-size:15px;font-weight:700;color:#09090b;">${studentName}</td></tr>
            <tr><td style="padding:4px 16px 12px;font-size:14px;color:#475569;">${studentEmail}</td></tr>
            ${studentPhone ? `<tr><td style="padding:4px 16px 12px;font-size:14px;color:#475569;">${studentPhone}</td></tr>` : ""}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
            <tr><td style="background:#f8fafc;padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Payment</td></tr>
            <tr><td style="padding:12px 16px;"><span style="font-size:22px;font-weight:900;color:#16a34a;">R${price ?? 250}</span> <span style="font-size:13px;color:#64748b;">— EFT (verify on bank statement)</span></td></tr>
            <tr><td style="padding:4px 16px 12px;font-size:13px;color:#64748b;font-family:'Courier New',monospace;">Ref: ${reference || "N/A"}</td></tr>
          </table>

          ${courseCount > 0 ? `
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#09090b;text-transform:uppercase;letter-spacing:0.05em;">Courses (${courseCount})</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
            <tbody>
              ${courseList.map((c, i) =>
                `<tr><td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;">${i+1}. <strong>${c.title}</strong>${c.institution ? ` — ${c.institution}` : ""}</td></tr>`
              ).join("")}
            </tbody>
          </table>` : ""}

          <a href="${APP_URL}/admin" style="display:inline-block;background:#09090b;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">Open Admin Dashboard →</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    // ── Send both emails ──────────────────────────────────────────────────────
    step = "send_emails";
    const [studentRes, adminRes] = await Promise.all([
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from: FROM,
          to: studentEmail,
          subject: `Request received, ${studentName.split(" ")[0]}. We'll be in touch.`,
          html: studentHtml,
        }),
      }),
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from: FROM,
          to: ADMIN_EMAIL,
          subject: `New help request from ${studentName} — ${courseCount} course${courseCount !== 1 ? "s" : ""}`,
          html: adminHtml,
        }),
      }),
    ]);

    step = "parse_responses";
    const [studentBody, adminBody] = await Promise.all([studentRes.json(), adminRes.json()]);

    const errors: string[] = [];
    if (!studentRes.ok) errors.push(`student: ${JSON.stringify(studentBody)}`);
    if (!adminRes.ok)   errors.push(`admin: ${JSON.stringify(adminBody)}`);

    if (errors.length) {
      console.error("Email errors:", errors);
      return new Response(JSON.stringify({ error: errors.join("; "), step }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, studentId: studentBody.id, adminId: adminBody.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error(`send-help-request-emails error at ${step}:`, err);
    return new Response(JSON.stringify({ error: String(err), step }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
