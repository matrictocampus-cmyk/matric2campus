import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTEREST_KEYWORDS: Record<string, string[]> = {
  tech:        ["information technology", "computer science", "ict", "software", "computing", "data", "tech"],
  health:      ["health sciences", "nursing", "medical", "healthcare", "pharmacy", "dentistry", "biomedical"],
  business:    ["business", "commerce", "management", "finance", "accounting", "economics", "supply chain"],
  engineering: ["engineering", "mechanical", "civil", "electrical", "chemical", "industrial", "mechatronics"],
  arts:        ["arts", "design", "creative", "fine arts", "visual arts", "architecture", "fashion"],
  sciences:    ["natural sciences", "science", "physics", "chemistry", "biology", "biochemistry", "environmental"],
  social:      ["education", "social sciences", "social work", "psychology", "sociology", "development"],
  law:         ["law", "legal studies", "criminology", "policing", "human rights"],
  agriculture: ["agriculture", "horticulture", "food technology", "conservation", "veterinary"],
  media:       ["media", "communications", "journalism", "public relations", "broadcast", "film"],
};

interface Course {
  title: string;
  category: string;
  duration: string;
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

  // Check key first — fail fast before any DB work
  const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!RESEND_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return new Response(
      JSON.stringify({ success: true, warning: "RESEND_API_KEY not configured" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const APP_URL = Deno.env.get("APP_URL")    ?? "https://matric2campus.co.za";
  const FROM    = Deno.env.get("FROM_EMAIL") ?? "Matric2Campus <team@matric2campus.co.za>";

  let step = "init";
  try {
    step = "parse_body";
    const payload: Payload = await req.json();

    step = "extract_fields";
    const {
      name, email, password,
      personalityType, personalityEmoji, personalityTagline, personalitySummary,
      interests = [], aps,
    } = payload;

    step = "build_keywords";
    const keywords = [...new Set(
      interests.flatMap((i: string) => INTEREST_KEYWORDS[i] ?? [])
    )];

    step = "query_courses";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let courses: Course[] = [];
    if (keywords.length > 0) {
      const orFilter = keywords.slice(0, 8).map((k: string) => `category.ilike.%${k}%`).join(",");
      const { data } = await supabase
        .from("institution_courses")
        .select("title, category, duration")
        .or(orFilter)
        .limit(4);
      courses = (data ?? []) as Course[];
    }
    if (courses.length === 0) {
      const { data } = await supabase
        .from("institution_courses")
        .select("title, category, duration")
        .limit(4);
      courses = (data ?? []) as Course[];
    }

    step = "build_html";
    const html = buildEmail({ name, email, password, personalityType, personalityEmoji, personalityTagline, personalitySummary, aps, courses, appUrl: APP_URL });

    step = "call_resend";
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: email,
        subject: `${name}, your Matric2Campus roadmap is ready`,
        html,
      }),
    });

    step = "parse_resend_response";
    const resendBody = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", JSON.stringify(resendBody));
      return new Response(JSON.stringify({ error: resendBody, step }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendBody.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error(`send-welcome-email crashed at step "${step}":`, err);
    return new Response(JSON.stringify({ error: String(err), step }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── HTML email ───────────────────────────────────────────────────────────────

function esc(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

function buildEmail(d: {
  name: string; email: string; password: string;
  personalityType: string; personalityEmoji: string;
  personalityTagline: string; personalitySummary: string;
  aps?: number | null; courses: Course[]; appUrl: string;
}): string {
  const { name, email, password, personalityType, personalityEmoji, personalityTagline, personalitySummary, aps, courses, appUrl } = d;
  const year = new Date().getFullYear();

  const courseRows = courses.length > 0
    ? courses.map((c, i) => `
      <tr>
        <td style="padding:${i === 0 ? "0" : "14px"} 0 14px;border-bottom:1px solid #f1f5f9;">
          <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#0f172a;line-height:1.3;">${esc(c.title)}</p>
          <p style="margin:0;font-size:13px;color:#64748b;">
            ${esc(c.category)}${c.duration ? ` &nbsp;&middot;&nbsp; ${esc(c.duration)}` : ""}
          </p>
        </td>
      </tr>`).join("")
    : `<tr><td style="padding:20px 0;text-align:center;">
        <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6;">
          Log in to see your personalised course matches${aps ? ` based on your APS of <strong>${aps}</strong>` : ""}.
        </p>
       </td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Welcome to Matric2Campus</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *{box-sizing:border-box}body{margin:0;padding:0;background:#f1f5f9;-webkit-font-smoothing:antialiased}
    @media(max-width:600px){.wrap{padding:12px!important}.card{padding:28px 22px!important}.hdr{padding:24px 22px!important}.ftr{padding:22px!important}}
  </style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

  <div style="display:none;max-height:0;overflow:hidden;">You're a ${esc(personalityType)} — your roadmap is live. Login details inside.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" class="wrap" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

        <!-- Header -->
        <tr>
          <td class="hdr" style="background:#04040A;border-radius:20px 20px 0 0;padding:32px 44px;text-align:center;">
            <p style="margin:0 0 4px;font-size:26px;font-weight:900;letter-spacing:-0.03em;color:#fff;">Matric<span style="color:#6366f1;">2</span>Campus</p>
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">Your student roadmap platform</p>
          </td>
        </tr>
        <tr><td style="height:3px;background:linear-gradient(90deg,#6366f1,#818cf8);"></td></tr>

        <!-- Card -->
        <tr>
          <td class="card" style="background:#fff;padding:44px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

            <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.02em;line-height:1.2;">Hi ${esc(name)}, welcome.</p>
            <p style="margin:0 0 36px;font-size:16px;color:#475569;line-height:1.7;">Your account is ready and your personalised roadmap has been generated. Everything you need is below.</p>

            <!-- Personality -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
              <tr>
                <td style="background:linear-gradient(135deg,#eef2ff,#f5f3ff);border:2px solid #c7d2fe;border-radius:16px;padding:28px 32px;text-align:center;">
                  <p style="margin:0 0 10px;font-size:46px;line-height:1;">${esc(personalityEmoji)}</p>
                  <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.1em;">Your Personality Type</p>
                  <p style="margin:0 0 6px;font-size:22px;font-weight:900;color:#312e81;">You're a ${esc(personalityType)}</p>
                  <p style="margin:0;font-size:14px;color:#6366f1;font-style:italic;">&ldquo;${esc(personalityTagline)}&rdquo;</p>
                </td>
              </tr>
            </table>

            <!-- Login details -->
            <p style="margin:0 0 12px;font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.1em;">Your Login Details</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:14px;margin-bottom:14px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.09em;">Email Address</p>
                  <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#0f172a;word-break:break-all;">${esc(email)}</p>
                  <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.09em;">Password</p>
                  <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#0f172a;font-family:'Courier New',monospace;">${esc(password)}</p>
                  <p style="margin:0;font-size:12px;color:#64748b;line-height:1.55;">You can change your password at any time from settings after signing in.</p>
                </td>
              </tr>
            </table>

            <!-- Star notice -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:30px;">
              <tr>
                <td style="background:#fffbeb;border:2px solid #fde68a;border-radius:12px;padding:14px 18px;">
                  <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#78350f;">Star this email now</p>
                  <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">Your login details are here. Star it so you can always find them quickly.</p>
                </td>
              </tr>
            </table>

            <!-- Sign in button -->
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:36px;">
              <tr>
                <td style="border-radius:13px;background:linear-gradient(135deg,#6366f1,#818cf8);box-shadow:0 4px 24px rgba(99,102,241,0.4);text-align:center;">
                  <a href="${appUrl}" style="display:block;padding:16px 40px;font-size:16px;font-weight:800;color:#fff;text-decoration:none;border-radius:13px;font-family:Inter,-apple-system,sans-serif;">
                    Sign In to Matric2Campus &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;"><tr><td style="height:1px;background:#e2e8f0;"></td></tr></table>

            <!-- About you -->
            <p style="margin:0 0 14px;font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.1em;">About You</p>
            <p style="margin:0 0 36px;font-size:15px;color:#334155;line-height:1.85;">${esc(personalitySummary)}</p>

            ${aps != null ? `
            <!-- APS -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
              <tr>
                <td style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:14px;padding:22px 28px;">
                  <p style="margin:0 0 4px;font-size:10px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.1em;">Your APS Score</p>
                  <p style="margin:0 0 8px;font-size:42px;font-weight:900;color:#14532d;line-height:1;">${aps}</p>
                  <p style="margin:0;font-size:13px;color:#16a34a;line-height:1.6;">Log in to see all courses your APS qualifies you for. Life Orientation excluded from calculation.</p>
                </td>
              </tr>
            </table>` : ""}

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;"><tr><td style="height:1px;background:#e2e8f0;"></td></tr></table>

            <!-- Courses -->
            <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.1em;">Courses Aligned With Your Interests</p>
            <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.65;">Based on your profile, these programmes could be a strong match. Log in to check eligibility status and full entry requirements.</p>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">${courseRows}</table>

            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
              <tr>
                <td style="border-radius:13px;border:2px solid #6366f1;text-align:center;">
                  <a href="${appUrl}/eligibility" style="display:block;padding:14px 36px;font-size:15px;font-weight:800;color:#6366f1;text-decoration:none;border-radius:11px;font-family:Inter,-apple-system,sans-serif;">
                    See All My Matched Courses &rarr;
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <tr><td style="height:3px;background:linear-gradient(90deg,#818cf8,#6366f1);"></td></tr>

        <!-- Footer -->
        <tr>
          <td class="ftr" style="background:#04040A;border-radius:0 0 20px 20px;padding:28px 44px;text-align:center;">
            <p style="margin:0 0 6px;font-size:16px;font-weight:900;color:#fff;">Matric<span style="color:#6366f1;">2</span>Campus</p>
            <p style="margin:0 0 14px;font-size:12px;color:rgba(255,255,255,0.3);">Built for South African learners &middot; Free, always.</p>
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.18);line-height:1.7;">
              You received this because you created an account at Matric2Campus.<br/>
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
}
