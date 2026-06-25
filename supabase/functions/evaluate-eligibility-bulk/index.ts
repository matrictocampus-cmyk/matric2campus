// functions/evaluate-eligibility-bulk/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// APS map for converting Step6 level strings to numeric APS
const APS_MAP: Record<string, number> = {
  "0-29%": 1,
  "30-39%": 2,
  "40-49%": 3,
  "50-59%": 4,
  "60-69%": 5,
  "70-79%": 6,
  "80-100%": 7,
};

// normalize subject names for matching
function normalizeForMatching(subj: string | null | undefined) {
  if (!subj) return subj;
  const s = subj.toLowerCase().trim();

  if (s.includes("english")) return "english";
  if (s.includes("isi") && s.includes("zulu")) return "isizulu";
  if (s.includes("xhosa")) return "xhosa";
  if (s.includes("afrikaans")) return "afrikaans";

  if (s.includes("pure mathematics") || s === "pure mathematics") return "pure mathematics";
  if (s.includes("mathematics") || s.includes("maths")) return "mathematics";
  if (s.includes("mathematics literacy") || s.includes("maths literacy")) return "mathematics literacy";

  if (s.includes("life orientation") || s === "lo") return "lo";

  return s;
}

// parse requirement like "Mathematics Level 4"
function parseSubjectRequirement(reqStr: string | null | undefined) {
  if (!reqStr) return { subject: null, requiredLevel: null };

  const levelMatch = reqStr.match(/level\s*(\d+)/i) || reqStr.match(/l\s*(\d+)/i);
  const requiredLevel = levelMatch ? parseInt(levelMatch[1], 10) : null;

  let subj = reqStr.replace(/level\s*\d+/i, "").replace(/l\s*\d+/i, "").trim();
  subj = normalizeForMatching(subj);

  return { subject: subj, requiredLevel };
}

// build subject -> APS map
function buildUserSubjectAPSMap(subjectsMarks: Record<string, string>) {
  const map: Record<string, number> = {};
  for (const [rawSubj, levelStr] of Object.entries(subjectsMarks || {})) {
    const canon = normalizeForMatching(rawSubj);
    const apsNum = APS_MAP[levelStr] || 0;
    map[canon] = apsNum;
    if (canon === "pure mathematics") map["mathematics"] = Math.max(map["mathematics"] || 0, apsNum);
  }
  return map;
}

interface ProfilePayload {
  subjects: string[];
  subjectsMarks: Record<string, string>;
  aps: number;
  has_work_experience: boolean;
  [key: string]: any;
}

interface Course {
  title: string;
  entry_requirements?: any;
  [key: string]: any;
}

function evaluateEligibility(profile: ProfilePayload, courses: Course[]) {
  const userSubjectsCanonical = (profile.subjects || []).map(normalizeForMatching);
  const userAPS = profile.aps || 0;
  const userSubjectAPSMap = buildUserSubjectAPSMap(profile.subjectsMarks || {});
  const hasWorkExp = !!profile.has_work_experience;

  const results = courses.map((course) => {
    const er = course.entry_requirements || {};
    const reasons: string[] = [];
    let eligibility: "ELIGIBLE" | "CONDITIONAL" | "NOT_ELIGIBLE" = "ELIGIBLE";

    // ALL_OF subjects
    const requiredAll: string[] = er?.required_subjects?.all_of || [];
    for (const r of requiredAll) {
      const { subject, requiredLevel } = parseSubjectRequirement(r);
      if (!subject) continue;

      const hasSubject = userSubjectsCanonical.includes(subject) || (subject === "mathematics" && userSubjectsCanonical.includes("pure mathematics"));
      const userSubAPS = userSubjectAPSMap[subject] || 0;

      if (!hasSubject) {
        eligibility = "NOT_ELIGIBLE";
        reasons.push(`Missing required subject: ${subject}`);
      } else if (requiredLevel !== null && userSubAPS < requiredLevel) {
        eligibility = "NOT_ELIGIBLE";
        reasons.push(`Required level for ${subject}: ${requiredLevel}. You have: ${userSubAPS || "N/A"}`);
      }
    }

    // ANY_OF subjects
    const requiredAny: string[] = er?.required_subjects?.any_of || [];
    if (requiredAny.length) {
      let anySatisfied = false;
      const missingReasons: string[] = [];
      for (const r of requiredAny) {
        const { subject, requiredLevel } = parseSubjectRequirement(r);
        if (!subject) continue;
        const hasSubject = userSubjectsCanonical.includes(subject) || (subject === "mathematics" && userSubjectsCanonical.includes("pure mathematics"));
        const userSubAPS = userSubjectAPSMap[subject] || 0;

        if (hasSubject && (requiredLevel === null || userSubAPS >= requiredLevel)) {
          anySatisfied = true;
          break;
        } else {
          if (!hasSubject) missingReasons.push(`missing ${subject}`);
          else missingReasons.push(`${subject} level ${userSubAPS} < required ${requiredLevel}`);
        }
      }
      if (!anySatisfied) {
        eligibility = "NOT_ELIGIBLE";
        reasons.push(`Requires one of: ${requiredAny.join(", ")}. You do not meet any (${missingReasons.join("; ")})`);
      }
    }

    // Minimum APS total
    const minAPS = (er?.minimum_requirements?.min_aps) || er?.min_aps;
    if (minAPS && userAPS < minAPS) {
      eligibility = "NOT_ELIGIBLE";
      reasons.push(`Minimum APS required: ${minAPS}. You have: ${userAPS}`);
    }

    // Minimum grades per subject
    const gradesRequired = er?.minimum_requirements?.min_grade;
    if (gradesRequired && typeof gradesRequired === "object") {
      for (const [reqSubjRaw, reqGrade] of Object.entries(gradesRequired)) {
        const reqSubj = normalizeForMatching(reqSubjRaw);
        const userAPSforSubj = userSubjectAPSMap[reqSubj] || 0;
        const reqGradeNum = Number(reqGrade);
        if (!userAPSforSubj || userAPSforSubj < reqGradeNum) {
          eligibility = "NOT_ELIGIBLE";
          reasons.push(`Minimum grade for ${reqSubjRaw}: ${reqGradeNum}. You have: ${userAPSforSubj || "N/A"}`);
        }
      }
    }

    // Work experience
    if (er?.additional_requirements?.work_experience_required && !hasWorkExp) {
      if (eligibility === "ELIGIBLE") eligibility = "CONDITIONAL";
      reasons.push("Work experience is required for this programme.");
    }

    if (!reasons.length) reasons.push("You meet all the entry requirements.");

    return {
      course: course.title,
      eligibility,
      reasons,
      notes: er?.selection_notes || null,
    };
  });

  return results;
}

serve(async (req) => {
  try {
    const body = await req.json();
    const profile: ProfilePayload = body.profile;
    const courses: Course[] = body.courses || [];

    if (!profile || !Array.isArray(courses)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
    }

    const results = evaluateEligibility(profile, courses);

    return new Response(JSON.stringify({ results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error", details: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
