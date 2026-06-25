// src/apps/admin/components/BundleModal.jsx
import React, { useEffect, useState } from "react";
import { Modal, Button, Badge } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";

export default function BundleModal({ bundleId, isOpen, onClose, onStatusChange }) {
  const [bundleData, setBundleData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bundleId) return;
    fetchBundleDetails(bundleId);
  }, [bundleId]);

  const fetchBundleDetails = async (id) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_bundle_details", { p_bundle_id: id });
      if (error) throw error;
      setBundleData(data || []);
    } catch (err) {
      console.error("Error fetching bundle details:", err);
      setBundleData([]);
    } finally {
      setLoading(false);
    }
  };

  const groupedByInstitution = () => {
    const map = {};
    bundleData.forEach((app) => {
      if (!map[app.institution_name]) map[app.institution_name] = [];
      map[app.institution_name].push(app);
    });
    return map;
  };

  const handleApplicationAction = async (applicationId, newStatus) => {
    try {
      await supabase.rpc("update_application_status", {
        p_application_id: applicationId,
        p_new_status: newStatus,
      });
      onStatusChange?.();
      fetchBundleDetails(bundleId);
    } catch (err) {
      console.error("Error updating application status:", err);
    }
  };

  if (!isOpen) return null;

  const first = bundleData[0] || {};
  const institutionGroups = groupedByInstitution();

  const statusColor = (status) => {
    switch (status) {
      case "pending_documents":
        return "warning";
      case "ready":
        return "success";
      case "in_progress":
        return "info";
      case "completed":
        return "success";
      case "rejected":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Bundle: ${first.bundle_ref}`}>
      {loading ? (
        <div>Loading bundle details...</div>
      ) : (
        <div className="space-y-4">
          {/* Bundle & User Info */}
          <div>
            <h3>Status: <Badge variant={statusColor(first.bundle_status)}>{first.bundle_status}</Badge></h3>
            <h4>User Info:</h4>
            <p>Name: {first.full_name}</p>
            <p>Email: {first.email}</p>
            <p>Phone: {first.phone}</p>
            <p>School: {first.school}</p>
            <p>Payment Status: <Badge variant={first.payment_status === "paid" ? "success" : "warning"}>{first.payment_status || "pending"}</Badge></p>
            <p>Documents Uploaded: {first.documents_uploaded ? "✅ Yes" : "❌ No"}</p>
          </div>

          <hr />

          {/* Applications */}
          {Object.entries(institutionGroups).map(([institution, apps]) => (
            <div key={institution}>
              <h4>{institution}</h4>
              {apps.map((app) => (
                <div key={app.application_id} className="mb-2 p-2 border rounded">
                  <div className="flex justify-between items-center">
                    <span>
                      <strong>{app.course_title || "No course title"}</strong>{" "}
                      <Badge variant={statusColor(app.application_status)}>{app.application_status}</Badge>
                    </span>
                    <div className="space-x-1">
                      <Button size="sm" variant="success" disabled={app.application_status === "completed"} onClick={() => handleApplicationAction(app.application_id, "completed")}>Complete</Button>
                      <Button size="sm" variant="warning" onClick={() => handleApplicationAction(app.application_id, "action_required")}>Flag Issue</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleApplicationAction(app.application_id, "rejected")}>Reject</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <hr />

          {/* Stats */}
          <div className="space-y-1">
            <p>Total Applications: {first.total_applications}</p>
            <p>Completed: {first.completed_applications}</p>
            <p>Pending: {first.pending_applications}</p>
            <p>Ready for Completion: {first.ready_for_completion ? "✅ Yes" : "❌ No"}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
