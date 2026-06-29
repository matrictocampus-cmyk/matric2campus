import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  FiSearch, FiPlus, FiCheck, FiX,
  FiChevronDown, FiArrowRight,
} from "react-icons/fi";
import MyMatchesTutorial from "./MyMatchesTutorial";

// ─── Domain config ────────────────────────────────────────────────────────────
const DOMAIN_SECTIONS = [
  {
    key:        "cao",
    title:      "CAO Universities",
    short:      "One application, 6 choices",
    accent:     "#D97706",
    tagBg:      "bg-amber-100",
    tagText:    "text-amber-800",
    limit:      6,
    limitLabel: "spots",
    perInst:    false,
  },
  {
    key:        "university",
    title:      "Universities",
    short:      "Direct / NBT",
    accent:     "#2563EB",
    tagBg:      "bg-blue-100",
    tagText:    "text-blue-800",
    limit:      3,
    limitLabel: "per university",
    perInst:    true,
  },
  {
    key:        "private",
    title:      "Private Colleges",
    short:      "No limit",
    accent:     "#7C3AED",
    tagBg:      "bg-purple-100",
    tagText:    "text-purple-800",
    limit:      null,
    limitLabel: "",
    perInst:    false,
  },
  {
    key:        "tvet",
    title:      "TVET Colleges",
    short:      "Certificates & diplomas",
    accent:     "#059669",
    tagBg:      "bg-emerald-100",
    tagText:    "text-emerald-800",
    limit:      null,
    limitLabel: "",
    perInst:    false,
  },
];

const INIT_SHOW = 4;
const TERM_LABELS = { 1: "Term 1", 2: "Term 2", 3: "Term 3", 4: "Final" };

// ─── Mark / APS helpers ───────────────────────────────────────────────────────
const APS_MAP_STRING = { "0-29%":1,"30-39%":2,"40-49%":3,"50-59%":4,"60-69%":5,"70-79%":6,"80-100%":7 };
function pctToLevel(pct) {
  const p = Number(pct);
  if (isNaN(p)) return 0;
  if (p>=80) return 7; if (p>=70) return 6; if (p>=60) return 5;
  if (p>=50) return 4; if (p>=40) return 3; if (p>=30) return 2;
  return p>0?1:0;
}
function getMarkLevel(m) {
  if (typeof m==="string" && APS_MAP_STRING[m]!==undefined) return APS_MAP_STRING[m];
  const n = typeof m==="string" ? parseFloat(m.replace(/[^0-9.]/g,"")) : Number(m);
  return isNaN(n)?0:pctToLevel(n);
}
function calcAPS(obj) {
  if (!obj||typeof obj!=="object") return 0;
  return Object.entries(obj).reduce((s,[k,v])=>{
    if (String(k).toLowerCase().includes("life orientation")||String(k).toLowerCase()==="lo") return s;
    return s+getMarkLevel(v);
  },0);
}

// ─── Term helpers ─────────────────────────────────────────────────────────────
function getTermsWithData(mr) {
  if (!mr||typeof mr!=="object"||Array.isArray(mr)) return [];
  return [1,2,3,4].filter(t=>{ const d=mr[t]??mr[String(t)]; return d&&typeof d==="object"&&Object.keys(d).length>0; });
}
function getLatestTerm(mr) { const t=getTermsWithData(mr); return t.length?t[t.length-1]:null; }
function resolveMarks(profile, viewTerm) {
  let obj=null;
  if (viewTerm&&profile?.manual_results) { const d=profile.manual_results[viewTerm]??profile.manual_results[String(viewTerm)]; if(d&&typeof d==="object") obj=d; }
  if (!obj&&profile?.subjects_marks) obj=profile.subjects_marks;
  return { aps: obj?calcAPS(obj):(profile?.aps_score||0), subjectMap: buildSubjectMap(obj||{}) };
}

// ─── Subject helpers ──────────────────────────────────────────────────────────
function norm(s) {
  if (!s) return "";
  const v=String(s).toLowerCase().trim();
  if (v.includes("english")) return "english";
  if (v.includes("zulu")) return "isizulu";
  if (v.includes("xhosa")) return "xhosa";
  if (v.includes("afrikaans")) return "afrikaans";
  if (v==="pure mathematics"||v.includes("pure math")) return "pure mathematics";
  if (v.includes("mathematics literacy")||v.includes("maths literacy")) return "mathematics literacy";
  if (v.includes("mathematics")||v.includes("maths")) return "mathematics";
  if (v.includes("life orientation")||v==="lo") return "lo";
  return v;
}
function buildSubjectMap(obj) {
  const map={};
  for(const [raw,mark] of Object.entries(obj||{})){
    const key=norm(raw); const level=getMarkLevel(mark);
    map[key]={raw,mark,level};
    if(key==="pure mathematics"&&(!map["mathematics"]||level>map["mathematics"].level)) map["mathematics"]={raw,mark,level};
  }
  return map;
}

// ─── Eligibility ──────────────────────────────────────────────────────────────
function parseReq(r) {
  if(!r||typeof r!=="string") return {subject:null,reqLevel:null,display:""};
  const m=r.match(/level\s*(\d+)/i)||r.match(/\bl\s*(\d+)/i);
  const reqLevel=m?parseInt(m[1],10):null;
  return {subject:norm(r.replace(/level\s*\d+/i,"").replace(/\bl\s*\d+/i,"").trim()),reqLevel,display:r.trim()};
}
function checkReqs(allOf,anyOf,subjectMap) {
  const checks=[]; let ok=true; const reasons=[];
  for(const r of allOf){
    const {subject,reqLevel,display}=parseReq(r); if(!subject) continue;
    const e=subjectMap[subject];
    const met=!!e&&(reqLevel===null||e.level>=reqLevel);
    checks.push({name:display,met,userLevel:e?.level||0,reqLevel});
    if(!met){ok=false;reasons.push(!e?`Missing: ${display}`:`${display.replace(/level\s*\d+/i,"").trim()} needs L${reqLevel} (you have L${e.level})`);}
  }
  if(anyOf.length){
    const pass=anyOf.some(r=>{const{subject,reqLevel}=parseReq(r);const e=subjectMap[subject];return e&&(reqLevel===null||e.level>=reqLevel);});
    if(!pass){ok=false;reasons.push(`Needs one of: ${anyOf.join(", ")}`);}
  }
  return {checks,ok,reasons};
}
function evaluate(course,userAPS,subjectMap){
  const er=course.entry_requirements||{};
  if(Array.isArray(er.routes)&&er.routes.length>0){
    let best=null;
    for(const route of er.routes){
      const minAPS=route.min_aps||null;
      const {checks,ok,reasons}=checkReqs(route.required_subjects?.all_of||[],[],subjectMap);
      const apsOk=!minAPS||userAPS>=minAPS;
      let elig=ok?"ELIGIBLE":"NOT_ELIGIBLE"; const rr=[...reasons];
      if(!apsOk){if(elig==="ELIGIBLE")elig="CONDITIONAL";rr.push(`Min APS ${minAPS} needed (you have ${userAPS})`);}
      const rank={ELIGIBLE:2,CONDITIONAL:1,NOT_ELIGIBLE:0};
      if(!best||rank[elig]>rank[best.elig]) best={elig,reasons:rr,checks,minAPS};
    }
    return best||{elig:"NOT_ELIGIBLE",reasons:[],checks:[],minAPS:null};
  }
  const minAPS=er?.minimum_requirements?.min_aps||er?.min_aps||null;
  const {checks,ok,reasons}=checkReqs(er?.required_subjects?.all_of||[],er?.required_subjects?.any_of||[],subjectMap);
  let elig=ok?"ELIGIBLE":"NOT_ELIGIBLE";
  if(minAPS&&userAPS<minAPS){if(elig==="ELIGIBLE")elig="CONDITIONAL";reasons.push(`Min APS ${minAPS} needed (you have ${userAPS})`);}
  return {elig,reasons,checks,minAPS};
}

// ─── Scoring ──────────────────────────────────────────────────────────────────
const IKW={
  tech:["tech","computer","software","information","digital","data","it","cyber","cloud","artificial"],
  health:["health","medical","nursing","pharmacy","medicine","clinical","biomedical","occupational","nutrition"],
  business:["business","commerce","finance","accounting","management","marketing","economics","logistics"],
  engineering:["engineering","civil","mechanical","electrical","chemical","industrial","mechatronics","renewable"],
  arts:["art","design","music","drama","visual","creative","architecture","fashion","media"],
  sciences:["science","biology","chemistry","physics","natural","environmental","forensic","actuarial"],
  social:["social","education","teaching","psychology","welfare","development"],
  law:["law","legal","justice","criminology","policing"],
  agriculture:["agriculture","agri","farming","food"],
  media:["media","communication","journalism","broadcasting"],
};
const DT=[
  ["data science",3],["data analytics",3],["artificial intelligence",3],["machine learning",3],
  ["cybersecurity",3],["mechatronics",3],["renewable energy",3],["biomedical engineering",3],
  ["actuarial science",3],["software engineering",3],["occupational therapy",3],
  ["software development",2],["computer science",2],["electrical engineering",2],
  ["civil engineering",2],["nursing",2],["pharmacy",2],["information technology",2],
  ["logistics",2],["supply chain",2],["forensic",2],["aviation",2],["biotechnology",2],
  ["accounting",1],["data",1],
];
function scoreInt(ints,cat,title){
  if(!ints?.length) return 0;
  const txt=`${cat} ${title}`.toLowerCase();
  return ints.reduce((s,id)=>s+((IKW[id]||[]).some(kw=>txt.includes(kw))?1:0),0);
}
function scoreDem(title,cat){
  const txt=`${title} ${cat}`.toLowerCase();
  return DT.reduce((s,[kw,pts])=>txt.includes(kw)?s+pts:s,0);
}

// ─── Domain helper ────────────────────────────────────────────────────────────
function instDomain(instType,isCao){
  if(!instType) return "university";
  const t=instType.toLowerCase();
  if(t.includes("tvet")) return "tvet";
  if(t.includes("private")) return "private";
  if(isCao) return "cao";
  return "university";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function QualifiedCourses({ profile, userId }) {
  const navigate = useNavigate();

  const [rawCourses,   setRawCourses]   = useState([]);
  const [caoInstIds,   setCaoInstIds]   = useState(new Set());
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [addedIds,     setAddedIds]     = useState(new Set());
  const [addedMeta,    setAddedMeta]    = useState({}); // id → {title, instName}
  const [addingId,     setAddingId]     = useState(null);
  const [removingId,   setRemovingId]   = useState(null);
  const [feedback,     setFeedback]     = useState({ msg:"", ok:true });
  const [showBasket,   setShowBasket]   = useState(true);
  const [expandedId,   setExpandedId]   = useState(null);
  const [search,       setSearch]       = useState("");
  const [colExpanded,  setColExpanded]  = useState({}); // `${domKey}` → bool

  const termsWithData = useMemo(()=>getTermsWithData(profile?.manual_results),[profile]);
  const defaultTerm   = useMemo(()=>getLatestTerm(profile?.manual_results)||profile?.results_term||null,[profile]);
  const [viewTerm, setViewTerm] = useState(defaultTerm);
  const { aps, subjectMap } = useMemo(()=>resolveMarks(profile,viewTerm),[profile,viewTerm]);
  const interests = profile?.career_interests || [];

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(()=>{
    (async()=>{
      try{
        const [
          {data:bucket},
          {data:courses},
          {data:caoCourses},
        ] = await Promise.all([
          userId
            ? supabase.from("application_bucket").select("program_id,course_title,institution_name").eq("user_id",userId).is("package_id",null)
            : Promise.resolve({data:[]}),
          supabase.from("institution_courses")
            .select("id,title,category,entry_requirements,programme_type,duration,career_opportunities,institution_id,institutions(id,name,type)")
            .order("title").limit(600),
          supabase.from("institution_courses")
            .select("institution_id").ilike("apply_via","%cao%").limit(500),
        ]);
        const ids=new Set((caoCourses||[]).map(c=>c.institution_id));
        setCaoInstIds(ids);
        const added=new Set((bucket||[]).map(b=>b.program_id));
        setAddedIds(added);
        const meta={};
        (bucket||[]).forEach(b=>{meta[b.program_id]={title:b.course_title,instName:b.institution_name};});
        setAddedMeta(meta);
        setRawCourses(courses||[]);
      }catch(err){
        console.error(err);
        setError("Could not load courses. Please try again.");
      }finally{
        setLoading(false);
      }
    })();
  },[userId]);

  // ── Score + evaluate ─────────────────────────────────────────────────────────
  const scored = useMemo(()=>{
    return rawCourses.map(c=>{
      const res=evaluate(c,aps,subjectMap);
      return{
        ...c,...res,
        iScore:scoreInt(interests,c.category||"",c.title||""),
        dScore:scoreDem(c.title||"",c.category||""),
        domain:instDomain(c.institutions?.type,caoInstIds.has(c.institution_id)),
      };
    });
  },[rawCourses,aps,subjectMap,interests,caoInstIds]);

  const qualified = useMemo(()=>scored.filter(c=>c.elig==="ELIGIBLE"||c.elig==="CONDITIONAL"),[scored]);

  // Search
  const filtered = useMemo(()=>{
    if(!search.trim()) return qualified;
    const q=search.toLowerCase();
    return qualified.filter(c=>
      c.title.toLowerCase().includes(q)||
      (c.institutions?.name||"").toLowerCase().includes(q)||
      (c.category||"").toLowerCase().includes(q)
    );
  },[qualified,search]);

  // Group by domain + sort by relevance
  const grouped = useMemo(()=>{
    const out={};
    for(const dom of DOMAIN_SECTIONS){
      const all=filtered.filter(c=>c.domain===dom.key);
      // Sort: matched (iScore) first, then in-demand (dScore), then rest
      all.sort((a,b)=>{
        if(b.iScore!==a.iScore) return b.iScore-a.iScore;
        if(b.dScore!==a.dScore) return b.dScore-a.dScore;
        return (a.elig==="ELIGIBLE"?0:1)-(b.elig==="ELIGIBLE"?0:1);
      });
      out[dom.key]=all;
    }
    return out;
  },[filtered]);

  // ── Limits ───────────────────────────────────────────────────────────────────
  const caoAdded = useMemo(()=>[...addedIds].filter(id=>{
    const c=rawCourses.find(x=>x.id===id);
    return c&&caoInstIds.has(c.institution_id);
  }).length,[addedIds,rawCourses,caoInstIds]);

  const uniByInst = useMemo(()=>{
    const map={};
    [...addedIds].forEach(id=>{
      const c=rawCourses.find(x=>x.id===id);
      if(c&&!caoInstIds.has(c.institution_id)&&c.institutions?.type?.toLowerCase().includes("university")){
        map[c.institution_id]=(map[c.institution_id]||0)+1;
      }
    });
    return map;
  },[addedIds,rawCourses,caoInstIds]);

  const canAdd = useCallback((course)=>{
    if(addedIds.has(course.id)) return{ok:false,reason:"added"};
    if(course.domain==="cao"){
      if(caoAdded>=6) return{ok:false,reason:"CAO limit reached (6 max)"};
    }else if(course.domain==="university"){
      const cnt=uniByInst[course.institution_id]||0;
      if(cnt>=3) return{ok:false,reason:"3 per university max"};
    }
    return{ok:true,reason:null};
  },[addedIds,caoAdded,uniByInst]);

  // ── Add / Remove ─────────────────────────────────────────────────────────────
  const handleAdd = async(course)=>{
    const{ok,reason}=canAdd(course);
    if(!ok||!userId){
      if(reason&&reason!=="added"){setFeedback({msg:reason,ok:false});setTimeout(()=>setFeedback({msg:"",ok:true}),3000);}
      return;
    }
    setAddingId(course.id);
    const typeMap={university:"university",cao:"university",private:"private_college",tvet:"college"};
    const{error:err}=await supabase.from("application_bucket").insert({
      user_id:userId, institution_id:course.institution_id,
      institution_type:typeMap[course.domain]||"university",
      program_id:course.id, course_title:course.title,
      institution_name:course.institutions?.name||"",
    });
    if(err){
      setFeedback({msg:"Failed to add. Try again.",ok:false});
    }else{
      setAddedIds(prev=>new Set([...prev,course.id]));
      setAddedMeta(prev=>({...prev,[course.id]:{title:course.title,instName:course.institutions?.name||""}}));
      setFeedback({msg:`"${course.title}" added`,ok:true});
    }
    setTimeout(()=>setFeedback({msg:"",ok:true}),2500);
    setAddingId(null);
  };

  const handleRemove = async(courseId)=>{
    if(!userId||removingId) return;
    setRemovingId(courseId);
    const{error:err}=await supabase.from("application_bucket").delete().eq("user_id",userId).eq("program_id",courseId);
    if(!err){
      setAddedIds(prev=>{const n=new Set(prev);n.delete(courseId);return n;});
      setAddedMeta(prev=>{const n={...prev};delete n[courseId];return n;});
    }
    setRemovingId(null);
  };

  // ── Loading / error ───────────────────────────────────────────────────────────
  if(loading) return(
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      <div className="h-8 w-40 bg-gray-100 rounded-xl animate-pulse"/>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i=><div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse"/>)}
      </div>
    </div>
  );
  if(error) return(
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">{error}</div>
    </div>
  );

  const totalEligible=qualified.filter(c=>c.elig==="ELIGIBLE").length;
  const totalCond=qualified.filter(c=>c.elig==="CONDITIONAL").length;

  return(
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
      <MyMatchesTutorial />

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">My Matches</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {qualified.length>0?`${totalEligible} fully eligible · ${totalCond} conditional`:"No qualifying courses found"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {aps>0?(
            <div data-tutorial="matches-aps" className="bg-gray-900 text-white rounded-xl px-4 py-2 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">APS</p>
              <p className="text-xl font-extrabold leading-none">{aps}</p>
              {viewTerm&&<p className="text-[8px] opacity-40 mt-0.5">{TERM_LABELS[viewTerm]}</p>}
            </div>
          ):(
            <button onClick={()=>navigate("/profile")} className="text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-orange-300 text-orange-500">
              Add marks →
            </button>
          )}
        </div>
      </div>

      {/* No marks notice */}
      {aps===0&&(
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
          <strong>No marks entered yet.</strong>{" "}
          <button onClick={()=>navigate("/profile")} className="underline font-semibold">Add your results in Profile</button>{" "}
          to see accurate matches.
        </div>
      )}

      {/* Term switcher */}
      {termsWithData.length>1&&(
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <p className="text-xs font-bold text-gray-500 flex-shrink-0">TERM:</p>
          <div className="flex gap-2 flex-wrap">
            {termsWithData.map(t=>(
              <button key={t} onClick={()=>setViewTerm(t)}
                className="text-xs font-bold px-3 py-1.5 rounded-full border transition-all"
                style={viewTerm===t?{background:"#FF7A18",color:"#fff",borderColor:"#FF7A18"}:{borderColor:"#e5e7eb",color:"#6b7280"}}>
                {TERM_LABELS[t]}{t===termsWithData[termsWithData.length-1]&&" ★"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedback.msg&&(
        <div className={`p-3 rounded-xl text-sm font-medium ${feedback.ok?"bg-green-50 border border-green-200 text-green-800":"bg-red-50 border border-red-200 text-red-700"}`}>
          {feedback.ok?"✓ ":""}{feedback.msg}
        </div>
      )}

      {/* ── Basket ─────────────────────────────────────────────────────────────── */}
      {addedIds.size>0&&(
        <div data-tutorial="matches-basket">
        <BasketPanel
          addedIds={addedIds}
          addedMeta={addedMeta}
          rawCourses={rawCourses}
          caoInstIds={caoInstIds}
          caoAdded={caoAdded}
          uniByInst={uniByInst}
          show={showBasket}
          onToggle={()=>setShowBasket(s=>!s)}
          onRemove={handleRemove}
          removingId={removingId}
          navigate={navigate}
        />
        </div>
      )}

      {/* ── Search ─────────────────────────────────────────────────────────────── */}
      <div className="relative">
        <FiSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input
          type="text"
          placeholder="Search courses, institutions, or fields…"
          value={search}
          onChange={e=>setSearch(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-9 py-2.5 text-sm outline-none focus:border-orange-400 shadow-sm"
        />
        {search&&(
          <button onClick={()=>setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <FiX size={13}/>
          </button>
        )}
      </div>

      {/* Cross-domain tip */}
      {addedIds.size===0&&(
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600 leading-relaxed">
          <strong className="text-gray-900">You can mix courses across all sections.</strong>{" "}
          CAO = 6 total choices · Universities = 3 per institution · Colleges = no limit.
        </div>
      )}

      {/* ── 4-col grid ─────────────────────────────────────────────────────────── */}
      {qualified.length===0?(
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
          <p className="font-bold text-gray-900">No qualifying courses found</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            {aps>0?"Try adjusting your search, or update your marks.":"Add your subject marks in Profile to see courses you qualify for."}
          </p>
          <button onClick={()=>navigate("/profile")} className="text-white text-sm font-bold px-5 py-2.5 rounded-xl" style={{background:"#FF7A18"}}>
            Update Profile
          </button>
        </div>
      ):(
        <div data-tutorial="matches-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          {DOMAIN_SECTIONS.map(dom=>{
            const courses=grouped[dom.key]||[];
            return(
              <DomainColumn
                key={dom.key}
                dom={dom}
                courses={courses}
                search={search}
                expanded={colExpanded[dom.key]||false}
                onToggleExpand={()=>setColExpanded(p=>({...p,[dom.key]:!p[dom.key]}))}
                caoAdded={caoAdded}
                uniByInst={uniByInst}
                addedIds={addedIds}
                addingId={addingId}
                expandedId={expandedId}
                onExpand={id=>setExpandedId(expandedId===id?null:id)}
                onAdd={handleAdd}
                canAdd={canAdd}
                aps={aps}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Basket panel ─────────────────────────────────────────────────────────────
function BasketPanel({ addedIds, addedMeta, rawCourses, caoInstIds, caoAdded, uniByInst, show, onToggle, onRemove, removingId, navigate }) {
  const byDomain={};
  [...addedIds].forEach(id=>{
    const c=rawCourses.find(x=>x.id===id)||{};
    const dom=instDomain(c.institutions?.type,caoInstIds.has(c.institution_id));
    if(!byDomain[dom]) byDomain[dom]=[];
    byDomain[dom].push({id,title:c.title||addedMeta[id]?.title||"",inst:c.institutions?.name||addedMeta[id]?.instName||""});
  });

  return(
    <div className="bg-white border-2 border-orange-200 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-50 transition-colors">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center" style={{background:"#FF7A18"}}>
            {addedIds.size}
          </span>
          <p className="text-sm font-bold text-gray-900">Selected for application</p>
          <span className="text-[10px] text-gray-400 hidden sm:block">
            {caoAdded>0&&`${caoAdded}/6 CAO`}
            {Object.keys(uniByInst).length>0&&` · ${Object.values(uniByInst).reduce((s,n)=>s+n,0)} direct`}
          </span>
        </div>
        <span className="text-gray-400 text-xs">{show?"▲":"▼"}</span>
      </button>

      {show&&(
        <>
          <div className="border-t border-orange-100 divide-y divide-gray-50">
            {DOMAIN_SECTIONS.map(dom=>{
              const items=byDomain[dom.key];
              if(!items?.length) return null;
              return(
                <div key={dom.key} className="px-4 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{color:dom.accent}}>
                    {dom.title}
                    {dom.key==="cao"&&<span className="ml-1.5 text-gray-400 normal-case font-medium">{caoAdded}/6</span>}
                  </p>
                  {items.map(item=>(
                    <div key={item.id} className="flex items-center gap-2 py-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{item.title}</p>
                        <p className="text-[10px] text-gray-400 truncate">{item.inst}</p>
                      </div>
                      <button onClick={()=>onRemove(item.id)} disabled={removingId===item.id} className="text-gray-300 hover:text-red-400 flex-shrink-0">
                        {removingId===item.id?<span className="text-xs">…</span>:<FiX size={13}/>}
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="px-4 py-3 border-t border-orange-100">
            <button
              onClick={()=>navigate("/apply")}
              className="w-full py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-1.5"
              style={{background:"#FF7A18"}}
            >
              Proceed to Apply <FiArrowRight size={14}/>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Domain column ────────────────────────────────────────────────────────────
function DomainColumn({ dom, courses, search, expanded, onToggleExpand, caoAdded, uniByInst, addedIds, addingId, expandedId, onExpand, onAdd, canAdd, aps }) {
  const caoFull=dom.key==="cao"&&caoAdded>=6;
  const visible=expanded||search.trim()?courses:courses.slice(0,INIT_SHOW);
  const moreCount=courses.length-INIT_SHOW;
  const hasMore=!search.trim()&&!expanded&&moreCount>0;

  return(
    <div data-tutorial={`matches-${dom.key}`} className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white flex flex-col">
      {/* Accent bar */}
      <div className="h-1 w-full" style={{background:dom.accent}}/>

      {/* Column header */}
      <div className="px-3 pt-3 pb-2.5 border-b border-gray-50">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <p className="text-[11px] font-extrabold text-gray-900 leading-tight">{dom.title}</p>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${dom.tagBg} ${dom.tagText}`}>
            {courses.length}
          </span>
        </div>
        <p className="text-[10px] text-gray-400">{dom.short}</p>
        {dom.key==="cao"&&(
          <p className={`text-[10px] font-bold mt-1 ${caoFull?"text-red-600":"text-amber-600"}`}>
            {caoAdded}/6 {caoFull?"— limit reached":"spots used"}
          </p>
        )}
        {dom.key==="university"&&(
          <p className="text-[10px] text-blue-500 font-medium mt-0.5">Max 3 per university</p>
        )}
      </div>

      {/* Empty state */}
      {courses.length===0&&(
        <div className="px-3 py-6 text-center">
          <p className="text-[11px] text-gray-400">{search?"No matches":"None found with your APS"}</p>
        </div>
      )}

      {/* Course cards */}
      <div className="divide-y divide-gray-50 flex-1">
        {visible.map(course=>{
          const{ok:addOk,reason:addReason}=canAdd(course);
          const instCnt=uniByInst[course.institution_id]||0;
          return(
            <CompactCourseCard
              key={course.id}
              course={course}
              dom={dom}
              aps={aps}
              isAdded={addedIds.has(course.id)}
              isAdding={addingId===course.id}
              isExpanded={expandedId===course.id}
              canAdd={addOk}
              blockReason={addReason}
              instCnt={instCnt}
              onAdd={()=>onAdd(course)}
              onToggle={()=>onExpand(course.id)}
            />
          );
        })}
      </div>

      {/* See more / less */}
      {hasMore&&(
        <button
          onClick={onToggleExpand}
          className="px-3 py-2.5 text-[11px] font-bold text-left border-t border-gray-50 hover:bg-gray-50 transition-colors flex items-center gap-1"
          style={{color:dom.accent}}
        >
          See {moreCount} more <FiChevronDown size={11}/>
        </button>
      )}
      {expanded&&!search.trim()&&moreCount>0&&(
        <button onClick={onToggleExpand} className="px-3 py-2.5 text-[11px] font-semibold text-gray-400 hover:text-gray-600 text-left border-t border-gray-50 hover:bg-gray-50 transition-colors">
          Show less ↑
        </button>
      )}
    </div>
  );
}

// ─── Compact course card ──────────────────────────────────────────────────────
function CompactCourseCard({ course, dom, aps, isAdded, isAdding, isExpanded, canAdd, blockReason, instCnt, onAdd, onToggle }) {
  const isElig=course.elig==="ELIGIBLE";
  const minAPS=course.minAPS||0;
  const apsOk=!minAPS||!aps||aps>=minAPS;

  return(
    <div className={`flex flex-col transition-all ${isExpanded?"bg-gray-50":""}`}>
      <div className="px-3 py-2.5 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {/* Eligibility dot + title */}
          <div className="flex items-start gap-1.5">
            <span
              className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{background:isElig?"#16A34A":"#D97706"}}
              title={isElig?"Eligible":"Conditional"}
            />
            <p className="text-[11px] font-bold text-gray-900 leading-snug line-clamp-2">{course.title}</p>
          </div>

          {/* Institution */}
          <p className="text-[10px] text-gray-400 truncate mt-0.5 pl-3">{course.institutions?.name}</p>

          {/* Meta badges */}
          <div className="flex items-center gap-1.5 mt-1 pl-3 flex-wrap">
            {course.dScore>=3&&(
              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-orange-100 text-orange-600">IN DEMAND</span>
            )}
            {course.iScore>0&&(
              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-50 text-blue-600">MATCHES YOU</span>
            )}
            {minAPS>0&&(
              <span className={`text-[9px] font-semibold px-1 py-0.5 rounded ${apsOk?"bg-green-50 text-green-700":"bg-amber-50 text-amber-700"}`}>
                APS {minAPS}+
              </span>
            )}
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={onAdd}
          disabled={isAdded||isAdding||(!canAdd&&blockReason!=="added")}
          title={!canAdd&&blockReason?blockReason:undefined}
          className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
            isAdded?"bg-gray-100 text-gray-400 cursor-default"
            :!canAdd?"bg-gray-50 text-gray-200 cursor-not-allowed"
            :"text-white hover:opacity-90"
          }`}
          style={!isAdded&&canAdd?{background:dom.accent}:{}}
        >
          {isAdding?"…":isAdded?<FiCheck size={12}/>:<FiPlus size={12}/>}
        </button>
      </div>

      {/* Expand toggle */}
      <button
        onClick={onToggle}
        className="mx-3 mb-1.5 text-[9px] text-gray-400 hover:text-gray-600 font-medium text-left flex items-center gap-0.5"
      >
        {isExpanded?<>▲ Hide details</>:<>▼ Details</>}
      </button>

      {/* Expanded details */}
      {isExpanded&&(
        <div className="mx-3 mb-2.5 p-2.5 bg-white border border-gray-100 rounded-xl space-y-2">
          {!isElig&&course.reasons?.[0]&&(
            <p className="text-[10px] text-amber-700 leading-snug">⚠ {course.reasons[0]}</p>
          )}
          {course.checks?.filter(sc=>!sc.met).length>0&&(
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Missing</p>
              {course.checks.filter(sc=>!sc.met).map((sc,i)=>(
                <p key={i} className="text-[10px] text-red-600">✗ {sc.name}{sc.reqLevel!=null&&` (L${sc.reqLevel})`}</p>
              ))}
            </div>
          )}
          {course.career_opportunities&&(
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Careers</p>
              <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-3">{course.career_opportunities}</p>
            </div>
          )}
          {dom.key==="university"&&instCnt>0&&(
            <p className="text-[9px] text-blue-500">{instCnt}/3 from this university</p>
          )}
        </div>
      )}
    </div>
  );
}
