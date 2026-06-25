// src/pages/Admin/AllBundles.jsx
import { Package, Search, Filter, Download, Eye, MoreVertical, Calendar, User, Hash } from "lucide-react";
import { useState } from "react";

export default function AllBundles() {
  const [bundles] = useState([
    { id: 1, ref: "BUN-2024-1001", status: "completed", applications: 3, admin: "John Smith", created: "2024-01-15", updated: "2024-01-16" },
    { id: 2, ref: "BUN-2024-1002", status: "in_progress", applications: 5, admin: "Sarah Johnson", created: "2024-01-14", updated: "2024-01-15" },
    { id: 3, ref: "BUN-2024-1003", status: "action_required", applications: 2, admin: "Emma Davis", created: "2024-01-13", updated: "2024-01-14" },
    { id: 4, ref: "BUN-2024-1004", status: "ready", applications: 4, admin: null, created: "2024-01-12", updated: "2024-01-12" },
    { id: 5, ref: "BUN-2024-1005", status: "submitted", applications: 6, admin: "Mike Wilson", created: "2024-01-11", updated: "2024-01-12" },
  ]);

  const getStatusColor = (status) => {
    const colors = {
      ready: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      submitted: "bg-purple-100 text-purple-800",
      action_required: "bg-red-100 text-red-800",
      completed: "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Bundles</h1>
          <p className="text-gray-600">View and manage all application bundles</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            Advanced Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4" />
            Export All
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
            <option>All Statuses</option>
            <option>Ready</option>
            <option>In Progress</option>
            <option>Action Required</option>
            <option>Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
            <option>All Time</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Last Quarter</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Admin</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
            <option>All Admins</option>
            <option>Unassigned</option>
            <option>John Smith</option>
            <option>Sarah Johnson</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Applications</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
            <option>Any</option>
            <option>1-3</option>
            <option>4-6</option>
            <option>7+</option>
          </select>
        </div>
      </div>

      {/* Bundles Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bundle Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Admin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bundles.map((bundle) => (
                <tr key={bundle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{bundle.ref}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(bundle.status)}`}>
                      {bundle.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{bundle.applications}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className={bundle.admin ? "text-gray-900" : "text-gray-500"}>
                        {bundle.admin || "Unassigned"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{bundle.created}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-blue-600 hover:text-blue-900" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Total Bundles</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">124</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Completed This Month</p>
              <p className="text-3xl font-bold text-green-900 mt-2">42</p>
            </div>
            <div className="text-green-600 font-bold">65%</div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">Avg Processing Time</p>
              <p className="text-3xl font-bold text-yellow-900 mt-2">3.8h</p>
            </div>
            <div className="text-yellow-600 font-bold">-12%</div>
          </div>
        </div>
      </div>
    </div>
  );
}