import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { FiSearch, FiChevronDown, FiChevronUp, FiClock, FiBookOpen, FiArrowLeft } from "react-icons/fi";

const TYPE_TABS = ["All", "University", "TVET College", "Private College"];

function normalizeType(type) {
  if (!type) return "Other";
  const t = type.toLowerCase();
  if (t.includes("university")) return "University";
  if (t.includes("tvet") || t.includes("technical and vocational") || t.includes("technical & vocational")) return "TVET College";
  if (t.includes("private")) return "Private College";
  return "Other";
}

function RequirementsSummary({ req }) {
  if (!req) return <span className="text-gray-400 text-xs">No requirements listed</span>;
  const r = typeof req === "string" ? JSON.parse(req) : req;
  const aps = r?.minimum_requirements?.min_aps;
  const qual = r?.minimum_requirements?.qualification;
  const allOf = r?.required_subjects?.all_of || [];
  return (
    <div className="text-xs text-gray-600 space-y-1">
      {qual && <div><span className="font-medium">Pass type:</span> {qual}</div>}
      {aps && <div><span className="font-medium">Min APS:</span> {aps}</div>}
      {allOf.length > 0 && (
        <div><span className="font-medium">Required:</span> {allOf.join(" · ")}</div>
      )}
      {r?.selection_notes && (
        <div className="text-gray-500 mt-1 leading-relaxed">{r.selection_notes}</div>
      )}
    </div>
  );
}

function CourseCard({ course }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start justify-between gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-snug">{course.title}</p>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {course.duration && (
              <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                <FiClock size={10} /> {course.duration}
              </span>
            )}
            {course.category && (
              <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full truncate max-w-[220px]">
                {course.category}
              </span>
            )}
            {course.programme_type && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {course.programme_type}
              </span>
            )}
          </div>
        </div>
        <span className="text-gray-400 mt-1 shrink-0">
          {expanded ? <FiChevronUp /> : <FiChevronDown />}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">Entry Requirements</p>
            <RequirementsSummary req={course.entry_requirements} />
          </div>
          {course.career_opportunities && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Career Opportunities</p>
              <p className="text-xs text-gray-600 leading-relaxed">{course.career_opportunities}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CourseView({ institution, onBack }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    supabase
      .from("institution_courses")
      .select("id, title, category, duration, programme_type, entry_requirements, career_opportunities")
      .eq("institution_id", institution.id)
      .order("title")
      .then(({ data }) => {
        setCourses(data || []);
        setLoading(false);
      });
  }, [institution.id]);

  const filtered = search.trim()
    ? courses.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        (c.category || "").toLowerCase().includes(search.toLowerCase())
      )
    : courses;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-5 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-200 hover:text-white text-sm font-medium mb-3 transition-colors"
        >
          <FiArrowLeft size={16} /> Back to institutions
        </button>
        <h2 className="text-white font-bold text-xl leading-snug">{institution.name}</h2>
        <p className="text-blue-200 text-xs mt-0.5">{institution.normalizedType}</p>
      </div>

      {/* Search */}
      <div className="px-5 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="relative max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search courses…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Course list */}
      <div className="flex-1 p-5 bg-gray-50 overflow-y-auto">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm animate-pulse">Loading courses…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {search ? "No courses match your search." : "No courses listed for this institution yet."}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-3">
            <p className="text-xs text-gray-500 mb-3">
              {filtered.length} course{filtered.length !== 1 ? "s" : ""}
              {search && ` matching "${search}"`}
            </p>
            {filtered.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Institutions() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState(null);

  useEffect(() => {
    supabase
      .from("institutions")
      .select("id, name, type, description, city, province")
      .order("name")
      .then(({ data }) => {
        setInstitutions((data || []).map(i => ({ ...i, normalizedType: normalizeType(i.type) })));
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading institutions…</div>
      </div>
    );
  }

  // Full-screen course view when institution selected
  if (selectedInstitution) {
    return (
      <div className="min-h-screen flex flex-col -m-4 md:-m-6">
        <CourseView
          institution={selectedInstitution}
          onBack={() => setSelectedInstitution(null)}
        />
      </div>
    );
  }

  const filtered = institutions.filter(i => {
    const matchesTab = activeTab === "All" || i.normalizedType === activeTab;
    const matchesSearch = !search.trim() || i.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Browse Institutions</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Explore all courses across {institutions.length} institutions
        </p>
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search institutions…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TYPE_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab} ({tab === "All" ? institutions.length : institutions.filter(i => i.normalizedType === tab).length})
            </button>
          ))}
        </div>
      </div>

      {/* Institution grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No institutions found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(inst => (
            <button
              key={inst.id}
              onClick={() => setSelectedInstitution(inst)}
              className="text-left p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-snug">{inst.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{inst.normalizedType}</p>
                  {(inst.city || inst.province) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[inst.city, inst.province].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <FiBookOpen className="shrink-0 mt-0.5 text-gray-300" size={18} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
