import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pctToLevel(pct) {
  const p = Number(pct);
  if (p >= 80) return 7;
  if (p >= 70) return 6;
  if (p >= 60) return 5;
  if (p >= 50) return 4;
  if (p >= 40) return 3;
  if (p >= 30) return 2;
  return 1;
}

function calcAPS(subjectsMarks) {
  if (!subjectsMarks || typeof subjectsMarks !== "object") return 0;
  return Object.entries(subjectsMarks).reduce((sum, [subj, mark]) => {
    if (subj.toLowerCase().includes("life orientation")) return sum;
    return sum + pctToLevel(mark);
  }, 0);
}

// Map career interest IDs to keywords for matching institution_courses.category
const INTEREST_KEYWORDS = {
  tech:        ["tech", "computer", "software", "information", "digital", "data", "it"],
  health:      ["health", "medical", "nursing", "pharmacy", "medicine", "clinical", "biomedical"],
  business:    ["business", "commerce", "finance", "accounting", "management", "marketing", "economics"],
  engineering: ["engineering", "civil", "mechanical", "electrical", "chemical", "industrial"],
  arts:        ["art", "design", "music", "drama", "visual", "creative", "architecture"],
  sciences:    ["science", "biology", "chemistry", "physics", "natural", "environmental"],
  social:      ["social", "education", "teaching", "psychology", "welfare", "development"],
  law:         ["law", "legal", "justice", "criminology", "policing"],
  agriculture: ["agriculture", "agri", "farming", "food", "environmental"],
  media:       ["media", "communication", "journalism", "broadcasting", "public relations"],
};

function interestsMatchCategory(interests = [], category = "") {
  const cat = category.toLowerCase();
  return interests.some(id => (INTEREST_KEYWORDS[id] || []).some(kw => cat.includes(kw)));
}

const INTEREST_LABELS = {
  tech: "Technology", health: "Health & Medicine", business: "Business & Finance",
  engineering: "Engineering", arts: "Arts & Design", sciences: "Natural Sciences",
  social: "Education & Social Work", law: "Law & Justice",
  agriculture: "Agriculture", media: "Media & Comms",
};

const PERSONALITY_STYLE = {
  "Innovator":     "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Builder":       "bg-amber-50  text-amber-700  border-amber-200",
  "Healer":        "bg-green-50  text-green-700  border-green-200",
  "Analyst":       "bg-blue-50   text-blue-700   border-blue-200",
  "Strategist":    "bg-purple-50 text-purple-700 border-purple-200",
  "Creator":       "bg-pink-50   text-pink-700   border-pink-200",
  "People Person": "bg-teal-50   text-teal-700   border-teal-200",
  "Advocate":      "bg-slate-50  text-slate-700  border-slate-200",
  "Steward":       "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Storyteller":   "bg-orange-50 text-orange-700 border-orange-200",
  "Explorer":      "bg-sky-50    text-sky-700    border-sky-200",
};

const TERM_REMINDER = {
  1: "You entered Term 1 results. Come back after each term to keep your recommendations sharp.",
  2: "You're halfway through the year. Update these with your Term 3 and Term 4 marks as they come in.",
  3: "One term to go. Come back after Term 4 to lock in your final recommendations.",
};

const BUNDLE_STATUS = {
  pending_documents: { label: "Pending Documents", color: "bg-amber-100 text-amber-700" },
  in_progress:       { label: "In Progress",        color: "bg-blue-100 text-blue-700"   },
  submitted:         { label: "Submitted",           color: "bg-purple-100 text-purple-700"},
  action_required:   { label: "Action Required",     color: "bg-red-100 text-red-700"     },
  completed:         { label: "Completed",           color: "bg-green-100 text-green-700" },
  rejected:          { label: "Rejected",            color: "bg-gray-100 text-gray-500"   },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/"); return; }

        const [
          { data: profile },
          { data: onboarding },
          { data: courses },
          { data: bundle },
          { data: bucket },
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("onboarding_responses").select("personality_summary, results_term, financial_concern, dream_university, support_needed").eq("user_id", user.id).maybeSingle(),
          supabase.from("institution_courses").select("id, title, category, duration, entry_requirements, programme_type").limit(50),
          supabase.from("application_bundles").select("id, bundle_ref, status, created_at").eq("user_id", user.id).not("status", "in", '("completed","rejected")').maybeSingle(),
          supabase.from("application_bucket").select("id").eq("user_id", user.id).is("package_id", null),
        ]);

        let activeApps = [];
        if (bundle?.id) {
          const { data: apps } = await supabase
            .from("applications")
            .select("id, course_title, institution_name, status")
            .eq("bundle_id", bundle.id);
          activeApps = apps || [];
        }

        setData({ profile, onboarding, courses: courses || [], bundle, bucketCount: bucket?.length || 0, activeApps });
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4 animate-pulse">
        <div className="h-24 bg-gray-100 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="h-16 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  const { profile, onboarding, courses, bundle, bucketCount, activeApps } = data || {};

  const firstName      = profile?.first_name || "there";
  const hour           = new Date().getHours();
  const greeting       = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const aps            = calcAPS(profile?.subjects_marks);
  const subjectCount   = Object.keys(profile?.subjects_marks || {}).length;
  const interests      = profile?.career_interests || [];
  const personality    = profile?.personality_type || null;
  const grade          = profile?.grade || null;
  const province       = profile?.province || null;
  const resultsTerm    = onboarding?.results_term || null;
  const hasOnboarding  = !!(profile?.onboarding_completed);
  const personalityStyle = PERSONALITY_STYLE[personality] || "bg-gray-50 text-gray-600 border-gray-200";

  // Matched courses: filter by career interest keywords + APS if available
  const matchedCourses = courses
    .filter(c => interestsMatchCategory(interests, c.category || c.title || ""))
    .filter(c => {
      const minAps = c.entry_requirements?.min_aps || c.entry_requirements?.aps || 0;
      return aps === 0 || !minAps || aps >= minAps;
    })
    .slice(0, 6);

  const showTermReminder = hasOnboarding && resultsTerm && resultsTerm < 4 && subjectCount > 0;
  const needsOnboarding  = !hasOnboarding;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {greeting}, {firstName}
          </h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {personality && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${personalityStyle}`}>
                {personality}
              </span>
            )}
            {grade && <span className="text-xs text-gray-400">{grade}</span>}
            {province && <span className="text-xs text-gray-400">· {province}</span>}
          </div>
        </div>
        {aps > 0 && (
          <div className="text-center bg-gray-900 text-white rounded-xl px-5 py-3 min-w-[72px]">
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">APS</p>
            <p className="text-3xl font-extrabold leading-none">{aps}</p>
          </div>
        )}
      </div>

      {/* ── No onboarding → single CTA ────────────────────────────────────── */}
      {needsOnboarding && (
        <div className="bg-gray-950 text-white rounded-2xl p-6 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-base">Complete your quiz first</p>
            <p className="text-sm text-white/60 mt-1">
              Takes 3 minutes. We'll build your personalised roadmap from your answers.
            </p>
          </div>
          <button
            onClick={() => navigate("/onboarding")}
            className="flex-shrink-0 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Start quiz
          </button>
        </div>
      )}

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      {hasOnboarding && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">APS</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{aps || "—"}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">out of ~42</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Subjects</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{subjectCount || "—"}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">recorded</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Interests</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{interests.length || "—"}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">selected</p>
          </div>
        </div>
      )}

      {/* ── Term reminder ──────────────────────────────────────────────────── */}
      {showTermReminder && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
          <p className="text-sm text-amber-800 leading-relaxed">
            <span className="font-semibold">Term {resultsTerm} results saved.</span>{" "}
            {TERM_REMINDER[resultsTerm]}
          </p>
        </div>
      )}

      {/* ── Active application ─────────────────────────────────────────────── */}
      {bundle && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">
              Application #{bundle.bundle_ref || bundle.id.slice(0, 8)}
            </p>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${BUNDLE_STATUS[bundle.status]?.color || "bg-gray-100 text-gray-600"}`}>
              {BUNDLE_STATUS[bundle.status]?.label || bundle.status}
            </span>
          </div>
          {activeApps.length > 0 && (
            <div className="space-y-1.5">
              {activeApps.map(app => (
                <div key={app.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{app.course_title}</p>
                    <p className="text-xs text-gray-400">{app.institution_name}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 capitalize">
                    {(app.status || "pending").replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate("/apply")}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            View application details →
          </button>
        </div>
      )}

      {/* ── Bucket ready ───────────────────────────────────────────────────── */}
      {!bundle && bucketCount > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4 shadow-sm">
          <div>
            <p className="font-semibold text-gray-900">
              {bucketCount} course{bucketCount !== 1 ? "s" : ""} saved
            </p>
            <p className="text-sm text-gray-500 mt-0.5">Ready to apply. Select a package and submit.</p>
          </div>
          <button
            onClick={() => navigate("/apply")}
            className="flex-shrink-0 bg-gray-900 hover:bg-gray-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Apply now
          </button>
        </div>
      )}

      {/* ── Recommended courses ────────────────────────────────────────────── */}
      {hasOnboarding && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900">Recommended for you</p>
            <button
              onClick={() => navigate("/eligibility")}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
            >
              Browse all →
            </button>
          </div>

          {/* Interest tags */}
          {interests.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {interests.map(id => (
                <span key={id} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                  {INTEREST_LABELS[id] || id}
                </span>
              ))}
            </div>
          )}

          {matchedCourses.length > 0 ? (
            <div className="space-y-2">
              {matchedCourses.map(course => {
                const minAps = course.entry_requirements?.min_aps || course.entry_requirements?.aps;
                const eligible = !minAps || aps === 0 || aps >= minAps;
                return (
                  <div key={course.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 shadow-sm hover:border-gray-300 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{course.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {course.category && (
                          <span className="text-[11px] text-gray-400">{course.category}</span>
                        )}
                        {course.duration && (
                          <span className="text-[11px] text-gray-400">· {course.duration}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {minAps && (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${eligible ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                          APS {minAps}+
                        </span>
                      )}
                      <button
                        onClick={() => navigate("/eligibility")}
                        className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 whitespace-nowrap"
                      >
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-sm font-semibold text-gray-700">Find courses you qualify for</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">
                Browse programmes matched to your APS of {aps > 0 ? aps : "…"} and your interests.
              </p>
              <button
                onClick={() => navigate("/eligibility")}
                className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
              >
                Browse eligible courses
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Need help ──────────────────────────────────────────────────────── */}
      {hasOnboarding && !bundle && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/institutions")}
            className="bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-gray-300 transition-colors shadow-sm group"
          >
            <p className="text-sm font-semibold text-gray-900">Browse institutions</p>
            <p className="text-xs text-gray-400 mt-0.5 group-hover:text-gray-500">Universities, colleges, TVET</p>
          </button>
          <button
            onClick={() => navigate("/eligibility")}
            className="bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-gray-300 transition-colors shadow-sm group"
          >
            <p className="text-sm font-semibold text-gray-900">Check eligibility</p>
            <p className="text-xs text-gray-400 mt-0.5 group-hover:text-gray-500">See every course you qualify for</p>
          </button>
        </div>
      )}

    </div>
  );
}
