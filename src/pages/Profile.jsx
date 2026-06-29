import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { FiPlus, FiX, FiCheck, FiEdit2 } from "react-icons/fi";

// ─── Constants ────────────────────────────────────────────────────────────────
const PROVINCES = [
  "Eastern Cape","Free State","Gauteng","KwaZulu-Natal",
  "Limpopo","Mpumalanga","North West","Northern Cape","Western Cape",
];
const GRADES = ["Grade 10","Grade 11","Grade 12","Matric (passed)"];
const TERMS  = [
  { value: 1, label: "Term 1" },
  { value: 2, label: "Term 2" },
  { value: 3, label: "Term 3" },
  { value: 4, label: "Final / Matric results" },
];
const INTERESTS_LIST = [
  { id: "tech",        label: "Technology"          },
  { id: "health",      label: "Health & Medicine"   },
  { id: "business",    label: "Business & Finance"  },
  { id: "engineering", label: "Engineering"         },
  { id: "arts",        label: "Arts & Design"       },
  { id: "sciences",    label: "Natural Sciences"    },
  { id: "social",      label: "Education & Social"  },
  { id: "law",         label: "Law & Justice"       },
  { id: "agriculture", label: "Agriculture"         },
  { id: "media",       label: "Media & Comms"       },
];
const COMMON_SUBJECTS = [
  "Mathematics","Mathematical Literacy","Physical Sciences","Life Sciences",
  "Geography","History","Accounting","Business Studies","Economics",
  "Computer Applications Technology","Information Technology",
  "Engineering Graphics and Design","Visual Arts","Music","Dramatic Arts",
  "Consumer Studies","Tourism","Agricultural Sciences",
  "English Home Language","English First Additional Language",
  "Afrikaans Home Language","Afrikaans First Additional Language",
  "Zulu","Xhosa","Sepedi","Setswana","Sesotho","Life Orientation",
];

// NSC mark descriptors — ordered best to worst for the level picker grid
const MARK_LEVELS = [
  { level: 7, label: "Outstanding",  range: "80%+",   min: 80, max: 100, mid: 90, color: "#15803d" },
  { level: 6, label: "Meritorious",  range: "70–79%", min: 70, max: 79,  mid: 75, color: "#4d7c0f" },
  { level: 5, label: "Substantial",  range: "60–69%", min: 60, max: 69,  mid: 65, color: "#ca8a04" },
  { level: 4, label: "Adequate",     range: "50–59%", min: 50, max: 59,  mid: 55, color: "#d97706" },
  { level: 3, label: "Moderate",     range: "40–49%", min: 40, max: 49,  mid: 45, color: "#ea580c" },
  { level: 2, label: "Elementary",   range: "30–39%", min: 30, max: 39,  mid: 35, color: "#dc2626" },
  { level: 1, label: "Not Achieved", range: "0–29%",  min: 0,  max: 29,  mid: 15, color: "#9ca3af" },
];

function pctToLevel(pct) {
  const p = Number(pct);
  if (p >= 80) return 7; if (p >= 70) return 6; if (p >= 60) return 5;
  if (p >= 50) return 4; if (p >= 40) return 3; if (p >= 30) return 2;
  return 1;
}
function calcAPS(subjects) {
  return subjects.reduce((sum, s) => {
    if (s.name.toLowerCase().includes("life orientation")) return sum;
    return sum + pctToLevel(s.mark);
  }, 0);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Profile() {
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [userId, setUserId]     = useState(null);
  const [error, setError]       = useState("");

  // Form state
  const [firstName,   setFirstName]   = useState("");
  const [lastName,    setLastName]    = useState("");
  const [phone,       setPhone]       = useState("");
  const [grade,       setGrade]       = useState("");
  const [province,    setProvince]    = useState("");
  const [school,      setSchool]      = useState("");
  const [dreamUni,    setDreamUni]    = useState("");
  const [interests,   setInterests]   = useState([]);
  const [resultsTerm, setResultsTerm] = useState(null);
  const [personality, setPersonality] = useState(null);
  const [email,       setEmail]       = useState("");

  // Application history
  const [appHistory, setAppHistory] = useState([]);

  // Per-term subjects: { 1: [{name, mark}], 2: [...], 3: [...], 4: [...] }
  const [termSubjects, setTermSubjects] = useState({ 1: [], 2: [], 3: [], 4: [] });
  const [editingIdx, setEditingIdx]     = useState(null);

  // Add subject panel state
  const [showSubjectInput, setShowSubjectInput] = useState(false);
  const [newName,  setNewName]  = useState("");
  const [newMark,  setNewMark]  = useState(null); // null = not yet chosen

  // Derived
  const subjects = resultsTerm ? (termSubjects[resultsTerm] || []) : [];
  const liveAps  = calcAPS(subjects);
  const isLO     = newName.toLowerCase().includes("life orientation");
  const availableSubjects = COMMON_SUBJECTS.filter(
    s => !subjects.some(e => e.name.toLowerCase() === s.toLowerCase())
  );
  const markLabel = newMark !== null ? MARK_LEVELS.find(l => l.level === pctToLevel(newMark))?.label : null;

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: p } = await supabase
        .from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!p) { setLoading(false); return; }

      setFirstName(p.first_name || "");
      setLastName(p.last_name  || "");
      setPhone(p.phone         || "");
      setGrade(p.grade         || "");
      setProvince(p.province   || "");
      setSchool(p.school       || "");
      setDreamUni(p.dream_university || "");
      setInterests(p.career_interests || []);
      setResultsTerm(p.results_term ?? null);
      setPersonality(p.personality_type || null);
      setEmail(p.email || "");

      // Load per-term subjects
      const raw = { 1: [], 2: [], 3: [], 4: [] };
      if (p.manual_results && typeof p.manual_results === "object" && !Array.isArray(p.manual_results)) {
        // Per-term data stored in manual_results JSONB
        [1, 2, 3, 4].forEach(t => {
          const termData = p.manual_results[t] || p.manual_results[String(t)];
          if (termData && typeof termData === "object") {
            raw[t] = Object.entries(termData)
              .map(([name, mark]) => ({ name, mark: Number(mark) }))
              .filter(s => !isNaN(s.mark));
          }
        });
      } else if (p.subjects_marks && typeof p.subjects_marks === "object") {
        // Legacy flat format — put it into the selected term (or term 1)
        const term = p.results_term || 1;
        if (term >= 1 && term <= 4) {
          raw[term] = Object.entries(p.subjects_marks)
            .map(([name, mark]) => ({ name, mark: Number(mark) }))
            .filter(s => !isNaN(s.mark));
        }
      }
      setTermSubjects(raw);

      // Load application history
      const { data: bundles } = await supabase
        .from("application_bundles")
        .select("id, bundle_ref, status, created_at, package_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setAppHistory(bundles || []);

      setLoading(false);
    })();
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!userId) return;
    setError(""); setSaving(true);
    try {
      const activeSubjects = termSubjects[resultsTerm] || [];
      const subjectsMarks  = Object.fromEntries(activeSubjects.map(s => [s.name, s.mark]));
      const aps            = liveAps > 0 ? liveAps : null;

      // Build manual_results from all terms
      const manualResultsData = {};
      [1, 2, 3, 4].forEach(t => {
        const ts = termSubjects[t] || [];
        if (ts.length > 0) manualResultsData[t] = Object.fromEntries(ts.map(s => [s.name, s.mark]));
      });

      await supabase.from("profiles").update({
        first_name:       firstName.trim(),
        last_name:        lastName.trim(),
        full_name:        `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone:            phone.trim() || null,
        grade:            grade || null,
        province:         province || null,
        school:           school.trim() || null,
        dream_university: dreamUni.trim() || null,
        career_interests: interests,
        subjects_marks:   Object.keys(subjectsMarks).length ? subjectsMarks : null,
        aps_score:        aps,
        results_term:     resultsTerm,
        manual_results:   Object.keys(manualResultsData).length ? manualResultsData : null,
        updated_at:       new Date().toISOString(),
      }).eq("user_id", userId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Subject helpers ───────────────────────────────────────────────────────
  const addSubject = () => {
    if (!resultsTerm || !newName || newMark === null) return;
    setTermSubjects(prev => ({
      ...prev,
      [resultsTerm]: [...(prev[resultsTerm] || []), { name: newName, mark: newMark }],
    }));
    setNewName(""); setNewMark(null); setShowSubjectInput(false);
  };

  const updateMark = (idx, mark) => {
    if (!resultsTerm) return;
    const clamped = Math.min(100, Math.max(0, Number(mark)));
    setTermSubjects(prev => ({
      ...prev,
      [resultsTerm]: prev[resultsTerm].map((s, i) => i === idx ? { ...s, mark: clamped } : s),
    }));
  };

  const removeSubject = (idx) => {
    if (!resultsTerm) return;
    setTermSubjects(prev => ({
      ...prev,
      [resultsTerm]: prev[resultsTerm].filter((_, i) => i !== idx),
    }));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const toggleInterest = (id) => {
    setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const openAddPanel = () => {
    if (!resultsTerm) return;
    setNewName(""); setNewMark(null); setShowSubjectInput(true);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4 animate-pulse">
        <div className="h-24 bg-gray-100 rounded-2xl" />
        {[0,1,2].map(i => <div key={i} className="h-36 bg-gray-100 rounded-2xl" />)}
      </div>
    );
  }

  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "S";

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
          style={{ background: "#FF7A18" }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-lg truncate">
            {firstName || lastName ? `${firstName} ${lastName}`.trim() : "Your Profile"}
          </p>
          <p className="text-sm text-gray-400">
            {grade && `${grade} · `}{province}{personality && ` · ${personality}`}
          </p>
          {liveAps > 0 && (
            <p className="text-sm font-semibold mt-0.5" style={{ color: "#FF7A18" }}>
              APS {liveAps} · {subjects.filter(s => !s.name.toLowerCase().includes("life orientation")).length} subjects
              {resultsTerm && <span className="text-gray-400 font-normal"> (Term {resultsTerm})</span>}
            </p>
          )}
        </div>
      </div>

      {/* ── Personal info ────────────────────────────────────────────────── */}
      <Section title="Personal Information">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input value={firstName} onChange={e => setFirstName(e.target.value)}
              className="field-input" placeholder="First name" />
          </Field>
          <Field label="Last name">
            <input value={lastName} onChange={e => setLastName(e.target.value)}
              className="field-input" placeholder="Last name" />
          </Field>
          <Field label="Phone">
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className="field-input" placeholder="0XX XXX XXXX" type="tel" />
          </Field>
          <Field label="Email">
            <input value={email} readOnly
              className="field-input bg-gray-50 text-gray-400 cursor-not-allowed" />
          </Field>
          <Field label="Grade">
            <select value={grade} onChange={e => setGrade(e.target.value)} className="field-input">
              <option value="">Select grade</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Province">
            <select value={province} onChange={e => setProvince(e.target.value)} className="field-input">
              <option value="">Select province</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="School" className="col-span-2">
            <input value={school} onChange={e => setSchool(e.target.value)}
              className="field-input" placeholder="Your school name" />
          </Field>
          <Field label="Dream university / institution" className="col-span-2">
            <input value={dreamUni} onChange={e => setDreamUni(e.target.value)}
              className="field-input" placeholder="e.g. University of Pretoria" />
          </Field>
        </div>
      </Section>

      {/* ── Subjects & marks ─────────────────────────────────────────────── */}
      <Section
        title="Subjects & Marks"
        right={liveAps > 0
          ? <span className="text-sm font-bold text-gray-900">APS <span style={{ color: "#FF7A18" }}>{liveAps}</span></span>
          : null
        }
      >
        {/* ── Term selector ──────────────────────────────────────────────── */}
        <div className="space-y-1.5 mb-4">
          <p className="text-xs font-bold text-gray-600">
            Which term's results are you entering?
          </p>
          <div className="flex gap-2 flex-wrap">
            {TERMS.map(t => (
              <button
                key={t.value}
                onClick={() => { setResultsTerm(t.value); setEditingIdx(null); setShowSubjectInput(false); }}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-colors ${
                  resultsTerm === t.value
                    ? "text-white border-transparent"
                    : "text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
                style={resultsTerm === t.value ? { background: "#FF7A18", borderColor: "#FF7A18" } : {}}
              >
                {t.label}
                {(termSubjects[t.value]?.length > 0) && (
                  <span className={`ml-1.5 font-bold ${resultsTerm === t.value ? "text-white/70" : "text-orange-400"}`}>
                    ·{termSubjects[t.value].length}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Prompt if no term selected */}
          {!resultsTerm && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">
              <span className="text-amber-500 text-base leading-none mt-0.5">↑</span>
              <p className="text-xs text-amber-800">
                <span className="font-bold">Select a term above</span> to enter or view your subjects and marks.
                Each term stores separate results.
              </p>
            </div>
          )}
        </div>

        {resultsTerm && (
          <>
            {/* ── Subject list ─────────────────────────────────────────── */}
            {subjects.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">
                No subjects for Term {resultsTerm} yet — add one below.
              </p>
            )}

            {subjects.length >= 8 && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-2">
                <span className="text-red-500 font-bold text-base leading-none mt-0.5">↑</span>
                <p className="text-xs text-red-800">
                  <span className="font-bold">You have {subjects.length} subjects listed above.</span>{" "}
                  Most matric students take 7. Check for accidental duplicates.
                </p>
              </div>
            )}

            <div className="space-y-2 mb-3">
              {subjects.map((s, i) => (
                <SubjectRow
                  key={i}
                  subject={s}
                  index={i}
                  isEditing={editingIdx === i}
                  onEdit={() => setEditingIdx(i)}
                  onDoneEditing={() => setEditingIdx(null)}
                  onUpdateMark={mark => updateMark(i, mark)}
                  onRemove={() => removeSubject(i)}
                />
              ))}
            </div>

            {/* ── Add subject panel ─────────────────────────────────────── */}
            {showSubjectInput ? (
              <AddSubjectPanel
                availableSubjects={availableSubjects}
                newName={newName}
                newMark={newMark}
                isLO={isLO}
                markLabel={markLabel}
                liveAps={liveAps}
                termLabel={TERMS.find(t => t.value === resultsTerm)?.label || `Term ${resultsTerm}`}
                onChange={(name, mark) => { setNewName(name); setNewMark(mark); }}
                onAdd={addSubject}
                onCancel={() => { setShowSubjectInput(false); setNewName(""); setNewMark(null); }}
              />
            ) : (
              <button
                onClick={openAddPanel}
                className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
                style={{ color: "#FF7A18" }}
              >
                <FiPlus size={14} /> Add subject to Term {resultsTerm}
              </button>
            )}

            {liveAps > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                APS excludes Life Orientation · out of ~42
              </p>
            )}
          </>
        )}
      </Section>

      {/* ── Career interests ─────────────────────────────────────────────── */}
      <Section title="Career Interests">
        <div className="flex gap-2 flex-wrap">
          {INTERESTS_LIST.map(({ id, label }) => {
            const on = interests.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggleInterest(id)}
                className={`text-sm px-3 py-1.5 rounded-full font-medium border transition-colors ${
                  on ? "text-white border-transparent" : "text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
                style={on ? { background: "#FF7A18", borderColor: "#FF7A18" } : {}}
              >
                {on && <FiCheck size={11} className="inline mr-1" />}{label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Application History ──────────────────────────────────────────── */}
      {appHistory.length > 0 && (
        <Section title="Application History">
          <div className="space-y-2">
            {appHistory.map(b => {
              const STATUS_LABEL = {
                pending_documents: "Pending Documents",
                in_progress: "In Progress",
                submitted: "Submitted",
                action_required: "Action Required",
                completed: "Completed",
                rejected: "Rejected",
              };
              const STATUS_COLOR = {
                pending_documents: "#D97706",
                in_progress: "#2563EB",
                submitted: "#7C3AED",
                action_required: "#DC2626",
                completed: "#16A34A",
                rejected: "#6B7280",
              };
              return (
                <div key={b.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: STATUS_COLOR[b.status] || "#6B7280" }}
                      >
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString("en-ZA")}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Ref: {b.bundle_ref || b.id}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Save ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: "#FF7A18" }}
      >
        {saved ? <><FiCheck size={16} /> Saved!</> : saving ? "Saving…" : "Save Changes"}
      </button>

      <style>{`
        .field-input {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
          background: white;
          color: #111827;
        }
        .field-input:focus { border-color: #FF7A18; }
      `}</style>
    </div>
  );
}

// ─── Subject row (with inline level-picker edit) ───────────────────────────────
function SubjectRow({ subject, isEditing, onEdit, onDoneEditing, onUpdateMark, onRemove }) {
  const currentLevel = pctToLevel(subject.mark);
  const isLO = subject.name.toLowerCase().includes("life orientation");

  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm text-gray-800 font-medium truncate">{subject.name}</span>
        {!isEditing ? (
          <>
            <button
              onClick={onEdit}
              className="flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900 flex-shrink-0"
            >
              {subject.mark}%
              <FiEdit2 size={11} className="text-gray-400" />
            </button>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full w-6 text-center flex-shrink-0 ${
                isLO ? "bg-gray-100 text-gray-400" : "bg-orange-50 text-orange-700"
              }`}
            >
              {isLO ? "—" : currentLevel}
            </span>
          </>
        ) : (
          <button onClick={onDoneEditing} className="text-green-600 flex-shrink-0">
            <FiCheck size={14} />
          </button>
        )}
        <button onClick={onRemove} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
          <FiX size={14} />
        </button>
      </div>

      {/* Inline level picker when editing */}
      {isEditing && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-[10px] font-bold text-gray-500 mb-1.5">TAP A LEVEL TO UPDATE</p>
          <div className="flex gap-1 flex-wrap">
            {MARK_LEVELS.map(({ level, label, mid, color }) => (
              <button
                key={level}
                onClick={() => { onUpdateMark(mid); onDoneEditing(); }}
                title={`${label} (${level === 7 ? "80%+" : `${MARK_LEVELS.find(l=>l.level===level).min}–${MARK_LEVELS.find(l=>l.level===level).max}%`})`}
                className={`flex flex-col items-center px-2 py-1 rounded-lg border-2 transition-all min-w-[44px] ${
                  currentLevel === level
                    ? "border-orange-400 bg-orange-50"
                    : "border-gray-200 bg-white hover:border-orange-200"
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: currentLevel === level ? "#FF7A18" : color }}
                >
                  {level}
                </span>
                <span className="text-[9px] text-gray-500 mt-0.5 leading-none">{MARK_LEVELS.find(l=>l.level===level).range}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">Currently at Level {currentLevel} · {subject.mark}%</p>
        </div>
      )}
    </div>
  );
}

// ─── Add subject panel ────────────────────────────────────────────────────────
function AddSubjectPanel({ availableSubjects, newName, newMark, isLO, markLabel, liveAps, termLabel, onChange, onAdd, onCancel }) {
  const levelForMark = newMark !== null ? pctToLevel(newMark) : null;
  const canAdd = newName !== "" && newMark !== null;
  const apsGain = newMark !== null && !isLO ? pctToLevel(newMark) : 0;

  return (
    <div className="mt-3 bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-4">

      {/* STEP 1: Pick subject */}
      <div>
        <p className="text-xs font-bold text-gray-700 mb-1.5">
          STEP 1 — Choose a subject
        </p>
        <select
          value={newName}
          onChange={e => onChange(e.target.value, newMark)}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none bg-white"
          style={{ borderColor: newName ? "#FF7A18" : undefined }}
        >
          <option value="">— Select a subject —</option>
          {availableSubjects.length === 0
            ? <option disabled>All subjects already added for this term</option>
            : availableSubjects.map(s => <option key={s} value={s}>{s}</option>)
          }
        </select>
        {isLO && (
          <p className="text-[11px] text-gray-400 mt-1 pl-1">Life Orientation does not count toward your APS score.</p>
        )}
      </div>

      {/* STEP 2: Pick level */}
      {newName && (
        <div>
          <p className="text-xs font-bold text-gray-700 mb-2">
            STEP 2 — What mark did you get in {newName.split(" ").slice(0, 2).join(" ")}?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MARK_LEVELS.map(({ level, label, range, mid, color }) => {
              const selected = levelForMark === level;
              return (
                <button
                  key={level}
                  onClick={() => onChange(newName, mid)}
                  className={`rounded-xl p-2.5 text-left border-2 transition-all flex items-center gap-2 ${
                    selected ? "border-orange-400 bg-orange-50" : "border-gray-100 bg-white hover:border-orange-200"
                  }`}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: selected ? "#FF7A18" : color }}
                  >
                    {level}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 leading-snug">{label}</p>
                    <p className="text-[10px] text-gray-500">{range}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {!newName && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">
              <span className="text-amber-500 font-bold">↑</span>
              <p className="text-xs text-amber-800 font-bold">Select a subject in Step 1 first</p>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Fine-tune % */}
      {newName && newMark !== null && (
        <div>
          <p className="text-xs font-bold text-gray-700 mb-2">
            STEP 3 — Fine-tune your exact percentage (optional)
          </p>
          <div className="flex items-center justify-center gap-4 py-1">
            <button
              onClick={() => onChange(newName, Math.max(0, newMark - 1))}
              className="w-10 h-10 rounded-full border-2 border-gray-200 text-gray-700 text-xl font-bold hover:border-orange-300 transition-all flex items-center justify-center"
            >
              −
            </button>
            <div className="text-center min-w-[90px]">
              <p className="text-3xl font-extrabold text-gray-900 leading-none">
                {newMark}<span className="text-lg font-medium">%</span>
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Level {levelForMark} · {markLabel}
              </p>
            </div>
            <button
              onClick={() => onChange(newName, Math.min(100, newMark + 1))}
              className="w-10 h-10 rounded-full border-2 border-gray-200 text-gray-700 text-xl font-bold hover:border-orange-300 transition-all flex items-center justify-center"
            >
              +
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-1">Use − / + to adjust by 1% at a time</p>
        </div>
      )}

      {/* APS preview */}
      {canAdd && !isLO && apsGain > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
          <p className="text-xs font-bold text-green-800">
            Adding this subject brings your APS from {liveAps} → {liveAps + apsGain}
          </p>
        </div>
      )}

      {/* Safeguard: no mark selected yet */}
      {newName && newMark === null && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <span className="text-amber-600 font-bold text-base leading-none mt-0.5">↑</span>
          <p className="text-xs text-amber-800">
            <span className="font-bold">Select a mark level above</span> to continue. Tap the level that matches your result.
          </p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onAdd}
          disabled={!canAdd}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-30 transition-all"
          style={{ background: canAdd ? "#FF7A18" : "#9ca3af" }}
        >
          {canAdd ? `+ Add to ${termLabel}` : "Complete steps above first"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-gray-500 text-sm font-medium border border-gray-200 hover:border-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function Section({ title, right, children }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-gray-900">{title}</p>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
