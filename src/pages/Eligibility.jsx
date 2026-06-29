import React from "react";
import { useNavigate } from "react-router-dom";
import QualifiedCourses from "../components/Eligibility/QualifiedCourses";

export default function Eligibility({ profile, loading, userId }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4 animate-pulse">
        <div className="h-20 bg-gray-100 rounded-2xl" />
        <div className="h-12 bg-gray-100 rounded-xl" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  // Check if the user has any marks data at all
  const hasManualResults =
    profile?.manual_results &&
    typeof profile.manual_results === "object" &&
    !Array.isArray(profile.manual_results) &&
    Object.keys(profile.manual_results).length > 0;

  const hasSubjectMarks =
    profile?.subjects_marks &&
    typeof profile.subjects_marks === "object" &&
    Object.keys(profile.subjects_marks).length > 0;

  const hasAnyData = hasManualResults || hasSubjectMarks || profile?.is_completed || profile?.onboarding_completed;

  if (!profile || !hasAnyData) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-4 mt-16">
        <div className="text-5xl">📋</div>
        <h2 className="text-xl font-bold text-gray-900">Complete your profile first</h2>
        <p className="text-gray-500 text-sm">
          We need your subject marks and results to find courses you qualify for.
        </p>
        <button
          onClick={() => navigate("/profile")}
          className="text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          style={{ background: "#FF7A18" }}
        >
          Go to Profile →
        </button>
      </div>
    );
  }

  return <QualifiedCourses profile={profile} userId={userId} />;
}
