// src/pages/Profile/Step4Interests.jsx
import React, { useState, useMemo } from 'react';

const SUBJECT_OPTIONS = [
  "English Home Language",
  "English First Additional Language",
  "Afrikaans Home Language",
  "Afrikaans First Additional Language",
  "isiZulu Home Language",
  "isiZulu First Additional Language",
  "Mathematics",
  "Mathematical Literacy",
  "Physical Sciences",
  "Life Sciences",
  "Accounting",
  "Business Studies",
  "Economics",
  "Geography",
  "History",
  "Life Orientation (LO)",
  "Information Technology",
  "Computer Applications Technology",
  "Consumer Studies",
  "Tourism",
  "Music",
  "Visual Arts",
  "Dramatic Arts",
  "Religion Studies",
];

const MARK_OPTIONS = [
  "0-29%",
  "30-39%",
  "40-49%",
  "50-59%",
  "60-69%",
  "70-79%",
  "80-100%",
];

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

export default function Step4Interests({ profile, setProfile }) {
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedMark, setSelectedMark] = useState("");
  const [addError, setAddError] = useState("");

  const subjects = profile.subjectsMarks || {};

  // Calculate total APS excluding LO (for live preview)
  const totalAPS = useMemo(() => {
    return Object.entries(subjects)
      .filter(([subject]) => !subject.toLowerCase().includes("life orientation"))
      .reduce((sum, [, mark]) => sum + formatAPS(mark), 0);
  }, [subjects]);

  const addSubject = () => {
    if (!selectedSubject || !selectedMark) {
      setAddError("Please choose both a subject and a mark range before adding.");
      return;
    }
    if (subjects[selectedSubject]) {
      setAddError("That subject is already in your list. Remove it first if you want to change the mark.");
      return;
    }
    setAddError("");
    setProfile({
      ...profile,
      subjectsMarks: {
        ...subjects,
        [selectedSubject]: selectedMark,
      },
    });
    setSelectedSubject("");
    setSelectedMark("");
  };

  const removeSubject = (subject) => {
    const updated = { ...subjects };
    delete updated[subject];
    setProfile({
      ...profile,
      subjectsMarks: updated,
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">📚 Subjects & Marks</h2>

      {/* Add new subject */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <h3 className="font-medium">Add a Subject</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="input w-full border rounded p-2"
          >
            <option value="">Select Subject</option>
            {SUBJECT_OPTIONS.map((subj) => (
              <option key={subj} value={subj}>{subj}</option>
            ))}
          </select>
          <select
            value={selectedMark}
            onChange={(e) => setSelectedMark(e.target.value)}
            className="input w-full border rounded p-2"
          >
            <option value="">Select Mark Range</option>
            {MARK_OPTIONS.map((mark) => (
              <option key={mark} value={mark}>{mark}</option>
            ))}
          </select>
        </div>
        <button
          onClick={addSubject}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Subject
        </button>
        {addError && (
          <p className="text-sm text-red-600 mt-1">{addError}</p>
        )}
      </div>

      {/* List of added subjects */}
      {Object.keys(subjects).length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium mb-3">Added Subjects</h3>
          <table className="w-full text-left border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border-b">Subject</th>
                <th className="p-2 border-b">Mark Range</th>
                <th className="p-2 border-b">APS Level</th>
                <th className="p-2 border-b text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(subjects).map(([subject, mark]) => (
                <tr key={subject} className="border-b">
                  <td className="p-2">{subject}</td>
                  <td className="p-2">{mark}</td>
                  <td className="p-2">{formatAPS(mark)}</td>
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

          {/* Live APS total */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-sm text-blue-600">
              ℹ️ In the next step, you'll enter your exact percentage for each subject.
            </p>
            <div className="font-semibold text-right">
              Total APS (excluding LO): <span className="text-purple-700">{totalAPS}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}