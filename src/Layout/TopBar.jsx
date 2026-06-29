import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ConfirmSignOut from "../components/ui/ConfirmSignOut";
import { FiBell, FiChevronDown, FiUser, FiLogOut, FiCheck, FiX } from "react-icons/fi";

const PAGE_TITLES = {
  "/dashboard":    "Dashboard",
  "/institutions": "Institutions",
  "/eligibility":  "My Matches",
  "/apply":        "Applications",
  "/profile":      "My Profile",
};

const NOTIF_TYPE_COLORS = {
  success: { bg: "bg-green-50",  dot: "#16A34A" },
  warning: { bg: "bg-amber-50",  dot: "#D97706" },
  action:  { bg: "bg-red-50",    dot: "#DC2626" },
  info:    { bg: "bg-blue-50",   dot: "#2563EB" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Topbar({ profile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [userId, setUserId] = useState(null);
  const panelRef = useRef(null);

  const pageTitle = PAGE_TITLES[location.pathname] ?? "Matric2Campus";

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // ── Load user + notifications ────────────────────────────────────────────
  const loadNotifications = useCallback(async (uid) => {
    if (!uid) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at, bundle_id")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setNotifications(data);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await loadNotifications(user.id);
    })();
  }, [loadNotifications]);

  // Subscribe to new notifications in real-time
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("user-notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Close panel on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  // ── Mark as read ─────────────────────────────────────────────────────────
  const markRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
  };

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
          <div className="relative" ref={panelRef}>
            <button
              data-tutorial="bell"
              onClick={() => setNotifOpen(o => !o)}
              className="relative w-9 h-9 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center"
            >
              <FiBell size={18} className="text-gray-500" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-[#FF7A18] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {unreadCount === 0 && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-gray-300" />
              )}
            </button>

            {/* Notification panel */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 text-sm">Notifications</p>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "#FF7A18" }}>
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs font-semibold text-gray-400 hover:text-gray-700 flex items-center gap-1"
                    >
                      <FiCheck size={11} /> Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <FiBell size={24} className="text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(n => {
                      const cfg = NOTIF_TYPE_COLORS[n.type] || NOTIF_TYPE_COLORS.info;
                      return (
                        <div
                          key={n.id}
                          className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors ${n.is_read ? "hover:bg-gray-50" : cfg.bg}`}
                          onClick={() => { markRead(n.id); if (n.bundle_id) navigate("/apply"); }}
                        >
                          <div className="mt-1 flex-shrink-0">
                            <div
                              className="w-2 h-2 rounded-full mt-0.5"
                              style={{ background: n.is_read ? "#d1d5db" : cfg.dot }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold leading-snug ${n.is_read ? "text-gray-600" : "text-gray-900"}`}>
                              {n.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                          {!n.is_read && (
                            <button
                              onClick={e => { e.stopPropagation(); markRead(n.id); }}
                              className="flex-shrink-0 text-gray-300 hover:text-gray-500"
                            >
                              <FiX size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                    <button
                      onClick={() => { setNotifOpen(false); navigate("/apply"); }}
                      className="text-xs font-semibold w-full text-center"
                      style={{ color: "#FF7A18" }}
                    >
                      View your applications →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

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
                  <div className="px-4 py-3.5 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {profile?.full_name || "Student"}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {profile?.email}
                    </p>
                  </div>

                  <button
                    onClick={() => { setMenuOpen(false); navigate("/profile"); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FiUser size={15} className="text-gray-400" /> My Profile
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
