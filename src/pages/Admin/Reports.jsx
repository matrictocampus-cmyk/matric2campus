// src/pages/Admin/Reports.jsx
import { FileText, Download, Calendar, Filter, TrendingUp, BarChart3, PieChart } from "lucide-react";

export default function Reports() {
  const reports = [
    { id: 1, name: "Monthly Bundle Report", type: "PDF", size: "2.4 MB", generated: "Today, 10:30 AM" },
    { id: 2, name: "Admin Performance Q4", type: "Excel", size: "5.1 MB", generated: "Yesterday, 3:45 PM" },
    { id: 3, name: "Application Analytics", type: "PDF", size: "3.2 MB", generated: "Jan 12, 2024" },
    { id: 4, name: "User Activity Log", type: "CSV", size: "8.7 MB", generated: "Jan 10, 2024" },
    { id: 5, name: "Revenue Report", type: "Excel", size: "4.3 MB", generated: "Jan 8, 2024" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Generate and download system reports</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Generate New Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Stats */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Report Templates</h3>
              <Filter className="w-5 h-5 text-gray-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "Bundle Summary", icon: Package, color: "bg-blue-100 text-blue-600" },
                { name: "User Activity", icon: TrendingUp, color: "bg-green-100 text-green-600" },
                { name: "Performance", icon: BarChart3, color: "bg-purple-100 text-purple-600" },
                { name: "Analytics", icon: PieChart, color: "bg-yellow-100 text-yellow-600" },
              ].map((template, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${template.color}`}>
                      <template.icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium">{template.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Reports */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Scheduled Reports</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium">Weekly Summary</p>
                  <p className="text-sm text-gray-500">Every Monday at 9:00 AM</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600">Active</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium">Monthly Analytics</p>
                  <p className="text-sm text-gray-500">1st of every month</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-yellow-600">Pending</span>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Recent Reports</h3>
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <p className="font-medium">{report.name}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{report.type}</span>
                    <span>{report.size}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1 text-blue-600 hover:text-blue-900" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Generator */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold mb-6">Generate Custom Report</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option>Select report type</option>
              <option>Bundle Analysis</option>
              <option>User Activity</option>
              <option>Performance Metrics</option>
              <option>Revenue Report</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option>Select range</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last Quarter</option>
              <option>Custom Range</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option>PDF</option>
              <option>Excel</option>
              <option>CSV</option>
              <option>JSON</option>
            </select>
          </div>
        </div>
        <div className="mt-6">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}