import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SimpleAdminDashboard() {
  const [data, setData] = useState({
    bundles: [],
    applications: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Get bundles
      const { data: bundles } = await supabase
        .from("application_bundles")
        .select("*");
      
      // Get applications
      const { data: applications } = await supabase
        .from("applications")
        .select("*");
      
      setData({
        bundles: bundles || [],
        applications: applications || [],
        loading: false,
        error: null
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  }

  async function updateStatus(applicationId, newStatus) {
    const comment = newStatus === "action_required" 
      ? prompt("Comment:")
      : null;
    
    if (newStatus === "action_required" && !comment) return;
    
    try {
      const { error } = await supabase.rpc("update_application_status", {
        p_application_id: applicationId,
        p_new_status: newStatus,
        p_comment: comment
      });
      
      if (error) throw error;
      
      alert("Updated!");
      loadData();
    } catch (error) {
      alert("Error: " + error.message);
    }
  }

  if (data.loading) {
    return <div style={{ padding: 24 }}>Loading admin data...</div>;
  }

  if (data.error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Error</h2>
        <p>{data.error}</p>
        <button onClick={loadData}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Admin Dashboard</h1>
      
      <div style={{ marginBottom: 32 }}>
        <h2>Bundles ({data.bundles.length})</h2>
        {data.bundles.map(b => (
          <div key={b.id} style={{ 
            border: '1px solid #ccc', 
            padding: 12, 
            marginBottom: 8 
          }}>
            <strong>#{b.id}</strong> - {b.package_type} - {b.status}
          </div>
        ))}
      </div>
      
      <div>
        <h2>Applications ({data.applications.length})</h2>
        {data.applications.map(app => (
          <div key={app.id} style={{ 
            border: '1px solid #ccc', 
            padding: 12, 
            marginBottom: 8 
          }}>
            <div>
              <strong>{app.institution_name}</strong> - {app.status}
            </div>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => updateStatus(app.id, "in_progress")}>
                In Progress
              </button>
              <button onClick={() => updateStatus(app.id, "submitted")}>
                Submitted
              </button>
              <button onClick={() => updateStatus(app.id, "completed")}>
                Completed
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <button onClick={loadData} style={{ marginTop: 16 }}>
        Refresh
      </button>
    </div>
  );
}