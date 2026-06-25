import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const APS_MAP = {
  "0-29%": 1, "30-39%": 2, "40-49%": 3,
  "50-59%": 4, "60-69%": 5, "70-79%": 6, "80-100%": 7,
};

function calcAPS(marksObj) {
  return Object.entries(marksObj || {}).reduce((sum, [subj, lvl]) => {
    if (String(subj).toLowerCase().includes("life orientation") || String(subj).toLowerCase() === "lo") return sum;
    return sum + (APS_MAP[lvl] || 0);
  }, 0);
}

const BUNDLE_STATUS_CFG = {
  pending_documents: { label: "Pending Documents",  bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-800",  badge: "bg-amber-100 text-amber-700",  icon: "⏳" },
  in_progress:       { label: "In Progress",         bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-800",   badge: "bg-blue-100 text-blue-700",   icon: "🔄" },
  submitted:         { label: "Submitted",           bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", badge: "bg-purple-100 text-purple-700",icon: "📬" },
  action_required:   { label: "Action Required",     bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", badge: "bg-orange-100 text-orange-700",icon: "⚠️" },
  completed:         { label: "Completed",           bg: "bg-green-50",  border: "border-green-200",  text: "text-green-800",  badge: "bg-green-100 text-green-700",  icon: "✅" },
  rejected:          { label: "Rejected",            bg: "bg-red-50",    border: "border-red-200",    text: "text-red-800",    badge: "bg-red-100 text-red-700",    icon: "❌" },
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [profile, setProfile]                   = useState(null);
  const [bucketCount, setBucketCount]           = useState(0);
  const [activeBundle, setActiveBundle]         = useState(null);
  const [activeApps, setActiveApps]             = useState([]);
  const [loading, setLoading]                   = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/"); return; }

        const [{ data: prof }, bundleResult, bucketResult] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("application_bundles").select("*").eq("user_id", user.id)
            .not("status", "in", '("completed","rejected")').maybeSingle(),
          supabase.from("application_bucket").select("id").eq("user_id", user.id).is("package_id", null),
        ]);

        setProfile(prof);
        setBucketCount(bucketResult.data?.length || 0);

        if (bundleResult.data) {
          setActiveBundle(bundleResult.data);
          const { data: apps } = await supabase
            .from("applications").select("id, course_title, institution_name, status, admin_comment")
            .eq("bundle_id", bundleResult.data.id);
          setActiveApps(apps || []);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-10 bg-gray-100 rounded-xl w-1/3" />
        <div className="h-28 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile?.first_name || "Student";
  const userAPS = calcAPS(profile?.subjects_marks);
  const hasProfile = !!(profile?.first_name && profile?.subjects_marks);
  const hasSubjects = !!(profile?.subjects_marks);

  // ── Smart "next step" logic ───────────────────────────────────────────────
  let nextStep = null;
  if (!profile?.first_name) {
    nextStep = {
      priority: "high",
      icon: "👤",
      title: "Complete your profile",
      desc: "Add your personal details and subject marks so we can match you with courses.",
      action: () => navigate("/profile"),
      cta: "Go to Profile",
      color: "blue",
    };
  } else if (!hasSubjects) {
    nextStep = {
      priority: "high",
      icon: "📚",
      title: "Add your subject marks",
      desc: "Your matric results are needed to calculate your APS and check eligibility.",
      action: () => navigate("/profile"),
      cta: "Add Subjects",
      color: "purple",
    };
  } else if (activeBundle?.status === "action_required") {
    nextStep = {
      priority: "urgent",
      icon: "⚠️",
      title: "Admin needs your attention",
      desc: "An issue was flagged on your application. Check the details and upload a response.",
      action: () => navigate("/apply"),
      cta: "View & Respond",
      color: "orange",
    };
  } else if (activeBundle?.status === "pending_documents" && !activeBundle.locked) {
    nextStep = {
      priority: "high",
      icon: "📋",
      title: "Complete your application",
      desc: "Your bundle is created. Open the CAO Assistant or upload documents for admin assistance.",
      action: () => navigate("/apply"),
      cta: "Complete Application",
      color: "amber",
    };
  } else if (activeBundle) {
    nextStep = {
      priority: "info",
      icon: BUNDLE_STATUS_CFG[activeBundle.status]?.icon || "📦",
      title: `Application ${BUNDLE_STATUS_CFG[activeBundle.status]?.label || activeBundle.status}`,
      desc: `${activeApps.length} course${activeApps.length !== 1 ? "s" : ""} submitted. We'll update you as things progress.`,
      action: () => navigate("/apply"),
      cta: "Track Application",
      color: "blue",
    };
  } else if (bucketCount > 0) {
    nextStep = {
      priority: "high",
      icon: "🚀",
      title: `${bucketCount} course${bucketCount !== 1 ? "s" : ""} ready to apply`,
      desc: "You've added courses to your bucket. Select a package and submit your application.",
      action: () => navigate("/apply"),
      cta: "Apply Now",
      color: "green",
    };
  } else if (hasProfile) {
    nextStep = {
      priority: "normal",
      icon: "🎯",
      title: "Find courses you qualify for",
      desc: "Based on your APS of " + userAPS + ", see which programmes you're eligible for and add them to your application.",
      action: () => navigate("/eligibility"),
      cta: "Browse Eligible Courses",
      color: "green",
    };
  }

  const COLOR_MAP = {
    blue:   { bg: "bg-blue-600",   hover: "hover:bg-blue-700",   ring: "ring-blue-200",   soft: "bg-blue-50 border-blue-200",   text: "text-blue-800"   },
    purple: { bg: "bg-purple-600", hover: "hover:bg-purple-700", ring: "ring-purple-200", soft: "bg-purple-50 border-purple-200",text: "text-purple-800" },
    green:  { bg: "bg-green-600",  hover: "hover:bg-green-700",  ring: "ring-green-200",  soft: "bg-green-50 border-green-200",  text: "text-green-800"  },
    amber:  { bg: "bg-amber-500",  hover: "hover:bg-amber-600",  ring: "ring-amber-200",  soft: "bg-amber-50 border-amber-200",  text: "text-amber-800"  },
    orange: { bg: "bg-orange-600", hover: "hover:bg-orange-700", ring: "ring-orange-200", soft: "bg-orange-50 border-orange-200",text: "text-orange-800" },
  };

  // ── Journey steps ──────────────────────────────────────────────────────────
  const steps = [
    {
      num: 1, label: "Profile",
      done: hasProfile,
      active: !hasProfile,
      sub: hasProfile ? `APS ${userAPS}` : "Add your details & marks",
      path: "/profile",
    },
    {
      num: 2, label: "Eligibility",
      done: hasProfile && (bucketCount > 0 || !!activeBundle),
      active: hasProfile && bucketCount === 0 && !activeBundle,
      sub: bucketCount > 0 ? `${bucketCount} in bucket` : activeBundle ? "Applied" : "Browse courses",
      path: "/eligibility",
    },
    {
      num: 3, label: "Apply",
      done: !!activeBundle,
      active: bucketCount > 0 && !activeBundle,
      sub: activeBundle
        ? (BUNDLE_STATUS_CFG[activeBundle.status]?.label || activeBundle.status)
        : bucketCount > 0 ? "Ready to pay" : "Pay & submit",
      path: "/apply",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}, {firstName}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Here's where your application stands today.</p>
        </div>
        {hasSubjects && (
          <div className="bg-blue-600 text-white rounded-xl px-4 py-2 text-center">
            <p className="text-xs font-medium opacity-80">Your APS</p>
            <p className="text-2xl font-bold leading-tight">{userAPS}</p>
          </div>
        )}
      </div>

      {/* ── Next Step CTA ──────────────────────────────────────────────────── */}
      {nextStep && (() => {
        const c = COLOR_MAP[nextStep.color] || COLOR_MAP.blue;
        const isUrgent = nextStep.priority === "urgent";
        return (
          <div className={`border rounded-xl p-5 ${c.soft} flex items-start justify-between gap-4 ${isUrgent ? `ring-2 ${c.ring}` : ""}`}>
            <div className="flex items-start gap-3 flex-1">
              <span className="text-2xl flex-shrink-0 mt-0.5">{nextStep.icon}</span>
              <div>
                <p className={`font-bold ${c.text}`}>{nextStep.title}</p>
                <p className="text-sm text-gray-600 mt-0.5">{nextStep.desc}</p>
              </div>
            </div>
            <button
              onClick={nextStep.action}
              className={`flex-shrink-0 ${c.bg} ${c.hover} text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap`}
            >
              {nextStep.cta} →
            </button>
          </div>
        );
      })()}

      {/* ── Journey Progress ───────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Your Journey</p>
        <div className="flex items-start gap-0">
          {steps.map((step, i) => (
            <React.Fragment key={step.num}>
              <button
                onClick={() => navigate(step.path)}
                className="flex flex-col items-center flex-1 group text-center"
              >
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold mb-2 transition-colors ${
                  step.done
                    ? "border-green-500 bg-green-500 text-white"
                    : step.active
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-200 bg-gray-50 text-gray-400"
                }`}>
                  {step.done ? "✓" : step.num}
                </div>
                <p className={`text-xs font-semibold ${step.done ? "text-green-600" : step.active ? "text-blue-600" : "text-gray-400"}`}>
                  {step.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-tight">{step.sub}</p>
              </button>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mt-5 mx-1 ${steps[i].done ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Active application detail ──────────────────────────────────────── */}
      {activeBundle && (() => {
        const cfg = BUNDLE_STATUS_CFG[activeBundle.status] || { label: activeBundle.status, bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", badge: "bg-gray-100 text-gray-600", icon: "📦" };
        return (
          <div className={`border rounded-xl p-5 space-y-4 ${cfg.bg} ${cfg.border}`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className={`font-semibold ${cfg.text}`}>
                  {cfg.icon} Bundle #{activeBundle.bundle_ref || activeBundle.id}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Created {new Date(activeBundle.created_at).toLocaleDateString("en-ZA")} · {activeApps.length} course{activeApps.length !== 1 ? "s" : ""}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>

            {activeApps.length > 0 && (
              <div className="space-y-2">
                {activeApps.map(app => (
                  <div key={app.id} className="bg-white/70 rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{app.course_title}</p>
                        <p className="text-xs text-gray-500">{app.institution_name}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        BUNDLE_STATUS_CFG[app.status]?.badge || "bg-gray-100 text-gray-600"
                      }`}>
                        {(app.status || "pending").replace(/_/g, " ")}
                      </span>
                    </div>
                    {app.admin_comment && (
                      <p className="text-xs text-orange-600 mt-1.5 bg-orange-50 rounded px-2 py-1">
                        💬 {app.admin_comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate("/apply")}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              View full application →
            </button>
          </div>
        );
      })()}

      {/* ── Bucket preview (no active bundle) ─────────────────────────────── */}
      {!activeBundle && bucketCount > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl font-bold text-green-600">
              {bucketCount}
            </div>
            <div>
              <p className="font-semibold text-gray-900">Courses in your bucket</p>
              <p className="text-sm text-gray-500">Ready to apply — select a package and pay</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/apply")}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Apply Now →
          </button>
        </div>
      )}

      {/* ── Profile snapshot (only when profile exists but no active action) ─ */}
      {hasProfile && !activeBundle && bucketCount === 0 && (
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: "APS Score",    value: userAPS,                                      sub: "out of ~42",    color: "text-blue-600"  },
            { label: "Subjects",     value: Object.keys(profile.subjects_marks || {}).length, sub: "recorded",  color: "text-purple-600"},
            { label: "Profile",      value: profile.is_completed ? "Complete" : "Partial", sub: "",             color: profile.is_completed ? "text-green-600" : "text-amber-600"},
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
              {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <p className="text-center text-xs text-gray-400 pb-2">
        Need help? <a href="mailto:support@txi.ac.za" className="underline">support@txi.ac.za</a>
      </p>
    </div>
  );
}
