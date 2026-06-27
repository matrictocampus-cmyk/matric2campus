import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL   = Deno.env.get("APP_URL")        ?? "https://matric2campus.co.za";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const INTEREST_CATEGORIES: Record<string, string[]> = {
  tech:        ["Information Technology", "Computer Science", "ICT", "Software", "Computing", "Data"],
  health:      ["Health Sciences", "Nursing", "Medical", "Healthcare", "Pharmacy", "Dentistry", "Biomedical"],
  business:    ["Business", "Commerce", "Management", "Finance", "Accounting", "Economics", "Supply Chain"],
  engineering: ["Engineering", "Mechanical", "Civil", "Electrical", "Chemical", "Industrial", "Mechatronics"],
  arts:        ["Arts", "Design", "Creative", "Fine Arts", "Visual Arts", "Architecture", "Fashion"],
  sciences:    ["Natural Sciences", "Science", "Physics", "Chemistry", "Biology", "Biochemistry", "Environmental"],
  social:      ["Education", "Social Sciences", "Social Work", "Psychology", "Sociology", "Development"],
  law:         ["Law", "Legal Studies", "Criminology", "Policing", "Human Rights"],
  agriculture: ["Agriculture", "Horticulture", "Food Technology", "Conservation", "Veterinary"],
  media:       ["Media", "Communications", "Journalism", "Public Relations", "Broadcast", "Film"],
};

interface Course {
  title: string;
  category: string;
  duration: string;
  institution_name: string;
}

interface Payload {
  name: string;
  email: string;
  password: string;
  personalityType: string;
  personalityEmoji: string;
  personalityTagline: string;
  personalitySummary: string;
  interests: string[];
  aps: number | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: Payload = await req.json();
    const {
      name, email, password,
      personalityType, personalityEmoji, personalityTagline, personalitySummary,
      interests = [], aps,
    } = payload;

    // Query matched courses with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const categories = [...new Set(
      interests.flatMap(i => INTEREST_CATEGORIES[i] ?? [])
    )].slice(0, 8);

    let courses: Course[] = [];

    if (categories.length > 0) {
      const filters = categories.map(c => `category.ilike.%${c}%`).join(",");
      const { data } = await supabase
        .from("institution_courses")
        .select("title, category, duration, institutions!inner(name)")
        .or(filters)
        .limit(4);

      courses = (data ?? []).map((r: any) => ({
        title: r.title ?? "Unnamed Course",
        category: r.category ?? "",
        duration: r.duration ?? "",
        institution_name: r.institutions?.name ?? "",
      }));
    }

    // Fallback: any courses
    if (courses.length === 0) {
      const { data } = await supabase
        .from("institution_courses")
        .select("title, category, duration, institutions!inner(name)")
        .limit(4);

      courses = (data ?? []).map((r: any) => ({
        title: r.title ?? "Unnamed Course",
        category: r.category ?? "",
        duration: r.duration ?? "",
        institution_name: r.institutions?.name ?? "",
      }));
    }

    const html = buildEmail({ name, email, password, personalityType, personalityEmoji, personalityTagline, personalitySummary, aps, courses });

    if (!RESEND_KEY) {
      console.warn("RESEND_API_KEY not set — skipping send");
      return new Response(
        JSON.stringify({ success: true, warning: "RESEND_API_KEY not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: "Matric2Campus <noreply@matric2campus.co.za>",
        to: email,
        subject: `Welcome, ${name} — your personalised roadmap is ready`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error:", errText);
      return new Response(JSON.stringify({ error: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("send-welcome-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── HTML email builder ───────────────────────────────────────────────────────

interface EmailData {
  name: string;
  email: string;
  password: string;
  personalityType: string;
  personalityEmoji: string;
  personalityTagline: string;
  personalitySummary: string;
  aps?: number | null;
  courses: Course[];
}

function esc(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function buildEmail(d: EmailData): string {
  const { name, email, password, personalityType, personalityEmoji, personalityTagline, personalitySummary, aps, courses } = d;

  const courseRows = courses.length > 0
    ? courses.map((c, i) => `
        <tr>
          <td style="padding: ${i === 0 ? "0" : "16px"} 0 16px; border-bottom: 1px solid #f1f5f9;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align: top; padding-right: 12px;">
                  <p style="margin: 0 0 3px; font-size: 15px; font-weight: 700; color: #0f172a; line-height: 1.3;">${esc(c.title)}</p>
                  <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                    ${esc(c.institution_name)}${c.duration ? ` &nbsp;·&nbsp; ${esc(c.duration)}` : ""}
                  </p>
                </td>
                ${c.category ? `
                <td style="vertical-align: top; white-space: nowrap;">
                  <span style="display: inline-block; font-size: 11px; background: #eef2ff; color: #4f46e5; padding: 4px 10px; border-radius: 20px; font-weight: 600; letter-spacing: 0.02em;">${esc(c.category)}</span>
                </td>` : ""}
              </tr>
            </table>
          </td>
        </tr>`).join("")
    : `<tr><td style="padding: 20px 0; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
          Log in to see your personalised course matches based on your interests${aps ? ` and APS score of <strong>${aps}</strong>` : ""}.
        </p>
       </td></tr>`;

  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Welcome to Matric2Campus</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #f1f5f9; -webkit-font-smoothing: antialiased; }
    img { border: 0; display: block; }
    a { text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 12px !important; }
      .card { padding: 28px 22px !important; }
      .header-cell { padding: 24px 22px !important; }
      .footer-cell { padding: 22px !important; }
      .btn-cell { display: block !important; width: 100% !important; }
      .btn-a { display: block !important; text-align: center !important; }
      .credential-row td { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f1f5f9;">
    Hi ${esc(name)}, you're a ${esc(personalityType)} — your personalised roadmap is live. Your login details are inside. ⭐ Star this email.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" class="email-wrapper" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

          <!-- ── Header ── -->
          <tr>
            <td class="header-cell" style="background:#04040A;border-radius:20px 20px 0 0;padding:32px 44px;text-align:center;">
              <p style="margin:0 0 4px;font-size:26px;font-weight:900;letter-spacing:-0.03em;color:#ffffff;">
                Matric<span style="color:#6366f1;">2</span>Campus
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">
                South Africa&apos;s student roadmap platform
              </p>
            </td>
          </tr>

          <!-- ── Indigo divider line ── -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#6366f1,#818cf8);"></td>
          </tr>

          <!-- ── Main card ── -->
          <tr>
            <td class="card" style="background:#ffffff;padding:44px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:30px;font-weight:900;color:#0f172a;letter-spacing:-0.02em;line-height:1.2;">
                Hi ${esc(name)}, welcome. 👋
              </p>
              <p style="margin:0 0 36px;font-size:16px;color:#475569;line-height:1.7;">
                Your Matric2Campus account is ready. Your personalised roadmap has been generated based on everything you told us. Here&apos;s everything you need.
              </p>

              <!-- Personality card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#eef2ff 0%,#f5f3ff 100%);border:2px solid #c7d2fe;border-radius:16px;padding:28px 32px;text-align:center;">
                    <p style="margin:0 0 10px;font-size:48px;line-height:1;">${esc(personalityEmoji)}</p>
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.1em;">Your Personality Type</p>
                    <p style="margin:0 0 6px;font-size:24px;font-weight:900;color:#312e81;letter-spacing:-0.01em;">You&apos;re a ${esc(personalityType)}</p>
                    <p style="margin:0;font-size:14px;color:#6366f1;font-style:italic;font-weight:500;">&ldquo;${esc(personalityTagline)}&rdquo;</p>
                  </td>
                </tr>
              </table>

              <!-- Section: Login Details -->
              <p style="margin:0 0 12px;font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.1em;">
                Your Login Details
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:14px;margin-bottom:14px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr class="credential-row">
                        <td style="padding:0 0 14px;border-bottom:1px solid #e9ecef;width:50%;vertical-align:top;">
                          <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.09em;">Email Address</p>
                          <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;word-break:break-all;">${esc(email)}</p>
                        </td>
                        <td style="width:16px;"></td>
                        <td style="padding:0 0 14px;border-bottom:1px solid #e9ecef;vertical-align:top;">
                          <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.09em;">Password</p>
                          <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;font-family:'Courier New',Courier,monospace;">${esc(password)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="3" style="padding-top:14px;">
                          <p style="margin:0;font-size:12px;color:#64748b;line-height:1.55;">
                            Use these details every time you sign in. You can change your password from your profile settings at any time.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Star this email notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:30px;">
                <tr>
                  <td style="background:#fffbeb;border:2px solid #fde68a;border-radius:12px;padding:16px 20px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:20px;padding-right:12px;vertical-align:top;padding-top:1px;">⭐</td>
                        <td>
                          <p style="margin:0;font-size:14px;font-weight:700;color:#78350f;margin-bottom:3px;">Star this email now</p>
                          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                            This email has your login details. Tap the star icon in your inbox so you can always find it quickly when you need to log back in.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Sign in button -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;width:100%;">
                <tr>
                  <td class="btn-cell" style="border-radius:13px;background:linear-gradient(135deg,#6366f1 0%,#818cf8 100%);box-shadow:0 4px 24px rgba(99,102,241,0.45);text-align:center;">
                    <a href="${APP_URL}" class="btn-a" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:13px;letter-spacing:0.01em;font-family:Inter,-apple-system,sans-serif;">
                      Sign In to Matric2Campus &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 40px;font-size:12px;color:#94a3b8;text-align:center;">
                Direct link: <a href="${APP_URL}" style="color:#6366f1;font-weight:600;">${APP_URL.replace(/^https?:\/\//, "")}</a>
              </p>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
                <tr>
                  <td style="height:1px;background:linear-gradient(90deg,transparent,#e2e8f0 20%,#e2e8f0 80%,transparent);"></td>
                </tr>
              </table>

              <!-- About You -->
              <p style="margin:0 0 14px;font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.1em;">
                About You
              </p>
              <p style="margin:0 0 36px;font-size:15px;color:#334155;line-height:1.85;">
                ${esc(personalitySummary)}
              </p>

              ${aps != null ? `
              <!-- APS score -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:14px;padding:22px 28px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:20px;">
                          <p style="margin:0 0 4px;font-size:10px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.1em;">Your APS Score</p>
                          <p style="margin:0;font-size:42px;font-weight:900;color:#14532d;line-height:1;letter-spacing:-0.02em;">${aps}</p>
                        </td>
                        <td style="vertical-align:middle;">
                          <p style="margin:0;font-size:13px;color:#16a34a;line-height:1.6;">
                            Based on your subject marks, Life Orientation excluded. Log in to see the full list of courses your APS qualifies you for.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>` : ""}

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                <tr>
                  <td style="height:1px;background:linear-gradient(90deg,transparent,#e2e8f0 20%,#e2e8f0 80%,transparent);"></td>
                </tr>
              </table>

              <!-- Courses -->
              <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.1em;">
                Courses Most Aligned With You
              </p>
              <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.65;">
                Based on your interests and background, these programmes could be a strong fit. Log in to see eligibility status, entry requirements, and the full matched list.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                ${courseRows}
              </table>

              <!-- See more button (outlined) -->
              <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                <tr>
                  <td class="btn-cell" style="border-radius:13px;border:2px solid #6366f1;text-align:center;">
                    <a href="${APP_URL}/eligibility" class="btn-a" style="display:inline-block;padding:15px 36px;font-size:15px;font-weight:800;color:#6366f1;text-decoration:none;border-radius:11px;font-family:Inter,-apple-system,sans-serif;letter-spacing:0.01em;">
                      See All My Matched Courses &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── Indigo divider ── -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#818cf8,#6366f1);"></td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td class="footer-cell" style="background:#04040A;border-radius:0 0 20px 20px;padding:28px 44px;text-align:center;">
              <p style="margin:0 0 6px;font-size:16px;font-weight:900;color:#ffffff;letter-spacing:-0.01em;">
                Matric<span style="color:#6366f1;">2</span>Campus
              </p>
              <p style="margin:0 0 16px;font-size:12px;color:rgba(255,255,255,0.3);line-height:1.7;">
                Built for South African learners &nbsp;&middot;&nbsp; Free, always.
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.18);line-height:1.7;">
                You received this because you created an account at Matric2Campus.<br />
                If this wasn&apos;t you, contact <a href="mailto:support@matric2campus.co.za" style="color:rgba(255,255,255,0.35);text-decoration:none;font-weight:500;">support@matric2campus.co.za</a>
              </p>
            </td>
          </tr>

          <!-- Copyright -->
          <tr>
            <td style="padding:20px 0 8px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; ${year} Matric2Campus. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
