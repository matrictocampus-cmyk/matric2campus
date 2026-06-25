import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useState, useEffect } from "react";

export default function AdminGuard({ children }) {
  const [status, setStatus] = useState("checking"); // "checking", "admin", "not-admin"

  useEffect(() => {
    checkIfAdmin();
  }, []);

  async function checkIfAdmin() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setStatus("not-admin");
        return;
      }

      // Check admin_profiles table
      const { data: adminProfile } = await supabase
        .from("admin_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      setStatus(adminProfile ? "admin" : "not-admin");
    } catch (error) {
      console.error("Admin check error:", error);
      setStatus("not-admin");
    }
  }

  if (status === "checking") {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>Checking admin access...</div>
      </div>
    );
  }

  if (status === "not-admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}