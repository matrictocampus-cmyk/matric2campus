import { Link, useLocation } from "react-router-dom";
import {
  FiHome, FiBook, FiStar, FiFileText, FiUser,
  FiChevronLeft, FiChevronRight,
} from "react-icons/fi";

const NAV_ITEMS = [
  { name: "Dashboard",    path: "/dashboard",    icon: <FiHome size={18} />     },
  { name: "Institutions", path: "/institutions", icon: <FiBook size={18} />     },
  { name: "My Matches",   path: "/eligibility",  icon: <FiStar size={18} />     },
  { name: "Applications", path: "/apply",        icon: <FiFileText size={18} /> },
  { name: "Profile",      path: "/profile",      icon: <FiUser size={18} />     },
];

function calcCompletion(profile) {
  if (!profile) return 0;
  const checks = [
    !!profile.full_name,
    !!profile.grade,
    !!(profile.career_interests?.length),
    !!(Object.keys(profile?.subjects_marks || {}).length),
    !!profile.onboarding_completed,
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

export default function Sidebar({ open = true, setOpen = () => {}, profile }) {
  const location = useLocation();
  const completion = calcCompletion(profile);

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "S";

  return (
    <aside
      className={`hidden md:flex flex-col h-screen flex-shrink-0 transition-all duration-300 border-r border-gray-100 bg-white
        ${open ? "w-64" : "w-16"}`}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 flex-shrink-0">
        {open && (
          <span className="text-lg font-extrabold text-gray-900 tracking-tight select-none">
            Matric<span style={{ color: "#FF7A18" }}>2</span>Campus
          </span>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="ml-auto w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-500"
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? <FiChevronLeft size={16} /> : <FiChevronRight size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={!open ? item.name : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 group border-l-4
                ${open ? "" : "justify-center"}
                ${active ? "bg-orange-50 font-semibold" : "text-gray-600 hover:bg-gray-100 border-transparent"}`}
              style={active ? { borderLeftColor: "#FF7A18" } : {}}
            >
              <span style={active ? { color: "#FF7A18" } : {}} className={active ? "" : "text-gray-500 group-hover:text-gray-700"}>
                {item.icon}
              </span>
              {open && (
                <span className={`text-sm whitespace-nowrap ${active ? "text-gray-900" : "text-gray-600 group-hover:text-gray-800"}`}>
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100 space-y-3 flex-shrink-0">
        {open && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Profile</span>
              <span className="text-[11px] font-bold text-gray-700">{completion}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${completion}%`, background: "#FF7A18" }}
              />
            </div>
          </div>
        )}
        <div className={`flex items-center gap-2.5 ${open ? "" : "justify-center"}`}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: "#FF7A18" }}
          >
            {initials}
          </div>
          {open && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                {profile?.first_name || "Student"}
              </p>
              <p className="text-[11px] text-gray-400 truncate">
                {profile?.grade ? `Grade ${profile.grade}` : "Learner"}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
