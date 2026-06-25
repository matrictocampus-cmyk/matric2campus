// src/pages/Admin/AdminLayout.jsx
import { Outlet, NavLink } from "react-router-dom";
import { 
  LayoutDashboard, BarChart3, Settings, 
  Users, FileText, Package, Bell, HelpCircle,
  Home
} from "lucide-react";

export default function AdminLayout() {
  const navItems = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { path: "/admin/users", label: "Users", icon: Users },
    { path: "/admin/bundles", label: "All Bundles", icon: Package },
    { path: "/admin/reports", label: "Reports", icon: FileText },
    { path: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900">Admin Panel</h1>
              <p className="text-xs text-gray-500">v2.0.0</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/admin"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <div className="px-4 mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Support
              </p>
            </div>
            <ul className="space-y-1">
              <li>
                <NavLink
                  to="/admin/help"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`
                  }
                >
                  <HelpCircle className="w-5 h-5" />
                  Help & Support
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/notifications"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`
                  }
                >
                  <Bell className="w-5 h-5" />
                  Notifications
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    3
                  </span>
                </NavLink>
              </li>
            </ul>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">A</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Admin User</p>
              <p className="text-xs text-gray-500">admin@example.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}