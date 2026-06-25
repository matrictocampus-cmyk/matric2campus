// src/pages/Admin/Notifications.jsx
import { Bell, CheckCircle, AlertCircle, Info, X, Filter } from "lucide-react";
import { useState } from "react";

export default function Notifications() {
  const [notifications, setNotifications] = useState([
    { id: 1, type: "info", title: "New bundle available", message: "Bundle #BUN-2024-1042 is ready for processing", time: "2 minutes ago", read: false },
    { id: 2, type: "warning", title: "Action required", message: "Bundle #BUN-2024-1038 needs your attention", time: "1 hour ago", read: false },
    { id: 3, type: "success", title: "Bundle completed", message: "Bundle #BUN-2024-1035 has been processed successfully", time: "3 hours ago", read: true },
    { id: 4, type: "info", title: "System update", message: "Scheduled maintenance on Saturday at 2:00 AM", time: "1 day ago", read: true },
    { id: 5, type: "warning", title: "Performance alert", message: "Average processing time increased by 15%", time: "2 days ago", read: true },
  ]);

  const getIcon = (type) => {
    switch (type) {
      case "success": return CheckCircle;
      case "warning": return AlertCircle;
      default: return Info;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case "success": return "text-green-600 bg-green-100";
      case "warning": return "text-yellow-600 bg-yellow-100";
      default: return "text-blue-600 bg-blue-100";
    }
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">Stay updated with system alerts and messages</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Mark all as read
            </button>
          )}
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Notification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unread Notifications</p>
              <p className="text-3xl font-bold mt-2">{unreadCount}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today</p>
              <p className="text-3xl font-bold mt-2">
                {notifications.filter(n => n.time.includes('minute') || n.time.includes('hour')).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-3xl font-bold mt-2">{notifications.length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Info className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Recent Notifications</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No notifications yet</p>
              <p className="text-sm text-gray-500">When you receive notifications, they'll appear here</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = getIcon(notification.type);
              return (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getColor(notification.type)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Mark as read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold mb-4">Notification Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Notifications</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option>Immediate</option>
              <option>Daily Digest</option>
              <option>Weekly Summary</option>
              <option>Disabled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Push Notifications</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option>Enabled</option>
              <option>Disabled</option>
            </select>
          </div>
        </div>
        <div className="mt-6">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}