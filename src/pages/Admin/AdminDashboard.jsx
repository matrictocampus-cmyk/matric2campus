// AdminDashboard.jsx — FINAL with per-bundle modal and course actions (God Mode)
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  Search, Filter, LogOut, Bell, ChevronRight,
  Clock, CheckCircle, AlertCircle, Workflow,
  UserCheck, Package, RefreshCw, Eye,
  Calendar, Download, MoreVertical, CreditCard, HelpCircle, FileText, X
} from "lucide-react";

/* =====================================================
   HELPERS
   ===================================================== */
const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatDateTime = (dateString) =>
  new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatTime = (date) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

/* =====================================================
   COMPONENT
   ===================================================== */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [sessionUser, setSessionUser] = useState(null);
  const [availableBundles, setAvailableBundles] = useState([]);
  const [myWorkBundles, setMyWorkBundles] = useState([]);
  const [actionRequiredBundles, setActionRequiredBundles] = useState([]);
  const [completedBundles, setCompletedBundles] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [adminRequests, setAdminRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAttentionOnly, setShowAttentionOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Modal state for bundle details
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [selectedBundleUserId, setSelectedBundleUserId] = useState(null);
  const [bundleDetails, setBundleDetails] = useState([]); // will be array of rows from RPC
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Send message state (within bundle modal)
  const [msgText, setMsgText] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);

  // Modal state for comment on status update (existing)
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentBundle, setCommentBundle] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [targetStatus, setTargetStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* =====================================================
     SESSION
     ===================================================== */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setSessionUser(data.session.user);
    });
  }, []);

  /* =====================================================
     SAVE ADMIN ID FOR EXTENSION
     ===================================================== */
  useEffect(() => {
    if (!sessionUser?.id) return;
    try {
      localStorage.setItem("TXI_ADMIN_ID", sessionUser.id);
    } catch (e) {}
    window.dispatchEvent(
      new CustomEvent("TXI_ADMIN_SESSION", {
        detail: { id: sessionUser.id, email: sessionUser.email },
      })
    );
  }, [sessionUser]);

  /* =====================================================
     FETCH ALL DATA (includes pending_documents)
     ===================================================== */
  const fetchAllData = async () => {
    if (!sessionUser) return;
    setLoading(true);

    const selectConfig = `
      id,
      bundle_ref,
      status,
      created_at,
      updated_at,
      assigned_admin_id,
      user_id,
      applications(id,status)
    `;

    try {
      const [
        { data: availableData },
        { data: myWorkData },
        { data: actionRequiredData },
        { data: completedData },
      ] = await Promise.all([
        supabase
          .from("application_bundles")
          .select(selectConfig)
          .in("status", ["ready", "pending_documents"])
          .is("assigned_admin_id", null)
          .order("created_at", { ascending: false }),

        supabase
          .from("application_bundles")
          .select(selectConfig)
          .eq("assigned_admin_id", sessionUser.id)
          .in("status", ["ready", "pending_documents", "in_progress", "submitted"])
          .order("created_at", { ascending: false }),

        supabase
          .from("application_bundles")
          .select(selectConfig)
          .eq("assigned_admin_id", sessionUser.id)
          .eq("status", "action_required")
          .order("created_at", { ascending: false }),

        supabase
          .from("application_bundles")
          .select(selectConfig)
          .eq("assigned_admin_id", sessionUser.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false }),
      ]);

      setAvailableBundles(availableData || []);
      setMyWorkBundles(myWorkData || []);
      setActionRequiredBundles(actionRequiredData || []);
      setCompletedBundles(completedData || []);

      // 2. Fetch pending payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("application_packages")
        .select(`
          id,
          user_id,
          package_type,
          price,
          uni_limit,
          tvet_limit,
          private_limit,
          consultation_included,
          created_at
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;

      // 3. Fetch pending admin requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("admin_assistance_requests")
        .select(`
          id,
          user_id,
          status,
          terms_accepted_at,
          created_at
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      // 4. Get user profiles
      const userIds = [
        ...new Set([
          ...(paymentsData || []).map(p => p.user_id),
          ...(requestsData || []).map(r => r.user_id)
        ])
      ];

      let profilesMap = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, email, first_name, last_name")
          .in("user_id", userIds);

        if (profilesError) throw profilesError;

        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p;
          return acc;
        }, {});
      }

      const paymentsWithProfile = (paymentsData || []).map(p => ({
        ...p,
        profiles: profilesMap[p.user_id] || { email: "", first_name: "", last_name: "" }
      }));

      const requestsWithProfile = (requestsData || []).map(r => ({
        ...r,
        profiles: profilesMap[r.user_id] || { email: "", first_name: "", last_name: "" }
      }));

      setPendingPayments(paymentsWithProfile);
      setAdminRequests(requestsWithProfile);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [sessionUser]);

  /* =====================================================
     NOTIFICATION HELPER
     ===================================================== */
  const insertStatusNotification = async (bundleId, newStatus, customMessage = null) => {
    try {
      const allBundles = [
        ...availableBundles, ...myWorkBundles,
        ...actionRequiredBundles, ...completedBundles,
      ];
      const bund = allBundles.find(b => b.id === bundleId);
      const uid = bund?.user_id;
      if (!uid) return;

      const STATUS_NOTIFS = {
        in_progress:     { title: "Application In Progress",  msg: "Good news — our team is actively working on your application.",        type: "info"    },
        submitted:       { title: "Application Submitted",    msg: "Your applications have been submitted to the institution(s).",         type: "info"    },
        completed:       { title: "Application Completed!",   msg: "Your application has been fully processed. Check your email.",         type: "success" },
        action_required: { title: "Action Required",          msg: customMessage || "Our team needs more info. Please check your application.", type: "warning" },
        rejected:        { title: "Application Update",       msg: customMessage || "Your application was reviewed. Contact support for details.", type: "warning" },
      };

      const notif = STATUS_NOTIFS[newStatus];
      if (!notif) return;

      await supabase.from("notifications").insert({
        user_id:   uid,
        title:     notif.title,
        message:   notif.msg,
        type:      notif.type,
        bundle_id: bundleId,
      });
    } catch (err) {
      console.warn("Notification insert failed:", err);
    }
  };

  /* =====================================================
     BUNDLE ACTIONS (claim, simple status update)
     ===================================================== */
  const handleClaimBundle = async (bundleId) => {
    try {
      const { error } = await supabase.rpc("claim_bundle", { p_bundle_id: bundleId });
      if (error) throw error;
      fetchAllData();
    } catch (error) {
      console.error("Claim error:", error);
      alert("Failed to claim bundle.");
    }
  };

  const handleUpdateStatus = async (bundleId, newStatus) => {
    try {
      const { error } = await supabase.rpc("update_bundle_status", {
        p_bundle_id: bundleId,
        p_new_status: newStatus,
      });
      if (error) throw error;
      await insertStatusNotification(bundleId, newStatus);
      fetchAllData();
    } catch (error) {
      console.error("Status update error:", error);
      alert("Failed to update status.");
    }
  };

  // Open modal for comment (Flag Issue / Reject)
  const openCommentModal = (bundle, status) => {
    setCommentBundle(bundle);
    setTargetStatus(status);
    setCommentText("");
    setShowCommentModal(true);
  };

  const handleStatusWithComment = async () => {
    if (!commentText.trim()) {
      alert("Please enter a comment.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("update_bundle_status_with_comment", {
        p_bundle_id: commentBundle.id,
        p_new_status: targetStatus,
        p_admin_comment: commentText,
      });
      if (error) throw error;
      await insertStatusNotification(commentBundle.id, targetStatus, commentText);
      setShowCommentModal(false);
      fetchAllData();
    } catch (error) {
      console.error("Comment update error:", error);
      alert("Failed to update status.");
    } finally {
      setSubmitting(false);
    }
  };

  /* =====================================================
     PAYMENT CONFIRMATION
     ===================================================== */
  const handleConfirmPayment = async (payment) => {
    try {
      const { error: pkgError } = await supabase
        .from("application_packages")
        .update({ status: "active" })
        .eq("id", payment.id);
      if (pkgError) throw pkgError;

      const { error: txError } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: payment.user_id,
          amount: payment.price,
          type: "payment",
          reason: `Payment for ${payment.package_type} package`,
          reference_id: payment.id,
          reference_type: "application_package",
        });
      if (txError) throw txError;

      const { error: walletError } = await supabase.rpc("add_to_wallet", {
        p_user_id: payment.user_id,
        p_amount: payment.price,
      });
      if (walletError) throw walletError;

      try {
        await fetch("https://igfnrntcwzotligxdslf.supabase.co/functions/v1/send-payment-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: payment.profiles.email,
            name: `${payment.profiles.first_name || ""} ${payment.profiles.last_name || ""}`.trim(),
            amount: payment.price,
            package: payment.package_type,
          }),
        });
      } catch (emailErr) {
        console.warn("Email notification failed", emailErr);
      }

      fetchAllData();
    } catch (error) {
      console.error("Payment confirmation error:", error);
      alert("Failed to confirm payment.");
    }
  };

  /* =====================================================
     ADMIN REQUEST ACTIONS
     ===================================================== */
  const handleUpdateRequestStatus = async (requestId, newStatus) => {
    try {
      const { error } = await supabase
        .from("admin_assistance_requests")
        .update({ status: newStatus })
        .eq("id", requestId);
      if (error) throw error;
      fetchAllData();
    } catch (error) {
      console.error("Request status update error:", error);
      alert("Failed to update request status.");
    }
  };

  const handleViewDocuments = async (requestId, userId) => {
    alert(`Viewing documents for request ${requestId} – feature coming soon.`);
  };

  /* =====================================================
     LOGOUT
     ===================================================== */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  /* =====================================================
     FILTERS & STATS
     ===================================================== */
  const stats = useMemo(
    () => ({
      totalAvailable: availableBundles.length,
      totalMyWork: myWorkBundles.length,
      totalActionRequired: actionRequiredBundles.length,
      totalCompleted: completedBundles.length,
      pendingApplications: myWorkBundles.reduce(
        (acc, b) =>
          acc + (b.applications?.filter((app) => app.status === "pending")?.length || 0),
        0
      ),
      totalApplications: myWorkBundles.reduce(
        (acc, b) => acc + (b.applications?.length || 0),
        0
      ),
      pendingPayments: pendingPayments.length,
      pendingRequests: adminRequests.length,
    }),
    [availableBundles, myWorkBundles, actionRequiredBundles, completedBundles, pendingPayments, adminRequests]
  );

  const filterBundles = (bundles) =>
    bundles
      .filter((b) => !showAttentionOnly || ["action_required"].includes(b.status))
      .filter(
        (b) =>
          !searchQuery ||
          b.bundle_ref?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(b.id).includes(searchQuery)
      );

  const getStatusColor = (status) => {
    const colors = {
      ready: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      submitted: "bg-purple-100 text-purple-800",
      action_required: "bg-red-100 text-red-800",
      completed: "bg-green-100 text-green-800",
      rejected: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPaymentStatusColor = (status) => {
    return status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700";
  };

  /* =====================================================
     BUNDLE CARD COMPONENT – now clickable to open modal
     ===================================================== */
  const BundleCard = ({ bundle, showActions = true, showStatus = true }) => (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => {
        setSelectedBundle(bundle.id);
        fetchBundleDetails(bundle.id);
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-gray-400" />
            <h3 className="font-medium text-gray-900">{bundle.bundle_ref}</h3>
            {showStatus && (
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  bundle.status
                )}`}
              >
                {bundle.status?.replace("_", " ")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <UserCheck className="w-4 h-4" />
              {bundle.applications?.length || 0} applications
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(bundle.created_at)}
            </span>
          </div>
        </div>
        {showActions && (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); /* view details */ }}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="View details"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      {showActions && (
        <div className="flex gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
          {!bundle.assigned_admin_id ? (
            <button
              onClick={() => handleClaimBundle(bundle.id)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Claim Bundle
            </button>
          ) : (
            <>
              <button
                onClick={() => handleUpdateStatus(bundle.id, "in_progress")}
                className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
              >
                In Progress
              </button>
              <button
                onClick={() => handleUpdateStatus(bundle.id, "completed")}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                Complete
              </button>
              <button
                onClick={() => openCommentModal(bundle, "action_required")}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              >
                Flag Issue
              </button>
              <button
                onClick={() => openCommentModal(bundle, "rejected")}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                Reject
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  /* =====================================================
     FETCH BUNDLE DETAILS (for modal) using new RPC
     ===================================================== */
  const fetchBundleDetails = async (bundleId) => {
    setDetailsLoading(true);
    setMsgText(""); setMsgSent(false);
    try {
      const [{ data, error }, { data: bundleRow }] = await Promise.all([
        supabase.rpc("get_bundle_details", { p_bundle_id: bundleId }),
        supabase.from("application_bundles").select("user_id").eq("id", bundleId).single(),
      ]);
      if (error) throw error;
      setBundleDetails(data || []);
      setSelectedBundleUserId(bundleRow?.user_id || null);
    } catch (error) {
      console.error("Error fetching bundle details:", error);
      alert("Failed to load bundle details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  /* =====================================================
     UPDATE APPLICATION STATUS (from modal)
     ===================================================== */
  const handleUpdateApplicationStatus = async (applicationId, newStatus) => {
    try {
      const { error } = await supabase
        .rpc("update_application_status", {
          p_application_id: applicationId,
          p_new_status: newStatus,
        });
      if (error) throw error;
      // Optimistic update
      setBundleDetails(prev =>
        prev.map(app =>
          app.application_id === applicationId
            ? { ...app, application_status: newStatus }
            : app
        )
      );
    } catch (error) {
      console.error("Error updating application status:", error);
      alert("Failed to update status.");
    }
  };

  /* =====================================================
     BUNDLE DETAIL MODAL – GOD MODE
     ===================================================== */
  const BundleDetailModal = () => {
    if (!selectedBundle) return null;

    const first = bundleDetails[0] || {};

    // Group applications by institution
    const grouped = (bundleDetails || []).reduce((acc, app) => {
      if (!acc[app.institution_name]) acc[app.institution_name] = [];
      acc[app.institution_name].push(app);
      return acc;
    }, {});

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                Bundle {first.bundle_ref || selectedBundle}
              </h2>
              <button
                onClick={() => setSelectedBundle(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="text-center py-8">Loading bundle details...</div>
            ) : !bundleDetails || bundleDetails.length === 0 ? (
              <div className="text-center py-8">No applications found in this bundle.</div>
            ) : (
              <>
                {/* Bundle & User Info */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Bundle Status</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(first.bundle_status)}`}>
                      {first.bundle_status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-600">Name:</span> {first.full_name}</div>
                    <div><span className="text-gray-600">Email:</span> {first.email}</div>
                    <div><span className="text-gray-600">Phone:</span> {first.phone}</div>
                    <div><span className="text-gray-600">School:</span> {first.school}</div>
                    <div><span className="text-gray-600">Payment Status:</span> 
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getPaymentStatusColor(first.payment_status)}`}>
                        {first.payment_status || 'pending'}
                      </span>
                    </div>
                    <div><span className="text-gray-600">Documents Uploaded:</span> 
                      <span className="ml-2">{first.documents_uploaded ? '✅ Yes' : '❌ No'}</span>
                    </div>
                  </div>
                </div>

                {/* Applications grouped by institution */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Applications</h3>
                  {Object.entries(grouped).map(([institution, apps]) => (
                    <div key={institution} className="mb-4">
                      <h4 className="font-medium text-md mb-2">{institution}</h4>
                      <ul className="space-y-2">
                        {apps.map((app) => (
                          <li key={app.application_id} className="border rounded-lg p-3">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                              <div>
                                <div className="font-medium">{app.course_title || "Unknown Course"}</div>
                                <div className="text-sm text-gray-600 mt-1">
                                  Status: <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(app.application_status)}`}>
                                    {app.application_status?.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateApplicationStatus(app.application_id, 'completed')}
                                  disabled={app.application_status === 'completed'}
                                  className={`px-3 py-1 text-sm rounded ${
                                    app.application_status === 'completed'
                                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                      : 'bg-green-600 text-white hover:bg-green-700'
                                  }`}
                                >
                                  Complete
                                </button>
                                <button
                                  onClick={() => handleUpdateApplicationStatus(app.application_id, 'action_required')}
                                  className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                                >
                                  Flag Issue
                                </button>
                                <button
                                  onClick={() => handleUpdateApplicationStatus(app.application_id, 'rejected')}
                                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Total Applications: {first.total_applications}</div>
                    <div>Completed: {first.completed_applications}</div>
                    <div>Pending: {first.pending_applications}</div>
                    <div>Ready for Completion: {first.ready_for_completion ? '✅ Yes' : '❌ No'}</div>
                  </div>
                </div>

                {/* Send Message to Student */}
                {selectedBundleUserId && (
                  <div className="border-t pt-4 mt-2">
                    <h3 className="font-semibold mb-2">Send Message to Student</h3>
                    {msgSent ? (
                      <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                        ✅ Message sent — student will see it in their notification bell.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={msgText}
                          onChange={e => setMsgText(e.target.value)}
                          rows={3}
                          placeholder="Type a message for the student…"
                          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                        <button
                          disabled={!msgText.trim() || msgSending}
                          onClick={async () => {
                            if (!msgText.trim()) return;
                            setMsgSending(true);
                            try {
                              await supabase.from("notifications").insert({
                                user_id: selectedBundleUserId,
                                title: "Message from Matric2Campus Team",
                                message: msgText.trim(),
                                type: "info",
                                bundle_id: selectedBundle,
                              });
                              setMsgSent(true);
                              setMsgText("");
                            } catch (err) {
                              alert("Failed to send message.");
                            } finally {
                              setMsgSending(false);
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {msgSending ? "Sending…" : "Send Notification"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* =====================================================
     COMMENT MODAL (existing)
     ===================================================== */
  const CommentModal = () => {
    if (!showCommentModal) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {targetStatus === "action_required" ? "Flag Issue" : "Reject Bundle"}
            </h3>
            <button onClick={() => setShowCommentModal(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Provide a comment for {commentBundle?.bundle_ref}:
          </p>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={submitting}
          />
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowCommentModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleStatusWithComment}
              disabled={!commentText.trim() || submitting}
              className={`px-4 py-2 rounded-lg ${
                !commentText.trim() || submitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : targetStatus === "action_required"
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* =====================================================
     LOADING STATE
     ===================================================== */
  if (!sessionUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  /* =====================================================
     RENDER (full UI)
     ===================================================== */
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Welcome back, {sessionUser.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchAllData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <div className="relative">
                <Bell className="w-6 h-6 text-gray-600 cursor-pointer" />
                {stats.pendingPayments + stats.pendingRequests > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {stats.pendingPayments + stats.pendingRequests}
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 overflow-x-auto pb-2">
            {["overview", "available", "my-work", "action-required", "completed", "payments", "requests"].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {tab
                    .split("-")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                  {tab === "payments" && stats.pendingPayments > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {stats.pendingPayments}
                    </span>
                  )}
                  {tab === "requests" && stats.pendingRequests > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {stats.pendingRequests}
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Overview tab stats */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-gray-600">Available Bundles</p><p className="text-3xl font-bold mt-2">{stats.totalAvailable}</p></div>
                  <div className="p-3 bg-blue-100 rounded-lg"><Package className="w-6 h-6 text-blue-600" /></div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-gray-600">My Work</p><p className="text-3xl font-bold mt-2">{stats.totalMyWork}</p><p className="text-xs text-gray-500 mt-1">{stats.pendingApplications} pending apps</p></div>
                  <div className="p-3 bg-yellow-100 rounded-lg"><Workflow className="w-6 h-6 text-yellow-600" /></div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-gray-600">Action Required</p><p className="text-3xl font-bold mt-2">{stats.totalActionRequired}</p></div>
                  <div className="p-3 bg-red-100 rounded-lg"><AlertCircle className="w-6 h-6 text-red-600" /></div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-gray-600">Completed</p><p className="text-3xl font-bold mt-2">{stats.totalCompleted}</p></div>
                  <div className="p-3 bg-green-100 rounded-lg"><CheckCircle className="w-6 h-6 text-green-600" /></div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold">Pending Payments</h3>
                  <span className="ml-auto text-2xl font-bold text-blue-600">{stats.pendingPayments}</span>
                </div>
                <p className="text-sm text-gray-600">Awaiting admin confirmation</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <HelpCircle className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold">Admin Assistance Requests</h3>
                  <span className="ml-auto text-2xl font-bold text-blue-600">{stats.pendingRequests}</span>
                </div>
                <p className="text-sm text-gray-600">Awaiting processing</p>
              </div>
            </div>
          </>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search bundles by reference, status, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAttentionOnly(!showAttentionOnly)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
                  showAttentionOnly
                    ? "bg-red-100 text-red-700 border border-red-300"
                    : "border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Filter className="w-4 h-4" />
                Needs Attention
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full" />
          </div>
        ) : (
          <>
            {/* Bundle sections */}
            {activeTab !== "payments" && activeTab !== "requests" && (
              <>
                {/* Available Bundles */}
                {(activeTab === "overview" || activeTab === "available") &&
                  filterBundles(availableBundles).length > 0 && (
                    <section className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          Available Bundles
                          <span className="bg-blue-100 text-blue-800 text-sm px-2.5 py-0.5 rounded-full">
                            {filterBundles(availableBundles).length}
                          </span>
                        </h2>
                        <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          View all <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filterBundles(availableBundles).slice(0, 4).map((bundle) => (
                          <BundleCard key={bundle.id} bundle={bundle} />
                        ))}
                      </div>
                    </section>
                  )}

                {/* My Work */}
                {(activeTab === "overview" || activeTab === "my-work") &&
                  filterBundles(myWorkBundles).length > 0 && (
                    <section className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                          <Workflow className="w-5 h-5" />
                          My Work
                          <span className="bg-yellow-100 text-yellow-800 text-sm px-2.5 py-0.5 rounded-full">
                            {filterBundles(myWorkBundles).length}
                          </span>
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filterBundles(myWorkBundles).slice(0, 6).map((bundle) => (
                          <BundleCard key={bundle.id} bundle={bundle} />
                        ))}
                      </div>
                    </section>
                  )}

                {/* Action Required */}
                {(activeTab === "overview" || activeTab === "action-required") &&
                  filterBundles(actionRequiredBundles).length > 0 && (
                    <section className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          Action Required
                          <span className="bg-red-100 text-red-800 text-sm px-2.5 py-0.5 rounded-full">
                            {filterBundles(actionRequiredBundles).length}
                          </span>
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filterBundles(actionRequiredBundles).map((bundle) => (
                          <BundleCard key={bundle.id} bundle={bundle} />
                        ))}
                      </div>
                    </section>
                  )}

                {/* Completed Work */}
                {(activeTab === "overview" || activeTab === "completed") &&
                  filterBundles(completedBundles).length > 0 && (
                    <section className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          Completed Work
                          <span className="bg-green-100 text-green-800 text-sm px-2.5 py-0.5 rounded-full">
                            {filterBundles(completedBundles).length}
                          </span>
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filterBundles(completedBundles).slice(0, 4).map((bundle) => (
                          <BundleCard key={bundle.id} bundle={bundle} showActions={false} />
                        ))}
                      </div>
                    </section>
                  )}
              </>
            )}

            {/* PAYMENTS TAB */}
            {activeTab === "payments" && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Pending Payments
                    <span className="bg-blue-100 text-blue-800 text-sm px-2.5 py-0.5 rounded-full">
                      {pendingPayments.length}
                    </span>
                  </h2>
                </div>
                {pendingPayments.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No pending payments</h3>
                    <p className="text-gray-600">When users make a bank transfer, their payment will appear here.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {pendingPayments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {payment.profiles.first_name} {payment.profiles.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{payment.profiles.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{payment.package_type}</div>
                              <div className="text-xs text-gray-500">
                                Uni:{payment.uni_limit} TVET:{payment.tvet_limit} Priv:{payment.private_limit}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">R{payment.price}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateTime(payment.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleConfirmPayment(payment)}
                                className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Confirm Payment
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* ADMIN REQUESTS TAB */}
            {activeTab === "requests" && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Admin Assistance Requests
                    <span className="bg-blue-100 text-blue-800 text-sm px-2.5 py-0.5 rounded-full">
                      {adminRequests.length}
                    </span>
                  </h2>
                </div>
                {adminRequests.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
                    <p className="text-gray-600">When users request admin assistance, they'll appear here.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Terms Accepted</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documents</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {adminRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {req.profiles?.first_name} {req.profiles?.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{req.profiles?.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateTime(req.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {req.terms_accepted_at ? formatDate(req.terms_accepted_at) : '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button
                                onClick={() => handleViewDocuments(req.id, req.user_id)}
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <FileText className="w-4 h-4" />
                                View
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button
                                onClick={() => handleUpdateRequestStatus(req.id, "in_progress")}
                                className="inline-flex items-center px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                              >
                                In Progress
                              </button>
                              <button
                                onClick={() => handleUpdateRequestStatus(req.id, "completed")}
                                className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                Complete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>Auto-refresh: 30s</span>
            <span>Last updated: {formatTime(new Date())}</span>
          </div>
          <div className="flex items-center gap-6">
            <button className="hover:text-gray-900">Help</button>
            <button className="hover:text-gray-900">Documentation</button>
            <button className="hover:text-gray-900">Feedback</button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <BundleDetailModal />
      <CommentModal />
    </div>
  );
}