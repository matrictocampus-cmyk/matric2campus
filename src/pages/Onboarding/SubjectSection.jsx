import { useState, useMemo } from "react";
import { SA_SUBJECTS, getAchievementLevel } from "./onboardingConfig";

const MATH_CONFLICT = ["Mathematics", "Mathematical Literacy"];

const DEFAULT_T = {
  bg: "#04040A", surface: "#0E0E1A",
  border: "rgba(255,255,255,0.08)", borderActive: "#6366f1",
  textPrimary: "#F9FAFB", textSecondary: "rgba(255,255,255,0.5)",
  textMuted: "rgba(255,255,255,0.28)", accentLight: "#a5b4fc",
  green: "#4ade80",
  btnGrad: "linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #6366f1 100%)",
  btnShadow: "0 4px 28px rgba(99,102,241,0.45)",
};

export default function SubjectSection({ subjects, marks, onSubjectsChange, onMarksChange, onComplete, darkTheme }) {
  const T = darkTheme ?? DEFAULT_T;

  const [phase, setPhase] = useState("pick");
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
    onSubjectsChange(subjects.includes(subject)
      ? subjects.filter(s => s !== subject)
      : [...subjects, subject]);
  }

  function startMarks() {
    setMarkStep(0);
    setMarkInput(marks[subjects[0]] !== undefined ? String(marks[subjects[0]]) : "");
    setMarkError("");
    setPhase("marks");
  }

  const currentSubject = subjects[markStep];
  const rawMark = Number(markInput);
  const achievement = markInput !== "" && !isNaN(rawMark)
    ? getAchievementLevel(Math.min(100, Math.max(0, rawMark)))
    : null;

  function validateAndAdvance() {
    const val = Number(markInput);
    if (markInput === "" || isNaN(val)) { setMarkError("Please enter a mark between 0 and 100."); return; }
    if (val < 0 || val > 100) { setMarkError("Mark must be between 0% and 100%."); return; }
    setMarkError("");
    const updated = { ...marks, [currentSubject]: val };
    onMarksChange(updated);
    if (markStep < subjects.length - 1) {
      const next = markStep + 1;
      setMarkStep(next);
      setMarkInput(updated[subjects[next]] !== undefined ? String(updated[subjects[next]]) : "");
    } else {
      onComplete(updated);
    }
  }

  function goBackInMarks() {
    if (markStep === 0) { setPhase("pick"); return; }
    const prev = markStep - 1;
    setMarkStep(prev);
    setMarkInput(marks[subjects[prev]] !== undefined ? String(marks[subjects[prev]]) : "");
    setMarkError("");
  }

  const card = (selected) => ({
    display: "block", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
    padding: "12px 16px", borderRadius: 12,
    background: selected ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.025)",
    border: `1.5px solid ${selected ? T.borderActive : T.border}`,
    color: selected ? T.accentLight : T.textPrimary,
    fontSize: "0.88rem", transition: "all 0.12s ease", outline: "none",
    marginBottom: 0,
  });

  // ── Phase: subject picker ────────────────────────────────────────────────
  if (phase === "pick") {
    return (
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.accentLight, marginBottom: 12 }}>
          Subjects & Marks
        </p>
        <h2 style={{ fontSize: "clamp(1.6rem, 5.5vw, 2.2rem)", fontWeight: 800, color: T.textPrimary, marginBottom: 8, lineHeight: 1.2 }}>
          Which subjects do you take?
        </h2>
        <p style={{ color: T.textSecondary, fontSize: "0.92rem", marginBottom: 20 }}>
          Select all the subjects you currently study.
        </p>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search subjects…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.04)",
              border: `1.5px solid ${T.border}`,
              borderRadius: 12, color: T.textPrimary, fontFamily: "inherit",
              fontSize: "0.95rem", padding: "12px 16px 12px 42px",
              outline: "none", transition: "border-color 0.15s",
              caretColor: T.accentLight,
            }}
          />
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: "1rem", opacity: 0.4 }}>🔍</span>
        </div>

        {/* Conflict warning */}
        {hasMathConflict && (
          <div style={{ padding: "10px 14px", background: "rgba(251,191,36,0.1)", border: "1.5px solid rgba(251,191,36,0.4)", borderRadius: 10, color: "#fbbf24", fontSize: "0.82rem", fontWeight: 500, marginBottom: 12 }}>
            You can't take both Mathematics and Mathematical Literacy. Please remove one.
          </div>
        )}

        {/* Selected chips */}
        {subjects.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {subjects.map(s => (
              <button
                key={s}
                onClick={() => toggleSubject(s)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 20,
                  background: "rgba(99,102,241,0.15)", border: `1px solid ${T.borderActive}`,
                  color: T.accentLight, fontSize: "0.78rem", fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                }}
              >
                {s} <span style={{ opacity: 0.7 }}>×</span>
              </button>
            ))}
          </div>
        )}

        {/* Count indicator */}
        <div style={{ fontSize: "0.8rem", color: T.textMuted, marginBottom: 10, display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: T.textSecondary }}>{subjects.length}</span> selected
          {subjects.length < 5 && (
            <span style={{ color: "#fbbf24" }}>— need at least {5 - subjects.length} more</span>
          )}
          {subjects.length >= 5 && !hasMathConflict && (
            <span style={{ color: T.green, fontWeight: 600 }}>— ready to continue</span>
          )}
        </div>

        {/* Subject list */}
        <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 2 }}>
          {filteredSubjects.map(s => {
            const sel = subjects.includes(s);
            return (
              <button key={s} onClick={() => toggleSubject(s)} style={card(sel)}>
                <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {s}
                  {sel && <span style={{ color: T.accentLight, fontSize: "1rem" }}>✓</span>}
                </span>
              </button>
            );
          })}
          {filteredSubjects.length === 0 && (
            <p style={{ textAlign: "center", color: T.textMuted, fontSize: "0.88rem", padding: "24px 0" }}>No subjects match "{search}"</p>
          )}
        </div>

        <button
          onClick={startMarks}
          disabled={subjects.length < 5 || hasMathConflict}
          style={{
            marginTop: 20, width: "100%", border: "none", borderRadius: 14, fontFamily: "inherit",
            fontSize: "1.05rem", fontWeight: 700, padding: "16px",
            background: subjects.length >= 5 && !hasMathConflict
              ? "linear-gradient(135deg, #6366f1, #818cf8)"
              : "rgba(99,102,241,0.2)",
            color: subjects.length >= 5 && !hasMathConflict ? "#fff" : "rgba(255,255,255,0.25)",
            cursor: subjects.length >= 5 && !hasMathConflict ? "pointer" : "not-allowed",
            boxShadow: subjects.length >= 5 && !hasMathConflict ? "0 4px 28px rgba(99,102,241,0.4)" : "none",
            transition: "all 0.2s ease",
          }}
        >
          Continue — Enter My Marks →
        </button>
      </div>
    );
  }

  // ── Phase: marks entry ───────────────────────────────────────────────────
  return (
    <div>
      {/* Per-subject progress dots */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.accentLight }}>
          Subject {markStep + 1} of {subjects.length}
        </p>
        <div style={{ display: "flex", gap: 4 }}>
          {subjects.map((_, i) => (
            <div key={i} style={{
              height: 4, borderRadius: 4, transition: "all 0.2s",
              width: i === markStep ? 20 : 8,
              background: i < markStep ? "#6366f1" : i === markStep ? "#a5b4fc" : "rgba(255,255,255,0.1)",
            }} />
          ))}
        </div>
      </div>

      <h2 style={{ fontSize: "clamp(1.6rem, 5.5vw, 2.2rem)", fontWeight: 800, color: T.textPrimary, marginBottom: 6, lineHeight: 1.2 }}>
        {currentSubject}
      </h2>
      <p style={{ color: T.textSecondary, fontSize: "0.9rem", marginBottom: 28 }}>
        What was your latest mark or predicted percentage?
      </p>

      {/* Big number input */}
      <div style={{ position: "relative", textAlign: "center", marginBottom: 8 }}>
        <input
          type="number"
          min={0}
          max={100}
          value={markInput}
          onChange={e => { setMarkInput(e.target.value); setMarkError(""); }}
          onKeyDown={e => e.key === "Enter" && validateAndAdvance()}
          placeholder="—"
          autoFocus
          style={{
            width: "100%", background: "transparent", border: "none",
            borderBottom: `3px solid ${markInput ? "#6366f1" : "rgba(255,255,255,0.12)"}`,
            color: T.textPrimary, fontFamily: "inherit", outline: "none",
            fontSize: "clamp(3rem, 14vw, 5rem)", fontWeight: 900,
            textAlign: "center", padding: "8px 0",
            boxSizing: "border-box", caretColor: "#a5b4fc",
            transition: "border-color 0.2s",
          }}
        />
        <span style={{
          position: "absolute", right: 0, bottom: 16,
          fontSize: "1.8rem", fontWeight: 700, color: "rgba(255,255,255,0.2)",
        }}>%</span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={100}
        value={markInput === "" ? 0 : Math.min(100, Math.max(0, Number(markInput)))}
        onChange={e => { setMarkInput(e.target.value); setMarkError(""); }}
        style={{ width: "100%", accentColor: "#6366f1", marginBottom: 14 }}
      />

      {/* Achievement badge */}
      {achievement && (
        <div style={{
          textAlign: "center", padding: "10px 16px", borderRadius: 10,
          background: achievement.color + "18", color: achievement.color,
          fontSize: "0.88rem", fontWeight: 700, border: `1px solid ${achievement.color}40`,
          marginBottom: 8,
        }}>
          {achievement.label} &nbsp;·&nbsp; {achievement.range}
        </div>
      )}

      {markError && (
        <p style={{ textAlign: "center", color: "#f87171", fontSize: "0.85rem", marginBottom: 8 }}>{markError}</p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button
          onClick={goBackInMarks}
          style={{
            padding: "14px 18px", background: "none", border: `1.5px solid ${T.border}`,
            borderRadius: 12, color: T.textMuted, fontSize: "0.88rem", fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.15s, color 0.15s",
          }}
        >
          ← Back
        </button>
        <button
          onClick={validateAndAdvance}
          style={{
            flex: 1, border: "none", borderRadius: 12, fontFamily: "inherit",
            fontSize: "1rem", fontWeight: 700, padding: "14px",
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            color: "#fff", cursor: "pointer",
            boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
          }}
        >
          {markStep < subjects.length - 1 ? "Next Subject →" : "Done with Marks →"}
        </button>
      </div>
    </div>
  );
}
