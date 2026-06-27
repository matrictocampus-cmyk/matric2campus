import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import SubjectSection from "./SubjectSection";
import {
  CAREER_INTERESTS, SA_UNIVERSITIES, SA_PROVINCES,
  SCREEN_PROGRESS, computePersonality, computeAPS,
} from "./onboardingConfig";

// ─── Design tokens (match landing page exactly) ───────────────────────────────
const T = {
  bg:           "#04040A",
  surface:      "#0E0E1A",
  border:       "rgba(255,255,255,0.08)",
  borderHover:  "rgba(255,255,255,0.16)",
  borderActive: "#6366f1",
  textPrimary:  "#F9FAFB",
  textSecondary:"rgba(255,255,255,0.5)",
  textMuted:    "rgba(255,255,255,0.28)",
  accent:       "#6366f1",
  accentLight:  "#a5b4fc",
  accentGlow:   "rgba(99,102,241,0.35)",
  green:        "#4ade80",
  gold:         "#FFB612",
  btnGrad:      "linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #6366f1 100%)",
  btnShadow:    "0 4px 28px rgba(99,102,241,0.45), 0 1px 6px rgba(0,0,0,0.25)",
};

// ─── Constants ────────────────────────────────────────────────────────────────
const GRADES = [
  "Grade 9", "Grade 10", "Grade 11", "Grade 12 / Matric",
  "Already finished Matric",
];

const CERTAINTY_OPTIONS = [
  { id: "certain",   label: "I know exactly what I want to do",  sub: "You're focused. We'll help you go deeper." },
  { id: "exploring", label: "I have a few ideas but I'm not sure", sub: "That's the most common answer — you're not alone." },
  { id: "unsure",    label: "I'm completely open to exploring",    sub: "Perfect. That's exactly why you're here." },
];

const FINANCIAL_OPTIONS = [
  { id: "bursary", label: "I need a bursary or scholarship",     icon: "🏆" },
  { id: "family",  label: "My family can help fund my studies",   icon: "🏠" },
  { id: "loan",    label: "I'm considering a student loan",       icon: "🏦" },
  { id: "unsure",  label: "I'm not sure yet",                     icon: "🤔" },
];

const STUDY_PREFS = [
  { id: "fulltime",  label: "Full-time on campus",   icon: "🏛️" },
  { id: "parttime",  label: "Part-time",              icon: "📅" },
  { id: "online",    label: "Online / Distance",      icon: "💻" },
  { id: "flexible",  label: "Flexible / Hybrid",      icon: "🔄" },
];

const CHALLENGE_OPTIONS = [
  { id: "bursary",     label: "Finding bursaries and funding I qualify for",              icon: "🏆" },
  { id: "eligibility", label: "Knowing which courses and universities I can get into",    icon: "📊" },
  { id: "applications",label: "Actually getting my applications done and submitted",      icon: "📝" },
  { id: "career",      label: "Figuring out which career is the right fit for me",       icon: "🎯" },
  { id: "options",     label: "Understanding all my options after matric",                icon: "🗺️" },
  { id: "marks",       label: "What to do if my current marks aren't strong enough",     icon: "📈" },
];

const MOTIVATION_OPTIONS = [
  { id: "income",   label: "Build a career that pays really well" },
  { id: "firstgen", label: "Be the first in my family to get a degree" },
  { id: "passion",  label: "Work in a field I'm genuinely passionate about" },
  { id: "business", label: "Build my own business one day" },
  { id: "impact",   label: "Make a real difference in my community" },
  { id: "freedom",  label: "Become financially independent as fast as possible" },
];

// ─── Shared UI primitives ─────────────────────────────────────────────────────
function ScreenLabel({ children }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.accentLight, marginBottom: 12 }}>
      {children}
    </p>
  );
}

function BigQuestion({ children }) {
  return (
    <h1 style={{ fontSize: "clamp(1.8rem, 6vw, 2.6rem)", fontWeight: 800, color: T.textPrimary, lineHeight: 1.18, marginBottom: 10 }}>
      {children}
    </h1>
  );
}

function SubText({ children }) {
  return (
    <p style={{ fontSize: "clamp(0.9rem, 2.5vw, 1.05rem)", color: T.textSecondary, marginBottom: 32, lineHeight: 1.55 }}>
      {children}
    </p>
  );
}

function OptionCard({ selected, onClick, children, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
        padding: "16px 20px", borderRadius: 14,
        background: selected ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.025)",
        border: `2px solid ${selected ? T.borderActive : T.border}`,
        color: selected ? T.accentLight : T.textPrimary,
        transition: "all 0.15s ease",
        outline: "none",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function GridCard({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left", cursor: "pointer", fontFamily: "inherit",
        padding: "14px 16px", borderRadius: 14,
        background: selected ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.025)",
        border: `2px solid ${selected ? T.borderActive : T.border}`,
        color: selected ? T.accentLight : T.textPrimary,
        transition: "all 0.15s ease",
        outline: "none",
      }}
    >
      {children}
    </button>
  );
}

function TextInput({ value, onChange, placeholder, onEnter, inputRef, type = "text", autoComplete }) {
  return (
    <input
      ref={inputRef}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === "Enter" && onEnter?.()}
      placeholder={placeholder}
      autoComplete={autoComplete}
      autoFocus
      style={{
        width: "100%", background: "transparent", border: "none",
        borderBottom: `3px solid ${value ? T.accent : "rgba(255,255,255,0.12)"}`,
        color: T.textPrimary, fontFamily: "inherit",
        fontSize: "clamp(1.8rem, 7vw, 2.8rem)", fontWeight: 700,
        padding: "10px 0", outline: "none", boxSizing: "border-box",
        transition: "border-color 0.2s ease",
        caretColor: T.accentLight,
      }}
    />
  );
}

function PasswordStrength({ password }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const colors = ["transparent", "#ef4444", "#f59e0b", "#60a5fa", T.green];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  if (!password) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 5 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: 3, flex: 1, borderRadius: 4, background: i <= score ? colors[score] : T.border, transition: "background 0.3s" }} />
        ))}
      </div>
      <p style={{ fontSize: 12, color: colors[score] }}>{labels[score]}</p>
    </div>
  );
}

// ─── Main flow ────────────────────────────────────────────────────────────────
const INITIAL = {
  firstName: "", lastName: "", grade: "", province: "",
  certainty: "", interests: [], email: "",
  university: "", financial: "", studyPref: "",
  challenges: [], motivation: "",
  wantsPersonalisation: null, subjects: [], marks: {},
};

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState(INITIAL);
  const [screenIdx, setScreenIdx] = useState(0);
  const [direction, setDirection] = useState("forward");
  const [animKey, setAnimKey] = useState(0);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);
  const [subjectsDone, setSubjectsDone] = useState(false);
  const inputRef = useRef(null);

  const set = useCallback((key, val) => setAnswers(a => ({ ...a, [key]: val })), []);

  const personality = computePersonality(answers.interests);
  const aps = computeAPS(answers.subjects.map(s => ({ subject: s, mark: answers.marks[s] ?? 0 })));

  const SCREENS = [
    { id: "firstName" },
    { id: "lastName" },
    { id: "grade" },
    { id: "province" },
    { id: "certainty" },
    { id: "interests" },
    { id: "email" },
    { id: "university" },
    { id: "financial" },
    { id: "studyPref" },
    { id: "challenges" },
    { id: "motivation" },
    { id: "personalise" },
    ...(answers.wantsPersonalisation ? [{ id: "subjects" }] : []),
    { id: "personality" },
    { id: "password" },
  ];

  const currentScreen = SCREENS[screenIdx] ?? SCREENS[SCREENS.length - 1];
  const progressPct = SCREEN_PROGRESS[Math.min(screenIdx, SCREEN_PROGRESS.length - 1)];

  function canAdvance() {
    const a = answers;
    switch (currentScreen.id) {
      case "firstName":   return a.firstName.trim().length > 0;
      case "lastName":    return a.lastName.trim().length > 0;
      case "grade":       return !!a.grade;
      case "province":    return !!a.province;
      case "certainty":   return !!a.certainty;
      case "interests":   return a.interests.length > 0;
      case "email":       return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim());
      case "university":  return true;
      case "financial":   return !!a.financial;
      case "studyPref":   return !!a.studyPref;
      case "challenges":  return a.challenges.length > 0;
      case "motivation":  return !!a.motivation;
      case "personalise": return a.wantsPersonalisation !== null;
      case "subjects":    return subjectsDone;
      case "personality": return true;
      case "password":    return password.length >= 6;
      default:            return true;
    }
  }

  function goNext() {
    if (!canAdvance()) return;
    setDirection("forward");
    setAnimKey(k => k + 1);
    setScreenIdx(i => Math.min(i + 1, SCREENS.length - 1));
  }

  function goBack() {
    if (screenIdx === 0) { navigate("/"); return; }
    setDirection("back");
    setAnimKey(k => k + 1);
    setScreenIdx(i => Math.max(i - 1, 0));
  }

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [screenIdx]);

  async function handleCreateAccount(e) {
    e.preventDefault();
    if (password.length < 6) return;
    setSubmitError("");
    setSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: answers.email.trim(),
        password,
      });

      if (authError) {
        if (/already registered/i.test(authError.message)) {
          setSubmitError("An account with this email already exists. Try signing in instead.");
        } else if (/rate.limit|too many/i.test(authError.message)) {
          setSubmitError("Too many attempts. Please wait a minute and try again.");
        } else {
          setSubmitError(authError.message);
        }
        return;
      }

      const userId = authData.user?.id;
      if (!userId) { setSubmitError("Something went wrong. Please try again."); return; }

      await supabase.from("profiles").upsert({
        user_id: userId,
        email: answers.email.trim(),
        full_name: `${answers.firstName} ${answers.lastName}`.trim(),
        first_name: answers.firstName,
        last_name: answers.lastName,
        grade: answers.grade,
        province: answers.province,
        career_interests: answers.interests,
        personality_type: personality.type,
        onboarding_completed: true,
        subjects_marks: answers.subjects.length
          ? Object.fromEntries(answers.subjects.map(s => [s, answers.marks[s] ?? 0]))
          : null,
        is_completed: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      await supabase.from("onboarding_responses").upsert({
        user_id: userId,
        grade: answers.grade,
        province: answers.province,
        career_certainty: answers.certainty,
        career_interests: answers.interests,
        dream_university: answers.university || null,
        financial_concern: answers.financial,
        study_preference: answers.studyPref,
        wants_personalisation: answers.wantsPersonalisation ?? false,
        subjects_data: answers.subjects.map(s => ({ subject: s, mark: answers.marks[s] ?? 0 })),
        motivation: answers.motivation,
        support_needed: answers.challenges,
        personality_type: personality.type,
        personality_summary: personality.summary,
        completed_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      setDone(true);
    } catch (err) {
      console.error(err);
      setSubmitError("Something went wrong. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Email confirmed screen ───────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ fontSize: 56, marginBottom: 24 }}>📧</div>
        <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.4rem)", fontWeight: 800, color: T.textPrimary, marginBottom: 12 }}>
          Check your email
        </h1>
        <p style={{ color: T.textSecondary, fontSize: "1.05rem", maxWidth: 380, marginBottom: 8, lineHeight: 1.6 }}>
          We sent a confirmation link to <span style={{ color: T.textPrimary, fontWeight: 600 }}>{answers.email}</span>.
        </p>
        <p style={{ color: T.textMuted, fontSize: "0.9rem", maxWidth: 340, marginBottom: 32, lineHeight: 1.6 }}>
          Click the link, then come back to sign in and view your personalised roadmap.
        </p>
        <div style={{ background: T.surface, borderRadius: 16, padding: "20px 28px", maxWidth: 320, width: "100%", marginBottom: 28, border: `1px solid ${T.border}` }}>
          <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Your personality type</p>
          <p style={{ fontSize: "1.6rem", fontWeight: 800, color: T.textPrimary }}>
            {personality.emoji} {personality.type}
          </p>
          <p style={{ fontSize: "0.85rem", color: T.accentLight, marginTop: 4, fontStyle: "italic" }}>
            "{personality.tagline}"
          </p>
        </div>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: T.accentLight, fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
          Back to sign in
        </button>
      </div>
    );
  }

  // ─── Screens ──────────────────────────────────────────────────────────────
  function renderScreen() {
    const a = answers;
    const id = currentScreen.id;

    if (id === "firstName") return (
      <>
        <ScreenLabel>Welcome to Matric2Campus</ScreenLabel>
        <BigQuestion>What's your first name?</BigQuestion>
        <SubText>Let's make this personal from the start.</SubText>
        <TextInput
          inputRef={inputRef}
          value={a.firstName}
          onChange={v => set("firstName", v)}
          onEnter={goNext}
          placeholder="First name"
          autoComplete="given-name"
        />
        {a.firstName && (
          <p style={{ marginTop: 14, color: T.textMuted, fontSize: "0.9rem", animation: "fadeIn 0.3s ease-out" }}>
            Hi, <span style={{ color: T.green, fontWeight: 700 }}>{a.firstName}</span> — great to meet you.
          </p>
        )}
      </>
    );

    if (id === "lastName") return (
      <>
        <ScreenLabel>Step 2</ScreenLabel>
        <BigQuestion>And your surname, {a.firstName}?</BigQuestion>
        <SubText>This goes on your profile and application forms.</SubText>
        <TextInput
          inputRef={inputRef}
          value={a.lastName}
          onChange={v => set("lastName", v)}
          onEnter={goNext}
          placeholder="Surname"
          autoComplete="family-name"
        />
      </>
    );

    if (id === "grade") return (
      <>
        <ScreenLabel>Education</ScreenLabel>
        <BigQuestion>What grade are you in?</BigQuestion>
        <SubText>This helps us recommend the right courses and timelines for you.</SubText>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {GRADES.map(g => (
            <OptionCard key={g} selected={a.grade === g} onClick={() => set("grade", g)}>
              <span style={{ fontSize: "0.95rem", fontWeight: a.grade === g ? 600 : 400 }}>{g}</span>
            </OptionCard>
          ))}
        </div>
      </>
    );

    if (id === "province") return (
      <>
        <ScreenLabel>Location</ScreenLabel>
        <BigQuestion>Where are you based?</BigQuestion>
        <SubText>We'll show you institutions near you and relevant provincial opportunities.</SubText>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {SA_PROVINCES.map(p => (
            <GridCard key={p} selected={a.province === p} onClick={() => set("province", p)}>
              <span style={{ fontSize: "0.88rem", fontWeight: a.province === p ? 600 : 400 }}>{p}</span>
            </GridCard>
          ))}
        </div>
      </>
    );

    if (id === "certainty") return (
      <>
        <ScreenLabel>Career Direction</ScreenLabel>
        <BigQuestion>How certain are you about your career path?</BigQuestion>
        <SubText>Most learners aren't sure yet — that's completely normal.</SubText>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CERTAINTY_OPTIONS.map(opt => (
            <OptionCard key={opt.id} selected={a.certainty === opt.id} onClick={() => set("certainty", opt.id)}>
              <p style={{ fontSize: "0.97rem", fontWeight: 600, marginBottom: 3, color: a.certainty === opt.id ? T.accentLight : T.textPrimary }}>{opt.label}</p>
              <p style={{ fontSize: "0.82rem", color: T.textMuted }}>{opt.sub}</p>
            </OptionCard>
          ))}
        </div>
      </>
    );

    if (id === "interests") return (
      <>
        <ScreenLabel>Your Interests</ScreenLabel>
        <BigQuestion>Which fields excite you?</BigQuestion>
        <SubText>Pick as many as you like — you're not locking yourself in.</SubText>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {CAREER_INTERESTS.map(ci => {
            const sel = a.interests.includes(ci.id);
            return (
              <GridCard
                key={ci.id}
                selected={sel}
                onClick={() => set("interests", sel ? a.interests.filter(x => x !== ci.id) : [...a.interests, ci.id])}
              >
                <span style={{ fontSize: "1.4rem", display: "block", marginBottom: 6 }}>{ci.icon}</span>
                <span style={{ fontSize: "0.82rem", fontWeight: sel ? 600 : 400, lineHeight: 1.3, color: sel ? T.accentLight : T.textPrimary }}>
                  {ci.label}
                </span>
              </GridCard>
            );
          })}
        </div>
      </>
    );

    if (id === "email") return (
      <>
        <ScreenLabel>Your Account</ScreenLabel>
        <BigQuestion>Where should we send your results?</BigQuestion>
        <SubText>
          We'll email your personalised roadmap, matched courses, and bursary options here. No spam, ever.
        </SubText>
        <TextInput
          inputRef={inputRef}
          value={a.email}
          onChange={v => { set("email", v); }}
          onEnter={goNext}
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
        />
        {a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email) && (
          <p style={{ marginTop: 10, color: "#f87171", fontSize: "0.85rem" }}>
            Please enter a valid email address.
          </p>
        )}
      </>
    );

    if (id === "university") return (
      <>
        <ScreenLabel>Dream School</ScreenLabel>
        <BigQuestion>Do you have a dream university?</BigQuestion>
        <SubText>No pressure — you can always update this later.</SubText>
        <OptionCard
          selected={a.university === "open"}
          onClick={() => set("university", a.university === "open" ? "" : "open")}
          style={{ marginBottom: 16, fontWeight: 600 }}
        >
          I'm open to any institution
        </OptionCard>
        <p style={{ fontSize: "0.75rem", color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 600 }}>Or choose one</p>
        <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 }}>
          {SA_UNIVERSITIES.map(u => (
            <OptionCard
              key={u}
              selected={a.university === u}
              onClick={() => set("university", a.university === u ? "" : u)}
              style={{ padding: "12px 16px" }}
            >
              <span style={{ fontSize: "0.88rem" }}>{u}</span>
            </OptionCard>
          ))}
        </div>
      </>
    );

    if (id === "financial") return (
      <>
        <ScreenLabel>Funding</ScreenLabel>
        <BigQuestion>How do you plan to fund your studies?</BigQuestion>
        <SubText>This helps us surface the right bursaries and NSFAS information for you.</SubText>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FINANCIAL_OPTIONS.map(opt => (
            <OptionCard key={opt.id} selected={a.financial === opt.id} onClick={() => set("financial", opt.id)}>
              <span style={{ fontSize: "1.3rem", marginRight: 12 }}>{opt.icon}</span>
              <span style={{ fontSize: "0.95rem", fontWeight: a.financial === opt.id ? 600 : 400 }}>{opt.label}</span>
            </OptionCard>
          ))}
        </div>
      </>
    );

    if (id === "studyPref") return (
      <>
        <ScreenLabel>Study Style</ScreenLabel>
        <BigQuestion>How would you prefer to study?</BigQuestion>
        <SubText>We'll filter your course and institution options accordingly.</SubText>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {STUDY_PREFS.map(opt => (
            <GridCard key={opt.id} selected={a.studyPref === opt.id} onClick={() => set("studyPref", opt.id)}>
              <span style={{ fontSize: "1.6rem", display: "block", marginBottom: 8 }}>{opt.icon}</span>
              <span style={{ fontSize: "0.85rem", fontWeight: a.studyPref === opt.id ? 600 : 400 }}>{opt.label}</span>
            </GridCard>
          ))}
        </div>
      </>
    );

    if (id === "challenges") return (
      <>
        <ScreenLabel>Where You Need Help</ScreenLabel>
        <BigQuestion>What's your biggest challenge right now?</BigQuestion>
        <SubText>Select all that apply. This shapes which features we put front and centre for you.</SubText>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {CHALLENGE_OPTIONS.map(opt => {
            const sel = a.challenges.includes(opt.id);
            return (
              <OptionCard
                key={opt.id}
                selected={sel}
                onClick={() => set("challenges", sel ? a.challenges.filter(x => x !== opt.id) : [...a.challenges, opt.id])}
              >
                <span style={{ fontSize: "1.2rem", marginRight: 12 }}>{opt.icon}</span>
                <span style={{ fontSize: "0.93rem", fontWeight: sel ? 600 : 400 }}>{opt.label}</span>
              </OptionCard>
            );
          })}
        </div>
      </>
    );

    if (id === "motivation") return (
      <>
        <ScreenLabel>Motivation</ScreenLabel>
        <BigQuestion>What drives you most?</BigQuestion>
        <SubText>Pick the one that resonates with you right now. There's no wrong answer.</SubText>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MOTIVATION_OPTIONS.map(opt => (
            <OptionCard key={opt.id} selected={a.motivation === opt.id} onClick={() => set("motivation", opt.id)}>
              <span style={{ fontSize: "0.95rem", fontWeight: a.motivation === opt.id ? 600 : 400 }}>{opt.label}</span>
            </OptionCard>
          ))}
        </div>
      </>
    );

    if (id === "personalise") return (
      <>
        <ScreenLabel>Almost There</ScreenLabel>
        <BigQuestion>Want more accurate results?</BigQuestion>
        <SubText>
          Adding your subjects and marks lets us calculate your APS, show you the courses you actually qualify for,
          and filter out ones you don't — saving you weeks of guesswork.
        </SubText>
        <p style={{ fontSize: "0.82rem", color: T.textMuted, marginBottom: 20, fontStyle: "italic" }}>This step is optional. You can always add marks later from your profile.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <OptionCard selected={a.wantsPersonalisation === true} onClick={() => set("wantsPersonalisation", true)}>
            <p style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 4, color: a.wantsPersonalisation === true ? T.accentLight : T.textPrimary }}>
              Yes, add my subjects and marks
            </p>
            <p style={{ fontSize: "0.82rem", color: T.textMuted }}>Takes about 2 minutes. Gives you a full APS score and matched course list.</p>
          </OptionCard>
          <OptionCard
            selected={a.wantsPersonalisation === false}
            onClick={() => { set("wantsPersonalisation", false); setSubjectsDone(true); }}
            style={{ border: `2px solid ${a.wantsPersonalisation === false ? "rgba(255,255,255,0.3)" : T.border}` }}
          >
            <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: 4, color: T.textSecondary }}>No, continue without marks</p>
            <p style={{ fontSize: "0.82rem", color: T.textMuted }}>I'll add them later from my profile.</p>
          </OptionCard>
        </div>
      </>
    );

    if (id === "subjects") return (
      <SubjectSection
        subjects={a.subjects}
        marks={a.marks}
        onSubjectsChange={val => set("subjects", val)}
        onMarksChange={val => set("marks", val)}
        onComplete={completedMarks => {
          set("marks", completedMarks);
          setSubjectsDone(true);
          goNext();
        }}
        darkTheme={T}
      />
    );

    if (id === "personality") return (
      <div style={{ textAlign: "center" }}>
        <ScreenLabel>Your Results</ScreenLabel>
        <p style={{ color: T.textSecondary, fontSize: "1rem", marginBottom: 16 }}>Based on your answers, you're a…</p>
        <div style={{ fontSize: 64, marginBottom: 12 }}>{personality.emoji}</div>
        <h1 style={{ fontSize: "clamp(2.4rem, 8vw, 3.6rem)", fontWeight: 900, color: T.textPrimary, marginBottom: 6 }}>
          {personality.type}
        </h1>
        <p style={{ fontSize: "1.1rem", color: T.accentLight, fontStyle: "italic", marginBottom: 24 }}>
          "{personality.tagline}"
        </p>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 24px", textAlign: "left", marginBottom: 20 }}>
          <p style={{ color: T.textSecondary, lineHeight: 1.7, fontSize: "0.95rem" }}>{personality.summary}</p>
        </div>
        {answers.wantsPersonalisation && answers.subjects.length > 0 && (
          <div style={{ background: "rgba(99,102,241,0.1)", border: `1px solid ${T.borderActive}`, borderRadius: 14, padding: "16px 20px", textAlign: "left" }}>
            <p style={{ fontSize: 11, color: T.accentLight, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 4 }}>Your APS Score</p>
            <p style={{ fontSize: "2.4rem", fontWeight: 900, color: T.textPrimary, lineHeight: 1 }}>{aps}</p>
            <p style={{ fontSize: "0.78rem", color: T.textMuted, marginTop: 4 }}>Based on {answers.subjects.length} subjects — Life Orientation excluded</p>
          </div>
        )}
        <p style={{ fontSize: "0.85rem", color: T.textMuted, marginTop: 20 }}>Create your free account to save this and get your full roadmap →</p>
      </div>
    );

    if (id === "password") return (
      <form onSubmit={handleCreateAccount}>
        <ScreenLabel>Last Step</ScreenLabel>
        <BigQuestion>Create a password, {a.firstName}.</BigQuestion>
        <SubText>
          Secures your account at <span style={{ color: T.textPrimary, fontWeight: 600 }}>{a.email}</span>.
          You'll use it to log in and access your roadmap anytime.
        </SubText>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <input
            ref={inputRef}
            type={showPw ? "text" : "password"}
            value={password}
            onChange={e => { setPassword(e.target.value); setSubmitError(""); }}
            placeholder="Choose a password"
            autoComplete="new-password"
            required
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.04)",
              border: `2px solid ${password ? T.accent : T.border}`,
              borderRadius: 14, color: T.textPrimary, fontFamily: "inherit",
              fontSize: "1.1rem", padding: "14px 50px 14px 16px",
              outline: "none", transition: "border-color 0.2s",
              caretColor: T.accentLight,
            }}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: "0.8rem", fontFamily: "inherit" }}
          >
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
        <PasswordStrength password={password} />
        <p style={{ fontSize: "0.78rem", color: T.textMuted, marginTop: 8, marginBottom: 24 }}>Minimum 6 characters</p>

        {submitError && (
          <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, color: "#fca5a5", fontSize: "0.88rem", marginBottom: 16 }}>
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || password.length < 6}
          style={{
            width: "100%", border: "none", borderRadius: 14, fontFamily: "inherit",
            fontSize: "1.05rem", fontWeight: 700, padding: "16px",
            background: submitting || password.length < 6 ? "rgba(99,102,241,0.3)" : T.btnGrad,
            color: "#fff", cursor: submitting || password.length < 6 ? "not-allowed" : "pointer",
            boxShadow: password.length >= 6 ? T.btnShadow : "none",
            transition: "all 0.2s ease",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {submitting ? (
            <>
              <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
              Creating your account…
            </>
          ) : "Create My Account →"}
        </button>

        <p style={{ marginTop: 16, textAlign: "center", fontSize: "0.85rem", color: T.textMuted }}>
          Already have an account?{" "}
          <button type="button" onClick={() => navigate("/")} style={{ background: "none", border: "none", color: T.accentLight, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", textDecoration: "underline" }}>
            Sign in
          </button>
        </p>
      </form>
    );

    return null;
  }

  const isSubjectsScreen = currentScreen.id === "subjects";
  const isPasswordScreen = currentScreen.id === "password";
  const showNextBtn = !isSubjectsScreen && !isPasswordScreen;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* Depth accent — matches landing page */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.07) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(139,92,246,0.05) 0%, transparent 55%)" }}
      />

      {/* Progress bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: T.bg }}>
        <div style={{ height: 3, background: "rgba(255,255,255,0.07)" }}>
          <div style={{
            height: "100%",
            width: `${progressPct}%`,
            background: T.btnGrad,
            transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: `0 0 10px ${T.accentGlow}`,
          }} />
        </div>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 10px" }}>
          <button
            onClick={goBack}
            style={{ background: "none", border: "none", color: T.textMuted, fontSize: "0.88rem", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", padding: 0, transition: "color 0.15s" }}
          >
            ← Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "0.72rem", color: T.textMuted, fontWeight: 600 }}>
              {screenIdx + 1}/{SCREENS.length}
            </span>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: T.accentLight }}>
              {progressPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Screen content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "12px 20px 20px", maxWidth: 500, width: "100%", margin: "0 auto", boxSizing: "border-box", position: "relative", zIndex: 1 }}>
        <div
          key={animKey}
          style={{ animation: `${direction === "forward" ? "slideInRight" : "slideInLeft"} 0.22s ease-out` }}
        >
          {renderScreen()}
        </div>
      </div>

      {/* Sticky bottom Next button */}
      {showNextBtn && (
        <div style={{ position: "sticky", bottom: 0, background: T.bg, borderTop: `1px solid ${T.border}`, padding: "14px 20px", maxWidth: 500, width: "100%", margin: "0 auto", boxSizing: "border-box", zIndex: 10 }}>
          <button
            onClick={goNext}
            disabled={!canAdvance()}
            style={{
              width: "100%", border: "none", borderRadius: 14, fontFamily: "inherit",
              fontSize: "1.05rem", fontWeight: 700, padding: "16px",
              background: canAdvance() ? T.btnGrad : "rgba(99,102,241,0.2)",
              color: canAdvance() ? "#fff" : "rgba(255,255,255,0.3)",
              cursor: canAdvance() ? "pointer" : "not-allowed",
              boxShadow: canAdvance() ? T.btnShadow : "none",
              transition: "all 0.2s ease",
              backgroundSize: "200% 200%",
            }}
          >
            {currentScreen.id === "personality" ? "Create My Account →" : "Continue →"}
          </button>
        </div>
      )}
    </div>
  );
}
