import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  FiExternalLink, FiCheck, FiX,
  FiAlertCircle, FiLoader, FiCheckCircle, FiArrowLeft, FiArrowRight,
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
function getApplyLink(bucketItem) {
  const c = bucketItem.courseDetail;
  if (!c) return null;
  return c.apply_url || c.institutions?.website || null;
}

function getApplyLabel(bucketItem) {
  const c = bucketItem.courseDetail;
  if (!c) return "Apply";
  if (c.apply_via && c.apply_via !== "institution_website") return c.apply_via;
  const name = (c.institutions?.name || "").toLowerCase();
  if (name.includes("cao") || name.includes("central applications")) return "Apply via CAO";
  const type = (c.institutions?.type || "").toLowerCase();
  if (type === "tvet") return "Apply at College";
  return c.institutions?.name ? `${c.institutions.name} Portal` : "Apply";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Apply() {
  const navigate = useNavigate();

  // Core state
  const [view, setView]               = useState("home"); // "home" | "self" | "help"
  const [profile, setProfile]         = useState(null);
  const [bucketCourses, setBucketCourses] = useState([]);
  const [suggestions, setSuggestions]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [userId, setUserId]           = useState(null);
  const [activeBundle, setActiveBundle] = useState(null);
  const [activeApps, setActiveApps]   = useState([]);

  // Help flow
  const [helpStep, setHelpStep]       = useState("confirm"); // "confirm" | "payment" | "done"
  const [reference, setReference]     = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/"); return; }
        setUserId(user.id);

        const [
          { data: prof },
          { data: rawBucket },
          { data: bundle },
        ] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase
            .from("application_bucket")
            .select("id, course_title, institution_name, institution_type, program_id, created_at")
            .eq("user_id", user.id)
            .is("package_id", null)
            .order("created_at"),
          supabase
            .from("application_bundles")
            .select("*")
            .eq("user_id", user.id)
            .not("status", "in", '("completed","rejected")')
            .maybeSingle(),
        ]);

        setProfile(prof);

        // Enrich bucket items with course detail (apply_url, apply_via, institutions)
        const bucketItems = rawBucket || [];
        if (bucketItems.length > 0) {
          const programIds = bucketItems.map(b => b.program_id).filter(Boolean);
          const { data: courseDetails } = await supabase
            .from("institution_courses")
            .select("id, title, apply_url, apply_via, category, duration, institutions(name, type, website)")
            .in("id", programIds);

          const courseMap = {};
          (courseDetails || []).forEach(c => { courseMap[c.id] = c; });

          const enriched = bucketItems.map(b => ({
            ...b,
            courseDetail: courseMap[b.program_id] || null,
          }));
          setBucketCourses(enriched);

          // Load suggestions: same categories, different courses
          const cats = [...new Set(enriched.map(b => b.courseDetail?.category).filter(Boolean))];
          if (cats.length > 0) {
            const { data: sugg } = await supabase
              .from("institution_courses")
              .select("id, title, category, duration, institutions(name, type)")
              .in("category", cats.slice(0, 2))
              .not("id", "in", `(${programIds.join(",")})`)
              .limit(4);
            setSuggestions(sugg || []);
          }
        }

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

  // ── Remove from bucket ────────────────────────────────────────────────────
  const removeFromBucket = async (bucketId) => {
    const { error: delErr } = await supabase
      .from("application_bucket")
      .delete()
      .eq("id", bucketId);
    if (!delErr) {
      setBucketCourses(prev => prev.filter(b => b.id !== bucketId));
    }
  };

  // ── Help payment flow ─────────────────────────────────────────────────────
  const goToPayment = () => {
    setError("");
    const ts  = Date.now().toString(36).toUpperCase().slice(-5);
    const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
    setReference(`M2C-${ts}${rnd}`);
    setHelpStep("payment");
  };

  const confirmPayment = async () => {
    setError("");
    setSubmitting(true);
    try {
      const { data: bundle, error: bundleErr } = await supabase
        .from("application_bundles")
        .insert({
          user_id:      userId,
          package_type: "Application Help",
          status:       "pending_documents",
          bundle_ref:   reference,
        })
        .select()
        .single();
      if (bundleErr) throw bundleErr;

      if (bucketCourses.length > 0) {
        const instTypeMap = { university: "UNIVERSITY", college: "TVET", private_college: "PRIVATE" };
        await supabase.from("applications").insert(
          bucketCourses.map(b => ({
            bundle_id:        bundle.id,
            user_id:          userId,
            program_id:       b.program_id,
            course_title:     b.course_title,
            institution_name: b.institution_name,
            institution_type: instTypeMap[b.institution_type] || "UNIVERSITY",
            status:           "pending_documents",
          }))
        );
      }

      // Send confirmation email (non-fatal)
      supabase.functions.invoke("send-help-request-emails", {
        body: {
          studentEmail: profile?.email,
          studentName:  profile?.full_name || "Student",
          courses: bucketCourses.map(b => ({
            title: b.course_title,
            institution: b.institution_name,
          })),
          reference,
          price: HELP_PRICE,
        },
      }).catch(err => console.warn("Email error:", err));

      setActiveBundle(bundle);
      setHelpStep("done");
    } catch (err) {
      console.error("Help request error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Shared sub-components ─────────────────────────────────────────────────
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
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    done ? "bg-green-500 text-white" : active ? "text-white" : "bg-gray-100 text-gray-400"
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

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4 animate-pulse">
        <div className="h-10 bg-gray-100 rounded-xl w-48" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-gray-100 rounded-2xl" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Active bundle view (non-completed) ────────────────────────────────────
  if (activeBundle && helpStep !== "done") {
    const needsAction = activeBundle.status === "action_required";
    const canEdit = activeBundle.status === "pending_documents" && !activeBundle.locked && !activeBundle.assigned_admin_id;

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

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <Timeline status={activeBundle.status} />
        </div>

        {canEdit && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3">
            <FiAlertCircle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-800 text-sm">Waiting for our team</p>
              <p className="text-sm text-orange-700 mt-0.5">We've received your request and will start shortly.</p>
            </div>
          </div>
        )}
        {needsAction && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
            <FiAlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Action required</p>
              <p className="text-sm text-red-700 mt-0.5">Contact us at <strong>support@matric2campus.co.za</strong>.</p>
            </div>
          </div>
        )}
        {(activeBundle.status === "in_progress" || activeBundle.status === "submitted") && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
            <FiLoader size={16} className="text-blue-500 animate-spin flex-shrink-0" />
            <p className="text-sm text-blue-800 font-medium">
              {activeBundle.status === "in_progress"
                ? "Our team is actively working on your application."
                : "Applications submitted. Awaiting institution responses."}
            </p>
          </div>
        )}

        {activeApps.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold text-gray-900 text-sm">Courses ({activeApps.length})</p>
            {activeApps.map(app => (
              <div key={app.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{app.course_title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{app.institution_name}</p>
                    <span className={`inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[BUNDLE_STATUS[app.status]?.color || "amber"]}`}>
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
      </div>
    );
  }

  // ── Done screen ───────────────────────────────────────────────────────────
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
              We've sent confirmation to <strong>{profile?.email}</strong>. Our team will be in touch within 24–48 hours.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-left">
            <p className="text-xs text-gray-400 mb-0.5">Your reference</p>
            <p className="font-mono font-bold text-gray-900">{reference}</p>
          </div>
          {bucketCourses.length > 0 && (
            <div className="text-left space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Courses</p>
              {bucketCourses.map(b => (
                <div key={b.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <FiCheck size={13} className="text-green-500 flex-shrink-0" />
                  {b.course_title}{b.institution_name ? ` — ${b.institution_name}` : ""}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate("/dashboard")}
            className="text-white font-semibold text-sm px-5 py-2.5 rounded-xl"
            style={{ background: "#FF7A18" }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Self view: Apply Myself ───────────────────────────────────────────────
  if (view === "self") {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <button
          onClick={() => setView("home")}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800"
        >
          <FiArrowLeft size={14} /> Back
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-900">Apply Yourself</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Click each course's link to go directly to its application portal. You fill in and submit the application yourself.
          </p>
        </div>

        {bucketCourses.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
            <p className="font-semibold text-gray-700">No courses selected yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Go to My Matches and add the courses you want to apply to.</p>
            <button
              onClick={() => navigate("/eligibility")}
              className="text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
              style={{ background: "#FF7A18" }}
            >
              Go to My Matches
            </button>
          </div>
        ) : (
          <>
            {/* Course list */}
            <div className="space-y-2">
              {bucketCourses.map(b => {
                const url   = getApplyLink(b);
                const label = getApplyLabel(b);
                return (
                  <div key={b.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{b.course_title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500">{b.institution_name}</span>
                        {b.courseDetail?.duration && (
                          <span className="text-xs text-gray-400">· {b.courseDetail.duration}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg text-white whitespace-nowrap"
                          style={{ background: "#FF7A18" }}
                        >
                          {label} <FiExternalLink size={11} />
                        </a>
                      ) : (
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(`${b.institution_name} application portal south africa`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 whitespace-nowrap"
                        >
                          Find portal <FiExternalLink size={11} />
                        </a>
                      )}
                      <button
                        onClick={() => removeFromBucket(b.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Need help upsell */}
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Not sure where to start?</p>
                <p className="text-xs text-gray-600 mt-0.5">Let our team handle the entire application process for you.</p>
              </div>
              <button
                onClick={() => setView("help")}
                className="flex-shrink-0 text-sm font-bold text-white px-4 py-2 rounded-lg whitespace-nowrap"
                style={{ background: "#FF7A18" }}
              >
                Get help →
              </button>
            </div>

            {/* Suggested add-ons */}
            {suggestions.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">You might also want to add</p>
                <div className="space-y-2">
                  {suggestions.map(s => (
                    <div key={s.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-snug">{s.title}</p>
                        <p className="text-xs text-gray-500">{s.institutions?.name}</p>
                      </div>
                      <button
                        onClick={() => navigate("/eligibility")}
                        className="text-xs font-semibold flex-shrink-0"
                        style={{ color: "#FF7A18" }}
                      >
                        Add →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Help view: Get Assistance ─────────────────────────────────────────────
  if (view === "help") {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <button
          onClick={() => { setView("home"); setHelpStep("confirm"); }}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800"
        >
          <FiArrowLeft size={14} /> Back
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-900">Get Help Applying</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Our team handles your entire application. Pay R{HELP_PRICE} and we'll contact you to complete everything.
          </p>
        </div>

        {bucketCourses.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
            <p className="font-semibold text-gray-700">No courses selected yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Go to My Matches and add the courses you want help applying to.</p>
            <button
              onClick={() => navigate("/eligibility")}
              className="text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
              style={{ background: "#FF7A18" }}
            >
              Go to My Matches
            </button>
          </div>
        ) : helpStep === "confirm" ? (
          <>
            {/* Course list + price */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900">{bucketCourses.length} course{bucketCourses.length !== 1 ? "s" : ""}</p>
                <p className="text-2xl font-extrabold text-gray-900">R{HELP_PRICE}</p>
              </div>
              <div className="space-y-2">
                {bucketCourses.map(b => (
                  <div key={b.id} className="flex items-center gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{b.course_title}</p>
                      <p className="text-xs text-gray-400">{b.institution_name}</p>
                    </div>
                    <button
                      onClick={() => removeFromBucket(b.id)}
                      className="text-gray-300 hover:text-red-400 flex-shrink-0"
                      title="Remove"
                    >
                      <FiX size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-sm">
              <p className="font-semibold text-gray-900">What happens next:</p>
              <ol className="text-gray-700 mt-1.5 space-y-1 list-decimal list-inside text-xs">
                <li>Pay R{HELP_PRICE} via EFT using your reference number</li>
                <li>Our team contacts you within 24–48 hours</li>
                <li>We complete and submit your applications</li>
              </ol>
            </div>

            <button
              onClick={goToPayment}
              className="w-full py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: "#FF7A18" }}
            >
              Continue to Payment →
            </button>

            {/* Suggested add-ons */}
            {suggestions.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">You might also want to add</p>
                <div className="space-y-2">
                  {suggestions.map(s => (
                    <div key={s.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-snug">{s.title}</p>
                        <p className="text-xs text-gray-500">{s.institutions?.name}</p>
                      </div>
                      <button
                        onClick={() => navigate("/eligibility")}
                        className="text-xs font-semibold flex-shrink-0"
                        style={{ color: "#FF7A18" }}
                      >
                        Add →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : helpStep === "payment" ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Complete Payment</h2>
              <button onClick={() => setHelpStep("confirm")} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            </div>

            {/* Order summary */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900">Application Help</p>
                <p className="text-2xl font-extrabold text-gray-900">R{HELP_PRICE}</p>
              </div>
              <div className="space-y-1">
                {bucketCourses.map(b => (
                  <div key={b.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <FiCheck size={12} style={{ color: "#FF7A18" }} className="flex-shrink-0" />
                    {b.course_title}{b.institution_name ? ` — ${b.institution_name}` : ""}
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
                  <p className="text-xs text-gray-400">Your reference — use this exactly when paying</p>
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
              className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "#FF7A18" }}
            >
              {submitting && <FiLoader size={16} className="animate-spin" />}
              {submitting ? "Submitting…" : "I've made the payment →"}
            </button>
            <p className="text-xs text-gray-400 text-center">
              We'll verify your payment and be in touch within 24–48 hours.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  // ── Home view: two landing cards ──────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Apply</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {bucketCourses.length > 0
            ? `You have ${bucketCourses.length} course${bucketCourses.length !== 1 ? "s" : ""} ready to apply to. Choose how you'd like to proceed.`
            : "Choose how you want to apply to your selected courses."}
        </p>
      </div>

      {/* No bucket courses prompt */}
      {bucketCourses.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 flex items-start gap-3">
          <span className="text-amber-500 text-lg leading-none mt-0.5">↑</span>
          <div>
            <p className="text-sm font-bold text-amber-900">No courses selected yet</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Visit <button onClick={() => navigate("/eligibility")} className="underline font-semibold">My Matches</button> to browse qualifying courses and add them here.
            </p>
          </div>
        </div>
      )}

      {/* Two landing cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Apply Myself */}
        <button
          onClick={() => setView("self")}
          className="bg-white border border-gray-100 rounded-2xl p-6 text-left hover:border-orange-200 hover:shadow-md transition-all shadow-sm group"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gray-50">🎓</div>
            {bucketCourses.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#FF7A18" }}>
                {bucketCourses.length} selected
              </span>
            )}
          </div>
          <p className="font-bold text-gray-900 text-base mb-1">Apply Myself</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            We show you each course with a direct link to its application portal — CAO, college website, or private institution. You complete and submit the application yourself. <span className="font-medium text-gray-700">Free.</span>
          </p>
          <div className="mt-4 flex items-center gap-1 text-sm font-bold" style={{ color: "#FF7A18" }}>
            Get started <FiArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Get Help */}
        <button
          onClick={() => setView("help")}
          className="rounded-2xl p-6 text-left hover:opacity-95 hover:shadow-md transition-all shadow-sm group relative overflow-hidden"
          style={{ background: "#FF7A18" }}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-white/20">🤝</div>
            {bucketCourses.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                {bucketCourses.length} selected
              </span>
            )}
          </div>
          <p className="font-bold text-white text-base mb-1">Get Help Applying</p>
          <p className="text-sm text-white/80 leading-relaxed">
            Our team personally handles your applications from start to finish — we contact you, submit everything, and keep you updated. <span className="font-bold text-white">R{HELP_PRICE} once-off.</span>
          </p>
          <div className="mt-4 flex items-center gap-1 text-sm font-bold text-white">
            Get started <FiArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Course preview (if courses selected) */}
      {bucketCourses.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Your selected courses</p>
          </div>
          <div className="divide-y divide-gray-50">
            {bucketCourses.slice(0, 5).map(b => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{b.course_title}</p>
                  <p className="text-[10px] text-gray-400">{b.institution_name}</p>
                </div>
              </div>
            ))}
            {bucketCourses.length > 5 && (
              <div className="px-4 py-2 text-xs text-gray-400">
                + {bucketCourses.length - 5} more
              </div>
            )}
          </div>
          <div className="px-4 py-2 border-t border-gray-50">
            <button
              onClick={() => navigate("/eligibility")}
              className="text-xs font-semibold"
              style={{ color: "#FF7A18" }}
            >
              + Add more courses in My Matches
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
