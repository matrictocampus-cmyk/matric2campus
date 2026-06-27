import { Link, useLocation } from "react-router-dom";
import { FiHome, FiBook, FiStar, FiFileText, FiSettings } from "react-icons/fi";

const NAV_ITEMS = [
  { name: "Home",     path: "/dashboard",    icon: FiHome     },
  { name: "Courses",  path: "/institutions", icon: FiBook     },
  { name: "Matches",  path: "/eligibility",  icon: FiStar     },
  { name: "Apply",    path: "/apply",        icon: FiFileText },
  { name: "Settings", path: "/settings",     icon: FiSettings },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100">
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ name, path, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
              style={active ? { color: "#FF7A18" } : { color: "#9CA3AF" }}
            >
              <Icon size={20} />
              <span className="text-[10px] font-semibold">{name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
