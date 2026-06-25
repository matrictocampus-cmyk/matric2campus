// src/pages/Profile/Step5Uploads.jsx
import React, { useState, useEffect } from 'react';

export default function Step5Uploads({ profile, setProfile, onBack }) {
  const subjects = profile.subjectsMarks || {};
  const subjectList = Object.keys(subjects);

  // Parse existing manualResults if it's a valid JSON object
  const [exactMarks, setExactMarks] = useState(() => {
    try {
      const parsed = profile.manualResults ? JSON.parse(profile.manualResults) : {};
      return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  });

  // Update profile.manualResults whenever exactMarks changes
  useEffect(() => {
    const manualResults = Object.keys(exactMarks).length > 0 ? JSON.stringify(exactMarks) : null;
    setProfile({
      ...profile,
      manualResults,
    });
  }, [exactMarks]);

  const handlePercentageChange = (subject, value) => {
    const num = parseInt(value, 10);
    // Allow empty or valid number between 0 and 100
    if (value === '' || (num >= 0 && num <= 100)) {
      setExactMarks(prev => ({
        ...prev,
        [subject]: value === '' ? '' : num,
      }));
    }
  };

  if (subjectList.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">📄 Upload Documents & Exact Marks</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 mb-4">
            You haven't added any subjects in the previous step.
          </p>
          <button
            onClick={onBack}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            ← Go back to add subjects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">📄 Enter Exact Percentages for Each Subject</h2>
      <p className="text-gray-600">
        Provide the exact percentage you achieved (or expect) for each subject. This will be used for document uploads and CAO calculations.
      </p>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <table className="w-full text-left border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border-b">Subject</th>
              <th className="p-2 border-b">Mark Range (APS)</th>
              <th className="p-2 border-b">Exact Percentage (%)</th>
            </tr>
          </thead>
          <tbody>
            {subjectList.map(subject => (
              <tr key={subject} className="border-b">
                <td className="p-2 font-medium">{subject}</td>
                <td className="p-2 text-gray-600">{subjects[subject]}</td>
                <td className="p-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={exactMarks[subject] ?? ''}
                    onChange={(e) => handlePercentageChange(subject, e.target.value)}
                    className="w-24 border rounded p-1 text-center"
                    placeholder="0-100"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Optional file upload section could be added here later */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          💡 <strong>Coming soon:</strong> Upload your matric results or certificates for each subject.
        </p>
      </div>
    </div>
  );
}