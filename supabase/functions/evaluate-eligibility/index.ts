import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { profile, courses } = await req.json();

  function markToAPS(mark: number): number {
    if (mark >= 80) return 7;
    if (mark >= 70) return 6;
    if (mark >= 60) return 5;
    if (mark >= 50) return 4;
    if (mark >= 40) return 3;
    if (mark >= 30) return 2;
    return 1;
  }

  const manualResults = profile.manual_results || {};
  const subjectNames = Object.keys(manualResults);

  const results = courses.map((course: any) => {
    const er = course.entry_requirements || {};
    let eligibility = "ELIGIBLE";
    const reasons: string[] = [];

    const requiredAll = er?.required_subjects?.all_of || [];
    const missing = requiredAll.filter(
      (s: string) => !subjectNames.includes(s)
    );

    if (missing.length > 0) {
      eligibility = "NOT_ELIGIBLE";
      reasons.push(
        `Missing required subjects: ${missing.join(", ")}`
      );
    }

    if (
      er?.additional_requirements?.work_experience_required &&
      !profile.has_work_experience
    ) {
      eligibility = "CONDITIONAL";
      reasons.push("Work experience required.");
    }

    if (reasons.length === 0) {
      reasons.push("You meet all entry requirements.");
    }

    return {
      course: course.title,
      eligibility,
      reasons,
      notes: er?.selection_notes || null
    };
  });

  return new Response(
    JSON.stringify({
      status: "success",
      results
    }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    }
  );
});
