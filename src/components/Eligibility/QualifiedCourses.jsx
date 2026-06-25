import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const APS_MAP = {
  "0-29%": 1, "30-39%": 2, "40-49%": 3,
  "50-59%": 4, "60-69%": 5, "70-79%": 6, "80-100%": 7,
};

const INST_BUCKET_TYPE = {
  "University": "university",
  "Tvet College": "college",
  "Private College": "private_college",
};

const TYPE_TABS = ["All", "University", "Tvet College", "Private College"];

function normalize(subj) {
  if (!subj) return "";
  const s = String(subj).toLowerCase().trim();
  if (s.includes("english")) return "english";
  if (s.includes("isizulu") || (s.includes("isi") && s.includes("zulu"))) return "isizulu";
  if (s.includes("xhosa")) return "xhosa";
  if (s.includes("afrikaans")) return "afrikaans";
  if (s === "pure mathematics" || s.includes("pure mathematics")) return "pure mathematics";
  if (s.includes("mathematics literacy") || s.includes("maths literacy")) return "mathematics literacy";
  if (s.includes("mathematics") || s.includes("maths")) return "mathematics";
  if (s.includes("life orientation") || s === "lo") return "lo";
  return s;
}

function buildSubjectMap(marksObj) {
  const map = {};
  for (const [raw, range] of Object.entries(marksObj || {})) {
    const key = normalize(raw);
    const level = APS_MAP[range] || 0;
    map[key] = { raw, range, level };
    if (key === "pure mathematics") {
      if (!map["mathematics"] || level > map["mathematics"].level) {
        map["mathematics"] = { raw, range, level };
      }
    }
  }
  return map;
}

function calcUserAPS(marksObj) {
  return Object.entries(marksObj || {}).reduce((sum, [subj, lvl]) => {
    if (normalize(subj) === "lo") return sum;
    return sum + (APS_MAP[lvl] || 0);
  }, 0);
}

function parseReqStr(reqStr) {
  if (!reqStr || typeof reqStr !== "string") return { subject: null, requiredLevel: null, displayName: "" };
  const m = reqStr.match(/level\s*(\d+)/i) || reqStr.match(/\bl\s*(\d+)/i);
  const requiredLevel = m ? parseInt(m[1], 10) : null;
  const displayName = reqStr.trim();
  const subj = reqStr.replace(/level\s*\d+/i, "").replace(/\bl\s*\d+/i, "").trim();
  return { subject: normalize(subj), requiredLevel, displayName };
}

function checkSubjectReqs(allOf, anyOf, subjectMap) {
  const subjectChecks = [];
  let eligible = true;
  const reasons = [];

  for (const r of allOf) {
    const { subject, requiredLevel, displayName } = parseReqStr(r);
    if (!subject) continue;
    const entry = subjectMap[subject];
    const userLevel = entry?.level || 0;
    const hasSub = !!entry;
    const meetsLevel = requiredLevel === null || userLevel >= requiredLevel;
    const met = hasSub && meetsLevel;
    subjectChecks.push({ name: displayName, met, userLevel, requiredLevel });
    if (!hasSub) {
      eligible = false;
      reasons.push(`Missing required subject: ${displayName}`);
    } else if (!meetsLevel) {
      eligible = false;
      reasons.push(`${displayName.replace(/level\s*\d+/i, "").trim()} needs Level ${requiredLevel} (you have Level ${userLevel})`);
    }
  }

  if (anyOf.length) {
    const ok = anyOf.some((r) => {
      const { subject, requiredLevel } = parseReqStr(r);
      if (!subject) return false;
      const entry = subjectMap[subject];
      return entry && (requiredLevel === null || entry.level >= requiredLevel);
    });
    if (!ok) {
      eligible = false;
      reasons.push(`Needs one of: ${anyOf.join(", ")}`);
    }
  }

  return { subjectChecks, eligible, reasons };
}

function evaluate(profile, course, userAPS, subjectMap) {
  const er = course.entry_requirements || {};

  // Routes structure (Rosebank-style)
  if (Array.isArray(er.routes) && er.routes.length > 0) {
    let best = null;
    const rank = { ELIGIBLE: 2, CONDITIONAL: 1, NOT_ELIGIBLE: 0 };

    for (const route of er.routes) {
      const minAPS = route.min_aps || null;
      const allOf = route.required_subjects?.all_of || [];
      const { subjectChecks, eligible, reasons } = checkSubjectReqs(allOf, [], subjectMap);

      const apsOk = !minAPS || userAPS >= minAPS;
      let eligibility = "ELIGIBLE";
      const routeReasons = [...reasons];

      if (!eligible) eligibility = "NOT_ELIGIBLE";
      if (!apsOk) {
        if (eligibility === "ELIGIBLE") eligibility = "CONDITIONAL";
        routeReasons.push(`Min APS ${minAPS} required (you have ${userAPS})`);
      }

      const addReq = route.additional_subjects || er.additional_subjects;
      if (addReq?.count) {
        const namedKeys = new Set(allOf.map(r => parseReqStr(r).subject).filter(Boolean));
        const additionalCount = Object.entries(subjectMap).filter(
          ([key, val]) => key !== "lo" && !namedKeys.has(key) && val.level >= addReq.min_level
        ).length;
        if (additionalCount < addReq.count) {
          if (eligibility === "ELIGIBLE") eligibility = "CONDITIONAL";
          routeReasons.push(
            `Need ${addReq.count} more subject${addReq.count !== 1 ? "s" : ""} at Level ${addReq.min_level}+ (you have ${additionalCount})`
          );
        }
      }

      if (!best || rank[eligibility] > rank[best.eligibility]) {
        best = { eligibility, reasons: routeReasons, subjectChecks, minAPS };
      }
    }

    return best || { eligibility: "NOT_ELIGIBLE", reasons: [], subjectChecks: [], minAPS: null };
  }

  // Legacy all_of / any_of structure
  const minAPS = er?.minimum_requirements?.min_aps || er?.min_aps || null;
  const allOf = er?.required_subjects?.all_of || [];
  const anyOf = er?.required_subjects?.any_of || [];
  const { subjectChecks, eligible, reasons } = checkSubjectReqs(allOf, anyOf, subjectMap);

  let eligibility = eligible ? "ELIGIBLE" : "NOT_ELIGIBLE";

  if (minAPS && userAPS < minAPS) {
    if (eligibility === "ELIGIBLE") eligibility = "CONDITIONAL";
    reasons.push(`Min APS ${minAPS} required (you have ${userAPS})`);
  }

  if (er?.additional_requirements?.work_experience_required && eligibility === "ELIGIBLE") {
    eligibility = "CONDITIONAL";
    reasons.push("Work experience required");
  }

  // Check additional subjects (e.g. "three 20-credit subjects at level 4")
  const addReq = er?.additional_subjects;
  if (addReq?.count) {
    const namedKeys = new Set();
    for (const r of [...allOf, ...anyOf]) {
      const { subject } = parseReqStr(r);
      if (subject) namedKeys.add(subject);
    }
    const additionalCount = Object.entries(subjectMap).filter(
      ([key, val]) => key !== "lo" && !namedKeys.has(key) && val.level >= addReq.min_level
    ).length;
    if (additionalCount < addReq.count) {
      if (eligibility === "ELIGIBLE") eligibility = "CONDITIONAL";
      reasons.push(
        `Need ${addReq.count} more subject${addReq.count !== 1 ? "s" : ""} at Level ${addReq.min_level}+ (you have ${additionalCount})`
      );
    }
  }

  return { eligibility, reasons, subjectChecks, minAPS };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function QualifiedCourses({ profile, userId }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addedIds, setAddedIds] = useState(new Set());
  const [addingId, setAddingId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const userAPS = calcUserAPS(profile?.subjects_marks || {});

  useEffect(() => {
    if (!profile) return;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const marksObj = profile.subjects_marks || profile.subjectsMarks || {};
        const subjectMap = buildSubjectMap(marksObj);
        const aps = calcUserAPS(marksObj);

        if (userId) {
          const { data: bucket } = await supabase
            .from("application_bucket")
            .select("program_id")
            .eq("user_id", userId);
          if (bucket?.length) setAddedIds(new Set(bucket.map((b) => b.program_id)));
        }

        const { data, error: fetchErr } = await supabase
          .from("institution_courses")
          .select("id, title, entry_requirements, programme_type, duration, career_opportunities, institution_id, institutions(id, name, type)")
          .not("entry_requirements", "is", null);

        if (fetchErr) throw fetchErr;

        const qualified = (data || [])
          .map((course) => ({ ...course, ...evaluate(profile, course, aps, subjectMap) }))
          .filter((c) => c.eligibility === "ELIGIBLE" || c.eligibility === "CONDITIONAL");

        const groupMap = {};
        for (const course of qualified) {
          const inst = course.institutions;
          if (!inst) continue;
          if (!groupMap[inst.id]) {
            groupMap[inst.id] = {
              institutionId: inst.id,
              institutionName: inst.name,
              institutionType: inst.type,
              courses: [],
            };
          }
          groupMap[inst.id].courses.push(course);
        }

        const sorted = Object.values(groupMap)
          .sort((a, b) => a.institutionName.localeCompare(b.institutionName))
          .map((g) => ({
            ...g,
            courses: [...g.courses].sort((a, b) => {
              if (a.eligibility === b.eligibility) return a.title.localeCompare(b.title);
              return a.eligibility === "ELIGIBLE" ? -1 : 1;
            }),
          }));

        setGroups(sorted);
      } catch (err) {
        console.error("QualifiedCourses error:", err);
        setError("Could not load courses. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [profile, userId]);

  const toggleGroup = (id) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = async (course, institutionType) => {
    if (!userId || addedIds.has(course.id)) return;
    setAddingId(course.id);
    setFeedback("");
    const { error: insertErr } = await supabase
      .from("application_bucket")
      .insert({
        user_id: userId,
        institution_id: course.institution_id,
        institution_type: INST_BUCKET_TYPE[institutionType] || "university",
        program_id: course.id,
        course_title: course.title,
        institution_name: course.institutions?.name || "",
      });
    if (insertErr) {
      setFeedback("Failed to add course. Please try again.");
    } else {
      setAddedIds((prev) => new Set([...prev, course.id]));
      setFeedback(`"${course.title}" added to your application.`);
      setTimeout(() => setFeedback(""), 3000);
    }
    setAddingId(null);
  };

  const totalCount = groups.reduce((sum, g) => sum + g.courses.length, 0);
  const eligibleCount = groups.reduce(
    (sum, g) => sum + g.courses.filter((c) => c.eligibility === "ELIGIBLE").length, 0
  );

  const filteredGroups = groups
    .filter((g) => typeFilter === "All" || g.institutionType === typeFilter)
    .map((g) => ({
      ...g,
      courses: g.courses.filter((c) => {
        if (statusFilter !== "All" && c.eligibility !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!c.title.toLowerCase().includes(q) && !g.institutionName.toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    }))
    .filter((g) => g.courses.length > 0);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 text-sm">Finding courses you qualify for…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-gray-500 text-sm">No courses match your current subject marks.</p>
        <p className="text-gray-400 text-xs mt-1">
          Update your results in your{" "}
          <button onClick={() => navigate("/profile")} className="text-blue-600 underline">profile</button>{" "}
          to see more.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <p className="text-green-800 font-semibold text-sm">
          {eligibleCount} fully eligible · {totalCount - eligibleCount} conditional · {groups.length} institution{groups.length !== 1 ? "s" : ""}
        </p>
        {addedIds.size > 0 && (
          <button
            onClick={() => navigate("/apply")}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Apply with {addedIds.size} course{addedIds.size !== 1 ? "s" : ""} →
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Search courses or institutions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex flex-wrap gap-2">
          {TYPE_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                typeFilter === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
          <span className="w-px bg-gray-200 self-stretch mx-1" />
          {[
            { key: "All", label: "All statuses", activeClass: "bg-gray-700 text-white" },
            { key: "ELIGIBLE", label: "Eligible", activeClass: "bg-green-600 text-white" },
            { key: "CONDITIONAL", label: "Conditional", activeClass: "bg-amber-500 text-white" },
          ].map(({ key, label, activeClass }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === key ? activeClass : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">{feedback}</div>
      )}

      {filteredGroups.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">No courses match your filters.</div>
      )}

      {/* Institution accordions */}
      {filteredGroups.map((group) => {
        const isOpen = expandedGroups.has(group.institutionId);
        const gEligible = group.courses.filter((c) => c.eligibility === "ELIGIBLE").length;
        const gConditional = group.courses.filter((c) => c.eligibility === "CONDITIONAL").length;

        return (
          <div key={group.institutionId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleGroup(group.institutionId)}
              className="w-full px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors text-left"
            >
              <div>
                <p className="font-semibold text-gray-900 text-sm">{group.institutionName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {group.institutionType}
                  {gEligible > 0 && <span className="ml-2 text-green-600 font-medium">{gEligible} eligible</span>}
                  {gConditional > 0 && <span className="ml-1 text-amber-600 font-medium">· {gConditional} conditional</span>}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-gray-400">{group.courses.length} courses</span>
                <span className={`text-gray-400 text-xs transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▼</span>
              </div>
            </button>

            {isOpen && (
              <div className="divide-y divide-gray-100">
                {group.courses.map((course) => {
                  const isAdded = addedIds.has(course.id);
                  const isAdding = addingId === course.id;
                  const detailsOpen = expandedCourse === course.id;
                  const isEligible = course.eligibility === "ELIGIBLE";

                  return (
                    <div key={course.id} className="px-5 py-4">
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${
                              isEligible ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                            }`}>
                              {isEligible ? "ELIGIBLE" : "CONDITIONAL"}
                            </span>
                            {course.programme_type && (
                              <span className="text-xs text-gray-400">{course.programme_type}</span>
                            )}
                          </div>
                          <p className="font-semibold text-gray-900 text-sm leading-snug">{course.title}</p>
                        </div>
                        <button
                          onClick={() => handleAdd(course, group.institutionType)}
                          disabled={isAdded || isAdding}
                          className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                            isAdded
                              ? "bg-gray-100 text-gray-400 cursor-default"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {isAdding ? "…" : isAdded ? "Added ✓" : "+ Add"}
                        </button>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                        {course.duration && <span>⏱ {course.duration}</span>}
                        {course.minAPS != null && (
                          <span className={userAPS >= course.minAPS ? "text-green-600" : "text-amber-600"}>
                            APS {userAPS}/{course.minAPS} {userAPS >= course.minAPS ? "✓" : "✗"}
                          </span>
                        )}
                      </div>

                      {/* Conditional inline warning */}
                      {!isEligible && course.reasons?.length > 0 && (
                        <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                          ⚠ {course.reasons[0]}
                        </div>
                      )}

                      {/* Details toggle */}
                      <button
                        onClick={() => setExpandedCourse(detailsOpen ? null : course.id)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {detailsOpen ? "▲ Hide details" : "▼ Show details"}
                      </button>

                      {/* Expanded details */}
                      {detailsOpen && (
                        <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                          {course.subjectChecks?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1.5">Subject Requirements</p>
                              <div className="flex flex-wrap gap-2">
                                {course.subjectChecks.map((sc, i) => (
                                  <span
                                    key={i}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                      sc.met
                                        ? "bg-green-50 text-green-700 border border-green-200"
                                        : "bg-red-50 text-red-700 border border-red-200"
                                    }`}
                                  >
                                    {sc.met ? "✓" : "✗"} {sc.name}
                                    {sc.requiredLevel != null && (
                                      <span className="opacity-60">(L{sc.requiredLevel})</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {!isEligible && course.reasons?.length > 1 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">Why conditional</p>
                              <ul className="space-y-0.5">
                                {course.reasons.slice(1).map((r, i) => (
                                  <li key={i} className="text-xs text-amber-700 flex items-start gap-1">
                                    <span>•</span><span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {course.career_opportunities && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-1">Career Opportunities</p>
                              <p className="text-xs text-gray-600 leading-relaxed">{course.career_opportunities}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Sticky CTA */}
      {addedIds.size > 0 && (
        <div className="sticky bottom-4 flex justify-center pt-2">
          <button
            onClick={() => navigate("/apply")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-full shadow-lg transition-colors text-sm"
          >
            Apply with {addedIds.size} course{addedIds.size !== 1 ? "s" : ""} →
          </button>
        </div>
      )}
    </div>
  );
}
