import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import {
  FiSearch, FiChevronDown, FiChevronRight,
  FiArrowLeft, FiMapPin, FiBook, FiExternalLink, FiX,
} from "react-icons/fi";

// ─── Section config ────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    key:     "cao",
    title:   "CAO Universities",
    short:   "Apply via CAO",
    accent:  "#D97706",
    tagBg:   "bg-amber-100",
    tagText: "text-amber-800",
  },
  {
    key:     "university",
    title:   "Universities",
    short:   "Direct application",
    accent:  "#2563EB",
    tagBg:   "bg-blue-100",
    tagText: "text-blue-800",
  },
  {
    key:     "private",
    title:   "Private Colleges",
    short:   "Own portal",
    accent:  "#7C3AED",
    tagBg:   "bg-purple-100",
    tagText: "text-purple-800",
  },
  {
    key:     "tvet",
    title:   "TVET Colleges",
    short:   "Certificates & diplomas",
    accent:  "#059669",
    tagBg:   "bg-emerald-100",
    tagText: "text-emerald-800",
  },
];

const INIT = 4;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeType(type) {
  if (!type) return "other";
  const t = type.toLowerCase();
  if (t.includes("tvet") || t.includes("technical and vocational") || t.includes("technical & vocational")) return "tvet";
  if (t.includes("private")) return "private";
  if (t.includes("university")) return "university";
  return "other";
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(w => w.length > 2 && !["of", "the", "and", "&"].includes(w.toLowerCase()))
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");
}

// ─── Course view (lazy loaded) ────────────────────────────────────────────────
function CourseView({ institution, onBack }) {
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [expanded, setExpanded] = useState(null);

  const section = SECTIONS.find(s => s.key === institution._section) || SECTIONS[1];

  useEffect(() => {
    window.scrollTo(0, 0);
    supabase
      .from("institution_courses")
      .select("id, title, category, duration, programme_type, entry_requirements, career_opportunities, apply_url, apply_via")
      .eq("institution_id", institution.id)
      .order("title")
      .then(({ data }) => { setCourses(data || []); setLoading(false); });
  }, [institution.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.category || "").toLowerCase().includes(q) ||
      (c.programme_type || "").toLowerCase().includes(q)
    );
  }, [courses, search]);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800">
        <FiArrowLeft size={14} /> Back to institutions
      </button>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0"
            style={{ background: section.accent }}>
            {initials(institution.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold text-gray-900 leading-snug">{institution.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${section.tagBg} ${section.tagText}`}>
                {section.short}
              </span>
              {(institution.city || institution.province) && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <FiMapPin size={10} />
                  {[institution.city, institution.province].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>
        {institution._section === "cao" && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 leading-relaxed">
            <strong>Apply through the CAO portal</strong> — not directly on this website.
            Visit <span className="font-semibold">cao.ac.za</span> to apply for up to 6 courses across CAO universities.
          </div>
        )}
      </div>

      <div className="relative">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search courses…"
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"><FiX size={13} /></button>
        )}
      </div>

      {!loading && (
        <p className="text-xs text-gray-400 font-medium">
          {filtered.length} course{filtered.length !== 1 ? "s" : ""}
          {search && ` matching "${search}"`}
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-400 text-sm">{search ? "No courses match." : "No courses listed yet."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(course => {
            const open = expanded === course.id;
            const req  = course.entry_requirements;
            const aps  = req?.minimum_requirements?.min_aps || req?.min_aps;
            const qual = req?.minimum_requirements?.qualification;
            return (
              <div key={course.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpanded(open ? null : course.id)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{course.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {course.duration && <span className="text-[10px] text-gray-400">{course.duration}</span>}
                      {course.category && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${section.tagBg} ${section.tagText}`}>
                          {course.category}
                        </span>
                      )}
                      {aps && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">APS {aps}+</span>
                      )}
                    </div>
                  </div>
                  <FiChevronDown size={15} className={`flex-shrink-0 text-gray-400 transition-transform mt-1 ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                    {qual && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Minimum qualification</p>
                        <p className="text-xs text-gray-700">{qual}</p>
                      </div>
                    )}
                    {req?.required_subjects?.all_of?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Required subjects</p>
                        <p className="text-xs text-gray-700">{req.required_subjects.all_of.join(" · ")}</p>
                      </div>
                    )}
                    {req?.selection_notes && (
                      <p className="text-xs text-gray-500 leading-relaxed">{req.selection_notes}</p>
                    )}
                    {course.career_opportunities && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Career paths</p>
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{course.career_opportunities}</p>
                      </div>
                    )}
                    {course.apply_url && (
                      <a
                        href={course.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg text-white"
                        style={{ background: section.accent }}
                        onClick={e => e.stopPropagation()}
                      >
                        Apply <FiExternalLink size={11} />
                      </a>
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
}

// ─── Domain column (one per section type) ────────────────────────────────────
function DomainColumn({ section, institutions, search, onSelect }) {
  const [showAll, setShowAll] = useState(false);

  if (institutions.length === 0) return (
    <div className="rounded-2xl overflow-hidden border border-dashed border-gray-200 flex flex-col">
      <div className="h-1" style={{ background: section.accent }} />
      <div className="p-3">
        <p className="text-xs font-extrabold text-gray-900">{section.title}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">None listed yet</p>
      </div>
    </div>
  );

  const visible = showAll || search.trim() ? institutions : institutions.slice(0, INIT);
  const moreCount = institutions.length - INIT;
  const hasMore = !search.trim() && !showAll && moreCount > 0;

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white flex flex-col">
      {/* Accent bar + header */}
      <div className="h-1 w-full" style={{ background: section.accent }} />
      <div className="px-3 pt-3 pb-2 border-b border-gray-50">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-xs font-extrabold text-gray-900 leading-snug">{section.title}</p>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${section.tagBg} ${section.tagText}`}>
            {institutions.length}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 leading-snug">{section.short}</p>
        {section.key === "cao" && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded-lg text-[9px] text-amber-800 leading-snug">
            ⚠ One application, up to 6 courses, at <strong>cao.ac.za</strong>
          </div>
        )}
        {section.key === "university" && (
          <p className="mt-1.5 text-[9px] text-blue-600 font-medium">Some may require NBT</p>
        )}
      </div>

      {/* Institution list */}
      <div className="divide-y divide-gray-50 flex-1">
        {visible.map(inst => (
          <button
            key={inst.id}
            onClick={() => onSelect({ ...inst, _section: section.key })}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors group"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[9px] font-extrabold flex-shrink-0"
              style={{ background: section.accent }}
            >
              {initials(inst.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-900 leading-snug line-clamp-2">{inst.name}</p>
              {(inst.city || inst.province) && (
                <p className="text-[9px] text-gray-400 truncate">
                  {[inst.city, inst.province].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <FiChevronRight size={11} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
          </button>
        ))}
      </div>

      {/* See more / less */}
      {hasMore && (
        <button
          onClick={() => setShowAll(true)}
          className="px-3 py-2.5 text-[11px] font-bold text-left border-t border-gray-50 hover:bg-gray-50 transition-colors flex items-center gap-1"
          style={{ color: section.accent }}
        >
          See {moreCount} more <FiChevronDown size={11} />
        </button>
      )}
      {showAll && !search.trim() && moreCount > 0 && (
        <button
          onClick={() => setShowAll(false)}
          className="px-3 py-2.5 text-[11px] font-semibold text-gray-400 hover:text-gray-600 text-left border-t border-gray-50 hover:bg-gray-50 transition-colors"
        >
          Show less ↑
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Institutions() {
  const [institutions, setInstitutions] = useState([]);
  const [caoIds, setCaoIds]             = useState(new Set());
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [selected, setSelected]         = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from("institutions").select("id, name, type, city, province, website").order("name"),
      supabase.from("institution_courses").select("institution_id, apply_via").ilike("apply_via", "%cao%").limit(500),
    ]).then(([{ data: insts }, { data: caoCourses }]) => {
      const ids = new Set((caoCourses || []).map(c => c.institution_id));
      setCaoIds(ids);
      setInstitutions((insts || []).map(i => ({ ...i, _type: normalizeType(i.type) })));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <div className="h-8 w-40 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (selected) {
    return <CourseView institution={selected} onBack={() => setSelected(null)} />;
  }

  const q = search.trim().toLowerCase();
  const filterInsts = q
    ? institutions.filter(i => i.name.toLowerCase().includes(q) || (i.city || "").toLowerCase().includes(q))
    : institutions;

  const grouped = {
    cao:        filterInsts.filter(i => i._type === "university" && caoIds.has(i.id)),
    university: filterInsts.filter(i => i._type === "university" && !caoIds.has(i.id)),
    private:    filterInsts.filter(i => i._type === "private"),
    tvet:       filterInsts.filter(i => i._type === "tvet"),
  };

  const hasResults = Object.values(grouped).some(a => a.length > 0);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">Institutions</h1>
        <p className="text-sm text-gray-400 mt-0.5">{institutions.length} institutions · tap any to browse courses</p>
      </div>

      {/* Search */}
      <div className="relative">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or city…"
          className="w-full pl-10 pr-9 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <FiX size={13} />
          </button>
        )}
      </div>

      {/* Colour legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {SECTIONS.map(s => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.accent }} />
            <span className="text-xs text-gray-500 font-medium">{s.title}</span>
          </div>
        ))}
      </div>

      {!hasResults ? (
        <div className="py-16 text-center">
          <FiBook size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No institutions match "{search}"</p>
          <button onClick={() => setSearch("")} className="text-xs font-semibold mt-2" style={{ color: "#FF7A18" }}>
            Clear search
          </button>
        </div>
      ) : (
        /* ── 4-column desktop / 2×2 mobile grid ── */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          {SECTIONS.map(section => (
            <DomainColumn
              key={section.key}
              section={section}
              institutions={grouped[section.key] || []}
              search={search}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}
    </div>
  );
}
