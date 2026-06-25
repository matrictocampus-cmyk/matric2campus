import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";  // FIXED: Changed from "../../lib/supabase" to "../lib/supabase"
import { useState, useEffect } from "react";

export default function ProtectedAdminRoute({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  async function checkAdminStatus() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Check if user exists in admin_profiles table
      const { data: adminProfile } = await supabase
        .from("admin_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Also check if admin is active
      setIsAdmin(!!adminProfile && adminProfile.is_active === true);
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking admin permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    // Redirect to home page if not admin
    return <Navigate to="/" replace />;
  }

  return children;
}