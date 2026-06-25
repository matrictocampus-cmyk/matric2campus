import React from "react";
import { useNavigate } from "react-router-dom";
import QualifiedCourses from "../components/Eligibility/QualifiedCourses";

const APS_MAP = {
  "0-29%": 1, "30-39%": 2, "40-49%": 3,
  "50-59%": 4, "60-69%": 5, "70-79%": 6, "80-100%": 7,
};

function calcAPS(marksObj) {
  return Object.entries(marksObj || {}).reduce((sum, [subj, lvl]) => {
    const s = String(subj).toLowerCase().trim();
    if (s.includes("life orientation") || s === "lo") return sum;
    return sum + (APS_MAP[lvl] || 0);
  }, 0);
}

export default function Eligibility({ profile, loading, userId }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading…</div>
      </div>
    );
  }

  if (!profile || !profile.is_completed) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-4 mt-16">
        <div className="text-5xl">📋</div>
        <h2 className="text-xl font-bold text-gray-900">Complete your profile first</h2>
        <p className="text-gray-500 text-sm">
          We need your subject marks and matric results to find courses you qualify for.
        </p>
        <button
          onClick={() => navigate("/profile")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Go to Profile →
        </button>
      </div>
    );
  }

  const userAPS = calcAPS(profile.subjects_marks);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Courses You Qualify For</h1>
          <p className="text-gray-500 mt-1 text-sm">Based on your subject marks and APS score</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-blue-600 font-medium">Your APS</p>
            <p className="text-2xl font-bold text-blue-700">{userAPS}</p>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
          >
            Update results →
          </button>
        </div>
      </div>

      <QualifiedCourses profile={profile} userId={userId} />
    </div>
  );
}
