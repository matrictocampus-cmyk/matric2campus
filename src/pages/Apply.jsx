import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  FiSearch, FiExternalLink, FiCheck, FiX,
  FiAlertCircle, FiLoader, FiChevronDown, FiCheckCircle,
} from "react-icons/fi";

// ─── Constants ────────────────────────────────────────────────────────────────
const HELP_PRICE = 250;

const BUNDLE_STATUS = {
  pending_documents: { label: "Pending Documents",  step: 0, color: "amber"  },
  ready:             { label: "Ready for Review",    step: 1, color: "blue"   },
  in_progress:       { label: "In Progress",         step: 1, color: "blue"   },
  submitted:         { label: "Submitted",           step: 2, color: "purple" },
  action_required:   { label: "Action Required",     step: 1, color: "orange" },
  completed:         { label: "Completed",           step: 3, color: "green"  },
  rejected:          { label: "Rejected",            step: 3, color: "red"    },
};

const STATUS_COLORS = {
  amber:  "bg-amber-100  text-amber-800",
  blue:   "bg-blue-100   text-blue-800",
  purple: "bg-purple-100 text-purple-800",
  orange: "bg-orange-100 text-orange-800",
  green:  "bg-green-100  text-green-800",
  red:    "bg-red-100    text-red-800",
};

const BANK = {
  bank:    "ABSA",
  branch:  "632005",
  account: "4116206388",
  type:    "Classic Business Account",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function applyUrl(course) {
  return course.apply_url || course.institutions?.website || null;
}

function applyLabel(course) {
  if (course.apply_via && course.apply_via !== "institution_website") return course.apply_via;
  const name = (course.institutions?.name || "").toLowerCase();
  if (name.includes("cao") || name.includes("central applications")) return "CAO";
  const type = (course.institutions?.type || "").toLowerCase();
  if (type === "tvet") return "College Portal";
  return course.institutions?.name ? `${course.institutions.name} Portal` : "Institution Website";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Apply() {
  const navigate = useNavigate();

  // Data
  const [profile, setProfile]       = useState(null);
  const [courses, setCourses]        = useState([]);
  const [activeBundle, setActiveBundle] = useState(null);
  const [activeApps, setActiveApps]  = useState([]);
  const [loading, setLoading]        = useState(true);
  const [userId, setUserId]          = useState(null);

  // Browse state
  const [tab, setTab]                = useState("self");   // "self" | "help"
  const [search, setSearch]          = useState("");
  const [typeFilter, setTypeFilter]  = useState("all");

  // Help flow
  const [selected, setSelected]      = useState(new Set()); // Set of course IDs
  const [helpStep, setHelpStep]      = useState("select"); // "select" | "payment" | "done"
  const [reference, setReference]    = useState("");
  const [submitting, setSubmitting]  = useState(false);
  const [error, setError]            = useState("");

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/"); return; }
        setUserId(user.id);

        const [
          { data: prof },
          { data: courseRows },
          { data: bundle },
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("institution_courses")
            .select("id, title, category, duration, programme_type, entry_requirements, apply_url, apply_via, institutions(name, type, website)")
            .order("title"),
          supabase.from("application_bundles")
            .select("*")
            .eq("user_id", user.id)
            .not("status", "in", '("completed","rejected")')
            .maybeSingle(),
        ]);

        setProfile(prof);
        setCourses(courseRows || []);

        if (bundle) {
          setActiveBundle(bundle);
          const { data: apps } = await supabase
            .from("applications")
            .select("id, course_title, institution_name, status, admin_comment")
            .eq("bundle_id", bundle.id);
          setActiveApps(apps || []);
        }
      } catch (err) {
        console.error("Apply load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  // ── Filtered courses ──────────────────────────────────────────────────────
  const filteredCourses = useMemo(() => {
    const q = search.toLowerCase();
    return courses.filter(c => {
      const matchSearch = !q
        || c.title?.toLowerCase().includes(q)
        || c.institutions?.name?.toLowerCase().includes(q)
        || c.category?.toLowerCase().includes(q);
      const matchType = typeFilter === "all" || (c.institutions?.type || "").toLowerCase() === typeFilter;
      return matchSearch && matchType;
    });
  }, [courses, search, typeFilter]);

  const selectedCourses = useMemo(
    () => courses.filter(c => selected.has(c.id)),
    [courses, selected]
  );

  // ── Help flow actions ─────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const goToPayment = () => {
    setError("");
    const ref = `M2C-${(userId || "").slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    setReference(ref);
    setHelpStep("payment");
  };

  const confirmPayment = async () => {
    setError("");
    setSubmitting(true);
    try {
      // 1. Create bundle
      const { data: bundle, error: bundleErr } = await supabase
        .from("application_bundles")
        .insert({
          user_id:      userId,
          package_type: "Application Help",
          status:       "pending_documents",
        })
        .select()
        .single();
      if (bundleErr) throw bundleErr;

      // 2. Create application rows for selected courses
      if (selectedCourses.length > 0) {
        const instTypeMap = { university: "UNIVERSITY", tvet: "TVET", private: "PRIVATE" };
        await supabase.from("applications").insert(
          selectedCourses.map(c => ({
            bundle_id:        bundle.id,
            user_id:          userId,
            program_id:       c.id,
            course_title:     c.title,
            institution_name: c.institutions?.name || "",
            institution_type: instTypeMap[(c.institutions?.type || "").toLowerCase()] || "UNIVERSITY",
            status:           "pending_documents",
          }))
        );
      }

      // 3. Send emails (non-fatal)
      supabase.functions.invoke("send-help-request-emails", {
        body: {
          studentEmail: profile?.email,
          studentName:  profile?.full_name || "Student",
          studentPhone: profile?.phone || null,
          courses: selectedCourses.map(c => ({
            title: c.title,
            institution: c.institutions?.name || "",
          })),
          reference,
          price: HELP_PRICE,
        },
      }).then(({ error: emailErr }) => {
        if (emailErr) console.warn("Help request email error:", emailErr);
      }).catch(err => console.warn("Help request email failed:", err));

      setActiveBundle(bundle);
      setHelpStep("done");
    } catch (err) {
      console.error("Help request error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Active bundle status display ──────────────────────────────────────────
  const StatusBadge = ({ status }) => {
    const cfg = BUNDLE_STATUS[status] || { label: status, color: "amber" };
    return (
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[cfg.color] || "bg-gray-100 text-gray-700"}`}>
        {cfg.label}
      </span>
    );
  };

  const Timeline = ({ status }) => {
    const steps = ["Received", "Processing", "Submitted", "Done"];
    const current = BUNDLE_STATUS[status]?.step ?? 0;
    return (
      <div className="flex items-center">
        {steps.map((label, i) => {
          const done   = i < current;
          const active = i === current && status !== "rejected";
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done   ? "bg-green-500 text-white" :
                  active ? "text-white"               : "bg-gray-100 text-gray-400"
                }`}
                  style={active ? { background: "#FF7A18" } : {}}
                >
                  {done ? <FiCheck size={13} /> : i + 1}
                </div>
                <p className={`text-[10px] mt-1 whitespace-nowrap font-medium ${
                  done ? "text-green-600" : active ? "text-orange-600" : "text-gray-400"
                }`}>{label}</p>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-1 mb-4 ${done ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Shared course card ────────────────────────────────────────────────────
  const CourseCard = ({ course, mode }) => {
    const minAps = course.entry_requirements?.min_aps || course.entry_requirements?.aps;
    const profileAps = profile?.aps_score ?? 0;
    const eligible = !minAps || !profileAps || profileAps >= minAps;
    const url = applyUrl(course);
    const isSelected = selected.has(course.id);

    return (
      <div
        className={`bg-white border rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 transition-all ${
          mode === "help" && isSelected
            ? "border-2 shadow-sm"
            : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
        }`}
        style={mode === "help" && isSelected ? { borderColor: "#FF7A18" } : {}}
        onClick={mode === "help" ? () => toggleSelect(course.id) : undefined}
        role={mode === "help" ? "checkbox" : undefined}
        aria-checked={mode === "help" ? isSelected : undefined}
      >
        {mode === "help" && (
          <div
            className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
              isSelected ? "border-transparent" : "border-gray-300"
            }`}
            style={isSelected ? { background: "#FF7A18", borderColor: "#FF7A18" } : {}}
          >
            {isSelected && <FiCheck size={12} className="text-white" />}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug">{course.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {course.institutions?.name && (
              <span className="text-xs text-gray-500">{course.institutions.name}</span>
            )}
            {course.category && (
              <span className="text-xs text-gray-400">· {course.category}</span>
            )}
            {course.duration && (
              <span className="text-xs text-gray-400">· {course.duration}</span>
            )}
          </div>
          {minAps && (
            <span className={`inline-block mt-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
              eligible ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}>
              APS {minAps}+
            </span>
          )}
        </div>

        {mode === "self" && (
          url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors text-white whitespace-nowrap"
              style={{ background: "#FF7A18" }}
              onClick={e => e.stopPropagation()}
            >
              {applyLabel(course)} <FiExternalLink size={12} />
            </a>
          ) : (
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent((course.institutions?.name || "") + " application portal south africa")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 whitespace-nowrap transition-colors"
              onClick={e => e.stopPropagation()}
            >
              Find portal <FiExternalLink size={12} />
            </a>
          )
        )}
      </div>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4 animate-pulse">
        <div className="h-10 bg-gray-100 rounded-xl w-48" />
        <div className="h-10 bg-gray-100 rounded-xl" />
        {[0,1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  // ── Active bundle view ────────────────────────────────────────────────────
  if (activeBundle && helpStep !== "done") {
    const cfg = BUNDLE_STATUS[activeBundle.status] || {};
    const canEdit = activeBundle.status === "pending_documents" && !activeBundle.locked && !activeBundle.assigned_admin_id;
    const needsAction = activeBundle.status === "action_required";

    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Application</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Ref {activeBundle.bundle_ref || activeBundle.id} · {new Date(activeBundle.created_at).toLocaleDateString("en-ZA")}
            </p>
          </div>
          <StatusBadge status={activeBundle.status} />
        </div>

        {/* Timeline */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <Timeline status={activeBundle.status} />
        </div>

        {/* Status messages */}
        {canEdit && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3">
            <FiAlertCircle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-800 text-sm">Waiting for our team</p>
              <p className="text-sm text-orange-700 mt-0.5">
                We've received your request and will start processing it shortly. Check back for updates.
              </p>
            </div>
          </div>
        )}

        {needsAction && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
            <FiAlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Action required</p>
              <p className="text-sm text-red-700 mt-0.5">Our team needs more information. Check the notes below and contact us at <strong>support@matric2campus.co.za</strong>.</p>
            </div>
          </div>
        )}

        {(activeBundle.status === "in_progress" || activeBundle.status === "submitted") && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
            <FiLoader size={16} className="text-blue-500 animate-spin flex-shrink-0" />
            <p className="text-sm text-blue-800 font-medium">
              {activeBundle.status === "in_progress" ? "Our team is actively working on your application." : "Applications have been submitted to institutions. Awaiting responses."}
            </p>
          </div>
        )}

        {/* Applications list */}
        {activeApps.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold text-gray-900 text-sm">
              Courses ({activeApps.length})
            </p>
            {activeApps.map(app => (
              <div key={app.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{app.course_title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{app.institution_name}</p>
                    <span className={`inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                      STATUS_COLORS[BUNDLE_STATUS[app.status]?.color || "amber"]
                    }`}>
                      {(app.status || "pending").replace(/_/g, " ")}
                    </span>
                    {app.admin_comment && (
                      <div className="mt-2.5 p-2.5 bg-orange-50 border border-orange-100 rounded-lg text-xs text-orange-800">
                        <strong>Team note:</strong> {app.admin_comment}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeBundle.status === "completed" && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
            <p className="font-semibold text-green-800">Application completed!</p>
            <p className="text-sm text-green-700 mt-1">Your applications have been fully processed.</p>
          </div>
        )}
      </div>
    );
  }

  // ── Post-submission done screen ───────────────────────────────────────────
  if (helpStep === "done") {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <FiCheckCircle size={28} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Request submitted!</h1>
            <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
              We've sent a confirmation to <strong>{profile?.email}</strong> and our team has been notified.
              Someone will be in touch within 24–48 hours.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-left">
            <p className="text-xs text-gray-400 mb-0.5">Your reference</p>
            <p className="font-mono font-bold text-gray-900">{reference}</p>
          </div>
          {selectedCourses.length > 0 && (
            <div className="text-left space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Courses requested</p>
              {selectedCourses.map(c => (
                <div key={c.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <FiCheck size={13} className="text-green-500 flex-shrink-0" />
                  {c.title}{c.institutions?.name ? ` — ${c.institutions.name}` : ""}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate("/dashboard")}
            className="text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
            style={{ background: "#FF7A18" }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Main view: tabs ───────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">

      {/* Tab switcher */}
      <div className="bg-gray-100 rounded-2xl p-1 flex gap-1">
        {[
          { key: "self", label: "Apply Myself" },
          { key: "help", label: "Need Help Applying" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSearch(""); setTypeFilter("all"); }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
              tab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab descriptions */}
      {tab === "self" ? (
        <div>
          <p className="text-sm text-gray-500">
            Browse courses and apply directly at the institution or via CAO. You handle the application yourself.
          </p>
        </div>
      ) : (
        <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-start gap-3">
          <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: "#FF7A18" }} />
          <div>
            <p className="text-sm font-semibold text-gray-900">We handle everything for you</p>
            <p className="text-sm text-gray-600 mt-0.5">
              Select the courses you want to apply to. Pay R{HELP_PRICE} and our team contacts you personally to complete your applications.
            </p>
          </div>
        </div>
      )}

      {/* Payment step (help tab) */}
      {tab === "help" && helpStep === "payment" && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Complete Payment</h2>
            <button
              onClick={() => setHelpStep("select")}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              ← Back
            </button>
          </div>

          {/* Order summary */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-gray-900">Application Help</p>
              <p className="text-2xl font-extrabold text-gray-900">R{HELP_PRICE}</p>
            </div>
            <div className="space-y-1">
              {selectedCourses.map(c => (
                <div key={c.id} className="flex items-center gap-2 text-sm text-gray-600">
                  <FiCheck size={12} style={{ color: "#FF7A18" }} className="flex-shrink-0" />
                  {c.title}{c.institutions?.name ? ` — ${c.institutions.name}` : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Bank details */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Pay via EFT</p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-xs text-gray-400">Bank</p><p className="font-semibold text-gray-900">{BANK.bank}</p></div>
                <div><p className="text-xs text-gray-400">Branch</p><p className="font-semibold text-gray-900">{BANK.branch}</p></div>
                <div className="col-span-2"><p className="text-xs text-gray-400">Account</p><p className="text-xl font-bold text-gray-900">{BANK.account}</p></div>
                <div className="col-span-2"><p className="text-xs text-gray-400">Type</p><p className="font-semibold text-gray-900">{BANK.type}</p></div>
              </div>
              <div className="border-t border-blue-200 pt-3">
                <p className="text-xs text-gray-400">Your reference — use this exactly</p>
                <p className="font-mono font-extrabold text-lg text-gray-900 mt-0.5">{reference}</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>
          )}

          <button
            onClick={confirmPayment}
            disabled={submitting}
            className="w-full py-3 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "#FF7A18" }}
          >
            {submitting && <FiLoader size={16} className="animate-spin" />}
            {submitting ? "Submitting…" : "I've made the payment →"}
          </button>
          <p className="text-xs text-gray-400 text-center">
            We'll verify your payment and be in touch within 24–48 hours.
          </p>
        </div>
      )}

      {/* Search + filter (shown when browsing) */}
      {helpStep === "select" && (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses or institutions…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  <FiX size={14} />
                </button>
              )}
            </div>

            <div className="relative">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2.5 pr-8 text-sm text-gray-700 outline-none focus:border-gray-400 cursor-pointer transition-colors"
              >
                <option value="all">All types</option>
                <option value="university">University</option>
                <option value="tvet">TVET College</option>
                <option value="private">Private College</option>
              </select>
              <FiChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Selection bar (help tab only) */}
          {tab === "help" && selected.size > 0 && (
            <div className="flex items-center justify-between bg-white border rounded-xl px-4 py-3 shadow-sm" style={{ borderColor: "#FF7A18" }}>
              <p className="text-sm font-semibold text-gray-900">
                {selected.size} course{selected.size !== 1 ? "s" : ""} selected
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
                <button
                  onClick={goToPayment}
                  className="text-sm font-bold text-white px-4 py-2 rounded-lg transition-colors"
                  style={{ background: "#FF7A18" }}
                >
                  Continue — R{HELP_PRICE} →
                </button>
              </div>
            </div>
          )}

          {/* Course list */}
          {filteredCourses.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
              {courses.length === 0 ? (
                <>
                  <p className="font-semibold text-gray-800">No courses listed yet</p>
                  <p className="text-sm text-gray-400 mt-1.5">
                    Courses will appear here once our team adds them.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-gray-800">No results for "{search}"</p>
                  <button onClick={() => { setSearch(""); setTypeFilter("all"); }} className="text-sm mt-2" style={{ color: "#FF7A18" }}>
                    Clear filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCourses.map(course => (
                <CourseCard key={course.id} course={course} mode={tab === "self" ? "self" : "help"} />
              ))}
            </div>
          )}

          {/* Help tab: floating CTA when nothing selected yet */}
          {tab === "help" && selected.size === 0 && courses.length > 0 && (
            <p className="text-center text-sm text-gray-400 pt-2">
              Tick the courses above you'd like help with, then continue to payment.
            </p>
          )}
        </>
      )}
    </div>
  );
}
