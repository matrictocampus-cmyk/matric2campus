import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ConfirmSignOut from "../components/ui/ConfirmSignOut";
import { FiBell, FiChevronDown, FiSettings, FiLogOut } from "react-icons/fi";

const PAGE_TITLES = {
  "/dashboard":    "Dashboard",
  "/institutions": "Explore Courses",
  "/eligibility":  "My Matches",
  "/apply":        "Applications",
  "/settings":     "Settings",
};

export default function Topbar({ profile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const pageTitle = PAGE_TITLES[location.pathname] ?? "Matric2Campus";

  const handleSignOut = async () => {
    setConfirmOpen(false);
    try { await supabase.auth.signOut(); } catch (_) {}
    localStorage.removeItem("profile");
    navigate("/", { replace: true });
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "S";

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-30">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">{pageTitle}</h1>

        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <button className="relative w-9 h-9 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center">
            <FiBell size={18} className="text-gray-500" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#FF7A18]" />
          </button>

          {/* Avatar + dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-gray-100 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: "#FF7A18" }}
              >
                {initials}
              </div>
              <span className="hidden md:block text-sm font-semibold text-gray-800">
                {profile?.first_name || "Student"}
              </span>
              <FiChevronDown
                size={14}
                className={`hidden md:block text-gray-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  {/* User info header */}
                  <div className="px-4 py-3.5 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {profile?.full_name || "Student"}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {profile?.email}
                    </p>
                  </div>

                  {/* Menu items */}
                  <button
                    onClick={() => { setMenuOpen(false); navigate("/settings"); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FiSettings size={15} className="text-gray-400" /> Settings
                  </button>

                  <div className="border-t border-gray-100">
                    <button
                      onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <FiLogOut size={15} /> Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <ConfirmSignOut
        open={confirmOpen}
        onConfirm={handleSignOut}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
