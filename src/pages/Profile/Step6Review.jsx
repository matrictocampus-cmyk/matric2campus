// src/pages/Profile/Step6Review.jsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Step6Review({ profile, setProfile }) {
  const navigate = useNavigate();

  // APS mapping (unchanged)
  const formatAPS = (value) => {
    const map = {
      "0-29%": 1,
      "30-39%": 2,
      "40-49%": 3,
      "50-59%": 4,
      "60-69%": 5,
      "70-79%": 6,
      "80-100%": 7,
    };
    return map[value] || 0;
  };

  // Calculate total APS excluding LO – useMemo with deep comparison of subjectsMarks
  const totalAPS = useMemo(() => {
    if (!profile.subjectsMarks) return 0;
    return Object.entries(profile.subjectsMarks)
      .filter(([subject]) => !subject.toLowerCase().includes("life orientation"))
      .reduce((sum, [, value]) => sum + formatAPS(value), 0);
  }, [profile.subjectsMarks]);

  // Remove subject – creates a new object to trigger re-render
  const removeSubject = (subjectToRemove) => {
    const updatedSubjects = { ...profile.subjectsMarks };
    delete updatedSubjects[subjectToRemove];
    setProfile({
      ...profile,
      subjectsMarks: updatedSubjects,
    });
  };

  return (
    <div className="space-y-6 p-4 text-gray-800">
      {/* PERSONAL INFO */}
      <div className="bg-white p-4 shadow rounded text-gray-900">
        <h2 className="text-xl font-bold mb-3">👤 Personal Information</h2>
        <p><strong>Full Name:</strong> {profile.firstName} {profile.lastName}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Phone:</strong> {profile.phone}</p>
        <p><strong>Province:</strong> {profile.province}</p>
        <p><strong>School:</strong> {profile.school}</p>
        <p><strong>Highest Grade Completed:</strong> {profile.highestGrade}</p>
      </div>

      {/* SUBJECT MARKS */}
      <div className="bg-white p-4 shadow rounded text-gray-900">
        <h2 className="text-xl font-bold mb-3">📘 Subject Marks (APS Levels)</h2>

        {Object.keys(profile.subjectsMarks || {}).length === 0 ? (
          <p className="text-gray-500">No subjects selected.</p>
        ) : (
          <>
            <table className="w-full text-left border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border-b">Subject</th>
                  <th className="p-2 border-b">APS Level</th>
                  <th className="p-2 border-b">Marks</th>
                  <th className="p-2 border-b text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(profile.subjectsMarks).map(([subject, value]) => (
                  <tr key={subject} className="border-b">
                    <td className="p-2">{subject}</td>
                    <td className="p-2">Level {formatAPS(value) || '-'}</td>
                    <td className="p-2">{value}</td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => removeSubject(subject)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* APS TOTAL */}
            <div className="mt-4 text-right font-semibold text-lg">
              Total APS (excluding LO):{' '}
              <span className="text-purple-700">{totalAPS}</span>
            </div>
          </>
        )}
      </div>

      {/* MANUAL RESULTS */}
      {profile.manualResults && (() => {
        try {
          const parsed = typeof profile.manualResults === "string"
            ? JSON.parse(profile.manualResults)
            : profile.manualResults;
          const entries = Object.entries(parsed).filter(([, v]) => v !== "" && v !== null);
          if (!entries.length) return null;
          return (
            <div className="bg-white p-4 shadow rounded text-gray-900">
              <h2 className="text-xl font-bold mb-3">✍️ Exact Percentages</h2>
              <table className="w-full text-left border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border-b">Subject</th>
                    <th className="p-2 border-b">Exact %</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([subject, pct]) => (
                    <tr key={subject} className="border-b">
                      <td className="p-2">{subject}</td>
                      <td className="p-2">{pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        } catch {
          return null;
        }
      })()}

      {/* INFO NOTE */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        👆 Review your information above. When everything looks correct, click <strong>"Save Profile"</strong> at the bottom of the page to save and continue.
      </div>
    </div>
  );
}