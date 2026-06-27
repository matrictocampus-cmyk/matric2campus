import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import SubjectSection from "./SubjectSection";
import {
  CAREER_INTERESTS, SA_UNIVERSITIES, SA_PROVINCES,
  SCREEN_PROGRESS, computePersonality, computeAPS,
} from "./onboardingConfig";

const GRADES = ["Grade 9", "Grade 10", "Grade 11", "Grade 12 / Matric", "Already finished Matric"];

const FINANCIAL_OPTIONS = [
  { id: "bursary",  label: "I need a bursary or scholarship",  icon: "🏆" },
  { id: "family",   label: "My family can help fund my studies", icon: "🏠" },
  { id: "loan",     label: "I'm considering a student loan",     icon: "🏦" },
  { id: "unsure",   label: "I'm not sure yet",                   icon: "🤔" },
];

const STUDY_PREFS = [
  { id: "fulltime",  label: "Full-time on campus",  icon: "🏛️" },
  { id: "parttime",  label: "Part-time",             icon: "📅" },
  { id: "online",    label: "Online / Distance",     icon: "💻" },
  { id: "flexible",  label: "Flexible / Hybrid",     icon: "🔄" },
];

const MOTIVATION_OPTIONS = [
  { id: "career",   label: "Getting a great career" },
  { id: "passion",  label: "Following my passion" },
  { id: "family",   label: "Making my family proud" },
  { id: "impact",   label: "Making a difference" },
  { id: "freedom",  label: "Financial freedom" },
  { id: "mastery",  label: "Becoming an expert" },
];

const SUPPORT_OPTIONS = [
  { id: "selfdir",   label: "I prefer to figure things out myself" },
  { id: "counselor", label: "A career counsellor to guide me" },
  { id: "peers",     label: "Connecting with others on the same path" },
  { id: "family",    label: "Guidance I can share with my family" },
];

const CERTAINTY_OPTIONS = [
  {
    id: "certain",
    label: "I know exactly what I want to do",
    sub: "You're focused. Let's dig deeper.",
  },
  {
    id: "exploring",
    label: "I have a few ideas but I'm not sure",
    sub: "That's the most common answer.",
  },
  {
    id: "unsure",
    label: "I'm completely open to exploring",
    sub: "Perfect — that's why you're here.",
  },
];

function PasswordStrength({ password }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#10b981"];

  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all"
            style={{ backgroundColor: i <= score ? colors[score] : "#e5e7eb" }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color: colors[score] }}>{labels[score]}</p>
    </div>
  );
}

const INITIAL = {
  firstName: "", grade: "", province: "",
  certainty: "", interests: [], university: "",
  financial: "", studyPref: "", wantsPersonalisation: null,
  subjects: [], marks: {}, motivation: "", support: "",
};

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState(INITIAL);
  const [screenIdx, setScreenIdx] = useState(0);
  const [direction, setDirection] = useState("forward");
  const [animKey, setAnimKey] = useState(0);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);

  const [subjectsDone, setSubjectsDone] = useState(false);
  const inputRef = useRef(null);

  const set = useCallback((key, val) => setAnswers(a => ({ ...a, [key]: val })), []);

  const personality = computePersonality(answers.interests);
  const aps = computeAPS(
    answers.subjects.map(s => ({ subject: s, mark: answers.marks[s] ?? 0 }))
  );

  // Build the flat screen list based on current answers
  const SCREENS = [
    { id: "name" },
    { id: "grade" },
    { id: "province" },
    { id: "certainty" },
    { id: "interests" },
    { id: "university" },
    { id: "financial" },
    { id: "studyPref" },
    { id: "personalise" },
    ...(answers.wantsPersonalisation ? [{ id: "subjects" }] : []),
    { id: "motivation" },
    { id: "support" },
    { id: "personality" },
    { id: "account" },
  ];

  const currentScreen = SCREENS[screenIdx] ?? SCREENS[SCREENS.length - 1];
  const progressPct = SCREEN_PROGRESS[Math.min(screenIdx, SCREEN_PROGRESS.length - 1)];

  function canAdvance() {
    const a = answers;
    switch (currentScreen.id) {
      case "name":        return a.firstName.trim().length > 0;
      case "grade":       return !!a.grade;
      case "province":    return !!a.province;
      case "certainty":   return !!a.certainty;
      case "interests":   return a.interests.length > 0;
      case "university":  return true;
      case "financial":   return !!a.financial;
      case "studyPref":   return !!a.studyPref;
      case "personalise": return a.wantsPersonalisation !== null;
      case "subjects":    return subjectsDone;
      case "motivation":  return !!a.motivation;
      case "support":     return !!a.support;
      case "personality": return true;
      case "account":     return email.trim().length > 4 && password.length >= 6;
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
    if (!email.trim() || password.length < 6) return;
    setSubmitError("");
    setSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
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

      const profilePayload = {
        user_id: userId,
        email: email.trim(),
        full_name: answers.firstName,
        first_name: answers.firstName,
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
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "user_id" });

      if (profileError) {
        console.error("profile error:", profileError);
      }

      const onboardingPayload = {
        user_id: userId,
        grade: answers.grade,
        province: answers.province,
        career_certainty: answers.certainty,
        career_interests: answers.interests,
        dream_university: answers.university || null,
        financial_concern: answers.financial,
        study_preference: answers.studyPref,
        wants_personalisation: answers.wantsPersonalisation ?? false,
        subjects_data: answers.subjects.map(s => ({
          subject: s, mark: answers.marks[s] ?? 0,
        })),
        motivation: answers.motivation,
        support_needed: answers.support,
        personality_type: personality.type,
        personality_summary: personality.summary,
        completed_at: new Date().toISOString(),
      };

      await supabase.from("onboarding_responses").upsert(onboardingPayload, { onConflict: "user_id" });

      setDone(true);
    } catch (err) {
      console.error(err);
      setSubmitError("Something went wrong. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Success / email confirmation screen ──────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-6">📧</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Check your email</h1>
        <p className="text-gray-500 text-lg max-w-sm mb-2">
          We sent a confirmation link to <strong className="text-gray-800">{email}</strong>.
        </p>
        <p className="text-gray-400 text-sm max-w-sm mb-8">
          Click the link in your email, then come back here to sign in and view your personalised roadmap.
        </p>
        <div className="bg-gray-50 rounded-2xl px-6 py-4 max-w-sm w-full mb-6">
          <p className="text-sm text-gray-500 mb-1">Your personality type</p>
          <p className="text-xl font-bold text-gray-900">{personality.emoji} {personality.type}</p>
          <p className="text-sm text-gray-500 mt-1 italic">"{personality.tagline}"</p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="text-emerald-600 font-semibold text-sm hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  // ─── Screen content ────────────────────────────────────────────────────────
  function renderScreen() {
    const a = answers;
    const id = currentScreen.id;

    if (id === "name") return (
      <div>
        <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-3">Welcome</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">What should we call you?</h1>
        <p className="text-gray-400 mb-8">Just your first name is fine.</p>
        <input
          ref={inputRef}
          type="text"
          value={a.firstName}
          onChange={e => set("firstName", e.target.value)}
          onKeyDown={e => e.key === "Enter" && goNext()}
          placeholder="Your first name"
          className="w-full text-3xl font-semibold border-b-4 border-gray-200 focus:border-emerald-500 outline-none py-3 bg-transparent transition-colors placeholder-gray-200"
          autoComplete="given-name"
        />
        {a.firstName && (
          <p className="mt-4 text-gray-400 text-sm animate-fade-in">
            Nice to meet you, <span className="font-semibold text-gray-700">{a.firstName}</span>!
          </p>
        )}
      </div>
    );

    if (id === "grade") return (
      <div>
        <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-3">
          {a.firstName ? `Hi, ${a.firstName}` : "Step 2"}
        </p>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">What grade are you in?</h1>
        <p className="text-gray-400 mb-8">This helps us recommend the right courses and timelines.</p>
        <div className="flex flex-col gap-3">
          {GRADES.map(g => (
            <button
              key={g}
              onClick={() => { set("grade", g); }}
              className={`w-full text-left px-5 py-4 rounded-2xl border-2 text-base font-medium transition-all
                ${a.grade === g
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
    );

    if (id === "province") return (
      <div>
        <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-3">Location</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Where are you based?</h1>
        <p className="text-gray-400 mb-8">We'll show you universities and colleges nearby.</p>
        <div className="grid grid-cols-2 gap-3">
          {SA_PROVINCES.map(p => (
            <button
              key={p}
              onClick={() => set("province", p)}
              className={`px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-all text-left
                ${a.province === p
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    );

    if (id === "certainty") return (
      <div>
        <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-3">Career Direction</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">How certain are you about your career path?</h1>
        <p className="text-gray-400 mb-8">Most learners aren't sure yet — that's completely normal.</p>
        <div className="flex flex-col gap-4">
          {CERTAINTY_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => set("certainty", opt.id)}
              className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all
                ${a.certainty === opt.id
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 hover:border-gray-300"
                }`}
            >
              <p className="font-semibold text-gray-900 text-base">{opt.label}</p>
              <p className="text-sm text-gray-400 mt-0.5">{opt.sub}</p>
            </button>
          ))}
        </div>
      </div>
    );

    if (id === "interests") return (
      <div>
        <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-3">Your Interests</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Which fields excite you?</h1>
        <p className="text-gray-400 mb-6">Pick as many as you like. You're not locked in.</p>
        <div className="grid grid-cols-2 gap-3">
          {CAREER_INTERESTS.map(ci => {
            const selected = a.interests.includes(ci.id);
            return (
              <button
                key={ci.id}
                onClick={() => {
                  const updated = selected
                    ? a.interests.filter(x => x !== ci.id)
                    : [...a.interests, ci.id];
                  set("interests", updated);
                }}
                className={`px-4 py-3 rounded-2xl border-2 text-left transition-all
                  ${selected
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300"
                  }`}
              >
                <span className="text-xl block mb-1">{ci.icon}</span>
                <span className={`text-sm font-medium leading-tight ${selected ? "text-emerald-700" : "text-gray-700"}`}>
                  {ci.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );

    if (id === "university") return (
      <div>
        <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-3">Dream School</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Do you have a dream university?</h1>
        <p className="text-gray-400 mb-6">No pressure — you can always change your mind later.</p>
        <button
          onClick={() => set("university", a.university === "open" ? "" : "open")}
          className={`w-full mb-4 px-5 py-4 rounded-2xl border-2 text-left font-medium transition-all
            ${a.university === "open"
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
        >
          I'm open to any university
        </button>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 font-medium">Or choose one</p>
        <div className="max-h-52 overflow-y-auto flex flex-col gap-2">
          {SA_UNIVERSITIES.map(u => (
            <button
              key={u}
              onClick={() => set("university", a.university === u ? "" : u)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all
                ${a.university === u
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-gray-100 text-gray-600 hover:border-gray-200"
                }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
    );

    if (id === "financial") return (
      <div>
        <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-3">Funding</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">How do you plan to fund your studies?</h1>
        <p className="text-gray-400 mb-8">This helps us show you relevant bursaries and funding options.</p>
        <div className="flex flex-col gap-3">
          {FINANCIAL_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => set("financial", opt.id)}
              className={`w-full text-left px-5 py-4 rounded-2xl border-2 flex items-center gap-4 transition-all
                ${a.financial === opt.id
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 hover:border-gray-300"
                }`}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className={`font-medium text-base ${a.financial === opt.id ? "text-emerald-700" : "text-gray-700"}`}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );

    if (id === "studyPref") return (
      <div>
        <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-3">Study Style</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">How would you prefer to study?</h1>
        <p className="text-gray-400 mb-8">We'll filter options based on your preference.</p>
        <div className="grid grid-cols-2 gap-3">
          {STUDY_PREFS.map(opt => (
            <button
              key={opt.id}
              onClick={() => set("studyPref", opt.id)}
              className={`px-4 py-5 rounded-2xl border-2 text-center transition-all
                ${a.studyPref === opt.id
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 hover:border-gray-300"
                }`}
            >
              <span className="text-2xl block mb-2">{opt.icon}</span>
              <span className={`text-sm font-medium ${a.studyPref === opt.id ? "text-emerald-700" : "text-gray-700"}`}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );

    if (id === "personalise") return (
      <div>
        <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-3">Almost there</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Want more personalised results?</h1>
        <p className="text-gray-400 mb-3">
          Adding your subjects and marks lets us calculate your APS, match you to courses more accurately, and show you exactly what you qualify for.
        </p>
        <p className="text-sm text-gray-400 mb-8 italic">This step is completely optional.</p>
        <div className="flex flex-col gap-4">
          <button
            onClick={() => set("wantsPersonalisation", true)}
            className={`w-full text-left px-5 py-5 rounded-2xl border-2 transition-all
              ${a.wantsPersonalisation === true
                ? "border-emerald-500 bg-emerald-50"
                : "border-gray-200 hover:border-gray-300"
              }`}
          >
            <p className={`font-semibold text-base ${a.wantsPersonalisation === true ? "text-emerald-700" : "text-gray-900"}`}>
              Yes, personalise my results
            </p>
            <p className="text-sm text-gray-400 mt-1">
              I'll add my subjects and marks — takes about 2 minutes.
            </p>
          </button>
          <button
            onClick={() => { set("wantsPersonalisation", false); setSubjectsDone(true); }}
            className={`w-full text-left px-5 py-5 rounded-2xl border-2 transition-all
              ${a.wantsPersonalisation === false
                ? "border-gray-400 bg-gray-50"
                : "border-gray-200 hover:border-gray-300"
              }`}
          >
            <p className={`font-semibold text-base ${a.wantsPersonalisation === false ? "text-gray-700" : "text-gray-900"}`}>
              No, continue without marks
            </p>
            <p className="text-sm text-gray-400 mt-1">I can always add them later from my profile.</p>
          </button>
        </div>
      </div>
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
      />
    );

    if (id === "motivation") return (
      <div>
        <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-3">Motivation</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">What drives you to study further?</h1>
        <p className="text-gray-400 mb-8">Pick the one that resonates most.</p>
        <div className="flex flex-col gap-3">
          {MOTIVATION_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => set("motivation", opt.id)}
              className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-medium text-base transition-all
                ${a.motivation === opt.id
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );

    if (id === "support") return (
      <div>
        <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-3">Support</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">What kind of support would help you most?</h1>
        <p className="text-gray-400 mb-8">We'll tailor your dashboard to match.</p>
        <div className="flex flex-col gap-3">
          {SUPPORT_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => set("support", opt.id)}
              className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-medium text-base transition-all
                ${a.support === opt.id
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );

    if (id === "personality") return (
      <div className="text-center">
        <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-6">Your Results</p>
        <p className="text-gray-400 text-lg mb-4">Based on your answers, you're a…</p>
        <div className="text-7xl mb-4">{personality.emoji}</div>
        <h1 className="text-5xl font-bold text-gray-900 mb-2">{personality.type}</h1>
        <p className="text-xl text-gray-500 italic mb-8">"{personality.tagline}"</p>
        <div className="bg-gray-50 rounded-2xl p-6 text-left mb-6">
          <p className="text-gray-600 leading-relaxed text-base">{personality.summary}</p>
        </div>
        {a.wantsPersonalisation && answers.subjects.length > 0 && (
          <div className="bg-emerald-50 rounded-2xl px-5 py-4 text-left mb-6">
            <p className="text-sm text-emerald-600 font-semibold mb-1">Your APS Score</p>
            <p className="text-3xl font-bold text-emerald-700">{aps}</p>
            <p className="text-xs text-emerald-500 mt-1">Based on {answers.subjects.length} subjects (Life Orientation excluded)</p>
          </div>
        )}
        <p className="text-sm text-gray-400">Create your free account to save your roadmap →</p>
      </div>
    );

    if (id === "account") return (
      <form onSubmit={handleCreateAccount}>
        <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-3">Last Step</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Save your results</h1>
        <p className="text-gray-400 mb-8">
          Create a free account so you can view your personalised roadmap anytime, track applications, and get matched to courses.
        </p>
        <div className="flex flex-col gap-4">
          <div>
            <input
              ref={inputRef}
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setSubmitError(""); }}
              placeholder="Email address"
              autoComplete="email"
              required
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl text-base focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setSubmitError(""); }}
                placeholder="Create a password"
                autoComplete="new-password"
                required
                className="w-full px-4 py-4 pr-12 border-2 border-gray-200 rounded-2xl text-base focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            <PasswordStrength password={password} />
            <p className="text-xs text-gray-400 mt-2">Minimum 6 characters</p>
          </div>
        </div>

        {submitError && (
          <div className="mt-4 px-4 py-3 bg-red-50 border-2 border-red-200 rounded-2xl text-red-600 text-sm">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !email.trim() || password.length < 6}
          className="mt-6 w-full py-4 bg-emerald-600 text-white text-lg font-semibold rounded-2xl hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating your account…
            </>
          ) : "Create My Free Account →"}
        </button>

        <p className="mt-4 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <button type="button" onClick={() => navigate("/")} className="text-emerald-600 font-semibold hover:underline">
            Sign in
          </button>
        </p>
      </form>
    );

    return null;
  }

  const isSubjectsScreen = currentScreen.id === "subjects";
  const showNextButton = !isSubjectsScreen && currentScreen.id !== "account";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 w-full sticky top-0 z-10">
        <div
          className="h-full bg-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 max-w-lg mx-auto w-full">
        <button
          onClick={goBack}
          className="text-gray-400 text-sm font-medium hover:text-gray-700 transition-colors flex items-center gap-1"
        >
          ← Back
        </button>
        <span className="text-xs text-gray-300 font-medium tabular-nums">
          {screenIdx + 1} / {SCREENS.length}
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center px-5 py-6 max-w-lg mx-auto w-full">
        <div
          key={animKey}
          style={{
            animation: `${direction === "forward" ? "slideInRight" : "slideInLeft"} 0.22s ease-out`,
          }}
        >
          {renderScreen()}
        </div>
      </div>

      {/* Bottom nav — only shown for screens that use the shared Next button */}
      {showNextButton && (
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 max-w-lg mx-auto w-full">
          <button
            onClick={goNext}
            disabled={!canAdvance()}
            className="w-full py-4 bg-emerald-600 text-white text-lg font-semibold rounded-2xl hover:bg-emerald-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {currentScreen.id === "personality" ? "Create My Account →" : "Continue →"}
          </button>
        </div>
      )}
    </div>
  );
}
