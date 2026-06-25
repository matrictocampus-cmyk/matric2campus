import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabase";

// Layouts
import Layout from "./Layout/Layout";
import AdminLayout from "./pages/Admin/AdminLayout";

// Pages – Public
import Landing from "./pages/Landing";

// Pages – Student
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import Institutions from "./pages/Institutions";
import Apply from "./pages/Apply";
import Eligibility from "./pages/Eligibility";
import Payment from "./pages/Payment";
import Settings from "./pages/Settings";
import ProfileWizard from "./pages/Profile/ProfileWizard";

// Pages – Admin
import AdminDashboard from "./pages/Admin/AdminDashboard";
import Analytics from "./pages/Admin/Analytics";
import UsersPage from "./pages/Admin/Users";
import AllBundles from "./pages/Admin/AllBundles";
import Reports from "./pages/Admin/Reports";
import SettingsPage from "./pages/Admin/Settings";
import HelpSupport from "./pages/Admin/HelpSupport";
import Notifications from "./pages/Admin/Notifications";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      const currentSession = data?.session ?? null;

      setSession(currentSession);

      if (!currentSession?.user?.id) {
        setLoading(false);
        return;
      }

      const userId = currentSession.user.id;

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      setProfile(prof ?? null);

      const { data: adminRows } = await supabase
        .from("admin_profiles")
        .select("*")
        .eq("user_id", userId);

      setIsAdmin(Array.isArray(adminRows) && adminRows.length > 0);

      setLoading(false);
    };

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession ?? null);

        if (!newSession) {
          setProfile(null);
          setIsAdmin(false);
          return;
        }

        bootstrap();
      }
    );

    return () => sub?.subscription?.unsubscribe();
  }, []);

  if (loading) {
    return <div className="p-6">Loading application…</div>;
  }

  /**
   * ============================
   * 🔒 NOT LOGGED IN
   * ============================
   */
  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Landing />} />
      </Routes>
    );
  }

  /**
   * ============================
   * 🛠 ADMIN APP (ISOLATED)
   * ============================
   */
  if (isAdmin) {

    return (
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/bundles" element={<AllBundles />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
          <Route path="/admin/help" element={<HelpSupport />} />
          <Route path="/admin/notifications" element={<Notifications />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    );
  }

  /**
   * ============================
   * 👤 STUDENT APP (UNCHANGED)
   * ============================
   */

  return (
    <Routes>
      <Route element={<Layout profile={profile} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/institutions" element={<Institutions />} />
        <Route path="/apply" element={<Apply />} />
        <Route
          path="/eligibility"
          element={<Eligibility profile={profile} loading={loading} userId={session?.user?.id} />}
        />
        <Route path="/payment" element={<Payment />} />
        <Route path="/settings" element={<Settings />} />
        <Route
          path="/profile"
          element={
            <ProfileWizard
              user={session.user}
              profile={profile}
              setProfile={setProfile}
            />
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}