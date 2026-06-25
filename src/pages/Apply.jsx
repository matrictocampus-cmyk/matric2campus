import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, X, CheckCircle, AlertCircle, Loader, FileText, User } from "lucide-react";

// ── Status config ──────────────────────────────────────────────────────────────
const BUNDLE_STATUS = {
  pending_documents: { label: "Pending Documents",  color: "amber",  step: 0 },
  in_progress:       { label: "In Progress",         color: "blue",   step: 1 },
  submitted:         { label: "Submitted",           color: "purple", step: 2 },
  action_required:   { label: "Action Required",     color: "orange", step: 1 },
  completed:         { label: "Completed",           color: "green",  step: 3 },
  rejected:          { label: "Rejected",            color: "red",    step: 3 },
};

const APP_STATUS_COLORS = {
  pending_documents: "bg-amber-100 text-amber-700",
  in_progress:       "bg-blue-100 text-blue-700",
  submitted:         "bg-purple-100 text-purple-700",
  action_required:   "bg-orange-100 text-orange-700",
  completed:         "bg-green-100 text-green-700",
  rejected:          "bg-red-100 text-red-700",
};

const FALLBACK_PACKAGES = [
  { id: "UNI",     key: "UNI",     label: "Universities Only",  description: "Apply to all universities",    price: 75,  limits: { university: 6 },             isFundingOnly: false },
  { id: "TVET",    key: "TVET",    label: "TVET Colleges",      description: "Apply to all TVET colleges",   price: 105, limits: { college: 12 },               isFundingOnly: false },
  { id: "PRIVATE", key: "PRIVATE", label: "Private Colleges",   description: "Apply to all private colleges",price: 90,  limits: { private_college: 8 },        isFundingOnly: false },
  { id: "COMBO",   key: "COMBO",   label: "Combo Package",      description: "Universities + TVET + Funding",price: 250, limits: { university: 6, college: 12 }, isFundingOnly: false },
  { id: "FUNDING", key: "FUNDING", label: "Funding Application",description: "NSFAS, Bursary, etc.",         price: 65,  limits: {},                            isFundingOnly: true  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function Apply() {
  const navigate = useNavigate();
  const location = useLocation();
  const assistantWindowRef = useRef(null);

  // Pre-payment flow
  const [packages, setPackages]               = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [bucket, setBucket]                   = useState([]);
  const [error, setError]                     = useState("");
  const [info, setInfo]                       = useState("");
  const [loading, setLoading]                 = useState(true);
  const [currentStep, setCurrentStep]         = useState("select-package");
  const [paymentMethod, setPaymentMethod]     = useState(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [postPaymentChoice, setPostPaymentChoice] = useState(null);
  const [submittedCount, setSubmittedCount]   = useState(0);

  // User data
  const [userProfile, setUserProfile]   = useState(null);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [userId, setUserId]             = useState(null);

  // Active bundle
  const [activeBundle, setActiveBundle]               = useState(null);
  const [activeApplications, setActiveApplications]   = useState([]);
  const [bucketForBundle, setBucketForBundle]         = useState([]); // new bucket items user can add to existing bundle

  // Document upload (shared by post-payment and active bundle)
  const [showDocModal, setShowDocModal]       = useState(false);
  const [docModalStep, setDocModalStep]       = useState(1);
  const [termsAccepted, setTermsAccepted]     = useState(false);
  const [uploading, setUploading]             = useState(false);
  const [uploadedDocs, setUploadedDocs]       = useState({ id: null, transcript: null, other: [] });
  const [idCertified, setIdCertified]         = useState(false);
  const [docUploadSuccess, setDocUploadSuccess] = useState(false);

  // History
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyBundles, setHistoryBundles]     = useState([]);
  const [historyLoading, setHistoryLoading]     = useState(false);

  // ── Derived permissions ────────────────────────────────────────────────────
  const canEditBundle = activeBundle &&
    activeBundle.status === "pending_documents" &&
    !activeBundle.locked &&
    !activeBundle.assigned_admin_id;

  const needsUserAction = activeBundle?.status === "action_required";

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => { initializeUser(); }, [location.key]);

  const initializeUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      setUserId(user.id);

      const [{ data: profile }, { data: eligibility }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("eligibilities").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setUserProfile(profile);
      setEligibilityData(eligibility);

      const { data: bundle } = await supabase
        .from("application_bundles")
        .select("*")
        .eq("user_id", user.id)
        .not("status", "in", '("completed","rejected")')
        .maybeSingle();

      if (bundle) {
        setActiveBundle(bundle);
        const [{ data: apps }, { data: bucketItems }] = await Promise.all([
          supabase.from("applications").select("*").eq("bundle_id", bundle.id),
          supabase.from("application_bucket").select("id, course_title, institution_type, institution_name, program_id")
            .eq("user_id", user.id).is("package_id", null),
        ]);
        setActiveApplications(apps || []);
        if (bucketItems?.length) {
          setBucketForBundle(bucketItems.map(item => ({
            id: item.id,
            title: item.course_title,
            type: item.institution_type,
            institution: item.institution_name,
            courseId: item.program_id,
          })));
        }
      } else {
        await Promise.all([fetchPackagesFromDB(), loadBucketFromDB(user.id)]);
      }
    } catch (err) {
      console.error("Init error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadBucketFromDB = async (uid) => {
    const { data } = await supabase
      .from("application_bucket")
      .select("id, course_title, institution_type, institution_name, program_id")
      .eq("user_id", uid).is("package_id", null);
    if (data) setBucket(data.map(item => ({
      id: item.id, title: item.course_title,
      type: item.institution_type, institution: item.institution_name,
      courseId: item.program_id,
    })));
  };

  // ── Fetch packages ─────────────────────────────────────────────────────────
  const fetchPackagesFromDB = async () => {
    try {
      const { data, error: err } = await supabase
        .from("packages").select("*, package_limits(*)")
        .eq("is_active", true).order("price", { ascending: true });
      if (err) throw err;
      const pkgs = (data || []).map(pkg => {
        const limits = {};
        (pkg.package_limits || []).forEach(l => { limits[l.institution_type] = l.max_courses; });
        return { id: pkg.id, key: pkg.id, label: pkg.name, description: pkg.description || "",
          price: parseFloat(pkg.price) || 0, limits,
          isFundingOnly: Object.keys(limits).length === 0 };
      });
      setPackages(pkgs.length > 0 ? pkgs : FALLBACK_PACKAGES);
    } catch {
      setPackages(FALLBACK_PACKAGES);
    }
  };

  // ── Auto-suggest package ───────────────────────────────────────────────────
  useEffect(() => {
    if (packages.length === 0 || bucket.length === 0 || selectedPackage) return;
    const suggested = findPackageThatFits(bucket);
    if (suggested) setSelectedPackage(suggested);
  }, [packages, bucket]);

  useEffect(() => {
    if (selectedPackage && !selectedPackage.isFundingOnly) {
      const exceeded = checkExceeds(selectedPackage, bucket);
      setError(exceeded.length ? `Package too small: ${exceeded.join(", ")}` : "");
    } else setError("");
  }, [selectedPackage, bucket]);

  // ── CAO Assistant ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onMessage = (e) => {
      if (e.data?.type === "TXI_CAO_READY") {
        assistantWindowRef.current?.postMessage({ type: "TXI_CAO_DATA", payload: buildCaoData() }, window.location.origin);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [userProfile, bucket]);

  const buildCaoData = () => {
    const subjectsList = Object.entries(userProfile?.subjects_marks || {}).map(([subject, range]) => {
      const pct = parseInt(String(range).match(/(\d+)/)?.[1] || "0");
      const apsLevel = pct >= 80 ? 7 : pct >= 70 ? 6 : pct >= 60 ? 5 : pct >= 50 ? 4 : pct >= 40 ? 3 : pct >= 30 ? 2 : 1;
      return { subject, range, apsLevel, isLO: /life orientation/i.test(subject) };
    });
    return {
      personalInfo: { firstName: userProfile?.first_name || "", lastName: userProfile?.last_name || "",
        idNumber: userProfile?.id_number || "", email: userProfile?.email || "", phone: userProfile?.phone || "" },
      academicInfo: { totalAPS: subjectsList.filter(s => !s.isLO).reduce((sum, s) => sum + s.apsLevel, 0), subjects: subjectsList },
      courseChoices: (activeApplications.length > 0 ? activeApplications : bucket).map((it, idx) => ({
        choiceNumber: idx + 1, course: it.course_title || it.title, institution: it.institution_name || it.institution || "",
      })),
      packageInfo: selectedPackage ? { name: selectedPackage.label, price: selectedPackage.price } : null,
      paymentInfo: { reference: referenceNumber },
    };
  };

  const openCAOAssistant = () => {
    const w = window.open("/cao-assistant.html", "_blank", "width=1200,height=800");
    assistantWindowRef.current = w;
    setInfo(w ? "CAO Assistant opened in a new tab." : "Popup blocked — please allow popups.");
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  function countType(typeKey) { return bucket.filter(b => b.type === typeKey).length; }

  function checkExceeds(pkg, items) {
    const limits = pkg.limits || {};
    const usage = {
      university:     items.filter(b => b.type === "university").length,
      college:        items.filter(b => b.type === "college").length,
      private_college:items.filter(b => b.type === "private_college").length,
    };
    return Object.entries(usage)
      .filter(([k, v]) => v > (limits[k] || 0))
      .map(([k, v]) => `${k} (${v}/${limits[k] || 0})`);
  }

  function findPackageThatFits(items) {
    return [...packages].sort((a, b) => a.price - b.price)
      .find(p => !p.isFundingOnly && checkExceeds(p, items).length === 0) || null;
  }

  // ── Bucket actions (pre-payment) ───────────────────────────────────────────
  const removeFromBucket = async (itemId) => {
    const { error: err } = await supabase.from("application_bucket").delete().eq("id", itemId);
    if (err) { setError("Failed to remove."); return; }
    setBucket(prev => prev.filter(b => b.id !== itemId));
  };

  const clearBucket = async () => {
    if (!userId || !window.confirm("Clear all courses?")) return;
    await supabase.from("application_bucket").delete().eq("user_id", userId).is("package_id", null);
    setBucket([]); setSelectedPackage(null);
  };

  // ── Active bundle actions ──────────────────────────────────────────────────
  const removeApplication = async (appId) => {
    if (!canEditBundle) return;
    if (!window.confirm("Remove this course from your application?")) return;
    const { error: err } = await supabase.from("applications").delete().eq("id", appId);
    if (err) { setError("Failed to remove."); return; }
    setActiveApplications(prev => prev.filter(a => a.id !== appId));
  };

  const addBucketToBundle = async () => {
    if (!activeBundle || bucketForBundle.length === 0) return;
    try {
      const toInsert = bucketForBundle.map(item => ({
        bundle_id: activeBundle.id,
        user_id: userId,
        institution_type: item.type === "university" ? "UNIVERSITY" : item.type === "college" ? "TVET" : "PRIVATE",
        institution_name: item.institution,
        course_title: item.title,
        status: "pending_documents",
      }));
      const { data: newApps, error: err } = await supabase.from("applications").insert(toInsert).select();
      if (err) throw err;
      await supabase.from("application_bucket").delete().eq("user_id", userId).is("package_id", null);
      setActiveApplications(prev => [...prev, ...(newApps || [])]);
      setBucketForBundle([]);
      setInfo(`${toInsert.length} course${toInsert.length !== 1 ? "s" : ""} added to your application.`);
      setTimeout(() => setInfo(""), 3000);
    } catch (err) {
      setError("Failed to add courses. Please try again.");
    }
  };

  // ── Document upload (used both post-payment and from active bundle) ─────────
  const openDocModal = () => {
    setShowDocModal(true); setDocModalStep(1); setTermsAccepted(false);
    setUploadedDocs({ id: null, transcript: null, other: [] });
    setIdCertified(false); setDocUploadSuccess(false); setError("");
  };

  const submitDocuments = async () => {
    setUploading(true);
    try {
      const { data: request, error: reqErr } = await supabase
        .from("admin_assistance_requests")
        .insert({ user_id: userId, status: "pending", terms_accepted_at: new Date().toISOString() })
        .select().single();
      if (reqErr) throw reqErr;

      const uploadDoc = async (file, prefix) => {
        const path = `${userId}/${request.id}/${prefix}_${Date.now()}.${file.name.split(".").pop()}`;
        const { error: upErr } = await supabase.storage.from("user-documents").upload(path, file);
        if (upErr) throw upErr;
        await supabase.from("user_documents").insert({ request_id: request.id, file_name: file.name, file_path: path });
      };

      if (uploadedDocs.id) await uploadDoc(uploadedDocs.id, "id");
      if (uploadedDocs.transcript) await uploadDoc(uploadedDocs.transcript, "transcript");
      for (const f of uploadedDocs.other) await uploadDoc(f, "other");

      setDocUploadSuccess(true);
      setShowDocModal(false);
      setInfo("Documents submitted. Our team will contact you shortly.");
      setPostPaymentChoice("admin");
      setTimeout(() => setInfo(""), 5000);
    } catch (err) {
      console.error("Doc upload error:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Flow: proceed to payment ───────────────────────────────────────────────
  const proceedToPayment = () => {
    setError("");
    if (!selectedPackage) { setError("Please select a package"); return; }
    if (!selectedPackage.isFundingOnly && bucket.length === 0) {
      setError("Please add at least one course to your bucket"); return;
    }
    const exceeded = checkExceeds(selectedPackage, bucket);
    if (exceeded.length) { setError(`Package cannot fit your bucket: ${exceeded.join(", ")}`); return; }
    setReferenceNumber(`TXI-${(userId || "anon").slice(-6)}-${new Date().toISOString().split("T")[0].replace(/-/g, "")}`);
    setCurrentStep("payment");
  };

  const handlePaymentConfirmation = async () => {
    setError("");
    try {
      await supabase.from("application_packages").insert({
        user_id: userId, package_type: selectedPackage.label, price: selectedPackage.price,
        uni_limit: selectedPackage.limits.university || 0,
        tvet_limit: selectedPackage.limits.college || 0,
        private_limit: selectedPackage.limits.private_college || 0,
        status: "pending",
      });

      const { data: bundle, error: bundleErr } = await supabase
        .from("application_bundles")
        .insert({ user_id: userId, package_type: selectedPackage.label, status: "pending_documents" })
        .select().single();
      if (bundleErr) throw bundleErr;

      if (bucket.length > 0) {
        const { error: appsErr } = await supabase.from("applications").insert(
          bucket.map(item => ({
            bundle_id: bundle.id, user_id: userId,
            institution_type: item.type === "university" ? "UNIVERSITY" : item.type === "college" ? "TVET" : "PRIVATE",
            institution_name: item.institution, course_title: item.title,
            status: "pending_documents",
          }))
        );
        if (appsErr) throw appsErr;
      }

      await supabase.from("application_bucket").delete().eq("user_id", userId).is("package_id", null);
      setSubmittedCount(bucket.length);
      setCurrentStep("post-payment");
    } catch (err) {
      console.error("Payment error:", err);
      setError("Failed to process. Please try again.");
    }
  };

  // ── History ────────────────────────────────────────────────────────────────
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from("application_bundles")
        .select("id, bundle_ref, created_at, status, applications(institution_name, course_title, status, admin_comment)")
        .eq("user_id", userId)
        .in("status", ["completed", "rejected", "action_required"])
        .order("created_at", { ascending: false });
      setHistoryBundles(data || []);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDERS
  // ══════════════════════════════════════════════════════════════════════════

  // ── Status badge ──────────────────────────────────────────────────────────
  const StatusBadge = ({ status, size = "md" }) => {
    const cfg = BUNDLE_STATUS[status] || { label: status, color: "gray" };
    const colors = {
      amber: "bg-amber-100 text-amber-800 border-amber-200",
      blue: "bg-blue-100 text-blue-800 border-blue-200",
      purple: "bg-purple-100 text-purple-800 border-purple-200",
      orange: "bg-orange-100 text-orange-800 border-orange-200",
      green: "bg-green-100 text-green-800 border-green-200",
      red: "bg-red-100 text-red-800 border-red-200",
      gray: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return (
      <span className={`border rounded-full font-semibold ${colors[cfg.color]} ${size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"}`}>
        {cfg.label.replace(/_/g, " ")}
      </span>
    );
  };

  // ── Progress timeline ──────────────────────────────────────────────────────
  const Timeline = ({ status }) => {
    const steps = ["Documents", "In Review", "Submitted", "Done"];
    const current = BUNDLE_STATUS[status]?.step ?? 0;
    const isRejected = status === "rejected";
    const isActionRequired = status === "action_required";

    return (
      <div className="flex items-center gap-0">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current && !isRejected;
          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  isRejected && i === current ? "border-red-500 bg-red-100 text-red-700" :
                  isActionRequired && i === current ? "border-orange-500 bg-orange-100 text-orange-700" :
                  done ? "border-green-500 bg-green-500 text-white" :
                  active ? "border-blue-500 bg-blue-500 text-white" :
                  "border-gray-200 bg-gray-50 text-gray-400"
                }`}>
                  {done ? "✓" : i + 1}
                </div>
                <p className={`text-xs mt-1 whitespace-nowrap ${
                  done ? "text-green-600 font-medium" :
                  active ? "text-blue-600 font-medium" :
                  "text-gray-400"
                }`}>{label}</p>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mb-5 ${done ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // ── ACTIVE BUNDLE VIEW ────────────────────────────────────────────────────
  const renderActiveBundleView = () => {
    const appStatuses = [...new Set(activeApplications.map(a => a.status))];
    const hasAdminComments = activeApplications.some(a => a.admin_comment);

    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Application</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Bundle #{activeBundle.bundle_ref || activeBundle.id} · Created {new Date(activeBundle.created_at).toLocaleDateString("en-ZA")}
            </p>
          </div>
          <StatusBadge status={activeBundle.status} />
        </div>

        {/* Progress timeline */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <Timeline status={activeBundle.status} />
        </div>

        {info && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{info}</div>}
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        {/* ── PENDING DOCUMENTS: action panel ──────────────────────────────── */}
        {activeBundle.status === "pending_documents" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">
                  {canEditBundle ? "Complete your application" : "Application pending — being reviewed"}
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  {canEditBundle
                    ? "Choose how you'd like to complete your CAO application below. You can also edit your course selection."
                    : "An admin has picked up your bundle. Changes are locked while it's being processed."}
                </p>
              </div>
            </div>

            {canEditBundle && (
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  onClick={openCAOAssistant}
                  className="flex items-center gap-3 bg-white border border-amber-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-4 text-left transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-lg">🧑‍💻</div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Do It Myself</p>
                    <p className="text-xs text-gray-500">Open CAO Assistant — data pre-filled</p>
                    <p className="text-xs text-green-600 font-medium mt-0.5">Available now</p>
                  </div>
                </button>
                <button
                  onClick={openDocModal}
                  className="flex items-center gap-3 bg-white border border-amber-200 hover:border-purple-400 hover:bg-purple-50 rounded-xl p-4 text-left transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 text-lg">📋</div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Admin Assistance</p>
                    <p className="text-xs text-gray-500">Upload documents for our team to apply</p>
                    <p className="text-xs text-purple-600 font-medium mt-0.5">{docUploadSuccess ? "✓ Submitted" : "Upload ID + transcript"}</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ACTION REQUIRED: admin flagged an issue ───────────────────────── */}
        {needsUserAction && (
          <div className="bg-orange-50 border border-orange-300 rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-800">Admin requires additional information</p>
                <p className="text-sm text-orange-700 mt-0.5">Review the comments below on each application, then upload any requested documents.</p>
              </div>
            </div>
            <button
              onClick={openDocModal}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              Upload Response Documents
            </button>
          </div>
        )}

        {/* ── IN PROGRESS / SUBMITTED ───────────────────────────────────────── */}
        {(activeBundle.status === "in_progress" || activeBundle.status === "submitted") && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-3">
            <Loader size={20} className="text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="font-semibold text-blue-800">
                {activeBundle.status === "in_progress" ? "Our team is processing your application" : "Application submitted to institutions"}
              </p>
              <p className="text-sm text-blue-700 mt-0.5">No changes can be made at this stage. We'll update the status here once there's progress.</p>
            </div>
          </div>
        )}

        {/* ── Add new bucket items to existing bundle ──────────────────────── */}
        {canEditBundle && bucketForBundle.length > 0 && (
          <div className="bg-blue-50 border border-blue-300 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-blue-800 text-sm">
              You have {bucketForBundle.length} new course{bucketForBundle.length !== 1 ? "s" : ""} in your bucket
            </p>
            <div className="space-y-1.5">
              {bucketForBundle.map(item => (
                <div key={item.id} className="text-xs text-blue-700 bg-white/70 rounded px-3 py-1.5">
                  {item.title} — <span className="text-blue-500">{item.institution}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={addBucketToBundle} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                Add to Application
              </button>
              <button onClick={() => setBucketForBundle([])} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ── Applications list ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Applications ({activeApplications.length})</h2>
            {canEditBundle && (
              <button
                onClick={() => navigate("/eligibility")}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add more courses
              </button>
            )}
          </div>

          {activeApplications.length === 0 ? (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center">
              <p className="text-gray-400 text-sm">No courses in this application.</p>
              {canEditBundle && (
                <button onClick={() => navigate("/eligibility")} className="mt-2 text-blue-600 text-sm font-medium hover:underline">
                  Browse courses →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {activeApplications.map(app => (
                <div key={app.id} className="bg-white border border-gray-200 rounded-xl px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-snug">{app.course_title || "Course"}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{app.institution_name}</p>
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${APP_STATUS_COLORS[app.status] || "bg-gray-100 text-gray-600"}`}>
                          {(app.status || "pending").replace(/_/g, " ")}
                        </span>
                      </div>
                      {app.admin_comment && (
                        <div className="mt-2 p-2.5 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
                          <User size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-orange-700">Admin note</p>
                            <p className="text-xs text-orange-700 mt-0.5">{app.admin_comment}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {canEditBundle && (
                      <button onClick={() => removeApplication(app.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0 mt-0.5 transition-colors" title="Remove course">
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Blocking message (for non-editable states that aren't done) ───── */}
        {!canEditBundle && !needsUserAction && activeBundle.status !== "completed" && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 text-center">
            A new application opens once this bundle is <strong>completed</strong> or <strong>rejected</strong>.
          </div>
        )}
      </div>
    );
  };

  // ── STEP 1: Select package + bucket ───────────────────────────────────────
  const renderPackageStep = () => {
    const usage = {
      university:      countType("university"),
      college:         countType("college"),
      private_college: countType("private_college"),
    };
    const suggestedPkg = findPackageThatFits(bucket);

    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Apply with TXI</h1>
          <p className="text-gray-500 text-sm mt-1">Review your courses, choose a package, then pay</p>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        {info && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{info}</div>}

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Bucket */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Your Bucket ({bucket.length})</h2>
              {bucket.length > 0 && <button onClick={clearBucket} className="text-xs text-red-500 hover:text-red-700">Clear all</button>}
            </div>

            {bucket.length === 0 ? (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center">
                <p className="text-gray-400 text-sm">No courses added yet.</p>
                <button onClick={() => navigate("/eligibility")} className="mt-2 text-blue-600 text-sm font-medium hover:underline">
                  Browse eligible courses →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {bucket.map(item => (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.institution}</p>
                      <span className="inline-block mt-1 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {item.type === "university" ? "University" : item.type === "college" ? "TVET" : "Private"}
                      </span>
                    </div>
                    <button onClick={() => removeFromBucket(item.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0 mt-0.5 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => navigate("/eligibility")}
                  className="w-full py-2.5 border border-dashed border-blue-300 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors"
                >
                  + Add more courses
                </button>
              </div>
            )}

            {bucket.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs text-gray-600">
                {usage.university > 0 && <div className="flex justify-between"><span>Universities</span><span className="font-semibold">{usage.university}</span></div>}
                {usage.college > 0 && <div className="flex justify-between"><span>TVET Colleges</span><span className="font-semibold">{usage.college}</span></div>}
                {usage.private_college > 0 && <div className="flex justify-between"><span>Private Colleges</span><span className="font-semibold">{usage.private_college}</span></div>}
              </div>
            )}
          </div>

          {/* Right: Packages */}
          <div className="lg:col-span-3 space-y-3">
            <h2 className="font-semibold text-gray-900">Choose a Package</h2>
            <div className="space-y-3">
              {packages.map(pkg => {
                const fits = pkg.isFundingOnly || checkExceeds(pkg, bucket).length === 0;
                const isSelected = selectedPackage?.id === pkg.id;
                const isRecommended = suggestedPkg?.id === pkg.id && bucket.length > 0;

                return (
                  <div
                    key={pkg.id}
                    onClick={() => fits && (setSelectedPackage(pkg), setError(""))}
                    className={`relative border-2 rounded-xl p-4 transition-all ${
                      !fits ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed" :
                      isSelected ? "border-blue-600 bg-blue-50 cursor-pointer" :
                      "border-gray-200 bg-white hover:border-blue-300 cursor-pointer"
                    }`}
                  >
                    {isRecommended && (
                      <span className="absolute -top-2.5 left-4 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? "border-blue-600" : "border-gray-300"}`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                          </div>
                          <p className="font-semibold text-gray-900">{pkg.label}</p>
                        </div>
                        {pkg.description && <p className="text-xs text-gray-500 mt-1 ml-6">{pkg.description}</p>}
                        {!pkg.isFundingOnly && (
                          <div className="ml-6 mt-2 flex flex-wrap gap-1.5">
                            {pkg.limits.university && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${usage.university > pkg.limits.university ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                                Uni: {usage.university}/{pkg.limits.university}
                              </span>
                            )}
                            {pkg.limits.college && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${usage.college > pkg.limits.college ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                                TVET: {usage.college}/{pkg.limits.college}
                              </span>
                            )}
                            {pkg.limits.private_college && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${usage.private_college > pkg.limits.private_college ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                                Private: {usage.private_college}/{pkg.limits.private_college}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-bold text-gray-900">R{pkg.price}</p>
                        {!fits && bucket.length > 0 && <p className="text-xs text-red-500 mt-0.5">Bucket too large</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={proceedToPayment}
              disabled={!selectedPackage}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors mt-2 ${
                selectedPackage ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {selectedPackage ? `Proceed to Payment — R${selectedPackage.price}` : "Select a package to continue"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── STEP 2: Payment ────────────────────────────────────────────────────────
  const renderPaymentStep = () => (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
      <button onClick={() => setCurrentStep("select-package")} className="text-sm text-blue-600 hover:text-blue-800 font-medium">← Back</button>
      <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">{selectedPackage?.label}</p>
          <p className="text-sm text-gray-500">{bucket.length} course{bucket.length !== 1 ? "s" : ""} selected</p>
        </div>
        <p className="text-2xl font-bold text-gray-900">R{selectedPackage?.price}</p>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-gray-900">Payment Method</h2>
        {[
          { key: "bank",    label: "Manual Bank Transfer (EFT)",  sub: "Pay via internet banking or at the bank",      avail: true },
          { key: "payfast", label: "Card Payment (PayFast)",       sub: "Coming soon — use bank transfer for now",      avail: false },
        ].map(({ key, label, sub, avail }) => (
          <div key={key} onClick={() => setPaymentMethod(key)}
            className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
              paymentMethod === key ? (key === "bank" ? "border-blue-600 bg-blue-50" : "border-green-500 bg-green-50") : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                paymentMethod === key ? (key === "bank" ? "border-blue-600" : "border-green-500") : "border-gray-300"
              }`}>
                {paymentMethod === key && <div className={`w-2.5 h-2.5 rounded-full ${key === "bank" ? "bg-blue-600" : "bg-green-500"}`} />}
              </div>
              <div>
                <p className="font-medium text-gray-900">{label}</p>
                <p className={`text-xs ${avail ? "text-gray-500" : "text-amber-600"}`}>{sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {paymentMethod === "bank" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Bank Details</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-500 text-xs">Bank</p><p className="font-semibold">ABSA</p></div>
            <div><p className="text-gray-500 text-xs">Branch Code</p><p className="font-semibold">632005</p></div>
            <div className="sm:col-span-2"><p className="text-gray-500 text-xs">Account Number</p><p className="font-bold text-xl">4116206388</p></div>
            <div><p className="text-gray-500 text-xs">Account Type</p><p className="font-semibold">Classic Business Account</p></div>
          </div>
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">Your Reference Number</p>
            <p className="font-bold text-2xl text-blue-700 mt-0.5 tracking-wide">{referenceNumber}</p>
            <p className="text-xs text-amber-700 mt-1.5">⚠ Use this exact reference when making your payment</p>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Keep your proof of payment</p>
            <p>• Confirmation may take 1–2 business days</p>
          </div>
        </div>
      )}

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <button
        onClick={handlePaymentConfirmation}
        disabled={!paymentMethod}
        className={`w-full py-3 rounded-xl font-semibold transition-colors ${
          paymentMethod ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        {paymentMethod === "bank" ? "I have made the payment →" : "Continue →"}
      </button>
    </div>
  );

  // ── STEP 3: Post-payment ───────────────────────────────────────────────────
  const renderPostPaymentStep = () => (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
      <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
        <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
        <div>
          <p className="font-semibold text-green-800">Payment confirmed — application created!</p>
          <p className="text-sm text-green-700 mt-0.5">
            {submittedCount} course{submittedCount !== 1 ? "s" : ""} submitted · <strong>{selectedPackage?.label}</strong>
          </p>
        </div>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900">How would you like to complete your CAO application?</h1>
        <p className="text-gray-500 text-sm mt-1">You can also come back to this page at any time — your application stays open until an admin starts processing it.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <button
          onClick={() => { openCAOAssistant(); setPostPaymentChoice("self"); }}
          className="border-2 border-gray-200 hover:border-blue-400 rounded-xl p-5 text-left space-y-2 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl">🧑‍💻</div>
          <p className="font-bold text-gray-900">Do It Myself</p>
          <p className="text-sm text-gray-500">Open CAO Assistant — all your data is pre-filled. Copy into the CAO portal.</p>
          <p className="text-xs text-green-600 font-semibold">Available now</p>
        </button>

        <button
          onClick={openDocModal}
          className="border-2 border-gray-200 hover:border-purple-400 rounded-xl p-5 text-left space-y-2 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-xl">📋</div>
          <p className="font-bold text-gray-900">Admin Assistance</p>
          <p className="text-sm text-gray-500">Upload your ID + transcript and our team will handle your CAO application.</p>
          <p className="text-xs text-purple-600 font-semibold">{docUploadSuccess ? "✓ Documents submitted" : "Upload documents"}</p>
        </button>
      </div>

      {(postPaymentChoice === "self" || postPaymentChoice === "admin") && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          {postPaymentChoice === "self"
            ? "CAO Assistant opened. Use it to copy your data into the CAO portal."
            : "Documents submitted. Our team will contact you shortly."}
        </div>
      )}

      {info && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{info}</div>}
    </div>
  );

  // ── Document upload modal ──────────────────────────────────────────────────
  const DocModal = () => !showDocModal ? null : (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {docModalStep === 1 ? "Terms & Conditions" : "Upload Documents"}
            </h2>
            <button onClick={() => setShowDocModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold ${docModalStep >= 1 ? "bg-blue-600 text-white" : "bg-gray-200"}`}>1</span>
            <span className="flex-1 h-px bg-gray-200" />
            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold ${docModalStep >= 2 ? "bg-blue-600 text-white" : "bg-gray-200"}`}>2</span>
          </div>

          {docModalStep === 1 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2 max-h-48 overflow-y-auto">
                <p>By requesting admin assistance, you agree to share your personal information (ID, academic records, contact details) with our authorised support team solely for processing your applications.</p>
                <p>We comply with POPIA. Your data is encrypted, access-restricted, and deleted 30 days after processing. We will not share your information with third parties without your explicit consent.</p>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                I have read and agree to the terms
              </label>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowDocModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={() => setDocModalStep(2)} disabled={!termsAccepted}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${termsAccepted ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {docModalStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Upload clear, legible documents. Your ID must be a certified copy (less than 3 months old).</p>

              {[
                { label: "1. Certified ID Copy", key: "id", hint: "Must be certified within last 3 months", required: true },
                { label: "2. Latest Academic Transcript", key: "transcript", hint: "Grade 11/12 or latest results", required: true },
              ].map(({ label, key, hint }) => (
                <div key={key} className="border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400">{hint}</p>
                    </div>
                    {uploadedDocs[key] && <span className="text-xs text-green-600 font-medium">✓ Ready</span>}
                  </div>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => setUploadedDocs(prev => ({ ...prev, [key]: e.target.files[0] || null }))}
                    className="text-sm w-full" />
                  {key === "id" && (
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={idCertified} onChange={e => setIdCertified(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
                      I confirm this is a certified copy less than 3 months old
                    </label>
                  )}
                </div>
              ))}

              <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Additional Documents <span className="text-gray-400 font-normal">(optional)</span></p>
                <p className="text-xs text-gray-400">Proof of payment, supporting letters, etc.</p>
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setUploadedDocs(prev => ({ ...prev, other: [...prev.other, ...Array.from(e.target.files)] }))}
                  className="text-sm w-full" />
                {uploadedDocs.other.length > 0 && <p className="text-xs text-gray-500">{uploadedDocs.other.length} extra file(s) selected</p>}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-3">
                <button onClick={() => setDocModalStep(1)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Back</button>
                <button
                  onClick={submitDocuments}
                  disabled={!uploadedDocs.id || !uploadedDocs.transcript || !idCertified || uploading}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                    !uploading && uploadedDocs.id && uploadedDocs.transcript && idCertified
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {uploading && <Loader size={14} className="animate-spin" />}
                  {uploading ? "Uploading…" : "Submit Documents"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── History modal ──────────────────────────────────────────────────────────
  const HistoryModal = () => !showHistoryModal ? null : (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Application History</h2>
            <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          {historyLoading ? (
            <div className="text-center py-6"><Loader size={20} className="animate-spin text-gray-400 mx-auto" /></div>
          ) : historyBundles.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">No past applications found.</div>
          ) : (
            <div className="space-y-3">
              {historyBundles.map(bundle => (
                <div key={bundle.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900 text-sm">Bundle #{bundle.bundle_ref || bundle.id}</p>
                    <StatusBadge status={bundle.status} size="sm" />
                  </div>
                  <p className="text-xs text-gray-400">{new Date(bundle.created_at).toLocaleDateString("en-ZA")}</p>
                  <div className="space-y-1.5">
                    {bundle.applications?.map((app, i) => (
                      <div key={i} className="text-xs text-gray-600 bg-gray-50 rounded px-3 py-2">
                        <span className="font-medium">{app.course_title}</span> — {app.institution_name}
                        {app.admin_comment && <p className="text-orange-600 mt-0.5">💬 {app.admin_comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Main render ────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-pulse text-gray-500 text-sm">Loading…</div>
    </div>
  );

  return (
    <>
      {activeBundle
        ? renderActiveBundleView()
        : currentStep === "select-package" ? renderPackageStep()
        : currentStep === "payment" ? renderPaymentStep()
        : renderPostPaymentStep()}

      <DocModal />
      <HistoryModal />

      <button
        onClick={() => { fetchHistory(); setShowHistoryModal(true); }}
        className="fixed bottom-6 right-6 bg-gray-800 hover:bg-gray-900 text-white p-3.5 rounded-full shadow-lg z-40 transition-colors"
        title="View Application History"
      >
        <Clock size={18} />
      </button>
    </>
  );
}
