import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ApplicationsTable({ userId }) {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("application_bundles")
        .select(`id, bundle_ref, status, created_at, applications(institution_name, course_title, status)`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        setError("Failed to load applications.");
      } else {
        setBundles(data || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [userId]);

  const statusColor = (s) => {
    if (s === "completed") return "text-green-400";
    if (s === "rejected") return "text-red-400";
    return "text-yellow-400";
  };

  if (loading) return <div className="p-4 text-gray-400">Loading applications…</div>;
  if (error) return <div className="p-4 text-red-400">{error}</div>;
  if (bundles.length === 0) return <div className="p-4 text-gray-400 italic">No applications yet.</div>;

  return (
    <div className="bg-[#0b0b0b] p-5 rounded-2xl shadow-lg shadow-green-500/10 border border-green-500/20">
      <table className="w-full text-left">
        <thead>
          <tr className="text-sm text-green-300/80">
            <th className="py-2">Institution</th>
            <th>Program</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {bundles.map((bundle) =>
            (bundle.applications || []).map((app, i) => (
              <tr key={`${bundle.id}-${i}`} className="border-t border-gray-800 hover:bg-green-500/5 transition">
                <td className="py-3 text-white">{app.institution_name}</td>
                <td className={statusColor(app.status)}>{app.course_title}</td>
                <td className="text-gray-400">{new Date(bundle.created_at).toLocaleDateString()}</td>
                <td className={statusColor(app.status)}>{app.status?.replace(/_/g, " ")}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
