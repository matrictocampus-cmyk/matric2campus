import React from "react";

export default function EligibilityResults({ eligibility }) {
  if (!eligibility) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
        Fill in the form above and click <strong>"Submit &amp; Check Eligibility"</strong> to see your results and unlock the Apply button.
      </div>
    );
  }

  const yesNo = (val) => {
    if (val === true || val === "yes") return "Yes";
    if (val === false || val === "no") return "No";
    return val || "Not provided";
  };

  const needsFunding = eligibility.financial?.needsFunding;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100 space-y-5">
      <h2 className="text-2xl font-bold text-gray-900">Your Eligibility Summary</h2>

      {/* Education */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-1">
        <h3 className="font-semibold text-gray-800 mb-2">📚 Education</h3>
        <p className="text-sm"><span className="text-gray-500">Highest grade:</span> <strong>{eligibility.education?.highestGradeCompleted || eligibility.education?.grade || "Not provided"}</strong></p>
        <p className="text-sm"><span className="text-gray-500">School:</span> <strong>{eligibility.education?.school || "Not provided"}</strong></p>
        <p className="text-sm"><span className="text-gray-500">Qualification type:</span> <strong>{eligibility.education?.qualificationType || "Not specified"}</strong></p>
      </div>

      {/* Financial */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-1">
        <h3 className="font-semibold text-gray-800 mb-2">💰 Financial</h3>
        <p className="text-sm"><span className="text-gray-500">Annual household income:</span> <strong>{eligibility.financial?.familyIncome || "Not provided"}</strong></p>
        <p className="text-sm">
          <span className="text-gray-500">Likely eligible for funding:</span>{" "}
          <strong className={needsFunding ? "text-green-600" : "text-gray-700"}>
            {needsFunding ? "Yes — you may qualify for NSFAS or bursaries" : "May not qualify for needs-based funding"}
          </strong>
        </p>
      </div>

      {/* Study preferences */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-1">
        <h3 className="font-semibold text-gray-800 mb-2">🎓 Study Preferences</h3>
        <p className="text-sm"><span className="text-gray-500">Study mode:</span> <strong>{eligibility.lifestyle?.studyMode || "Not specified"}</strong></p>
        <p className="text-sm"><span className="text-gray-500">Has previous tertiary qualification:</span> <strong>{yesNo(eligibility.lifestyle?.previousTertiary)}</strong></p>
        <p className="text-sm"><span className="text-gray-500">Field of interest:</span> <strong>{eligibility.barriers?.fieldInterest || "Not specified"}</strong></p>
      </div>

      {/* Confirmation */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
        <span className="text-2xl">✅</span>
        <div>
          <p className="font-semibold text-green-800">Eligibility saved successfully!</p>
          <p className="text-sm text-green-700 mt-1">You can now browse courses and add them to your application bucket. Click <strong>"Browse Courses"</strong> below to start.</p>
        </div>
      </div>
    </div>
  );
}
