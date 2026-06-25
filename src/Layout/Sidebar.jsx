import { Link, useLocation } from "react-router-dom";
import {
  FiHome,
  FiUser,
  FiCheckSquare,
  FiLayers,
  FiSettings,
  FiMenu,
  FiGrid,
} from "react-icons/fi";

export default function Sidebar({ open = true, setOpen = () => {}, profile }) {
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: <FiHome /> },
    { name: "My Profile", path: "/profile", icon: <FiUser /> },
    { name: "Browse Institutions", path: "/institutions", icon: <FiGrid /> },
    { name: "Eligibility", path: "/eligibility", icon: <FiLayers /> },
    { name: "Apply", path: "/apply", icon: <FiCheckSquare /> },
    { name: "Settings", path: "/settings", icon: <FiSettings /> },
  ];

  return (
    <aside
      className={`flex flex-col h-screen transition-all duration-300 border-r bg-white text-black
        ${open ? "w-64" : "w-16"}`}
      aria-expanded={open}
    >
      {/* ===== BLUE HEADER (MATCHES TOPBAR) ===== */}
      <div
        className="flex items-center justify-between h-16 px-4
                   bg-gradient-to-r from-blue-900 to-blue-700
                   border-b border-blue-800"
      >
        {open && (
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-extrabold text-white">TXI</span>
            <span className="text-[10px] text-blue-200">
              Tertiary eXpress Interface
            </span>
          </div>
        )}

        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          className="p-2 rounded-md border border-white/20
                     hover:bg-white/10 transition"
        >
          <FiMenu size={20} className="text-white" />
        </button>
      </div>

      {/* ===== GREEN STATUS BAR ===== */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white">
        <div className="flex items-center justify-center h-6 text-[10px] font-medium tracking-wide">
          {open ? "Secure Session Active" : "🔒"}
        </div>
      </div>

      {/* ===== NAVIGATION ===== */}
      <nav className="mt-3 px-2 overflow-auto">
        {menuItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.name}
              className={`flex items-center gap-3 p-3 my-1 rounded-lg transition-colors duration-150
                ${open ? "px-4" : "justify-center"}
                ${
                  active
                    ? "bg-blue-600/15 border-l-4 border-blue-600 font-semibold"
                    : "text-gray-800 hover:bg-blue-600/10"
                }
              `}
            >
              <span
                className={`text-lg ${
                  active ? "text-blue-700" : "text-gray-800"
                }`}
              >
                {item.icon}
              </span>
              {open && <span className="whitespace-nowrap">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* ===== FOOTER ===== */}
      <div className="mt-auto p-3 border-t border-gray-200">
        {open ? (
          <div className="text-xs text-gray-600">© TXI • Built for learners</div>
        ) : (
          <div className="text-center text-xs text-gray-600">TXI</div>
        )}
      </div>
    </aside>
  );
}
