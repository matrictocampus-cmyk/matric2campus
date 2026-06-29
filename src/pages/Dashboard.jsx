import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  FiArrowRight, FiTrendingUp, FiBook, FiGrid,
  FiCheckCircle, FiLoader, FiAlertCircle,
} from "react-icons/fi";
import DashboardTutorial from "../components/DashboardTutorial";

// ─── APS helpers ──────────────────────────────────────────────────────────────
function parseMark(mark) {
  if (typeof mark === "number") return mark;
  if (typeof mark === "string") {
    const n = parseFloat(mark.replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}
function pctToLevel(pct) {
  const p = parseMark(pct);
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
function calcApsForTerm(manualResults, term) {
  if (!manualResults || !term) return 0;
  const termData = manualResults[term] ?? manualResults[String(term)];
  if (!termData || typeof termData !== "object") return 0;
  return Object.entries(termData).reduce((sum, [subj, mark]) => {
    if (subj.toLowerCase().includes("life orientation")) return sum;
    return sum + pctToLevel(mark);
  }, 0);
}
function getLatestTerm(manualResults) {
  if (!manualResults || typeof manualResults !== "object" || Array.isArray(manualResults)) return null;
  for (let t = 4; t >= 1; t--) {
    const d = manualResults[t] ?? manualResults[String(t)];
    if (d && typeof d === "object" && Object.keys(d).length > 0) return t;
  }
  return null;
}
function getTermsWithData(manualResults) {
  if (!manualResults || typeof manualResults !== "object" || Array.isArray(manualResults)) return [];
  return [1, 2, 3, 4].filter(t => {
    const d = manualResults[t] ?? manualResults[String(t)];
    return d && typeof d === "object" && Object.keys(d).length > 0;
  });
}

// ─── Demand scoring ───────────────────────────────────────────────────────────
const DEMAND_TERMS = [
  ["data science", 3], ["data analytics", 3], ["artificial intelligence", 3],
  ["machine learning", 3], ["cybersecurity", 3], ["information security", 3],
  ["mechatronics", 3], ["renewable energy", 3], ["biomedical engineering", 3],
  ["actuarial science", 3], ["software engineering", 3],
  ["nuclear medicine", 3], ["occupational therapy", 3],
  ["software development", 2], ["computer science", 2],
  ["electrical engineering", 2], ["civil engineering", 2], ["chemical engineering", 2],
  ["mechanical engineering", 2], ["logistics", 2], ["supply chain", 2],
  ["nursing", 2], ["pharmacy", 2], ["accounting", 1], ["chartered", 2],
  ["information technology", 2], ["forensic", 2], ["aviation", 2],
  ["biotechnology", 2], ["robotics", 2],
];
function scoreDemand(title, category) {
  const text = `${title} ${category}`.toLowerCase();
  return DEMAND_TERMS.reduce((score, [kw, pts]) => text.includes(kw) ? score + pts : score, 0);
}

const INTEREST_KEYWORDS = {
  tech:        ["tech", "computer", "software", "information", "digital", "data", "it", "cyber", "cloud", "artificial"],
  health:      ["health", "medical", "nursing", "pharmacy", "medicine", "clinical", "biomedical", "occupational", "nutrition"],
  business:    ["business", "commerce", "finance", "accounting", "management", "marketing", "economics", "logistics"],
  engineering: ["engineering", "civil", "mechanical", "electrical", "chemical", "industrial", "mechatronics", "renewable"],
  arts:        ["art", "design", "music", "drama", "visual", "creative", "architecture", "fashion", "media"],
  sciences:    ["science", "biology", "chemistry", "physics", "natural", "environmental", "forensic", "actuarial"],
  social:      ["social", "education", "teaching", "psychology", "welfare", "development"],
  law:         ["law", "legal", "justice", "criminology", "policing"],
  agriculture: ["agriculture", "agri", "farming", "food"],
  media:       ["media", "communication", "journalism", "broadcasting"],
};
function scoreInterest(interests, category, title) {
  const text = `${category} ${title}`.toLowerCase();
  return interests.reduce((score, id) => {
    return score + ((INTEREST_KEYWORDS[id] || []).some(kw => text.includes(kw)) ? 1 : 0);
  }, 0);
}

const INTEREST_LABELS = {
  tech: "Technology", health: "Health", business: "Business",
  engineering: "Engineering", arts: "Arts & Design", sciences: "Sciences",
  social: "Education & Social", law: "Law", agriculture: "Agriculture", media: "Media",
};

const PERSONALITY_COLORS = {
  "Innovator": "#6366F1", "Builder": "#D97706", "Healer": "#16A34A",
  "Analyst": "#2563EB", "Strategist": "#7C3AED", "Creator": "#EC4899",
  "People Person": "#0D9488", "Advocate": "#475569", "Steward": "#059669",
  "Storyteller": "#FF7A18", "Explorer": "#0EA5E9",
};

const BUNDLE_STEPS = [
  { key: "received",   label: "Received" },
  { key: "processing", label: "Processing" },
  { key: "submitted",  label: "Submitted" },
  { key: "done",       label: "Done" },
];
const STATUS_STEP = {
  pending_documents: 0,
  ready:             1,
  in_progress:       1,
  submitted:         2,
  action_required:   1,
  completed:         3,
  rejected:          3,
};
const STATUS_LABEL = {
  pending_documents: "Awaiting team",
  in_progress:       "Being worked on",
  submitted:         "Submitted",
  action_required:   "Action required",
  completed:         "Completed",
  rejected:          "Unsuccessful",
};
const TERM_LABELS = { 1: "Term 1", 2: "Term 2", 3: "Term 3", 4: "Final" };

// ─── Component ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [viewTerm, setViewTerm]   = useState(null);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("txi_dismissed_bundles") || "[]")); }
    catch { return new Set(); }
  });

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/"); return; }

        const [
          { data: profile },
          { data: courses },
          { data: allBundles },
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("institution_courses")
            .select("id, title, category, duration, entry_requirements, programme_type, institutions(name, type)")
            .order("title").limit(300),
          supabase.from("application_bundles")
            .select("id, bundle_ref, status, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        const bundles = allBundles || [];
        const bundle = bundles.find(b => !["completed", "rejected"].includes(b.status)) || null;
        const historyBundles = bundles.filter(b => ["completed", "rejected"].includes(b.status));

        let activeApps = [];
        if (bundle?.id) {
          const { data: apps } = await supabase
            .from("applications")
            .select("id, course_title, institution_name, status")
            .eq("bundle_id", bundle.id)
            .limit(6);
          activeApps = apps || [];
        }

        const latestT = getLatestTerm(profile?.manual_results);
        setViewTerm(latestT || profile?.results_term || null);
        setData({ profile, courses: courses || [], bundle, historyBundles, activeApps });
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <style>{ANIM_CSS}</style>
        <div className="h-8 bg-gray-100 rounded-xl w-40 animate-pulse" />
        <div className="h-44 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const { profile, courses, bundle, historyBundles, activeApps } = data || {};

  const dismissBundle = (id) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("txi_dismissed_bundles", JSON.stringify([...next]));
      return next;
    });
  };

  const visibleHistory = (historyBundles || []).filter(b => !dismissedIds.has(b.id));

  // APS
  const manualResults = profile?.manual_results;
  const termsWithData = getTermsWithData(manualResults);
  const latestTerm    = termsWithData[termsWithData.length - 1] ?? null;
  const termAps = viewTerm ? calcApsForTerm(manualResults, viewTerm) : 0;
  const flatAps = calcAPS(profile?.subjects_marks);
  const storedAps = profile?.aps_score ?? 0;
  const effectiveAps = termAps > 0 ? termAps : flatAps > 0 ? flatAps : storedAps;
  const aps = effectiveAps > 0 ? effectiveAps : null;

  const viewTermData = viewTerm
    ? (manualResults?.[viewTerm] ?? manualResults?.[String(viewTerm)] ?? null)
    : null;
  const subjectCount = viewTermData
    ? Object.keys(viewTermData).length
    : Object.keys(profile?.subjects_marks || {}).length;

  const firstName   = profile?.first_name || "there";
  const hour        = new Date().getHours();
  const greeting    = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const interests   = profile?.career_interests || [];
  const personality = profile?.personality_type || null;
  const grade       = profile?.grade || null;
  const hasOnboarding = !!(profile?.onboarding_completed);
  const personalityColor = PERSONALITY_COLORS[personality] || "#FF7A18";

  // Score courses
  const scoredCourses = courses.map(c => {
    const minAps = c.entry_requirements?.min_aps ?? c.entry_requirements?.aps ?? 0;
    const qualifies = !minAps || !aps || aps >= minAps;
    const iScore = scoreInterest(interests, c.category || "", c.title || "");
    const dScore = scoreDemand(c.title || "", c.category || "");
    return { ...c, minAps, qualifies, iScore, dScore };
  });

  const shownIds = new Set();
  const matchedCourses = interests.length > 0
    ? scoredCourses.filter(c => c.qualifies && c.iScore > 0)
        .sort((a, b) => b.iScore - a.iScore || b.dScore - a.dScore).slice(0, 6)
    : [];
  matchedCourses.forEach(c => shownIds.add(c.id));

  const inDemandCourses = scoredCourses
    .filter(c => c.qualifies && c.dScore > 0 && !shownIds.has(c.id))
    .sort((a, b) => b.dScore - a.dScore).slice(0, 4);

  const recCourses = matchedCourses.length > 0 ? matchedCourses : inDemandCourses;

  const isActivelyWorking = bundle?.status === "in_progress";
  const isActionRequired  = bundle?.status === "action_required";
  const isSubmitted       = bundle?.status === "submitted";
  const bundleStep        = STATUS_STEP[bundle?.status] ?? 0;

  // APS level label
  const apsLabel = !aps ? null
    : aps >= 36 ? "Excellent"
    : aps >= 28 ? "Good"
    : aps >= 22 ? "Average"
    : "Building";

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
      <style>{ANIM_CSS}</style>
      <DashboardTutorial />

      {/* ── Greeting ────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{greeting}</p>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mt-0.5">
          {firstName}
        </h1>
      </div>

      {/* ── No onboarding ───────────────────────────────────────────────────── */}
      {!hasOnboarding && (
        <div
          className="rounded-2xl p-5 flex items-center justify-between gap-4"
          style={{ background: "#0F0F0F" }}
        >
          <div>
            <p className="font-bold text-white">Start your quiz first</p>
            <p className="text-sm text-white/50 mt-0.5">3 minutes · builds your personalised roadmap</p>
          </div>
          <button
            onClick={() => navigate("/onboarding")}
            className="flex-shrink-0 text-white font-bold text-sm px-4 py-2.5 rounded-xl whitespace-nowrap"
            style={{ background: "#FF7A18" }}
          >
            Start quiz
          </button>
        </div>
      )}

      {/* ── Student Stats Card ──────────────────────────────────────────────── */}
      {hasOnboarding && (
        <div
          data-tutorial="stats"
          className="rounded-2xl overflow-hidden shadow-sm"
          style={{ background: "#0F0F0F" }}
        >
          {/* Top row: APS + personality */}
          <div className="px-5 pt-5 pb-4 flex items-start gap-4">
            {/* APS display */}
            <div className="flex flex-col items-center justify-center rounded-xl px-5 py-3 flex-shrink-0"
              style={{ background: "rgba(255,122,24,0.15)", border: "1px solid rgba(255,122,24,0.3)" }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#FF7A18" }}>APS</span>
              <span className="text-4xl font-extrabold text-white leading-none mt-0.5">
                {aps ?? "—"}
              </span>
              {apsLabel && (
                <span className="text-[10px] font-bold mt-1" style={{ color: "#FF7A18" }}>{apsLabel}</span>
              )}
            </div>

            {/* Stats grid */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Grade + subjects row */}
              <div className="flex items-start gap-3 flex-wrap">
                {grade && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Grade</p>
                    <p className="text-base font-extrabold text-white leading-tight">
                      {grade.replace("Grade ", "")}
                    </p>
                  </div>
                )}
                {subjectCount > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Subjects</p>
                    <p className="text-base font-extrabold text-white leading-tight">{subjectCount}</p>
                  </div>
                )}
                {personality && (
                  <div className="ml-auto">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 text-right">Profile</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: personalityColor }}
                      />
                      <p className="text-xs font-bold text-white">{personality}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Term selector */}
              {termsWithData.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/30 font-medium">Results:</span>
                  {termsWithData.map(t => (
                    <button
                      key={t}
                      onClick={() => setViewTerm(t)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-all"
                      style={
                        viewTerm === t
                          ? { background: "#FF7A18", color: "#fff" }
                          : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }
                      }
                    >
                      {TERM_LABELS[t] || `T${t}`}{t === latestTerm ? " ★" : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Interests strip */}
          {interests.length > 0 && (
            <div className="px-5 pb-4 flex gap-1.5 flex-wrap">
              {interests.map(id => (
                <span
                  key={id}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
                >
                  {INTEREST_LABELS[id] || id}
                </span>
              ))}
            </div>
          )}

          {/* Bottom CTA strip */}
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="text-[11px] text-white/30">
              {!aps ? "Add your marks in Profile to see your APS" : `Based on ${TERM_LABELS[viewTerm] || "your"} results`}
            </p>
            <button
              onClick={() => navigate("/profile")}
              className="text-[11px] font-bold flex items-center gap-1"
              style={{ color: "#FF7A18" }}
            >
              Edit profile <FiArrowRight size={11} />
            </button>
          </div>
        </div>
      )}

      {/* ── Application Tracker ─────────────────────────────────────────────── */}
      {bundle && (
        <div data-tutorial="tracker" className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {/* Live header */}
          <div
            className="px-5 py-4 flex items-center justify-between gap-3"
            style={isActivelyWorking ? { background: "#F0FDF4" } : isActionRequired ? { background: "#FEF2F2" } : { background: "#fff" }}
          >
            <div className="flex items-center gap-2.5">
              {isActivelyWorking && (
                <span className="relative flex items-center">
                  <span className="pulse-ring absolute inline-flex w-3.5 h-3.5 rounded-full bg-green-400 opacity-75" />
                  <span className="relative w-2.5 h-2.5 rounded-full bg-green-500" />
                </span>
              )}
              {isActionRequired && (
                <FiAlertCircle size={16} className="text-red-500 flex-shrink-0" />
              )}
              {isSubmitted && (
                <span className="relative flex items-center">
                  <span className="pulse-ring absolute inline-flex w-3.5 h-3.5 rounded-full bg-purple-400 opacity-75" />
                  <span className="relative w-2.5 h-2.5 rounded-full bg-purple-500" />
                </span>
              )}
              {!isActivelyWorking && !isActionRequired && !isSubmitted && (
                <FiLoader size={14} className="text-amber-500 animate-spin flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {isActivelyWorking ? "Our team is working on your application"
                   : isActionRequired ? "Action required from you"
                   : isSubmitted     ? "Applications submitted"
                   : "Waiting to be assigned"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Ref {bundle.bundle_ref || bundle.id}
                </p>
              </div>
            </div>
          </div>

          {/* Animated progress bar */}
          <div className="h-1 w-full bg-gray-100 overflow-hidden">
            <div
              className={isActivelyWorking ? "progress-anim h-full rounded-full" : "h-full rounded-full transition-all duration-700"}
              style={{
                background: isActionRequired ? "#DC2626" : "#FF7A18",
                width: isActivelyWorking ? undefined : `${Math.max(8, (bundleStep / 3) * 100)}%`,
              }}
            />
          </div>

          {/* Step timeline */}
          <div className="px-5 py-4">
            <div className="flex items-center">
              {BUNDLE_STEPS.map((step, i) => {
                const done   = i < bundleStep;
                const active = i === bundleStep && bundle.status !== "rejected";
                const rej    = bundle.status === "rejected" && i === 3;
                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          rej    ? "bg-red-100 text-red-600"
                          : done   ? "bg-green-500 text-white"
                          : active ? "text-white"
                          : "bg-gray-100 text-gray-300"
                        }`}
                        style={active && !rej ? { background: "#FF7A18" } : {}}
                      >
                        {rej ? "✕" : done ? "✓" : i + 1}
                      </div>
                      <p className={`text-[10px] mt-1 font-semibold whitespace-nowrap ${
                        rej ? "text-red-500" : done ? "text-green-600" : active ? "text-orange-600" : "text-gray-300"
                      }`}>
                        {step.label}
                      </p>
                    </div>
                    {i < BUNDLE_STEPS.length - 1 && (
                      <div className={`flex-1 h-px mx-1.5 mb-4 transition-colors duration-700 ${done ? "bg-green-300" : "bg-gray-100"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Active status message */}
            {isActivelyWorking && (
              <div className="mt-3 p-3 bg-green-50 rounded-xl flex items-start gap-2.5">
                <span className="text-lg flex-shrink-0">👩‍💻</span>
                <div>
                  <p className="text-xs font-bold text-green-900">A staff member is actively working on this</p>
                  <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
                    Your applications are being prepared and submitted. We'll notify you of any updates.
                  </p>
                </div>
              </div>
            )}
            {isSubmitted && (
              <div className="mt-3 p-3 bg-purple-50 rounded-xl flex items-start gap-2.5">
                <span className="text-lg flex-shrink-0">📬</span>
                <div>
                  <p className="text-xs font-bold text-purple-900">Applications sent to institutions</p>
                  <p className="text-xs text-purple-700 mt-0.5 leading-relaxed">
                    Your applications have been submitted. Institutions typically respond within 4–8 weeks.
                  </p>
                </div>
              </div>
            )}
            {isActionRequired && (
              <div className="mt-3 p-3 bg-red-50 rounded-xl flex items-start gap-2.5">
                <span className="text-lg flex-shrink-0">⚠️</span>
                <div>
                  <p className="text-xs font-bold text-red-900">We need something from you</p>
                  <p className="text-xs text-red-700 mt-0.5">Check your notifications or email us at <strong>support@matric2campus.co.za</strong></p>
                </div>
              </div>
            )}
          </div>

          {/* Courses list */}
          {activeApps.length > 0 && (
            <div className="px-5 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Courses ({activeApps.length})
              </p>
              <div className="space-y-1.5">
                {activeApps.slice(0, 3).map(app => (
                  <div key={app.id} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: isActivelyWorking ? "#16A34A" : "#FF7A18" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{app.course_title}</p>
                      <p className="text-[10px] text-gray-400">{app.institution_name}</p>
                    </div>
                  </div>
                ))}
                {activeApps.length > 3 && (
                  <p className="text-[11px] text-gray-400 px-1 pb-1">+ {activeApps.length - 3} more</p>
                )}
              </div>
            </div>
          )}

          {/* Footer link */}
          <div className="px-5 py-3 border-t border-gray-50">
            <button
              onClick={() => navigate("/apply")}
              className="text-xs font-bold flex items-center gap-1"
              style={{ color: "#FF7A18" }}
            >
              View full application details <FiArrowRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ── Past applications (completed/rejected) ──────────────────────────── */}
      {visibleHistory.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Past Applications</p>
          {visibleHistory.map(b => (
            <div key={b.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    b.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {b.status === "completed" ? "Completed" : "Unsuccessful"}
                  </span>
                  <span className="text-[10px] text-gray-400">{new Date(b.created_at).toLocaleDateString("en-ZA")}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Ref: {b.bundle_ref || b.id}</p>
              </div>
              <button onClick={() => dismissBundle(b.id)} className="text-gray-300 hover:text-gray-500 text-sm">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ── No bundle CTA ───────────────────────────────────────────────────── */}
      {!bundle && hasOnboarding && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="font-bold text-gray-900">Ready to apply?</p>
          <p className="text-sm text-gray-400 mt-1 mb-4 leading-relaxed">
            Apply yourself using our direct portal links, or let our team handle everything for you.
          </p>
          <button
            onClick={() => navigate("/apply")}
            className="text-white font-bold text-sm px-5 py-2.5 rounded-xl flex items-center gap-1.5"
            style={{ background: "#FF7A18" }}
          >
            Go to Applications <FiArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ── Course recommendations ──────────────────────────────────────────── */}
      {hasOnboarding && recCourses.length > 0 && (
        <div data-tutorial="recommendations">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FiTrendingUp size={14} style={{ color: "#FF7A18" }} />
              <p className="font-bold text-gray-900 text-sm">
                {matchedCourses.length > 0 ? "Recommended for you" : "In demand right now"}
              </p>
            </div>
            <button
              onClick={() => navigate("/eligibility")}
              className="text-xs font-bold flex items-center gap-0.5"
              style={{ color: "#FF7A18" }}
            >
              See all <FiArrowRight size={12} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:-mx-6 md:px-6 snap-x snap-mandatory scrollbar-hide">
            {recCourses.slice(0, 6).map(c => (
              <MiniCourseCard key={c.id} course={c} aps={aps} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {/* ── No courses prompt ───────────────────────────────────────────────── */}
      {hasOnboarding && recCourses.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
          <p className="font-bold text-gray-900 text-sm">Add your marks to see matching courses</p>
          <p className="text-xs text-gray-400 mt-1 mb-3">Your APS score determines which programmes you qualify for.</p>
          <button
            onClick={() => navigate("/profile")}
            className="text-white text-sm font-bold px-5 py-2.5 rounded-xl"
            style={{ background: "#FF7A18" }}
          >
            Add my marks
          </button>
        </div>
      )}

      {/* ── Quick action buttons ─────────────────────────────────────────────── */}
      {hasOnboarding && (
        <div data-tutorial="actions" className="grid grid-cols-2 gap-3 pb-2">
          <button
            onClick={() => navigate("/institutions")}
            className="bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-orange-200 hover:shadow-sm transition-all shadow-sm group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <FiGrid size={14} className="text-gray-400" />
              <p className="text-sm font-bold text-gray-900">Institutions</p>
            </div>
            <p className="text-xs text-gray-400 leading-snug">Browse universities, colleges & TVET</p>
            <div className="mt-2 flex items-center gap-0.5 text-[11px] font-bold" style={{ color: "#FF7A18" }}>
              Explore <FiArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => navigate("/eligibility")}
            className="border border-gray-100 rounded-xl p-4 text-left hover:opacity-95 transition-all shadow-sm group"
            style={{ background: "#FF7A18" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <FiBook size={14} className="text-white/70" />
              <p className="text-sm font-bold text-white">My Matches</p>
            </div>
            <p className="text-xs text-white/70 leading-snug">Courses you qualify for</p>
            <div className="mt-2 flex items-center gap-0.5 text-[11px] font-bold text-white">
              Browse <FiArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Mini course card ─────────────────────────────────────────────────────────
function MiniCourseCard({ course, aps, navigate }) {
  const qualifies = !course.minAps || !aps || aps >= course.minAps;
  return (
    <button
      onClick={() => navigate("/eligibility")}
      className="flex-shrink-0 w-[190px] snap-start bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2 text-left hover:border-orange-200 hover:shadow transition-all"
    >
      <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{course.title}</p>
      {course.institutions?.name && (
        <div>
          <p className="text-[11px] font-semibold text-gray-500 truncate">{course.institutions.name}</p>
          {course.institutions?.type && (
            <p className="text-[10px] text-gray-400 capitalize">{course.institutions.type.replace(/_/g, " ")}</p>
          )}
        </div>
      )}
      <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-gray-100 flex-wrap">
        {course.duration && <span className="text-[10px] text-gray-400">{course.duration}</span>}
        {course.dScore >= 3 && (
          <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "#FF7A18" }}>
            In demand
          </span>
        )}
        {course.minAps > 0 && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${course.dScore < 3 ? "ml-auto" : ""} ${
            qualifies ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}>
            APS {course.minAps}+
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Animation CSS ────────────────────────────────────────────────────────────
const ANIM_CSS = `
  @keyframes pulse-ring-anim {
    0%   { transform: scale(0.8); opacity: 0.8; }
    70%  { transform: scale(2);   opacity: 0;   }
    100% { transform: scale(0.8); opacity: 0;   }
  }
  .pulse-ring {
    animation: pulse-ring-anim 1.8s ease-out infinite;
  }
  @keyframes progress-wave {
    0%   { width: 40%; margin-left: 0%; }
    50%  { width: 55%; margin-left: 35%; }
    100% { width: 40%; margin-left: 0%;  }
  }
  .progress-anim {
    animation: progress-wave 2.5s ease-in-out infinite;
  }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
`;
