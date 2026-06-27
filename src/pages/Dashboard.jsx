import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { FiArrowRight, FiZap } from "react-icons/fi";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pctToLevel(pct) {
  const p = Number(pct);
  if (p >= 80) return 7; if (p >= 70) return 6; if (p >= 60) return 5;
  if (p >= 50) return 4; if (p >= 40) return 3; if (p >= 30) return 2;
  return 1;
}

function calcAPS(subjectsMarks) {
  if (!subjectsMarks || typeof subjectsMarks !== "object") return 0;
  return Object.entries(subjectsMarks).reduce((sum, [subj, mark]) => {
    if (subj.toLowerCase().includes("life orientation")) return sum;
    return sum + pctToLevel(mark);
  }, 0);
}

const INTEREST_KEYWORDS = {
  tech:        ["tech", "computer", "software", "information", "digital", "data", "it", "cyber", "cloud"],
  health:      ["health", "medical", "nursing", "pharmacy", "medicine", "clinical", "biomedical", "occupational", "nutrition"],
  business:    ["business", "commerce", "finance", "accounting", "management", "marketing", "economics", "logistics", "supply", "aviation"],
  engineering: ["engineering", "civil", "mechanical", "electrical", "chemical", "industrial", "mechatronics", "renewable", "energy"],
  arts:        ["art", "design", "music", "drama", "visual", "creative", "architecture", "fashion"],
  sciences:    ["science", "biology", "chemistry", "physics", "natural", "environmental", "forensic", "actuarial"],
  social:      ["social", "education", "teaching", "psychology", "welfare", "development", "planning", "urban"],
  law:         ["law", "legal", "justice", "criminology", "policing", "forensic"],
  agriculture: ["agriculture", "agri", "farming", "food", "environmental", "nature"],
  media:       ["media", "communication", "journalism", "broadcasting", "public relations"],
};

function scoreMatch(interests = [], category = "", title = "") {
  const text = `${category} ${title}`.toLowerCase();
  return interests.reduce((score, id) => {
    const matched = (INTEREST_KEYWORDS[id] || []).some(kw => text.includes(kw));
    return score + (matched ? 1 : 0);
  }, 0);
}

const INTEREST_LABELS = {
  tech: "Technology", health: "Health", business: "Business",
  engineering: "Engineering", arts: "Arts & Design", sciences: "Sciences",
  social: "Education & Social", law: "Law", agriculture: "Agriculture", media: "Media",
};

// ─── Hidden gems (in-demand SA careers not well known) ───────────────────────
const HIDDEN_GEMS = [
  { id: "g1",  title: "Actuarial Science",           field: "Finance & Risk",       minAps: 36, demand: "Very High", why: "SA's top-paying graduate path — most students don't apply" },
  { id: "g2",  title: "Data Science",                field: "Technology",           minAps: 28, demand: "Very High", why: "Fastest growing field in SA — limited local graduates" },
  { id: "g3",  title: "Mechatronics Engineering",    field: "Engineering",          minAps: 30, demand: "High",      why: "Combines robotics + electronics + software — huge demand" },
  { id: "g4",  title: "Forensic Accounting",         field: "Finance & Law",        minAps: 28, demand: "High",      why: "Investigate financial fraud — rare skill, great salary" },
  { id: "g5",  title: "Biomedical Engineering",      field: "Health + Engineering", minAps: 32, demand: "Very High", why: "Design medical devices — massive post-COVID growth" },
  { id: "g6",  title: "Cybersecurity",               field: "Technology",           minAps: 26, demand: "Very High", why: "SA loses billions to cybercrime — skills gap is huge" },
  { id: "g7",  title: "Occupational Therapy",        field: "Health",               minAps: 26, demand: "High",      why: "Under-supplied nationally — public healthcare priority" },
  { id: "g8",  title: "Renewable Energy Engineering",field: "Engineering",          minAps: 28, demand: "Very High", why: "South Africa's energy crisis = your career opportunity" },
  { id: "g9",  title: "Logistics & Supply Chain",    field: "Business",             minAps: 22, demand: "High",      why: "Lower entry barrier, high upward mobility globally" },
  { id: "g10", title: "Urban & Regional Planning",   field: "Social Sciences",      minAps: 24, demand: "High",      why: "SA urbanisation boom — massive government investment" },
  { id: "g11", title: "Aviation Management",         field: "Business",             minAps: 24, demand: "High",      why: "Few study it — airline demand outpaces supply" },
  { id: "g12", title: "Nuclear Medicine Technology", field: "Health & Sciences",    minAps: 28, demand: "Very High", why: "Least known health career — top public sector salary" },
];

const BUNDLE_STATUS_LABEL = {
  pending_documents: "Pending Documents",
  in_progress:       "In Progress",
  submitted:         "Submitted",
  action_required:   "Action Required!",
  completed:         "Completed",
  rejected:          "Rejected",
};
const BUNDLE_STATUS_COLOR = {
  pending_documents: "#D97706",
  in_progress:       "#2563EB",
  submitted:         "#7C3AED",
  action_required:   "#DC2626",
  completed:         "#16A34A",
  rejected:          "#6B7280",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/"); return; }

        const [
          { data: profile },
          { data: courses },
          { data: bundle },
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("institution_courses")
            .select("id, title, category, duration, entry_requirements, programme_type, institutions(name, type)")
            .limit(120),
          supabase.from("application_bundles")
            .select("id, bundle_ref, status, created_at")
            .eq("user_id", user.id)
            .not("status", "in", '("completed","rejected")')
            .maybeSingle(),
        ]);

        let activeApps = [];
        if (bundle?.id) {
          const { data: apps } = await supabase
            .from("applications")
            .select("id, course_title, institution_name, status")
            .eq("bundle_id", bundle.id)
            .limit(5);
          activeApps = apps || [];
        }

        setData({ profile, courses: courses || [], bundle, activeApps });
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4 animate-pulse">
        <div className="h-20 bg-gray-100 rounded-2xl" />
        <div className="h-14 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  const { profile, courses, bundle, activeApps } = data || {};

  const firstName   = profile?.first_name || "there";
  const hour        = new Date().getHours();
  const greeting    = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const rawAps      = profile?.aps_score ?? calcAPS(profile?.subjects_marks);
  const aps         = rawAps > 0 ? rawAps : null;
  const subjectCount = Object.keys(profile?.subjects_marks || {}).length;
  const interests   = profile?.career_interests || [];
  const personality = profile?.personality_type || null;
  const grade       = profile?.grade || null;
  const hasOnboarding = !!(profile?.onboarding_completed);

  // Score and rank courses
  const rankedCourses = courses
    .map(c => {
      const minAps = c.entry_requirements?.min_aps || c.entry_requirements?.aps || 0;
      const qualifies = !minAps || !aps || aps >= minAps;
      const interestScore = scoreMatch(interests, c.category || "", c.title || "");
      return { ...c, minAps, qualifies, interestScore, score: interestScore * 2 + (qualifies ? 1 : 0) };
    })
    .filter(c => c.qualifies && c.interestScore > 0)
    .sort((a, b) => b.score - a.score);

  // Hidden gems the student qualifies for
  const eligibleGems = HIDDEN_GEMS.filter(g => !aps || aps >= g.minAps);

  const PERSONALITY_COLORS = {
    "Innovator": "#6366F1", "Builder": "#D97706", "Healer": "#16A34A",
    "Analyst": "#2563EB",   "Strategist": "#7C3AED", "Creator": "#EC4899",
    "People Person": "#0D9488", "Advocate": "#475569", "Steward": "#059669",
    "Storyteller": "#FF7A18", "Explorer": "#0EA5E9",
  };
  const personalityColor = PERSONALITY_COLORS[personality] || "#FF7A18";

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] text-gray-400 font-medium">{greeting}</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
            {firstName} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {aps && (
            <div className="bg-gray-900 text-white rounded-xl px-4 py-2 text-center min-w-[56px]">
              <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">APS</p>
              <p className="text-xl font-extrabold leading-none">{aps}</p>
            </div>
          )}
          {grade && (
            <div className="border border-gray-200 rounded-xl px-3 py-2 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Grade</p>
              <p className="text-sm font-bold text-gray-800 leading-tight">{grade.replace("Grade ", "")}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── No-onboarding CTA ──────────────────────────────────────────────── */}
      {!hasOnboarding && (
        <div className="bg-gray-950 text-white rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold">Complete your quiz first</p>
            <p className="text-sm text-white/50 mt-0.5">3 minutes · builds your personalised roadmap</p>
          </div>
          <button
            onClick={() => navigate("/onboarding")}
            className="flex-shrink-0 text-white font-semibold text-sm px-4 py-2.5 rounded-xl whitespace-nowrap"
            style={{ background: "#FF7A18" }}
          >
            Start quiz
          </button>
        </div>
      )}

      {/* ── Personality + stats (combined) ─────────────────────────────────── */}
      {hasOnboarding && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            {personality && (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-base font-bold"
                style={{ background: personalityColor }}
              >
                {personality[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {personality && (
                <p className="text-sm font-bold text-gray-900">{personality}</p>
              )}
              {profile?.personality_tagline && (
                <p className="text-xs text-gray-500 truncate">"{profile.personality_tagline}"</p>
              )}
              {!personality && <p className="text-sm font-semibold text-gray-900">Your profile</p>}
            </div>
            {/* Inline stats */}
            <div className="flex items-center gap-3 text-right flex-shrink-0">
              {subjectCount > 0 && (
                <div>
                  <p className="text-sm font-bold text-gray-900">{subjectCount}</p>
                  <p className="text-[10px] text-gray-400">subjects</p>
                </div>
              )}
              {interests.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-gray-900">{interests.length}</p>
                  <p className="text-[10px] text-gray-400">interests</p>
                </div>
              )}
            </div>
          </div>

          {/* Interest chips */}
          {interests.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-3 pt-3 border-t border-gray-100">
              {interests.map(id => (
                <span key={id} className="text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full font-medium border border-gray-100">
                  {INTEREST_LABELS[id] || id}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Active application ─────────────────────────────────────────────── */}
      {bundle && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-sm font-bold text-gray-900">
              Active Application
            </p>
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: BUNDLE_STATUS_COLOR[bundle.status] || "#6B7280" }}
            >
              {BUNDLE_STATUS_LABEL[bundle.status] || bundle.status}
            </span>
          </div>
          {activeApps.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {activeApps.map(app => (
                <div
                  key={app.id}
                  className="flex-shrink-0 bg-gray-50 rounded-xl px-3 py-2 min-w-[140px] max-w-[180px]"
                >
                  <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">{app.course_title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">{app.institution_name}</p>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate("/apply")}
            className="text-sm font-semibold mt-2 flex items-center gap-1"
            style={{ color: "#FF7A18" }}
          >
            View details <FiArrowRight size={13} />
          </button>
        </div>
      )}

      {/* ── Recommended for you ────────────────────────────────────────────── */}
      {hasOnboarding && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-gray-900">Recommended for you</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {rankedCourses.length > 0
                  ? `${rankedCourses.length} programme${rankedCourses.length !== 1 ? "s" : ""} matched`
                  : "Based on your interests"}
              </p>
            </div>
            <button
              onClick={() => navigate("/eligibility")}
              className="text-xs font-semibold flex items-center gap-0.5"
              style={{ color: "#FF7A18" }}
            >
              See all <FiArrowRight size={12} />
            </button>
          </div>

          {rankedCourses.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:-mx-6 md:px-6 snap-x snap-mandatory">
              {rankedCourses.slice(0, 12).map(course => (
                <CourseCard
                  key={course.id}
                  title={course.title}
                  institution={course.institutions?.name}
                  type={course.institutions?.type}
                  category={course.category}
                  duration={course.duration}
                  minAps={course.minAps}
                  aps={aps}
                  onClick={() => navigate("/eligibility")}
                />
              ))}
            </div>
          ) : (
            <EmptyCoursesCard
              aps={aps}
              hasInterests={interests.length > 0}
              navigate={navigate}
            />
          )}
        </div>
      )}

      {/* ── Hidden gems ────────────────────────────────────────────────────── */}
      {hasOnboarding && eligibleGems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <FiZap size={14} style={{ color: "#FF7A18" }} />
                <p className="font-bold text-gray-900">Hidden Gems</p>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                In-demand SA careers you qualify for — few students know about
              </p>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:-mx-6 md:px-6 snap-x snap-mandatory">
            {eligibleGems.map(gem => (
              <div
                key={gem.id}
                className="flex-shrink-0 w-[200px] snap-start bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900 leading-snug flex-1">{gem.title}</p>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 text-white"
                    style={{ background: gem.demand === "Very High" ? "#FF7A18" : "#6B7280" }}
                  >
                    {gem.demand}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{gem.why}</p>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400 font-medium">{gem.field}</span>
                  {gem.minAps > 0 && (
                    <span className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                      APS {gem.minAps}+
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick actions ──────────────────────────────────────────────────── */}
      {hasOnboarding && !bundle && (
        <div className="grid grid-cols-2 gap-3 pb-2">
          <button
            onClick={() => navigate("/institutions")}
            className="bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-orange-200 hover:shadow-sm transition-all shadow-sm"
          >
            <p className="text-sm font-bold text-gray-900">Browse institutions</p>
            <p className="text-xs text-gray-400 mt-0.5">Universities, colleges, TVET</p>
          </button>
          <button
            onClick={() => navigate("/apply")}
            className="rounded-xl p-4 text-left transition-all"
            style={{ background: "#FF7A18" }}
          >
            <p className="text-sm font-bold text-white">Apply for help</p>
            <p className="text-xs text-white/70 mt-0.5">We handle your applications</p>
          </button>
        </div>
      )}

    </div>
  );
}

// ─── Course card ──────────────────────────────────────────────────────────────
function CourseCard({ title, institution, type, category, duration, minAps, aps, onClick }) {
  const qualifies = !minAps || !aps || aps >= minAps;
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[200px] snap-start bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2 text-left hover:border-orange-200 hover:shadow transition-all"
    >
      <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{title}</p>
      {institution && (
        <div>
          <p className="text-[11px] font-semibold text-gray-600 truncate">{institution}</p>
          {type && <p className="text-[10px] text-gray-400 capitalize">{type.replace(/_/g, " ")}</p>}
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-2 border-t border-gray-100">
        {duration && (
          <span className="text-[10px] text-gray-400 font-medium">{duration}</span>
        )}
        {minAps > 0 && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto ${
            qualifies ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}>
            APS {minAps}+
          </span>
        )}
      </div>
    </button>
  );
}

function EmptyCoursesCard({ aps, hasInterests, navigate }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
      <p className="text-sm font-bold text-gray-800">
        {!hasInterests ? "Add your interests first" : "No matches yet"}
      </p>
      <p className="text-sm text-gray-400 mt-1 mb-4 leading-relaxed">
        {!hasInterests
          ? "Go to Profile → select career interests to get personalised recommendations."
          : `Browse all programmes you qualify for${aps ? ` with APS ${aps}` : ""}.`}
      </p>
      <button
        onClick={() => navigate(!hasInterests ? "/profile" : "/eligibility")}
        className="inline-flex items-center gap-1.5 text-white font-semibold text-sm px-5 py-2.5 rounded-xl"
        style={{ background: "#FF7A18" }}
      >
        {!hasInterests ? "Update profile" : "Browse eligible courses"}
        <FiArrowRight size={14} />
      </button>
    </div>
  );
}
