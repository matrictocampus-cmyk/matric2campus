// src/pages/Applications.jsx – with eligibility submission check
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useLocation, useNavigate } from "react-router-dom";

// ==========================
// CONSTANTS & HELPERS
// ==========================

const PROGRAMME_TYPES = [
  { label: "Commerce", value: "COMMERCE", icon: "💰", color: "from-green-500 to-emerald-600" },
  { label: "Engineering", value: "ENGINEERING", icon: "⚙️", color: "from-blue-500 to-blue-700" },
  { label: "Science", value: "SCIENCE", icon: "🔬", color: "from-purple-500 to-purple-700" },
  { label: "Arts & Humanities", value: "ARTS", icon: "🎨", color: "from-pink-500 to-rose-600" },
  { label: "Skills & Vocational", value: "SKILL", icon: "🔧", color: "from-orange-500 to-orange-600" },
  { label: "IT & Technology", value: "IT/TECH", icon: "💻", color: "from-indigo-500 to-indigo-600" },
];

// Map from frontend institution keys to database bucket types
const BUCKET_TYPE_MAP = {
  UNIVERSITY: "university",
  TVET: "college",
  PRIVATE: "private_college",
};

// Map from frontend institution keys to expected limit keys (same as bucket types)
const PACKAGE_LIMIT_KEY_MAP = {
  UNIVERSITY: "university",
  TVET: "college",
  PRIVATE: "private_college",
};

const INSTITUTION_TYPE_MAP = {
  UNIVERSITY: { label: "University", icon: "🏛️", color: "from-blue-500 to-purple-600" },
  TVET: { label: "Tvet College", icon: "🏢", color: "from-green-500 to-teal-600" },
  PRIVATE: { label: "Private College", icon: "🏫", color: "from-purple-500 to-pink-600" },
};

function programmeIncludes(programmeTypeValue, selectedField) {
  if (!programmeTypeValue) return false;
  
  if (Array.isArray(programmeTypeValue)) {
    return programmeTypeValue.includes(selectedField) || programmeTypeValue.includes("BRIDGING");
  }

  if (typeof programmeTypeValue === "string") {
    const trimmed = programmeTypeValue.trim();
    if (trimmed.startsWith("[")) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) {
          return arr.includes(selectedField) || arr.includes("BRIDGING");
        }
      } catch (e) { /* ignore */ }
    }

    if (trimmed.includes(",")) {
      const parts = trimmed.split(",").map((p) => p.trim());
      return parts.includes(selectedField) || parts.includes("BRIDGING");
    }

    return trimmed === selectedField || trimmed === "BRIDGING";
  }

  return false;
}

function normalizeForMatching(subj) {
  if (!subj) return subj;
  const s = String(subj).toLowerCase().trim();

  if (s.includes("english")) return "english";
  if (s.includes("isi") && s.includes("zulu")) return "isizulu";
  if (s.includes("xhosa")) return "xhosa";
  if (s.includes("afrikaans")) return "afrikaans";
  if (s.includes("pure mathematics") || s === "pure mathematics") return "pure mathematics";
  if (s.includes("mathematics") || s.includes("maths")) return "mathematics";
  if (s.includes("mathematics literacy") || s.includes("maths literacy")) return "mathematics literacy";
  if (s.includes("life orientation") || s === "lo") return "lo";

  return s;
}

function buildNormalizedUserSubjects(subjectsMarksObject) {
  const keys = Object.keys(subjectsMarksObject || {});
  const set = new Set();

  for (const raw of keys) {
    const canon = normalizeForMatching(raw);
    set.add(canon);
    if (canon === "pure mathematics") set.add("mathematics");
  }

  return Array.from(set);
}

const APS_MAP = {
  "0-29%": 1,
  "30-39%": 2,
  "40-49%": 3,
  "50-59%": 4,
  "60-69%": 5,
  "70-79%": 6,
  "80-100%": 7,
};

function parseSubjectRequirement(reqStr) {
  if (!reqStr || typeof reqStr !== "string") return { subject: null, requiredLevel: null };
  
  const levelMatch = reqStr.match(/level\s*(\d+)/i) || reqStr.match(/l\s*(\d+)/i);
  const requiredLevel = levelMatch ? parseInt(levelMatch[1], 10) : null;
  
  let subj = reqStr.replace(/level\s*\d+/i, "").replace(/l\s*\d+/i, "").trim();
  subj = normalizeForMatching(subj);
  
  return { subject: subj, requiredLevel };
}

function buildUserSubjectAPSMap(subjectsMarksObject = {}) {
  const map = {};
  for (const [rawSubj, levelStr] of Object.entries(subjectsMarksObject || {})) {
    const canon = normalizeForMatching(rawSubj);
    const apsNum = APS_MAP[levelStr] || 0;
    map[canon] = apsNum;
    if (canon === "pure mathematics") {
      map["mathematics"] = Math.max(map["mathematics"] || 0, apsNum);
    }
  }
  return map;
}

function evaluateEligibilityLocal(profilePayload, courses) {
  const userSubjectsCanonical = (profilePayload.subjects || []).map((s) => normalizeForMatching(s));
  const userAPS = typeof profilePayload.aps === "number" ? profilePayload.aps : 0;
  const userMarksMap = profilePayload.subjectsMarks || profilePayload.marks || {};
  const userSubjectAPSMap = buildUserSubjectAPSMap(userMarksMap);
  const hasWorkExp = !!profilePayload.has_work_experience;

  return courses.map((course) => {
    const er = course.entry_requirements || {};
    const reasons = [];
    let eligibility = "ELIGIBLE";

    const requiredAll = er?.required_subjects?.all_of || [];
    if (Array.isArray(requiredAll) && requiredAll.length > 0) {
      for (const r of requiredAll) {
        const { subject, requiredLevel } = parseSubjectRequirement(r);
        if (!subject) continue;

        const hasSubject = userSubjectsCanonical.includes(subject) || (subject === "mathematics" && userSubjectsCanonical.includes("pure mathematics"));
        const userSubjectAPS = userSubjectAPSMap[subject] || 0;

        if (!hasSubject) {
          eligibility = "NOT_ELIGIBLE";
          reasons.push(`Missing required subject: ${subject}`);
        } else if (requiredLevel !== null) {
          if (userSubjectAPS < requiredLevel) {
            eligibility = "NOT_ELIGIBLE";
            reasons.push(`Required level for ${subject}: ${requiredLevel}. You have: ${userSubjectAPS || "N/A"}`);
          }
        }
      }
    }

    const requiredAny = er?.required_subjects?.any_of || [];
    if (Array.isArray(requiredAny) && requiredAny.length > 0) {
      let anySatisfied = false;
      const anyMissingReasons = [];

      for (const r of requiredAny) {
        const { subject, requiredLevel } = parseSubjectRequirement(r);
        if (!subject) continue;

        const hasSubject = userSubjectsCanonical.includes(subject) || (subject === "mathematics" && userSubjectsCanonical.includes("pure mathematics"));
        const userSubjectAPS = userSubjectAPSMap[subject] || 0;

        if (hasSubject && (requiredLevel === null || userSubjectAPS >= requiredLevel)) {
          anySatisfied = true;
          break;
        } else {
          if (!hasSubject) anyMissingReasons.push(`missing ${subject}`);
          else anyMissingReasons.push(`${subject} level ${userSubjectAPS} < required ${requiredLevel}`);
        }
      }

      if (!anySatisfied) {
        eligibility = "NOT_ELIGIBLE";
        reasons.push(`Requires one of: ${requiredAny.join(", ")}. You do not meet any (${anyMissingReasons.join("; ")})`);
      }
    }

    const minAPS = (er?.minimum_requirements && er.minimum_requirements.min_aps) || er?.min_aps || null;
    if (minAPS && userAPS < minAPS) {
      eligibility = "NOT_ELIGIBLE";
      reasons.push(`Minimum APS required: ${minAPS}. You have: ${userAPS}`);
    }

    const gradesRequired = (er?.minimum_requirements && er.minimum_requirements.min_grade) || null;
    if (gradesRequired && typeof gradesRequired === "object") {
      for (const [reqSubjectRaw, reqGrade] of Object.entries(gradesRequired)) {
        const reqSubject = normalizeForMatching(reqSubjectRaw);
        const userAPSforSubj = userSubjectAPSMap[reqSubject] || 0;
        const reqGradeNum = Number(reqGrade);
        if (!userAPSforSubj || userAPSforSubj < reqGradeNum) {
          eligibility = "NOT_ELIGIBLE";
          reasons.push(`Minimum grade for ${reqSubjectRaw}: ${reqGradeNum}. You have: ${userAPSforSubj || "N/A"}`);
        }
      }
    }

    if (er?.additional_requirements?.work_experience_required && !hasWorkExp) {
      if (eligibility === "ELIGIBLE") eligibility = "CONDITIONAL";
      reasons.push("Work experience is required for this programme.");
    }

    if (reasons.length === 0) reasons.push("You meet all the entry requirements.");

    return {
      course: course.title,
      courseId: course.id,
      institutionId: course.institution_id,
      eligibility,
      reasons,
      notes: er?.selection_notes || null,
    };
  });
}

export default function Applications() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState("TYPE");
  const [institutionTypeKey, setInstitutionTypeKey] = useState("");
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [rawCourses, setRawCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  
  // New state: eligibility submitted?
  const [eligibilitySubmitted, setEligibilitySubmitted] = useState(false);

  const isAddMode = location?.state?.mode === "ADD_TO_BUCKET";
  const limits = location?.state?.limits || {};
  const [bucket, setBucket] = useState([]);
  const [showBucket, setShowBucket] = useState(false);

  // ===== LOAD USER AND PROFILE =====
  useEffect(() => {
    let mounted = true;
    async function loadUserAndProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }
        setUserId(user.id);

        const { data: prof, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("Profile fetch error:", error);
          if (mounted) setProfile(null);
        } else {
          if (mounted) setProfile(prof || null);
        }

        // Check eligibility submission
        const { data: elig, error: eligError } = await supabase
          .from("eligibilities")
          .select("is_completed")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!eligError && elig) {
          setEligibilitySubmitted(!!elig.is_completed);
        } else {
          setEligibilitySubmitted(false);
        }

      } catch (e) {
        console.error("loadUserAndProfile error:", e);
        if (mounted) setProfile(null);
      }
    }

    loadUserAndProfile();
    return () => { mounted = false; };
  }, [navigate]);

  // ===== LOAD BUCKET FROM SUPABASE =====
  useEffect(() => {
    if (!userId) return;
    const loadBucket = async () => {
      const { data, error } = await supabase
        .from("application_bucket")
        .select("id, course_title, institution_type, program_id, institution_name, created_at")
        .eq("user_id", userId)
        .is("package_id", null);
      if (!error && data) {
        const transformed = data.map(item => ({
          id: item.id,
          title: item.course_title,
          type: item.institution_type,
          courseId: item.program_id,
          institution: item.institution_name,
          addedAt: item.created_at,
        }));
        setBucket(transformed);
      }
    };
    loadBucket();
  }, [userId]);

  // ===== INSTITUTION SELECTION =====
  useEffect(() => {
    if (!institutionTypeKey) return;
    const institutionType = INSTITUTION_TYPE_MAP[institutionTypeKey];
    if (!institutionType) return;

    const loadInstitutions = async () => {
      setLoading(true);
      setError("");
      setInstitutions([]);
      setSelectedInstitutionId("");
      setRawCourses([]);
      setFilteredCourses([]);
      setResults([]);

      try {
        const { data, error } = await supabase
          .from("institutions")
          .select("id, name, description")
          .eq("type", institutionType.label)
          .order("name", { ascending: true });

        if (error) {
          console.error("loadInstitutions error:", error);
          setError("Failed to load institutions");
        } else {
          setInstitutions(data || []);
          setStep("INSTITUTION");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load institutions");
      } finally {
        setLoading(false);
      }
    };

    loadInstitutions();
  }, [institutionTypeKey]);

  const loadCourses = async () => {
    if (!selectedInstitutionId) {
      setError("Please select an institution");
      return;
    }

    setLoading(true);
    setError("");
    setRawCourses([]);
    setFilteredCourses([]);
    setResults([]);
    setExpandedCourse(null);

    try {
      const { data, error } = await supabase
        .from("institution_courses")
        .select("id, title, entry_requirements, programme_type, institution_id")
        .eq("institution_id", selectedInstitutionId)
        .order("title", { ascending: true });

      if (error) {
        console.error("loadCourses error:", error);
        setError("Failed to load courses for this institution");
        setLoading(false);
        return;
      }

      const all = data || [];
      setRawCourses(all);

      if (selectedField) {
        const matched = all.filter((c) => programmeIncludes(c.programme_type, selectedField));
        setFilteredCourses(matched);
        setStep("CHECK");
      } else {
        setStep("FIELD");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedField) return;
    const matched = rawCourses.filter((c) => programmeIncludes(c.programme_type, selectedField));
    setFilteredCourses(matched);
    if (selectedInstitutionId) setStep("CHECK");
  }, [selectedField, rawCourses, selectedInstitutionId]);

  // ===== ADD COURSE TO BUCKET (INSERT INTO SUPABASE) =====
  const addResultToBucket = async (result) => {
    // Prevent adding if eligibility not submitted
    if (!eligibilitySubmitted) {
      setError("You must complete and submit your eligibility before adding courses to your bucket.");
      return;
    }

    setError("");

    // Confirm for conditional courses
    if (result.eligibility === "CONDITIONAL") {
      const confirmAdd = window.confirm(
        "You may qualify conditionally. Do you still want to add this course?"
      );
      if (!confirmAdd) return;
    }

    if (!userId) {
      setError("You must be logged in.");
      return;
    }

    const title = result.course;
    if (!title) return setError("Invalid course");

    const matched = filteredCourses.find((rc) => rc.title === title) || rawCourses.find((rc) => rc.title === title);
    if (!matched) return setError("Course details not found.");

    // Get bucket type using the mapping
    const typeKey = BUCKET_TYPE_MAP[institutionTypeKey];
    if (!typeKey) return setError("Institution type not selected");

    // If in add mode, check package limits
    if (isAddMode) {
      // First try the mapped key (college for TVET, private_college for PRIVATE)
      let allowedLimit = limits[typeKey];
      // If not found, try the lowercase institution type key (tvet, private)
      if (allowedLimit === undefined) {
        const altKey = institutionTypeKey.toLowerCase();
        allowedLimit = limits[altKey];
      }
      if (allowedLimit === undefined) {
        return setError(`This package does not allow ${typeKey} applications.`);
      }

      // Count current items in bucket (local state is up to date)
      const usedCount = bucket.filter((b) => b.type === typeKey).length;
      if (usedCount >= allowedLimit) {
        return setError(`${typeKey.toUpperCase()} limit reached (${usedCount} / ${allowedLimit}).`);
      }
    }

    // Check for duplicate
    const duplicate = bucket.find((b) => b.title === title && b.courseId === matched.id);
    if (duplicate) return setError("Course already added.");

    // Get institution name
    const institutionName = institutions.find(i => i.id === selectedInstitutionId)?.name || "Unknown";

    // Insert into Supabase
    const { data: inserted, error: insertError } = await supabase
      .from("application_bucket")
      .insert({
        user_id: userId,
        institution_id: selectedInstitutionId,
        institution_type: typeKey,
        program_id: matched.id,
        course_title: title,
        institution_name: institutionName,
      })
      .select("id, course_title, institution_type, program_id, institution_name, created_at")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      setError("Failed to add course. Please try again.");
      return;
    }

    // Update local bucket state
    const newItem = {
      id: inserted.id,
      title: inserted.course_title,
      type: inserted.institution_type,
      courseId: inserted.program_id,
      institution: inserted.institution_name,
      addedAt: inserted.created_at,
      eligibility: result.eligibility,
      reasons: result.reasons,
      notes: result.notes,
    };
    setBucket(prev => [...prev, newItem]);
    setShowBucket(true);
  };

  // ===== REMOVE FROM BUCKET (DELETE FROM SUPABASE) =====
  const removeFromBucket = async (index) => {
    const item = bucket[index];
    if (!item || !item.id) return;
    const { error } = await supabase
      .from("application_bucket")
      .delete()
      .eq("id", item.id);
    if (error) {
      console.error("Delete error:", error);
      setError("Failed to remove course.");
      return;
    }
    setBucket(prev => prev.filter((_, i) => i !== index));
  };

  // ===== CLEAR ALL BUCKET ITEMS =====
  const clearBucket = async () => {
    if (!userId) return;
    const confirmed = window.confirm("Clear all courses?");
    if (!confirmed) return;
    const { error } = await supabase
      .from("application_bucket")
      .delete()
      .eq("user_id", userId)
      .is("package_id", null);
    if (!error) {
      setBucket([]);
    }
  };

  const handleCheckEligibility = async () => {
    setError("");
    setResults([]);
    setExpandedCourse(null);

    if (!profile) {
      setError("Profile not loaded — please complete your profile first.");
      return;
    }
    if (!filteredCourses || filteredCourses.length === 0) {
      setError("No courses to check eligibility for");
      return;
    }

    const marksObj = profile.subjects_marks || profile.subjectsMarks || {};
    const normalizedUserSubjects = buildNormalizedUserSubjects(marksObj);

    let apsTotal = null;
    if (typeof profile.aps === "number") {
      apsTotal = profile.aps;
    } else if (typeof profile.aps_total === "number") {
      apsTotal = profile.aps_total;
    } else {
      const entries = Object.entries(marksObj || {});
      const sum = entries.reduce((acc, [subj, level]) => {
        const sNorm = normalizeForMatching(subj);
        if (sNorm === "lo") return acc;
        return acc + (APS_MAP[level] || 0);
      }, 0);
      apsTotal = sum;
    }

    const profilePayload = {
      subjects: normalizedUserSubjects,
      subjectsMarks: marksObj,
      marks: marksObj,
      aps: apsTotal,
      aps_total: apsTotal,
      highest_grade: profile.highest_grade || profile.highestGrade || null,
      has_work_experience: !!profile.has_work_experience,
      nbt_score: profile.nbt_score || profile.nbt || null,
      age: profile.age || null,
    };

    setLoading(true);

    try {
      const localResults = evaluateEligibilityLocal(profilePayload, filteredCourses || []);
      setResults(localResults || []);
      setStep("RESULTS");
    } catch (err) {
      console.error("local evaluate error:", err);
      setError("Eligibility check failed.");
      setStep("ERROR");
    } finally {
      setLoading(false);
    }
  };

  const visibleResults = (results || []).filter((r) =>
    (r.course || "").toLowerCase().includes((searchQuery || "").toLowerCase())
  );

  const doneAddToBucket = () => {
    // No need to save to localStorage; bucket is in DB. Just navigate.
    navigate("/apply");
  };

  const getInstitutionName = () => {
    return institutions.find(i => i.id === selectedInstitutionId)?.name || "Selected Institution";
  };

  if (loading && step !== "CHECK") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="max-w-4xl mx-auto w-full">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                {isAddMode ? "Add Courses to Apply" : "Find Your Perfect Course"}
              </h1>
              <p className="text-gray-600 mt-2">
                {isAddMode 
                  ? "Browse and add courses to your application bucket" 
                  : "Check which courses match your academic profile and preferences"}
              </p>
            </div>
            {bucket.length > 0 && (
              <button
                onClick={() => setShowBucket(!showBucket)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <span>📋</span>
                <span>Bucket ({bucket.length})</span>
                <span>{showBucket ? "↑" : "↓"}</span>
              </button>
            )}
          </div>

          {/* PROFILE INFO */}
          {profile && (
            <div className="bg-white rounded-2xl p-6 shadow border border-gray-100 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">📊 Your Academic Profile</h3>
                  <div className="flex flex-wrap gap-4">
                    {profile.subjects_marks && Object.entries(profile.subjects_marks).slice(0, 4).map(([subject, mark]) => (
                      <span key={subject} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                        {subject}: {mark}
                      </span>
                    ))}
                    {profile.aps && (
                      <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                        APS: {profile.aps}
                      </span>
                    )}
                  </div>
                </div>
                {!profile.subjects_marks && (
                  <button
                    onClick={() => navigate("/profile")}
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Complete Profile →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ELIGIBILITY WARNING BANNER */}
          {!eligibilitySubmitted && isAddMode && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-xl flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-700 text-sm">!</span>
              </div>
              <div>
                <p className="text-red-800 font-medium">Eligibility Not Submitted</p>
                <p className="text-red-700 text-sm mt-1">
                  You must complete and submit your eligibility before you can add courses to your bucket. 
                  Please go to the <button onClick={() => navigate("/eligibility")} className="underline font-semibold">Eligibility page</button> and click "Submit Eligibility" first.
                </p>
              </div>
            </div>
          )}

          {/* BUCKET OVERLAY */}
          {showBucket && bucket.length > 0 && (
            <div className="mb-6 bg-white rounded-2xl shadow-lg border border-green-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Your Application Bucket</h3>
                  <div className="flex gap-3">
                    <button
                      onClick={clearBucket}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={doneAddToBucket}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2 rounded-lg font-semibold hover:opacity-90"
                    >
                      Proceed to Apply
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bucket.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900 line-clamp-2">{item.title}</h4>
                        <button
                          onClick={() => removeFromBucket(index)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mb-1 truncate">{item.institution}</div>
                      <div className="flex items-center justify-between mt-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.eligibility === "ELIGIBLE" ? 'bg-green-100 text-green-700' :
                          item.eligibility === "CONDITIONAL" ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {item.eligibility}
                        </span>
                        <span className="text-sm text-gray-600">{item.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ERROR DISPLAY */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-600 text-sm">!</span>
              </div>
              <div>
                <p className="text-red-700 font-medium">Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* ... rest of the JSX (steps) exactly as before ... */}
        {/* STEP 1: INSTITUTION TYPE */}
        {step === "TYPE" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 1: Choose Institution Type</h2>
            <p className="text-gray-600 mb-8">Select the type of institution you want to apply to:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(INSTITUTION_TYPE_MAP).map(([key, { label, icon, color }]) => (
                <button
                  key={key}
                  onClick={() => setInstitutionTypeKey(key)}
                  className={`p-8 rounded-2xl border-2 transition-all duration-300 ${
                    institutionTypeKey === key
                      ? `border-blue-500 bg-gradient-to-br ${color} text-white transform scale-105`
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg'
                  }`}
                >
                  <div className="text-4xl mb-4">{icon}</div>
                  <h3 className="text-xl font-bold mb-2">{label}</h3>
                  <p className="text-sm opacity-90">
                    {key === "UNIVERSITY" && "Bachelor's degrees, diplomas, and higher certificates"}
                    {key === "TVET" && "Technical and vocational education training programs"}
                    {key === "PRIVATE" && "Private higher education institutions"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: SELECT INSTITUTION */}
        {step === "INSTITUTION" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Step 2: Choose Institution</h2>
                <p className="text-gray-600 mt-1">Select from available {INSTITUTION_TYPE_MAP[institutionTypeKey]?.label}s</p>
              </div>
              <button
                onClick={() => setStep("TYPE")}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {institutions.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => setSelectedInstitutionId(inst.id)}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${
                    selectedInstitutionId === inst.id
                      ? 'border-blue-500 bg-blue-50 transform scale-105'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center mb-4">
                    <span className="text-xl">{inst.name.charAt(0)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{inst.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{inst.description || "Explore courses at this institution"}</p>
                  {selectedInstitutionId === inst.id && (
                    <div className="mt-4 text-blue-600 font-semibold">✓ Selected</div>
                  )}
                </button>
              ))}
            </div>

            {selectedInstitutionId && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={loadCourses}
                  className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  Load Courses →
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: SELECT FIELD */}
        {step === "FIELD" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Step 3: Choose Field of Study</h2>
                <p className="text-gray-600 mt-1">What are you interested in studying?</p>
              </div>
              <button
                onClick={() => setStep("INSTITUTION")}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {PROGRAMME_TYPES.map(({ label, value, icon, color }) => (
                <button
                  key={value}
                  onClick={() => setSelectedField(value)}
                  className={`p-6 rounded-2xl border-2 transition-all ${
                    selectedField === value
                      ? `border-blue-500 bg-gradient-to-br ${color} text-white transform scale-105`
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="text-3xl mb-3">{icon}</div>
                  <h3 className="font-bold text-lg">{label}</h3>
                </button>
              ))}
            </div>

            {selectedField && (
              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
                <div className="text-gray-600">
                  Ready to check courses for {PROGRAMME_TYPES.find(p => p.value === selectedField)?.label}
                </div>
                <button
                  onClick={() => setStep("CHECK")}
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
                >
                  Continue →
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: CHECK COURSES */}
        {step === "CHECK" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Step 4: Review Courses</h2>
                <p className="text-gray-600 mt-1">
                  Found {filteredCourses.length} courses for {PROGRAMME_TYPES.find(p => p.value === selectedField)?.label} at {getInstitutionName()}
                </p>
              </div>
              <button
                onClick={() => setStep("FIELD")}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Change Field
              </button>
            </div>

            <div className="mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-100">
                <h3 className="font-bold text-gray-900 mb-2">Ready to Check Eligibility</h3>
                <p className="text-gray-600 mb-4">
                  We'll compare these courses against your academic profile to see which ones you qualify for.
                </p>
                <button
                  onClick={handleCheckEligibility}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
                  disabled={loading}
                >
                  {loading ? "Checking..." : "🎯 Check Eligibility Now"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredCourses.slice(0, 10).map((course) => (
                <div key={course.id} className="p-4 border border-gray-200 rounded-xl">
                  <h4 className="font-semibold text-gray-900">{course.title}</h4>
                </div>
              ))}
              {filteredCourses.length > 10 && (
                <p className="text-gray-600 text-center">+ {filteredCourses.length - 10} more courses</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: RESULTS */}
        {step === "RESULTS" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">🎯 Eligibility Results</h2>
                <p className="text-gray-600 mt-1">
                  Based on your profile, here's what you qualify for at {getInstitutionName()}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("CHECK")}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  ← Back
                </button>
                {isAddMode && (
                  <button
                    onClick={doneAddToBucket}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90"
                  >
                    Proceed to Apply ({bucket.length})
                  </button>
                )}
              </div>
            </div>

            {/* SEARCH */}
            <div className="mb-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* RESULTS BY CATEGORY */}
            <div className="space-y-8">
              {["ELIGIBLE", "CONDITIONAL", "NOT_ELIGIBLE"].map((status) => {
                const group = visibleResults.filter((r) => r.eligibility === status);
                if (group.length === 0) return null;

                const statusConfig = {
                  ELIGIBLE: { title: "✅ Highly Recommended", color: "from-green-500 to-emerald-600", bg: "bg-green-50", border: "border-green-200" },
                  CONDITIONAL: { title: "🟡 May Qualify", color: "from-yellow-500 to-orange-500", bg: "bg-yellow-50", border: "border-yellow-200" },
                  NOT_ELIGIBLE: { title: "❌ Doesn't Match Profile", color: "from-red-500 to-pink-500", bg: "bg-red-50", border: "border-red-200" },
                };

                const config = statusConfig[status];

                return (
                  <div key={status} className={`${config.bg} ${config.border} rounded-2xl p-6 border`}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${config.color} flex items-center justify-center`}>
                        <span className="text-white text-xl">
                          {status === "ELIGIBLE" ? "✓" : status === "CONDITIONAL" ? "?" : "✗"}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{config.title}</h3>
                        <p className="text-gray-600">{group.length} course{group.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {group.map((result) => (
                        <div key={result.courseId} className="bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-gray-900 flex-1">{result.course}</h4>
                            {isAddMode && (status === "ELIGIBLE" || status === "CONDITIONAL") && (
                              <button
                                onClick={() => addResultToBucket(result)}
                                className={`text-green-600 hover:text-green-700 font-semibold text-sm whitespace-nowrap ml-3 ${
                                  !eligibilitySubmitted ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                disabled={!eligibilitySubmitted}
                                title={!eligibilitySubmitted ? "You must submit eligibility first" : ""}
                              >
                                + Add to Bucket
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between mb-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              status === "ELIGIBLE" ? 'bg-green-100 text-green-700' :
                              status === "CONDITIONAL" ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {result.eligibility}
                            </span>
                            <button
                              onClick={() => setExpandedCourse(expandedCourse === result.courseId ? null : result.courseId)}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              {expandedCourse === result.courseId ? "Hide Details" : "View Details"}
                            </button>
                          </div>

                          {expandedCourse === result.courseId && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <h5 className="font-semibold text-gray-900 mb-2">Requirements Analysis:</h5>
                              <ul className="space-y-2">
                                {result.reasons.map((reason, i) => (
                                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                    <span className="mt-1">•</span>
                                    <span>{reason}</span>
                                  </li>
                                ))}
                              </ul>
                              {result.notes && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                  <p className="text-sm text-blue-700">{result.notes}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* NO RESULTS */}
            {visibleResults.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔍</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No courses found</h3>
                <p className="text-gray-600">Try adjusting your search or view all courses</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP: ERROR */}
        {step === "ERROR" && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Something Went Wrong</h2>
            <p className="text-gray-600 mb-8">{error || "An unexpected error occurred"}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold hover:opacity-90"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* STEP INDICATOR */}
        {step !== "TYPE" && step !== "ERROR" && (
          <div className="mt-8 bg-white rounded-2xl p-6 shadow border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Current step: <span className="font-semibold text-gray-900">
                  {step === "INSTITUTION" && "Select Institution"}
                  {step === "FIELD" && "Choose Field"}
                  {step === "CHECK" && "Review Courses"}
                  {step === "RESULTS" && "View Results"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (step === "INSTITUTION") setStep("TYPE");
                    if (step === "FIELD") setStep("INSTITUTION");
                    if (step === "CHECK") setStep("FIELD");
                    if (step === "RESULTS") setStep("CHECK");
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Exit to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}