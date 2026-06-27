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

  // Subjects
  const [subjects, setSubjects]     = useState([]);
  const [editingIdx, setEditingIdx] = useState(null);
  const [newName,  setNewName]      = useState("");
  const [newMark,  setNewMark]      = useState("");
  const [showSubjectInput, setShowSubjectInput] = useState(false);

  const liveAps = calcAPS(subjects);

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

      if (p.subjects_marks && typeof p.subjects_marks === "object") {
        setSubjects(
          Object.entries(p.subjects_marks).map(([name, mark]) => ({ name, mark: Number(mark) }))
        );
      }
      setLoading(false);
    })();
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!userId) return;
    setError(""); setSaving(true);
    try {
      const subjectsMarks = Object.fromEntries(subjects.map(s => [s.name, s.mark]));
      const aps = liveAps > 0 ? liveAps : null;
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
        subjects_marks:   subjectsMarks,
        aps_score:        aps,
        results_term:     resultsTerm,
        updated_at:       new Date().toISOString(),
      }).eq("user_id", userId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Subjects helpers ──────────────────────────────────────────────────────
  const addSubject = () => {
    const name = newName.trim();
    const mark = Math.min(100, Math.max(0, Number(newMark)));
    if (!name || isNaN(mark)) return;
    if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) return;
    setSubjects(prev => [...prev, { name, mark }]);
    setNewName(""); setNewMark(""); setShowSubjectInput(false);
  };

  const updateMark = (idx, val) => {
    const mark = Math.min(100, Math.max(0, Number(val)));
    setSubjects(prev => prev.map((s, i) => i === idx ? { ...s, mark } : s));
  };

  const removeSubject = (idx) => {
    setSubjects(prev => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const toggleInterest = (id) => {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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
      <Section title="Subjects & Marks" right={
        liveAps > 0 ? (
          <span className="text-sm font-bold text-gray-900">
            APS <span style={{ color: "#FF7A18" }}>{liveAps}</span>
          </span>
        ) : null
      }>
        {/* Term selector */}
        <div className="flex gap-2 flex-wrap mb-3">
          {TERMS.map(t => (
            <button
              key={t.value}
              onClick={() => setResultsTerm(prev => prev === t.value ? null : t.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-colors ${
                resultsTerm === t.value
                  ? "text-white border-transparent"
                  : "text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
              style={resultsTerm === t.value ? { background: "#FF7A18", borderColor: "#FF7A18" } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Subject list */}
        <div className="space-y-2">
          {subjects.map((s, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <span className="flex-1 text-sm text-gray-800 font-medium truncate">{s.name}</span>
              {editingIdx === i ? (
                <input
                  type="number" min={0} max={100}
                  value={s.mark}
                  onChange={e => updateMark(i, e.target.value)}
                  onBlur={() => setEditingIdx(null)}
                  autoFocus
                  className="w-16 text-center text-sm border border-gray-300 rounded-lg px-2 py-1 outline-none"
                  style={{ borderColor: "#FF7A18" }}
                />
              ) : (
                <button
                  onClick={() => setEditingIdx(i)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900 min-w-[52px] justify-end"
                >
                  {s.mark}%
                  <FiEdit2 size={12} className="text-gray-400" />
                </button>
              )}
              {/* Level badge */}
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full w-6 text-center ${
                s.name.toLowerCase().includes("life orientation")
                  ? "bg-gray-100 text-gray-400"
                  : "bg-orange-50 text-orange-700"
              }`}>
                {s.name.toLowerCase().includes("life orientation") ? "—" : pctToLevel(s.mark)}
              </span>
              <button onClick={() => removeSubject(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                <FiX size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Add subject */}
        {showSubjectInput ? (
          <div className="mt-2 flex gap-2 flex-wrap">
            <input
              list="subjects-list"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Subject name"
              className="flex-1 min-w-0 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-300"
              onKeyDown={e => e.key === "Enter" && addSubject()}
            />
            <datalist id="subjects-list">
              {COMMON_SUBJECTS.filter(s => !subjects.some(e => e.name.toLowerCase() === s.toLowerCase()))
                .map(s => <option key={s} value={s} />)}
            </datalist>
            <input
              type="number" min={0} max={100}
              value={newMark}
              onChange={e => setNewMark(e.target.value)}
              placeholder="%"
              className="w-20 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-300 text-center"
              onKeyDown={e => e.key === "Enter" && addSubject()}
            />
            <button
              onClick={addSubject}
              disabled={!newName.trim() || newMark === ""}
              className="px-3 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-colors"
              style={{ background: "#FF7A18" }}
            >
              Add
            </button>
            <button onClick={() => { setShowSubjectInput(false); setNewName(""); setNewMark(""); }}
              className="px-3 py-2 rounded-xl text-gray-500 hover:text-gray-700 text-sm">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSubjectInput(true)}
            className="mt-2 flex items-center gap-1.5 text-sm font-semibold transition-colors"
            style={{ color: "#FF7A18" }}
          >
            <FiPlus size={14} /> Add subject
          </button>
        )}

        {liveAps > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            APS excludes Life Orientation · out of ~42
          </p>
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
        {saved
          ? <><FiCheck size={16} /> Saved!</>
          : saving ? "Saving…" : "Save Changes"
        }
      </button>

      {/* ── Scoped styles ────────────────────────────────────────────────── */}
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
