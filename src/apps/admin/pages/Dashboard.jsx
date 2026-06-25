import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(null);
  const [bundles, setBundles] = useState([]);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error("Authentication failed: " + userError.message);
      if (!user) throw new Error("No user logged in");
      setAdminId(user.id);

      const { data: bundlesData, error: bundlesError } = await supabase
        .from("application_bundles")
        .select("*");
      if (bundlesError) throw new Error("Failed to load bundles: " + bundlesError.message);
      setBundles(bundlesData || []);

      const { data: appsData, error: appsError } = await supabase
        .from("applications")
        .select("*");
      if (appsError) throw new Error("Failed to load applications: " + appsError.message);
      setApplications(appsData || []);

    } catch (err) {
      console.error("Error in loadData:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Update application status
  async function updateStatus(applicationId, newStatus) {
    const comment = newStatus === "action_required" 
      ? prompt("Explain what is missing or incorrect:") 
      : null;

    if (newStatus === "action_required" && !comment) return;

    try {
      const { error } = await supabase.rpc("update_application_status", {
        p_application_id: applicationId,
        p_new_status: newStatus,
        p_comment: comment
      });
      if (error) throw error;
      alert("✅ Status updated successfully!");
      loadData();
    } catch (err) {
      alert("Error updating status: " + err.message);
    }
  }

  // Claim a bundle (first-come, first-serve)
  async function claimBundle(bundleId) {
    try {
      const { error } = await supabase.rpc("claim_bundle", { p_bundle_id: bundleId });
      if (error) throw error;
      alert("✅ Bundle successfully claimed!");
      loadData();
    } catch (err) {
      alert("❌ Failed to claim bundle: " + err.message);
    }
  }

  // Loading state
  if (loading) return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <h2>Loading Admin Dashboard...</h2>
      <div style={{ marginTop: 16 }}>
        <div style={{ width: 200, height: 4, backgroundColor: '#f0f0f0', borderRadius: 2, margin: '0 auto' }}>
          <div style={{ width: '60%', height: '100%', backgroundColor: '#0070f3', borderRadius: 2, animation: 'pulse 1.5s infinite' }}></div>
        </div>
      </div>
    </div>
  );

  // Error state
  if (error) return (
    <div style={{ padding: 24 }}>
      <div style={{ backgroundColor: '#fff5f5', border: '2px solid #fc8181', padding: 24, borderRadius: 8, marginBottom: 24 }}>
        <h2 style={{ color: '#c53030', marginTop: 0 }}>Error Loading Dashboard</h2>
        <p>{error}</p>
        <button onClick={loadData} style={{ marginTop: 16, padding: '10px 20px', backgroundColor: '#ed8936', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          Retry Loading Data
        </button>
      </div>
    </div>
  );

  // Main Dashboard
  return (
    <div style={{ padding: 24 }}>
      <div style={{ backgroundColor: '#0070f3', color: 'white', padding: 24, borderRadius: 8, marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
          <p style={{ opacity: 0.9, marginTop: 4 }}>Manage student application bundles</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '0.9em' }}>Logged in as: {adminId?.slice(0, 8)}...</p>
          <p style={{ margin: 0, fontSize: '0.9em' }}>Data: {bundles.length} bundles, {applications.length} applications</p>
        </div>
      </div>

      {/* Bundles Section */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Application Bundles ({bundles.length})</h2>
          <button onClick={loadData} style={{ padding: '8px 16px', backgroundColor: '#4a5568', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.9em' }}>↻ Refresh Data</button>
        </div>

        {bundles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, backgroundColor: '#f8f9fa', borderRadius: 8, border: '2px dashed #dee2e6' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <h3 style={{ color: '#6c757d' }}>No bundles found</h3>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {bundles.map(bundle => (
              <div key={bundle.id} style={{ border: '1px solid #dee2e6', borderRadius: 8, padding: 20, backgroundColor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginTop: 0 }}>Bundle #{bundle.id}</h3>
                <p><strong>Package:</strong> {bundle.package_type}</p>
                <p><strong>Status:</strong> {bundle.status}</p>
                <p><strong>Locked:</strong> {bundle.locked ? '🔒 Yes' : '🔓 No'}</p>
                <p><strong>Assigned to:</strong> {bundle.assigned_admin_id || 'Nobody'}</p>

                {/* Claim Button: Only show if bundle is unassigned & unlocked */}
                {!bundle.locked && !bundle.assigned_admin_id ? (
                  <button onClick={() => claimBundle(bundle.id)} style={{ marginTop: 12, padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    Claim
                  </button>
                ) : null}

                {/* Already claimed notice */}
                {bundle.locked && bundle.assigned_admin_id && (
                  <p style={{ marginTop: 8, color: '#6c757d' }}>Claimed by: {bundle.assigned_admin_id.slice(0, 8)}...</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Applications Section */}
      <div>
        <h2 style={{ marginBottom: 16 }}>Applications ({applications.length})</h2>
        {applications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, backgroundColor: '#f8f9fa', borderRadius: 8, border: '2px dashed #dee2e6' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
            <h3 style={{ color: '#6c757d' }}>No applications found</h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {applications.map(app => (
              <div key={app.id} style={{ border: '1px solid #dee2e6', borderRadius: 8, padding: 20, backgroundColor: 'white' }}>
                <h3>{app.institution_name}</h3>
                <p><strong>Type:</strong> {app.institution_type}</p>
                <p><strong>Bundle ID:</strong> {app.bundle_id}</p>
                <p><strong>Status:</strong> {app.status}</p>
                {app.admin_comment && <p>📝 Admin Comment: {app.admin_comment}</p>}

                <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => updateStatus(app.id, "in_progress")} style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Mark In Progress</button>
                  <button onClick={() => updateStatus(app.id, "submitted")} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Mark Submitted</button>
                  <button onClick={() => updateStatus(app.id, "completed")} style={{ padding: '8px 16px', backgroundColor: '#20c997', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Mark Completed</button>
                  <button onClick={() => updateStatus(app.id, "rejected")} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}