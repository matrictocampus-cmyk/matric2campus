import { useState, useMemo } from "react";
import { SA_SUBJECTS, getAchievementLevel } from "./onboardingConfig";

const MATH_CONFLICT = ["Mathematics", "Mathematical Literacy"];

export default function SubjectSection({ subjects, marks, onSubjectsChange, onMarksChange, onComplete }) {
  const [phase, setPhase] = useState("pick"); // "pick" | "marks"
  const [markStep, setMarkStep] = useState(0);
  const [search, setSearch] = useState("");
  const [markInput, setMarkInput] = useState("");
  const [markError, setMarkError] = useState("");

  const filteredSubjects = useMemo(() => {
    const q = search.toLowerCase();
    return SA_SUBJECTS.filter(s => s.toLowerCase().includes(q));
  }, [search]);

  const hasMathConflict =
    subjects.includes("Mathematics") && subjects.includes("Mathematical Literacy");

  function toggleSubject(subject) {
    if (subjects.includes(subject)) {
      onSubjectsChange(subjects.filter(s => s !== subject));
    } else {
      onSubjectsChange([...subjects, subject]);
    }
  }

  function canProceedToPick() {
    return subjects.length >= 5 && !hasMathConflict;
  }

  function startMarks() {
    setMarkStep(0);
    setMarkInput(marks[subjects[0]] !== undefined ? String(marks[subjects[0]]) : "");
    setMarkError("");
    setPhase("marks");
  }

  const currentSubject = subjects[markStep];
  const currentMark = Number(markInput);
  const achievement = markInput !== "" && !isNaN(currentMark)
    ? getAchievementLevel(Math.min(100, Math.max(0, currentMark)))
    : null;

  function validateAndAdvance() {
    const val = Number(markInput);
    if (markInput === "" || isNaN(val)) {
      setMarkError("Please enter a mark between 0 and 100.");
      return;
    }
    if (val < 0 || val > 100) {
      setMarkError("Mark must be between 0% and 100%.");
      return;
    }
    setMarkError("");
    const updated = { ...marks, [currentSubject]: val };
    onMarksChange(updated);

    if (markStep < subjects.length - 1) {
      const next = markStep + 1;
      setMarkStep(next);
      setMarkInput(updated[subjects[next]] !== undefined ? String(updated[subjects[next]]) : "");
      setMarkError("");
    } else {
      onComplete(updated);
    }
  }

  function goBackInMarks() {
    if (markStep === 0) {
      setPhase("pick");
    } else {
      const prev = markStep - 1;
      setMarkStep(prev);
      setMarkInput(marks[subjects[prev]] !== undefined ? String(marks[subjects[prev]]) : "");
      setMarkError("");
    }
  }

  if (phase === "pick") {
    return (
      <div className="w-full">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Which subjects do you take?</h2>
        <p className="text-gray-500 mb-6">Select all subjects you are currently studying.</p>

        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search subjects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-2xl text-base focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
        </div>

        {hasMathConflict && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-700 text-sm font-medium">
            You can't take both Mathematics and Mathematical Literacy. Please remove one.
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-5 min-h-[2.5rem]">
          {subjects.length === 0 ? (
            <p className="text-gray-400 text-sm italic">No subjects selected yet</p>
          ) : subjects.map(s => (
            <button
              key={s}
              onClick={() => toggleSubject(s)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border-2 border-emerald-400 text-emerald-700 rounded-full text-sm font-medium transition-all hover:bg-red-50 hover:border-red-300 hover:text-red-600"
            >
              {s} <span className="text-xs">×</span>
            </button>
          ))}
        </div>

        <div className="text-sm text-gray-500 mb-3 flex items-center gap-2">
          <span className="font-semibold text-gray-700">{subjects.length}</span> selected
          {subjects.length < 5 && (
            <span className="text-amber-600">— add at least {5 - subjects.length} more</span>
          )}
          {subjects.length >= 5 && !hasMathConflict && (
            <span className="text-emerald-600 font-medium">— ready to continue</span>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto border-2 border-gray-100 rounded-2xl divide-y divide-gray-50">
          {filteredSubjects.map(s => {
            const selected = subjects.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleSubject(s)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors
                  ${selected ? "bg-emerald-50 text-emerald-700 font-medium" : "bg-white text-gray-700 hover:bg-gray-50"}`}
              >
                <span>{s}</span>
                {selected && <span className="text-emerald-500 text-lg">✓</span>}
              </button>
            );
          })}
          {filteredSubjects.length === 0 && (
            <p className="px-4 py-6 text-center text-gray-400 text-sm">No subjects match "{search}"</p>
          )}
        </div>

        <button
          onClick={startMarks}
          disabled={!canProceedToPick()}
          className="mt-6 w-full py-4 bg-emerald-600 text-white text-lg font-semibold rounded-2xl hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue — Enter My Marks →
        </button>
      </div>
    );
  }

  // Phase: marks
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-400 font-medium">{markStep + 1} of {subjects.length}</p>
        <div className="flex gap-1">
          {subjects.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i < markStep ? "w-5 bg-emerald-500" : i === markStep ? "w-5 bg-emerald-400" : "w-3 bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      <h2 className="text-3xl font-bold text-gray-900 mb-1 mt-4">{currentSubject}</h2>
      <p className="text-gray-500 mb-8">What was your latest mark or predicted percentage?</p>

      <div className="relative mb-3">
        <input
          type="number"
          min={0}
          max={100}
          value={markInput}
          onChange={e => { setMarkInput(e.target.value); setMarkError(""); }}
          onKeyDown={e => e.key === "Enter" && validateAndAdvance()}
          placeholder="e.g. 72"
          autoFocus
          className="w-full text-5xl font-bold text-center border-b-4 border-gray-200 focus:border-emerald-500 outline-none py-4 bg-transparent transition-colors placeholder-gray-200"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-gray-300">%</span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={markInput === "" ? 0 : Math.min(100, Math.max(0, Number(markInput)))}
        onChange={e => { setMarkInput(e.target.value); setMarkError(""); }}
        className="w-full accent-emerald-500 mb-4"
      />

      {achievement && (
        <div
          className="text-center py-3 px-4 rounded-2xl text-sm font-semibold transition-all"
          style={{ backgroundColor: achievement.color + "18", color: achievement.color }}
        >
          {achievement.label} &nbsp;·&nbsp; {achievement.range}
        </div>
      )}

      {markError && (
        <p className="mt-3 text-red-500 text-sm text-center">{markError}</p>
      )}

      <div className="mt-8 flex gap-3">
        <button
          onClick={goBackInMarks}
          className="px-5 py-4 text-gray-500 text-sm font-medium hover:text-gray-800 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={validateAndAdvance}
          className="flex-1 py-4 bg-emerald-600 text-white text-lg font-semibold rounded-2xl hover:bg-emerald-700 transition-colors"
        >
          {markStep < subjects.length - 1 ? "Next Subject →" : "Done with Marks →"}
        </button>
      </div>
    </div>
  );
}
