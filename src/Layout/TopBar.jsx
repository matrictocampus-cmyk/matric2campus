import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ConfirmSignOut from "../components/ui/ConfirmSignOut";

export default function Topbar({ profile }) {
  const navigate = useNavigate();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOutClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirmSignOut = async () => {
    setConfirmOpen(false);

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out error:", err);
    } finally {
      localStorage.removeItem("profile");
      navigate("/login", { replace: true });
    }
  };

  const handleCancel = () => {
    setConfirmOpen(false);
  };

  return (
    <>
      {/* ===================== TOP BAR ===================== */}
      <header className="w-full bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ===== Main Row ===== */}
          <div className="flex items-center justify-between h-16">

            {/* Left – Branding */}
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                <i className="fas fa-user-graduate text-xl"></i>
              </div>

              <div>
                <h1 className="font-bold text-lg">
                  CAO Application Assistant
                </h1>

                {profile?.full_name && (
                  <div className="text-xs text-blue-100">
                    Welcome back, {profile.full_name}
                  </div>
                )}
              </div>
            </div>

            {/* Right – User Info */}
            <div className="flex items-center gap-4">

              {/* Stats */}
              <div className="hidden md:flex items-center gap-2">
                {profile?.grade && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
                    <i className="fas fa-graduation-cap mr-1"></i>
                    Grade {profile.grade}
                  </div>
                )}

                {profile?.aps && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
                    <i className="fas fa-chart-line mr-1"></i>
                    APS: {profile.aps}
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-white"></i>
                  </div>

                  <div className="hidden md:block text-left">
                    <div className="font-medium text-sm">
                      {profile?.full_name || "User"}
                    </div>
                    <div className="text-xs text-blue-100 truncate max-w-[150px]">
                      {profile?.email || "Loading..."}
                    </div>
                  </div>

                  <i
                    className={`fas fa-chevron-down text-sm transition-transform ${
                      userMenuOpen ? "rotate-180" : ""
                    }`}
                  ></i>
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    ></div>

                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">

                      {/* User Info */}
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                            <i className="fas fa-user text-white text-xl"></i>
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">
                              {profile?.full_name || "User"}
                            </div>
                            <div className="text-sm text-gray-600 truncate">
                              {profile?.email}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu */}
                      <div className="py-2">
                        <button
                          onClick={() => navigate("/profile")}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 text-gray-700"
                        >
                          <i className="fas fa-user-edit text-blue-600"></i>
                          Edit Profile
                        </button>

                        <button
                          onClick={() => navigate("/eligibility")}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 text-gray-700"
                        >
                          <i className="fas fa-clipboard-check text-green-600"></i>
                          Eligibility Check
                        </button>

                        <button
                          onClick={() => navigate("/apply")}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 text-gray-700"
                        >
                          <i className="fas fa-paper-plane text-purple-600"></i>
                          Apply Now
                        </button>
                      </div>

                      {/* Sign Out */}
                      <div className="border-t border-gray-100 p-4">
                        <button
                          onClick={handleSignOutClick}
                          className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90"
                        >
                          <i className="fas fa-sign-out-alt"></i>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===================== GREEN STATUS BAR ===================== */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-1 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <i className="fas fa-shield-alt"></i> Secure Session
              </div>
              <div className="flex items-center gap-1">
                <i className="fas fa-database"></i> Local Storage Only
              </div>
            </div>

            <div className="flex items-center gap-1">
              <i className="fas fa-clock"></i>
              Session:{" "}
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== SIGN OUT MODAL ===================== */}
      <ConfirmSignOut
        open={confirmOpen}
        onConfirm={handleConfirmSignOut}
        onCancel={handleCancel}
      />
    </>
  );
}
