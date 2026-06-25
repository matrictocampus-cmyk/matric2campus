// src/pages/Admin/Settings.jsx
import { Settings as SettingsIcon, Bell, Shield, Database, Globe, Key, User } from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "integrations", label: "Integrations", icon: Database },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your admin panel settings and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-64">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === "general" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold mb-6">General Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admin Panel Name</label>
                  <input
                    type="text"
                    defaultValue="Application Processing System"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Timezone</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>(UTC-05:00) Eastern Time</option>
                    <option>(UTC-08:00) Pacific Time</option>
                    <option>(UTC+00:00) London</option>
                    <option>(UTC+05:30) India</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="pt-4 border-t">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold mb-6">Notification Preferences</h3>
              <div className="space-y-6">
                {[
                  { label: "New Bundle Available", description: "When a new bundle is ready for processing" },
                  { label: "Bundle Completed", description: "When a bundle status changes to completed" },
                  { label: "Action Required", description: "When a bundle requires your attention" },
                  { label: "System Updates", description: "Important system updates and maintenance" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                    <div className="relative inline-block w-12 h-6">
                      <input type="checkbox" className="sr-only" defaultChecked />
                      <div className="block bg-gray-300 w-12 h-6 rounded-full"></div>
                      <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold mb-6">Security Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>15 minutes</option>
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>4 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Two-Factor Authentication</label>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                    </div>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      Enable 2FA
                    </button>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Log Out All Sessions
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold mb-6">Integrations</h3>
              <div className="space-y-4">
                {[
                  { name: "Slack", status: "Connected", icon: "💬" },
                  { name: "Google Analytics", status: "Disconnected", icon: "📊" },
                  { name: "Email Service", status: "Connected", icon: "✉️" },
                  { name: "Webhook", status: "Configure", icon: "🔗" },
                ].map((integration, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{integration.icon}</div>
                      <div>
                        <p className="font-medium">{integration.name}</p>
                        <p className={`text-sm ${
                          integration.status === 'Connected' ? 'text-green-600' : 
                          integration.status === 'Disconnected' ? 'text-gray-500' : 
                          'text-blue-600'
                        }`}>
                          {integration.status}
                        </p>
                      </div>
                    </div>
                    <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                      {integration.status === 'Connected' ? 'Manage' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}