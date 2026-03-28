import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase.js";
import { ConfirmModal } from "./App.jsx";

const G = {
  dark:  "#1A2E1A", mid:   "#2D6A2D", base:  "#3A7A3A",
  light: "#4CAF50", pale:  "#C8E6C9", wash:  "#E8F5E9",
  cream: "#F5F7F5", white: "#FFFFFF",
};

function normalizeFileType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  if (["pdf"].includes(ext)) return "pdf";
  if (["mp4","mov","avi","webm","mkv","m4v"].includes(ext)) return "video";
  if (["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext)) return "image";
  if (["mp3","wav","aac","ogg","flac"].includes(ext)) return "audio";
  return "other";
}
const FILE_META = {
  pdf:   { icon:"bi-file-earmark-pdf",   bg:"#fee2e2", color:"#dc2626" },
  video: { icon:"bi-play-circle",        bg:"#dbeafe", color:"#2563eb" },
  image: { icon:"bi-image",              bg:"#fef9c3", color:"#a16207" },
  audio: { icon:"bi-music-note-beamed",  bg:"#f3e8ff", color:"#7c3aed" },
  other: { icon:"bi-file-earmark",       bg:"#f3f4f6", color:"#6b7280" },
};
function getExtLabel(f) { return f.split(".").pop().toUpperCase(); }
function formatSize(kb) { if (!kb) return ""; return kb < 1024 ? `${kb} KB` : `${(kb/1024).toFixed(1)} MB`; }
function formatDate(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z")||iso.includes("+") ? iso : iso+"Z";
  return new Date(s).toLocaleString("en-PH",{timeZone:"Asia/Manila",month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true});
}

const s = {
  page:         { display:"flex", height:"100vh", fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", background:"#F5F7F5", overflow:"hidden" },
  sidebar:      { width:280, minWidth:280, background:G.dark, display:"flex", flexDirection:"column", color:"#fff", overflow:"hidden" },
  sidebarHdr:   { padding:"20px 16px 12px", borderBottom:"1px solid rgba(255,255,255,0.1)" },
  sidebarTitle: { fontSize:18, fontWeight:700, color:"#fff", margin:0 },
  sidebarSub:   { fontSize:12, color:G.pale, marginTop:2 },
  addBtn:       { margin:"12px 16px", padding:"9px 14px", background:G.base, color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:13, display:"flex", alignItems:"center", gap:6 },
  moduleList:   { flex:1, overflowY:"auto", padding:"4px 0" },
  moduleItem:  (a) => ({ padding:"10px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, borderLeft:a?`3px solid ${G.light}`:"3px solid transparent", background:a?"rgba(255,255,255,0.12)":"transparent", transition:"background .15s" }),
  moduleIcon:   { width:34, height:34, borderRadius:6, background:G.mid, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  modTitle:     { fontSize:13, fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  modMeta:      { fontSize:11, color:G.pale, marginTop:1 },
  statusBadge: (st) => ({ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, flexShrink:0, marginLeft:"auto",
    background: st==="published"?"#dcfce7":"#fef9c3",
    color:      st==="published"?"#16a34a":"#a16207" }),
  main:         { flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
  topBar:       { background:"#fff", borderBottom:`1px solid ${G.wash}`, padding:"0 24px", display:"flex", alignItems:"center", height:58, gap:10, flexShrink:0 },
  topBarTitle:  { fontSize:17, fontWeight:700, color:G.dark, flex:1 },
  tabBar:       { display:"flex", borderBottom:`1px solid ${G.wash}`, background:"#fff", padding:"0 24px", flexShrink:0 },
  tab:         (a) => ({ padding:"11px 18px", fontSize:13, fontWeight:600, color:a?G.dark:"#999", borderBottom:a?`2px solid ${G.dark}`:"2px solid transparent", cursor:"pointer", transition:"all .15s", marginBottom:-1, display:"flex", alignItems:"center", gap:6 }),
  subTab:      (a) => ({ padding:"8px 16px", fontSize:12, fontWeight:600, color:a?G.mid:"#888", borderBottom:a?`2px solid ${G.mid}`:"2px solid transparent", cursor:"pointer", marginBottom:-1, display:"flex", alignItems:"center", gap:5 }),
  content:      { flex:1, overflowY:"auto", padding:24 },
  emptyState:   { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:300, gap:12, color:"#aaa" },
  overlay:      { position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modal:       (w) => ({ background:"#fff", borderRadius:10, width:"100%", maxWidth:w||540, maxHeight:"92vh", overflow:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.22)" }),
  mHeader:      { padding:"20px 24px 16px", borderBottom:`1px solid ${G.wash}`, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:"#fff", zIndex:1 },
  mTitle:       { fontSize:17, fontWeight:700, color:G.dark },
  mBody:        { padding:"20px 24px" },
  mFooter:      { padding:"16px 24px", borderTop:`1px solid ${G.wash}`, display:"flex", gap:8, justifyContent:"flex-end", position:"sticky", bottom:0, background:"#fff" },
  label:        { fontSize:11, fontWeight:700, color:"#666", marginBottom:5, display:"block", textTransform:"uppercase", letterSpacing:.6 },
  input:        { width:"100%", padding:"9px 12px", border:"1px solid #DDE8DD", borderRadius:6, fontSize:14, outline:"none", background:"#fff", boxSizing:"border-box", color:G.dark },
  select:       { width:"100%", padding:"9px 12px", border:"1px solid #DDE8DD", borderRadius:6, fontSize:14, outline:"none", background:"#fff", boxSizing:"border-box", color:G.dark },
  textarea:     { width:"100%", padding:"9px 12px", border:"1px solid #DDE8DD", borderRadius:6, fontSize:14, outline:"none", background:"#fff", boxSizing:"border-box", color:G.dark, resize:"vertical", minHeight:80 },
  fg:           { marginBottom:16 },
  row:          { display:"flex", gap:12 },
  btnPrimary:   { padding:"9px 20px", background:G.dark, color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:13, display:"inline-flex", alignItems:"center", gap:6 },
  btnSecondary: { padding:"9px 20px", background:G.wash, color:G.dark, border:"none", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:13, display:"inline-flex", alignItems:"center", gap:6 },
  btnDanger:    { padding:"9px 20px", background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:13, display:"inline-flex", alignItems:"center", gap:6 },
  btnGreen:     { padding:"9px 18px", background:G.base, color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:13, display:"inline-flex", alignItems:"center", gap:6 },
  btnSm:       (bg,col) => ({ padding:"6px 14px", background:bg||G.wash, color:col||G.dark, border:"none", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:12, display:"inline-flex", alignItems:"center", gap:5 }),
  iconBtn:     (c) => ({ background:"none", border:"none", cursor:"pointer", color:c||"#999", fontSize:15, padding:"5px 7px", borderRadius:6, display:"inline-flex", alignItems:"center" }),
  tag:         (c) => ({ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
    background:c==="green"?"#dcfce7":c==="yellow"?"#fef9c3":c==="red"?"#fee2e2":c==="blue"?"#dbeafe":"#f3f4f6",
    color:c==="green"?"#16a34a":c==="yellow"?"#a16207":c==="red"?"#dc2626":c==="blue"?"#1d4ed8":"#555" }),
  badge:        { background:G.wash, color:G.base, borderRadius:10, padding:"1px 8px", fontSize:11, fontWeight:700 },
  card:         { background:"#fff", borderRadius:10, padding:"20px 24px", border:"1px solid #DDE8DD", boxShadow:"0 1px 4px rgba(0,0,0,.04)", marginBottom:16 },
  statCard:    (c) => ({ flex:1, minWidth:90, background:"#fff", borderRadius:10, padding:"16px 18px", border:"1px solid #DDE8DD", borderTop:`3px solid ${c||G.base}` }),
  th:           { padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:.5, borderBottom:`2px solid ${G.wash}`, background:"#F5F7F5" },
  td:           { padding:"11px 14px", borderBottom:`1px solid ${G.wash}`, color:G.dark, verticalAlign:"middle" },
};

const QTYPE = { multiple_choice:"Multiple Choice", true_false:"True/False", short_answer:"Short Answer" };

// ── Question Modal ────────────────────────────────────────────────
function QuestionModal({ onSave, onClose, initial, num }) {
  const [qText,   setQText]   = useState(initial?.question_text||"");
  const [qType,   setQType]   = useState(initial?.question_type||"multiple_choice");
  const [opts,    setOpts]    = useState(()=>{
    if (initial?.question_options?.length) return initial.question_options.map(o=>({...o}));
    return ["","","",""].map(t=>({option_text:t,is_correct:false}));
  });
  const [correct, setCorrect] = useState(()=>{
    if (initial?.question_options?.length) return initial.question_options.findIndex(o=>o.is_correct);
    return 0;
  });
  const [tfAns,   setTfAns]   = useState(()=>{
    if (initial?.question_type==="true_false") {
      const c=(initial.question_options||[]).find(o=>o.is_correct);
      return c?.option_text==="True"?"true":"false";
    }
    return "true";
  });

  const setCorrectOpt = (i) => { setCorrect(i); setOpts(o=>o.map((x,j)=>({...x,is_correct:j===i}))); };
  const updateOptText = (i,v) => setOpts(o=>o.map((x,j)=>j===i?{...x,option_text:v}:x));
  const addOpt        = () => setOpts(o=>[...o,{option_text:"",is_correct:false}]);
  const removeOpt     = (i) => { if(opts.length>2){setOpts(o=>o.filter((_,j)=>j!==i));if(correct>=i)setCorrect(Math.max(0,correct-1));} };

  const save = () => {
    if (!qText.trim()) return alert("Please enter the question text.");
    let finalOpts=[];
    if (qType==="true_false") { finalOpts=[{option_text:"True",is_correct:tfAns==="true"},{option_text:"False",is_correct:tfAns==="false"}]; }
    else if (qType==="multiple_choice") {
      if (opts.some(o=>!o.option_text.trim())) return alert("Please fill in all options.");
      if (!opts.some(o=>o.is_correct)) return alert("Please mark the correct answer.");
      finalOpts=opts;
    }
    onSave({question_text:qText,question_type:qType,options:finalOpts});
  };

  const TYPE_BTNS=[
    {v:"multiple_choice",icon:"bi-list-ul",       label:"Multiple Choice"},
    {v:"true_false",     icon:"bi-toggle-on",     label:"True / False"},
    {v:"short_answer",   icon:"bi-pencil-square", label:"Short Answer"},
  ];

  return(
    <div style={s.overlay}>
      <div style={s.modal(600)}>
        <div style={s.mHeader}>
          <span style={s.mTitle}>{initial?`Edit Question ${num}`:"Add Question"}</span>
          <button style={s.iconBtn()} onClick={onClose}>×</button>
        </div>
        <div style={s.mBody}>
          <div style={s.fg}>
            <label style={s.label}>Question Type</label>
            <div style={{display:"flex",gap:8}}>
              {TYPE_BTNS.map(t=>(
                <button key={t.v} onClick={()=>setQType(t.v)} style={{
                  flex:1,padding:"10px 6px",borderRadius:6,cursor:"pointer",fontWeight:600,fontSize:12,
                  border:`2px solid ${qType===t.v?G.base:G.pale}`,
                  background:qType===t.v?G.wash:"#fff",color:qType===t.v?G.dark:"#888",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                }}>
                  <i className={`bi ${t.icon}`}/>{t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={s.fg}>
            <label style={s.label}>Question *</label>
            <textarea style={s.textarea} value={qText} onChange={e=>setQText(e.target.value)} placeholder="Type your question here…"/>
          </div>
          {qType==="multiple_choice"&&(
            <div style={s.fg}>
              <label style={s.label}>Answer Options — click the circle to mark the correct answer</label>
              {opts.map((opt,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <button onClick={()=>setCorrectOpt(i)} style={{
                    width:24,height:24,borderRadius:"50%",border:`2px solid ${correct===i?G.base:G.pale}`,
                    background:correct===i?G.base:"#fff",cursor:"pointer",flexShrink:0,
                    display:"flex",alignItems:"center",justifyContent:"center",
                  }}>
                    {correct===i&&<i className="bi bi-check-lg" style={{color:"#fff",fontSize:11}}/>}
                  </button>
                  <input style={{...s.input,flex:1}} value={opt.option_text} onChange={e=>updateOptText(i,e.target.value)} placeholder={`Option ${i+1}`}/>
                  <button style={s.iconBtn(opts.length>2?"#dc2626":"#ccc")} onClick={()=>removeOpt(i)} disabled={opts.length<=2}>
                    <i className="bi bi-x-lg"/>
                  </button>
                </div>
              ))}
              {opts.length<6&&<button style={{...s.btnSecondary,fontSize:12,padding:"6px 14px",marginTop:4}} onClick={addOpt}><i className="bi bi-plus-lg me-1"/>Add Option</button>}
            </div>
          )}
          {qType==="true_false"&&(
            <div style={s.fg}>
              <label style={s.label}>Correct Answer</label>
              <div style={{display:"flex",gap:10}}>
                {["true","false"].map(v=>(
                  <button key={v} onClick={()=>setTfAns(v)} style={{
                    flex:1,padding:14,borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:15,
                    border:`2px solid ${tfAns===v?G.base:G.pale}`,
                    background:tfAns===v?G.wash:"#fff",color:tfAns===v?G.dark:"#888",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  }}>
                    <i className={`bi bi-${v==="true"?"check-circle":"x-circle"}`}/>
                    {v==="true"?"True":"False"}
                  </button>
                ))}
              </div>
            </div>
          )}
          {qType==="short_answer"&&(
            <div style={{background:G.wash,borderRadius:8,padding:"14px 16px",fontSize:13,color:G.dark,display:"flex",gap:10}}>
              <i className="bi bi-info-circle-fill" style={{color:G.base,flexShrink:0,marginTop:1}}/>
              <div><strong>Short Answer:</strong> Students type a written response. Review manually in the Results tab.</div>
            </div>
          )}
        </div>
        <div style={s.mFooter}>
          <button style={s.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={s.btnPrimary} onClick={save}>{initial?"Save Changes":"Add Question"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Results Panel ─────────────────────────────────────────────────
function ResultsPanel({ assessment }) {
  const [attempts, setAttempts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("assessment_attempts")
      .select("*, profiles(full_name,student_id,email)")
      .eq("assessment_id",assessment.id).order("submitted_at",{ascending:false});
    setAttempts(data||[]); setLoading(false);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ load(); },[assessment.id]);

  const loadDetail = async (attempt) => {
    const { data:answers } = await supabase.from("assessment_answers")
      .select("*, questions(question_text,question_type), selected_option:question_options!selected_option_id(option_text,is_correct)")
      .eq("attempt_id",attempt.id);
    setSelected({...attempt,answers:answers||[]});
  };

  const total=attempts.length, passed=attempts.filter(a=>a.passed).length;
  const failed=total-passed;
  const avgScore=total>0?Math.round(attempts.reduce((s,a)=>s+(a.score||0),0)/total):0;
  const passRate=total>0?Math.round((passed/total)*100):0;

  if (loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Loading results…</div>;

  return(
    <div>
      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        {[
          {label:"Total Attempts",value:total,         color:G.base},
          {label:"Passed",        value:passed,        color:"#16a34a"},
          {label:"Failed",        value:failed,        color:"#dc2626"},
          {label:"Avg Score",     value:`${avgScore}%`,color:"#2563eb"},
          {label:"Pass Rate",     value:`${passRate}%`,color:G.light},
        ].map(stat=>(
          <div key={stat.label} style={s.statCard(stat.color)}>
            <div style={{fontSize:26,fontWeight:900,color:stat.color}}>{stat.value}</div>
            <div style={{fontSize:12,color:"#888",marginTop:2}}>{stat.label}</div>
          </div>
        ))}
      </div>

      {attempts.length===0?(
        <div style={{background:"#fff",borderRadius:10,border:`2px dashed ${G.pale}`,padding:"50px 20px",textAlign:"center"}}>
          <i className="bi bi-bar-chart d-block mb-3" style={{fontSize:44,color:G.pale}}/>
          <div style={{fontWeight:700,color:G.dark,marginBottom:6}}>No attempts yet</div>
          <div style={{fontSize:13,color:"#aaa"}}>Student results will appear here once they take the assessment in the app.</div>
        </div>
      ):(
        <div style={{background:"#fff",borderRadius:10,border:"1px solid #DDE8DD",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr>
                <th style={s.th}>Student</th>
                <th style={s.th}>Student ID</th>
                <th style={s.th}>Score</th>
                <th style={s.th}>Result</th>
                <th style={s.th}>Submitted</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map(a=>(
                <tr key={a.id}>
                  <td style={s.td}>
                    <div style={{fontWeight:600}}>{a.profiles?.full_name||"—"}</div>
                    <div style={{fontSize:11,color:"#aaa"}}>{a.profiles?.email||""}</div>
                  </td>
                  <td style={s.td}>{a.profiles?.student_id||"—"}</td>
                  <td style={s.td}>
                    <span style={{fontSize:17,fontWeight:900,color:a.passed?"#16a34a":"#dc2626"}}>{a.score??0}%</span>
                    <span style={{fontSize:11,color:"#aaa",marginLeft:4}}>/ {assessment.passing_score||75}% to pass</span>
                  </td>
                  <td style={s.td}><span style={s.tag(a.passed?"green":"red")}>{a.passed?"Passed":"Failed"}</span></td>
                  <td style={s.td}>{formatDate(a.submitted_at)}</td>
                  <td style={s.td}>
                    <button style={s.btnSm(G.wash,G.dark)} onClick={()=>loadDetail(a)}>
                      <i className="bi bi-eye"/>View Answers
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected&&(
        <div style={s.overlay}>
          <div style={s.modal(660)}>
            <div style={s.mHeader}>
              <div>
                <div style={s.mTitle}><i className="bi bi-file-earmark-text me-2"/>{selected.profiles?.full_name||"Student"}'s Answers</div>
                <div style={{fontSize:12,color:"#888",marginTop:2}}>
                  Score: <strong style={{color:selected.passed?"#16a34a":"#dc2626"}}>{selected.score}%</strong>
                  &nbsp;·&nbsp;<span style={s.tag(selected.passed?"green":"red")}>{selected.passed?"Passed":"Failed"}</span>
                  &nbsp;·&nbsp;{formatDate(selected.submitted_at)}
                </div>
              </div>
              <button style={s.iconBtn()} onClick={()=>setSelected(null)}>×</button>
            </div>
            <div style={s.mBody}>
              {selected.answers.length===0?<div style={{textAlign:"center",color:"#aaa",padding:32}}>No answer details available.</div>:(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {selected.answers.map((ans,i)=>{
                    const isCorrect=ans.selected_option?.is_correct;
                    const isShort=ans.questions?.question_type==="short_answer";
                    return(
                      <div key={ans.id} style={{background:isShort?G.cream:isCorrect?"#f0fdf4":"#fff5f5",borderRadius:8,padding:"14px 16px",border:`1px solid ${isShort?G.pale:isCorrect?"#86efac":"#fca5a5"}`}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:4}}>Q{i+1} · {QTYPE[ans.questions?.question_type]}</div>
                        <div style={{fontSize:14,fontWeight:600,color:G.dark,marginBottom:8}}>{ans.questions?.question_text}</div>
                        {isShort?(
                          <div style={{fontSize:13,color:"#555",fontStyle:"italic"}}><i className="bi bi-pencil me-1"/>Short answer — review manually</div>
                        ):(
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={s.tag(isCorrect?"green":"red")}>
                              <i className={`bi bi-${isCorrect?"check-circle":"x-circle"} me-1`}/>
                              {isCorrect?"Correct":"Incorrect"}
                            </span>
                            <span style={{fontSize:13}}>Answered: <strong>{ans.selected_option?.option_text||"—"}</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={s.mFooter}><button style={s.btnSecondary} onClick={()=>setSelected(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Assessment Panel (full-featured, embedded) ────────────────────
function AssessmentPanel({ module, onAssessmentChange, onConfirm }) {
  const [assessment, setAssessment] = useState(null);
  const [questions,  setQuestions]  = useState([]);
  const [badges,     setBadges]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [subTab,     setSubTab]     = useState("questions");
  const [showAdd,    setShowAdd]    = useState(false);
  const [editQ,      setEditQ]      = useState(null);
  const [editQIdx,   setEditQIdx]   = useState(null);
  const [form, setForm] = useState({title:"",passingScore:75,timeLimit:30,badgeId:"",isPublished:false});
  const setF = (k,v) => setForm(f=>({...f,[k]:v}));
  const [showAI, setShowAI]         = useState(false);
  const [aiPrompt, setAiPrompt]     = useState("");
  const [aiCount, setAiCount]       = useState(5);
  const [aiType, setAiType]         = useState("multiple_choice");
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiGenerated, setAiGenerated] = useState([]);
  const [aiSelected, setAiSelected] = useState([]);
  const [aiError, setAiError]       = useState("");

  useEffect(()=>{
    let active=true;
    (async()=>{
      setLoading(true);
      const [{data:a},{data:b}]=await Promise.all([
        supabase.from("assessments").select("*").eq("module_id",module.id).maybeSingle(),
        supabase.from("badges").select("id,name").order("name"),
      ]);
      if (!active) return;
      setBadges(b||[]);
      if (a) {
        setAssessment(a);
        setForm({title:a.title||"",passingScore:a.passing_score||75,timeLimit:a.time_limit_minutes||30,badgeId:a.badge_id||"",isPublished:!!a.is_published});
        const {data:qs}=await supabase.from("questions").select("*,question_options(*)").eq("assessment_id",a.id).order("sort_order");
        if (active) setQuestions(qs||[]);
      } else {
        setForm(f=>({...f,title:`${module.title} — Assessment`}));
      }
      if (active) setLoading(false);
    })();
    return()=>{ active=false; };
  },[module.id]);// eslint-disable-line

  const loadQs = async (aId) => {
    const {data}=await supabase.from("questions").select("*,question_options(*)").eq("assessment_id",aId||assessment?.id).order("sort_order");
    setQuestions(data||[]);
  };

  const createAssessment = async () => {
    setCreating(true);
    const {data:{user}}=await supabase.auth.getUser();
    const {data:newA,error}=await supabase.from("assessments").insert({
      module_id:module.id,title:form.title||`${module.title} — Assessment`,
      passing_score:form.passingScore,time_limit_minutes:form.timeLimit,
      is_published:false,created_by:user?.id,
    }).select().single();
    setCreating(false);
    if (error){alert("Error: "+error.message);return;}
    setAssessment(newA);
    setForm(f=>({...f,isPublished:false}));
    onAssessmentChange?.();
  };

  const saveSettings = () => {
    if (!assessment) return;
    onConfirm?.({ title:"Save Assessment Settings", message:"Save changes to assessment title, passing score, time limit, and badge?", confirmLabel:"Save Settings", danger:false,
      onConfirm: async()=>{
        setSaving(true);
        const payload={title:form.title,passing_score:form.passingScore,time_limit_minutes:form.timeLimit,badge_id:form.badgeId||null,is_published:form.isPublished};
        const {error}=await supabase.from("assessments").update(payload).eq("id",assessment.id);
        setSaving(false);
        if (error){alert("Save error: "+error.message);onConfirm?.(null);return;}
        setAssessment(a=>({...a,...payload}));
        onAssessmentChange?.();
        onConfirm?.(null);
      }
    });
  };

  const togglePublish = () => {
    if (!assessment) return;
    const newVal=!form.isPublished;
    onConfirm?.({ 
      title: newVal ? "Publish Assessment" : "Unpublish Assessment",
      message: newVal
        ? "Publish this assessment? Students will be able to see and take it immediately."
        : "Unpublish this assessment? Students will no longer see it.",
      confirmLabel: newVal ? "Publish" : "Unpublish",
      danger: !newVal,
      onConfirm: async()=>{
        setF("isPublished",newVal);
        await supabase.from("assessments").update({is_published:newVal}).eq("id",assessment.id);
        setAssessment(a=>({...a,is_published:newVal}));
        onAssessmentChange?.();
        onConfirm?.(null);
      }
    });
  };

  const deleteAssessment = () => {
    onConfirm?.({ title:"Delete Assessment", message:"Delete this assessment? All questions and student results will be permanently removed.", confirmLabel:"Delete", danger:true,
      onConfirm: async()=>{
        await supabase.from("assessments").delete().eq("id",assessment.id);
        setAssessment(null);setQuestions([]);
        setForm({title:`${module.title} — Assessment`,passingScore:75,timeLimit:30,badgeId:"",isPublished:false});
        onAssessmentChange?.();
        onConfirm?.(null);
      }
    });
  };

  const addQ    = (d) => { setQuestions(qs=>[...qs,{...d,_new:true,id:`tmp_${Date.now()}`}]); setShowAdd(false); };
  const updateQ = (d) => { setQuestions(qs=>qs.map((q,i)=>i===editQIdx?{...q,...d}:q)); setEditQ(null);setEditQIdx(null); };
  const deleteQ = (i) => {
    onConfirm?.({ title:"Delete Question", message:"Remove this question? This cannot be undone.", confirmLabel:"Delete", danger:true,
      onConfirm: async()=>{
        const q=questions[i];
        if (!q._new) {
          await supabase.from("question_options").delete().eq("question_id",q.id);
          await supabase.from("questions").delete().eq("id",q.id);
          loadQs();
        }
        setQuestions(qs=>qs.filter((_,j)=>j!==i));
        onConfirm?.(null);
      }
    });
  };
  const moveQ = (i,dir) => { const qs=[...questions];const t=i+dir;if(t<0||t>=qs.length)return;[qs[i],qs[t]]=[qs[t],qs[i]];setQuestions(qs); };

  const saveQuestions = () => {
    if (!assessment) return;
    onConfirm?.({ title:"Save Questions", message:`Save all ${questions.length} question(s) to this assessment?`, confirmLabel:"Save Questions", danger:false,
      onConfirm: async()=>{
    setSaving(true);

    // Track all real DB IDs that belong to this save (existing + newly inserted)
    const savedIds = [];

    for (let i=0;i<questions.length;i++) {
      const q=questions[i]; let qId=q.id;
      if (q._new) {
        const {data:nq}=await supabase.from("questions").insert({assessment_id:assessment.id,question_text:q.question_text,question_type:q.question_type,sort_order:i}).select().single();
        qId=nq?.id;
      } else {
        await supabase.from("questions").update({question_text:q.question_text,question_type:q.question_type,sort_order:i}).eq("id",qId);
        await supabase.from("question_options").delete().eq("question_id",qId);
      }
      if (qId) savedIds.push(qId);
      const opts=q.options||q.question_options||[];
      for (let j=0;j<opts.length;j++) {
        await supabase.from("question_options").insert({question_id:qId,option_text:opts[j].option_text,is_correct:opts[j].is_correct,sort_order:j});
      }
    }

    // Only delete DB questions that are NOT in savedIds (truly removed by user)
    const {data:dbQs}=await supabase.from("questions").select("id").eq("assessment_id",assessment.id);
    for (const dq of (dbQs||[])) {
      if (!savedIds.includes(dq.id)) {
        await supabase.from("question_options").delete().eq("question_id",dq.id);
        await supabase.from("questions").delete().eq("id",dq.id);
      }
    }
    await loadQs(); setSaving(false);
    onConfirm?.(null);
      }
    });
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) { setAiError("Please describe the topic or paste content for the AI to generate questions from."); return; }
    setAiLoading(true); setAiError(""); setAiGenerated([]); setAiSelected([]);
    try {
      const systemPrompt = `You are an educational assessment expert for a Gender and Development (GAD) e-learning platform called BLOOM at Cavite State University.

CRITICAL RULES — follow these exactly:
1. Generate EXACTLY ${aiCount} questions — no more, no less.
2. Return ONLY a raw JSON array. No markdown, no code fences, no explanation, no text before or after the array.
3. The array must start with [ and end with ].
4. Each question object must have:
   - "question_text": string
   - "question_type": "${aiType}"
   - "options": array of option objects with "option_text" (string) and "is_correct" (boolean)
     * For multiple_choice: exactly 4 options, exactly 1 is_correct=true, rest false
     * For true_false: exactly 2 options ("True" and "False"), exactly 1 is_correct=true
     * For short_answer: empty array []

EXAMPLE OUTPUT (multiple_choice, 2 questions):
[{"question_text":"What is gender equality?","question_type":"multiple_choice","options":[{"option_text":"Equal rights for all genders","is_correct":true},{"option_text":"Only for women","is_correct":false},{"option_text":"A legal term only","is_correct":false},{"option_text":"Not relevant today","is_correct":false}]},{"question_text":"What does GAD stand for?","question_type":"multiple_choice","options":[{"option_text":"Gender and Development","is_correct":true},{"option_text":"Growth and Diversity","is_correct":false},{"option_text":"Global Aid Division","is_correct":false},{"option_text":"General Administrative Directive","is_correct":false}]}]

Now generate EXACTLY ${aiCount} ${aiType} questions about the given topic.`;

      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) { setAiError("Groq API key not found. Add VITE_GROQ_API_KEY to your .env file and restart the dev server."); setAiLoading(false); return; }
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0.4,
          max_tokens: 6000,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Module: "${module.title}"\n\nTopic/Content: ${aiPrompt.trim()}\n\nGenerate ${aiCount} ${aiType} questions.` },
          ],
        }),
      });
      const data = await response.json();
      if (data.error) { setAiError("Groq API Error: " + data.error.message); setAiLoading(false); return; }
      const text = data.choices?.[0]?.message?.content || "";
      // Robustly extract JSON array from response
      // Strip markdown fences, then find the first [ ... ] block
      let clean = text.replace(/```json|```/g, "").trim();
      // Extract just the JSON array — find first [ and last ]
      const start = clean.indexOf("[");
      const end   = clean.lastIndexOf("]");
      if (start === -1 || end === -1) throw new Error("No JSON array found in response");
      clean = clean.slice(start, end + 1);
      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed)) throw new Error("Response is not an array");
      // Normalise and validate
      // Trim to exact requested count if AI returned more
      const trimmed = parsed.slice(0, aiCount);
      const normalised = trimmed.map((q, i) => ({
        id: `ai_${Date.now()}_${i}`,
        question_text: q.question_text || "",
        question_type: q.question_type || aiType,
        options: (q.options || []).map(o => ({ option_text: o.option_text || "", is_correct: !!o.is_correct })),
        _new: true,
      }));
      setAiGenerated(normalised);
      setAiSelected(normalised.map(q => q.id)); // select all by default
    } catch (e) {
      setAiError("Failed to parse AI response. Please try again. (" + e.message + ")");
    }
    setAiLoading(false);
  };

  const addAIQuestions = () => {
    const toAdd = aiGenerated
      .filter(q => aiSelected.includes(q.id))
      .map(q => ({ ...q, question_options: q.options }));
    setQuestions(qs => [...qs, ...toAdd]);
    setShowAI(false);
    setAiGenerated([]); setAiSelected([]); setAiPrompt(""); setAiError("");
  };

  if (loading) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Loading assessment…</div>;

  // Empty state
  if (!assessment) return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",textAlign:"center"}}>
      <div style={{width:72,height:72,borderRadius:16,background:G.wash,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
        <i className="bi bi-ui-checks" style={{fontSize:34,color:G.base}}/>
      </div>
      <div style={{fontSize:16,fontWeight:700,color:G.dark,marginBottom:6}}>No assessment created for this module</div>
      <div style={{fontSize:13,color:"#888",marginBottom:28,maxWidth:360}}>Create an assessment so students can test their knowledge after completing this module.</div>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={s.fg}>
          <label style={s.label}>Assessment Title</label>
          <input style={s.input} value={form.title} onChange={e=>setF("title",e.target.value)} placeholder={`${module.title} — Assessment`}/>
        </div>
        <div style={{...s.row,marginBottom:16}}>
          <div style={{flex:1}}>
            <label style={s.label}>Passing Score (%)</label>
            <input style={s.input} type="number" min={0} max={100} value={form.passingScore} onChange={e=>setF("passingScore",+e.target.value)}/>
          </div>
          <div style={{flex:1}}>
            <label style={s.label}>Time Limit (min)</label>
            <input style={s.input} type="number" min={1} value={form.timeLimit} onChange={e=>setF("timeLimit",+e.target.value)}/>
          </div>
        </div>
        <button style={{...s.btnGreen,width:"100%",justifyContent:"center",padding:"11px 20px",fontSize:14,opacity:creating?0.7:1}} onClick={createAssessment} disabled={creating}>
          {creating?<><i className="bi bi-hourglass-split"/>Creating…</>:<><i className="bi bi-plus-circle"/>Create Assessment</>}
        </button>
      </div>
    </div>
  );

  const warnNoQs = form.isPublished && questions.length===0;

  return(
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* Settings card */}
      <div style={s.card}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <i className="bi bi-gear" style={{color:G.base,fontSize:16}}/>
            <span style={{fontWeight:700,color:G.dark,fontSize:14}}>Assessment Settings</span>
            <span style={s.tag(form.isPublished?"green":"yellow")}>
              <i className={`bi bi-${form.isPublished?"broadcast":"slash-circle"} me-1`}/>
              {form.isPublished?"Published":"Draft"}
            </span>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button style={s.btnSm(form.isPublished?"#fee2e2":"#dcfce7",form.isPublished?"#dc2626":"#16a34a")} onClick={togglePublish}>
              <i className={`bi bi-${form.isPublished?"eye-slash":"broadcast"}`}/>
              {form.isPublished?"Unpublish":"Publish"}
            </button>
            <button style={s.btnSm("#fee2e2","#dc2626")} onClick={deleteAssessment}>
              <i className="bi bi-trash"/>Delete Assessment
            </button>
          </div>
        </div>

        {warnNoQs&&(
          <div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:6,padding:"10px 14px",fontSize:12,color:"#9a3412",marginBottom:14,display:"flex",gap:8,alignItems:"center"}}>
            <i className="bi bi-exclamation-triangle-fill" style={{flexShrink:0}}/>
            This assessment is published but has no questions. Add questions before publishing.
          </div>
        )}

        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <div style={{flex:3,minWidth:200,...s.fg}}>
            <label style={s.label}>Title</label>
            <input style={s.input} value={form.title} onChange={e=>setF("title",e.target.value)}/>
          </div>
          <div style={{flex:1,minWidth:100,...s.fg}}>
            <label style={s.label}>Passing Score (%)</label>
            <input style={s.input} type="number" min={0} max={100} value={form.passingScore} onChange={e=>setF("passingScore",+e.target.value)}/>
          </div>
          <div style={{flex:1,minWidth:100,...s.fg}}>
            <label style={s.label}>Time Limit (min)</label>
            <input style={s.input} type="number" min={1} value={form.timeLimit} onChange={e=>setF("timeLimit",+e.target.value)}/>
          </div>
        </div>
        <div style={s.fg}>
          <label style={s.label}><i className="bi bi-award me-1"/>Auto-award Badge on Pass</label>
          <select style={s.select} value={form.badgeId} onChange={e=>setF("badgeId",e.target.value)}>
            <option value="">— No badge —</option>
            {badges.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {form.badgeId&&<div style={{marginTop:6,fontSize:12,color:G.base,fontWeight:600}}><i className="bi bi-check-circle-fill me-1"/>Students who achieve {form.passingScore}% or higher will automatically receive this badge.</div>}
        </div>
        <div style={{display:"flex",justifyContent:"flex-end"}}>
          <button style={{...s.btnPrimary,opacity:saving?0.7:1}} onClick={saveSettings} disabled={saving}>
            {saving?<><i className="bi bi-hourglass-split"/>Saving…</>:<><i className="bi bi-floppy"/>Save Settings</>}
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${G.wash}`,marginBottom:20}}>
        <div style={s.subTab(subTab==="questions")} onClick={()=>setSubTab("questions")}>
          <i className="bi bi-file-earmark-text"/>Questions
          <span style={{...s.badge,marginLeft:4}}>{questions.length}</span>
        </div>
        <div style={s.subTab(subTab==="results")} onClick={()=>setSubTab("results")}>
          <i className="bi bi-bar-chart"/>Results
        </div>
      </div>

      {subTab==="questions"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontWeight:700,color:G.dark,fontSize:14}}>Questions</span>
              <span style={s.badge}>{questions.length}</span>
            </div>
            <div style={{display:"flex",gap:8}}>
              {questions.length>0&&(
                <button style={{...s.btnSm(G.wash,G.dark),opacity:saving?0.7:1}} onClick={saveQuestions} disabled={saving}>
                  {saving?<><i className="bi bi-hourglass-split"/>Saving…</>:<><i className="bi bi-floppy"/>Save Questions</>}
                </button>
              )}
              <button style={{...s.btnSm(G.wash,G.base),border:`1px solid ${G.pale}`,fontWeight:700}} onClick={()=>{setAiPrompt(module.description||"");setAiError("");setAiGenerated([]);setAiSelected([]);setShowAI(true);}}>
                <i className="bi bi-stars"/>Generate with AI
              </button>
              <button style={s.btnGreen} onClick={()=>setShowAdd(true)}>
                <i className="bi bi-plus-circle"/>Add Question
              </button>
            </div>
          </div>

          {questions.length===0?(
            <div style={{background:"#fff",borderRadius:10,border:`2px dashed ${G.pale}`,padding:"40px 20px",textAlign:"center"}}>
              <i className="bi bi-clipboard-check d-block mb-3" style={{fontSize:44,color:G.pale}}/>
              <div style={{fontWeight:700,color:G.dark,marginBottom:6}}>No questions yet</div>
              <div style={{fontSize:13,color:"#aaa",marginBottom:18}}>Add multiple choice, true/false, or short answer questions</div>
              <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
                <button style={{...s.btnSm(G.wash,G.base),border:`1px solid ${G.pale}`,fontWeight:700,padding:"9px 16px"}} onClick={()=>{setAiPrompt(module.description||"");setAiError("");setAiGenerated([]);setAiSelected([]);setShowAI(true);}}>
                  <i className="bi bi-stars"/>Generate with AI
                </button>
                <button style={s.btnGreen} onClick={()=>setShowAdd(true)}><i className="bi bi-plus-circle"/>Add Manually</button>
              </div>
            </div>
          ):(
            <>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {questions.map((q,i)=>{
                  const opts=(q.options||q.question_options||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
                  return(
                    <div key={q.id} style={{background:"#fff",borderRadius:10,border:"1px solid #DDE8DD",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
                      <div style={{display:"flex",alignItems:"center",padding:"10px 14px",borderBottom:`1px solid ${G.wash}`,background:"#F9FBF9",gap:8}}>
                        <span style={{fontSize:12,fontWeight:800,color:G.base,minWidth:28}}>Q{i+1}</span>
                        <span style={{fontSize:11,background:G.wash,color:G.dark,padding:"2px 9px",borderRadius:20,fontWeight:600}}>{QTYPE[q.question_type]}</span>
                        {q._new&&<span style={{fontSize:10,background:"#dbeafe",color:"#1d4ed8",padding:"1px 8px",borderRadius:20,fontWeight:700}}>Unsaved</span>}
                        <div style={{marginLeft:"auto",display:"flex",gap:2}}>
                          <button style={s.iconBtn("#aaa")} onClick={()=>moveQ(i,-1)} disabled={i===0} title="Move up"><i className="bi bi-arrow-up"/></button>
                          <button style={s.iconBtn("#aaa")} onClick={()=>moveQ(i,1)} disabled={i===questions.length-1} title="Move down"><i className="bi bi-arrow-down"/></button>
                          <button style={s.iconBtn(G.base)} onClick={()=>{setEditQ(q);setEditQIdx(i);}} title="Edit"><i className="bi bi-pencil"/></button>
                          <button style={s.iconBtn("#dc2626")} onClick={()=>deleteQ(i)} title="Delete"><i className="bi bi-trash"/></button>
                        </div>
                      </div>
                      <div style={{padding:"14px 16px"}}>
                        <div style={{fontSize:14,fontWeight:600,color:G.dark,marginBottom:10,lineHeight:1.5}}>{q.question_text}</div>
                        {q.question_type==="short_answer"?(
                          <div style={{background:G.wash,borderRadius:6,padding:"9px 14px",fontSize:12,color:"#888",fontStyle:"italic"}}>
                            <i className="bi bi-pencil me-1"/>Students will type a written response
                          </div>
                        ):(
                          <div style={{display:"flex",flexDirection:"column",gap:5}}>
                            {opts.map((o,j)=>(
                              <div key={j} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderRadius:6,fontSize:13,background:o.is_correct?"#dcfce7":"#f9fafb",border:`1px solid ${o.is_correct?"#86efac":"#e5e7eb"}`}}>
                                <i className={`bi bi-${o.is_correct?"check-circle-fill":"circle"}`} style={{color:o.is_correct?"#16a34a":"#d1d5db",flexShrink:0}}/>
                                <span style={{color:o.is_correct?"#16a34a":G.dark,fontWeight:o.is_correct?700:400}}>{o.option_text}</span>
                                {o.is_correct&&<span style={{marginLeft:"auto",fontSize:11,color:"#16a34a",fontWeight:700}}>Correct answer</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",paddingTop:12}}>
                <button style={{...s.btnPrimary,opacity:saving?0.7:1}} onClick={saveQuestions} disabled={saving}>
                  {saving?<><i className="bi bi-hourglass-split"/>Saving…</>:<><i className="bi bi-floppy"/>Save All Questions</>}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {subTab==="results"&&<ResultsPanel key={assessment.id} assessment={assessment}/>}

      {showAdd&&<QuestionModal num={questions.length+1} onSave={addQ} onClose={()=>setShowAdd(false)}/>}
      {editQ&&<QuestionModal initial={editQ} num={editQIdx+1} onSave={updateQ} onClose={()=>{setEditQ(null);setEditQIdx(null);}}/>}

      {/* ── AI Generate Modal ── */}
      {showAI&&(
        <div style={s.overlay}>
          <div style={{...s.modal,maxWidth:640,maxHeight:"92vh",overflow:"auto",background:G.wash}}>
            <div style={{padding:"16px 24px",background:`linear-gradient(135deg,${G.dark},${G.base})`,borderRadius:"10px 10px 0 0",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(255,255,255,0.25)"}}>
                  <i className="bi bi-stars" style={{color:"#fff",fontSize:18}}/>
                </div>
                <div>
                  <div style={{fontWeight:800,color:"#fff",fontSize:15}}>Generate Questions with AI</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.65)"}}>Powered by Groq — BLOOM GAD</div>
                </div>
              </div>
              <button style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:6,color:"#fff",cursor:"pointer",fontSize:16,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowAI(false)}>×</button>
            </div>
            <div style={{...s.mBody,background:G.wash}}>
              {aiError&&<div style={{background:"#fee2e2",color:"#dc2626",borderRadius:6,padding:"10px 14px",fontSize:13,marginBottom:14}}>{aiError}</div>}

              {/* Module context */}
              <div style={{background:"#fff",border:`1px solid ${G.pale}`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:G.dark}}>
                <i className="bi bi-book me-1"/><strong>Module:</strong> {module.title}
              </div>

              {/* Settings row */}
              <div style={{display:"flex",gap:12,marginBottom:16}}>
                <div style={{flex:1}}>
                  <label style={s.label}>Question Type</label>
                  <select style={s.select} value={aiType} onChange={e=>setAiType(e.target.value)}>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                </div>
                <div style={{flex:1}}>
                  <label style={s.label}>Number of Questions</label>
                  <select style={s.select} value={aiCount} onChange={e=>setAiCount(+e.target.value)}>
                    {[3,5,8,10,15].map(n=><option key={n} value={n}>{n} questions</option>)}
                  </select>
                </div>
              </div>

              {/* Topic / content input */}
              <div style={s.fg}>
                <label style={s.label}>Topic or Content *</label>
                <textarea style={{...s.textarea,minHeight:100}} value={aiPrompt}
                  onChange={e=>setAiPrompt(e.target.value)}
                  placeholder="Describe the topic, paste module content, or write key concepts the questions should cover. The more detail you provide, the better the questions."/>
                <div style={{fontSize:11,color:"#888",marginTop:4}}>
                  <i className="bi bi-lightbulb me-1"/>Tip: You can paste the module description or key learning outcomes here.
                </div>
              </div>

              {/* Generate button */}
              {aiGenerated.length===0&&(
                <button
                  style={{width:"100%",padding:"11px 20px",background:aiLoading?G.pale:`linear-gradient(135deg,${G.dark},${G.base})`,color:"#fff",border:"none",borderRadius:8,cursor:aiLoading?"not-allowed":"pointer",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
                  onClick={generateWithAI} disabled={aiLoading}>
                  {aiLoading
                    ? <><span style={{width:16,height:16,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/> Generating questions…</>
                    : <><i className="bi bi-stars"/>Generate {aiCount} Questions</>
                  }
                </button>
              )}

              {/* Generated questions review */}
              {aiGenerated.length>0&&(
                <div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{fontWeight:700,color:G.dark,fontSize:13}}>
                      <i className="bi bi-check2-all me-1" style={{color:"#16a34a"}}/>
                      {aiGenerated.length} questions generated — review and select
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button style={{...s.btnSm(G.wash,G.base),fontSize:11}} onClick={()=>setAiSelected(aiGenerated.map(q=>q.id))}>Select All</button>
                      <button style={{...s.btnSm(G.wash,G.dark),fontSize:11}} onClick={()=>setAiSelected([])}>Deselect All</button>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:340,overflowY:"auto",padding:"2px 0"}}>
                    {aiGenerated.map((q,i)=>{
                      const sel=aiSelected.includes(q.id);
                      const opts=q.options||[];
                      return(
                        <div key={q.id} style={{background:sel?G.wash:"#f9fafb",border:`1.5px solid ${sel?G.light:"#e5e7eb"}`,borderRadius:8,padding:"12px 14px",cursor:"pointer",transition:"all .15s"}}
                          onClick={()=>setAiSelected(s=>sel?s.filter(id=>id!==q.id):[...s,q.id])}>
                          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                            <div style={{width:20,height:20,borderRadius:4,border:`2px solid ${sel?G.base:"#d1d5db"}`,background:sel?G.base:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                              {sel&&<i className="bi bi-check" style={{color:"#fff",fontSize:11}}/>}
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,fontWeight:600,color:G.dark,marginBottom:6,lineHeight:1.5}}>
                                <span style={{fontSize:11,fontWeight:700,color:G.base,marginRight:6}}>Q{i+1}</span>
                                {q.question_text}
                              </div>
                              {q.question_type!=="short_answer"&&(
                                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                                  {opts.map((o,j)=>(
                                    <div key={j} style={{fontSize:12,padding:"4px 8px",borderRadius:5,background:o.is_correct?"#dcfce7":"#f3f4f6",color:o.is_correct?"#16a34a":G.dark,display:"flex",alignItems:"center",gap:6}}>
                                      <i className={`bi bi-${o.is_correct?"check-circle-fill":"circle"}`} style={{color:o.is_correct?"#16a34a":"#d1d5db"}}/>
                                      {o.option_text}
                                      {o.is_correct&&<span style={{marginLeft:"auto",fontSize:10,fontWeight:700}}>✓ Correct</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {q.question_type==="short_answer"&&(
                                <div style={{fontSize:12,color:"#888",fontStyle:"italic"}}>Open-ended — students type their answer</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Regenerate option */}
                  <button style={{...s.btnSm(G.wash,G.base),marginTop:10,fontSize:12}} onClick={()=>{setAiGenerated([]);setAiSelected([]);}}>
                    <i className="bi bi-arrow-clockwise"/>Regenerate
                  </button>
                </div>
              )}
            </div>
            <div style={{...s.mFooter,background:G.wash}}>
              <button style={s.btnSecondary} onClick={()=>setShowAI(false)}>Cancel</button>
              {aiGenerated.length>0&&(
                <button
                  style={{...s.btnPrimary,background:`linear-gradient(135deg,${G.dark},${G.base})`,opacity:aiSelected.length===0?0.5:1}}
                  onClick={addAIQuestions} disabled={aiSelected.length===0}>
                  <i className="bi bi-plus-circle"/>Add {aiSelected.length} Selected Question{aiSelected.length!==1?"s":""}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Files Panel ───────────────────────────────────────────────────
function FilesPanel({ module, onConfirm }) {
  const [files,      setFiles]      = useState([]);
  const [uploading,  setUploading]  = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [dragging,   setDragging]   = useState(false);
  const ref = useRef();

  useEffect(()=>{
    let active=true;
    (async()=>{const{data}=await supabase.from("module_files").select("*").eq("module_id",module.id).order("sort_order");if(active)setFiles(data||[]);})();
    return()=>{ active=false; };
  },[module.id]);

  const upload = async (file) => {
    setUploading(true);setUploadName(file.name);
    const{data:{user}}=await supabase.auth.getUser();
    const fileType=normalizeFileType(file.name);
    const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`${module.id}/${Date.now()}_${safe}`;
    const{error}=await supabase.storage.from("module-files").upload(path,file);
    if(error){alert("Upload failed: "+error.message);setUploading(false);return;}
    const{data:{publicUrl}}=supabase.storage.from("module-files").getPublicUrl(path);
    const{data:row}=await supabase.from("module_files").insert({module_id:module.id,file_name:file.name,file_url:publicUrl,file_type:fileType,file_size_kb:Math.round(file.size/1024),sort_order:files.length,uploaded_by:user?.id}).select().single();
    if(row)setFiles(f=>[...f,row]);
    setUploading(false);setUploadName("");
  };

  const onDrop=async(e)=>{e.preventDefault();setDragging(false);for(const f of Array.from(e.dataTransfer.files))await upload(f);};
  const onPick=async(e)=>{for(const f of Array.from(e.target.files))await upload(f);e.target.value="";};
  const del=(file)=>{
    onConfirm?.({ title:"Delete File", message:`Delete "${file.file_name}"? This cannot be undone.`, confirmLabel:"Delete", danger:true,
      onConfirm: async()=>{
        const[,path]=file.file_url.split("/module-files/");
        if(path)await supabase.storage.from("module-files").remove([path]);
        await supabase.from("module_files").delete().eq("id",file.id);
        setFiles(f=>f.filter(x=>x.id!==file.id));
        onConfirm?.(null);
      }
    });
  };

  return(
    <div>
      <div onClick={()=>!uploading&&ref.current?.click()} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}
        style={{border:`2px dashed ${dragging?G.base:G.pale}`,borderRadius:10,padding:"28px 20px",textAlign:"center",cursor:uploading?"default":"pointer",transition:"all .2s",background:dragging?G.wash:"transparent",marginBottom:16}}>
        {uploading?(
          <><i className="bi bi-hourglass-split d-block mb-2" style={{fontSize:32,color:G.base}}/><div style={{fontWeight:700,color:G.dark,fontSize:14}}>Uploading "{uploadName}"…</div><div style={{fontSize:12,color:"#aaa",marginTop:4}}>Please wait</div></>
        ):(
          <><i className="bi bi-cloud-upload d-block mb-2" style={{fontSize:36,color:G.pale}}/><div style={{fontWeight:700,color:G.dark,fontSize:14}}>Drop files here or click to upload</div><div style={{fontSize:12,color:"#aaa",marginTop:6}}>PDF · Video · Images · Audio · PowerPoint · Word · Excel · ZIP</div></>
        )}
        <input ref={ref} type="file" multiple style={{display:"none"}} onChange={onPick} accept=".pdf,.mp4,.mov,.avi,.webm,.mkv,.jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.txt,.zip"/>
      </div>
      {files.length===0?<div style={{textAlign:"center",padding:"20px 0",color:"#aaa",fontSize:13}}>No files yet — upload above to add learning content</div>:(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:12,color:"#999",fontWeight:600,marginBottom:4}}>{files.length} file{files.length!==1?"s":""} uploaded</div>
          {files.map(file=>{
            const ft=FILE_META[file.file_type]||FILE_META.other;
            return(
              <div key={file.id} style={{background:"#fff",borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 4px rgba(0,0,0,.04)",border:"1px solid #DDE8DD"}}>
                <div style={{width:42,height:42,borderRadius:10,background:ft.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <i className={`bi ${ft.icon}`} style={{fontSize:20,color:ft.color}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:G.dark,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{file.file_name}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:2,display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{background:G.wash,padding:"1px 7px",borderRadius:5,fontWeight:700,color:G.base}}>{getExtLabel(file.file_name)}</span>
                    {file.file_size_kb?<span>{formatSize(file.file_size_kb)}</span>:null}
                  </div>
                </div>
                <a href={file.file_url} target="_blank" rel="noreferrer" style={{...s.btnSm(G.wash,G.dark),textDecoration:"none"}}><i className="bi bi-eye"/>View</a>
                <button style={s.iconBtn("#dc2626")} onClick={()=>del(file)} title="Delete"><i className="bi bi-trash"/></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Module Form Modal ─────────────────────────────────────────────
function ModuleModal({ initial, categories, onSave, onClose }) {
  const [form,setForm]=useState({title:initial?.title||"",description:initial?.description||"",category_id:initial?.category_id||"",status:initial?.status||"draft"});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return(
    <div style={s.overlay}>
      <div style={s.modal(520)}>
        <div style={s.mHeader}><span style={s.mTitle}>{initial?"Edit Module":"Create New Module"}</span><button style={s.iconBtn()} onClick={onClose}>×</button></div>
        <div style={s.mBody}>
          <div style={s.fg}><label style={s.label}>Module Title *</label><input style={s.input} value={form.title} onChange={e=>set("title",e.target.value)} placeholder="e.g. Gender Sensitivity Training" autoFocus/></div>
          <div style={s.fg}><label style={s.label}>Description</label><textarea style={s.textarea} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="What will students learn?"/></div>
          <div style={s.row}>
            <div style={{...s.fg,flex:1}}><label style={s.label}>Category</label><select style={s.select} value={form.category_id} onChange={e=>set("category_id",e.target.value)}><option value="">— Select —</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div style={{...s.fg,flex:1}}><label style={s.label}>Status</label><select style={s.select} value={form.status} onChange={e=>set("status",e.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></div>
          </div>
          <div style={{background:G.wash,borderRadius:6,padding:"10px 14px",fontSize:12,color:G.dark}}><i className="bi bi-lightbulb me-1"/>Set to <strong>Published</strong> so students can see this module in the app.</div>
        </div>
        <div style={s.mFooter}>
          <button style={s.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={s.btnPrimary} onClick={()=>{if(!form.title.trim())return alert("Title required.");onSave(form);}}>{initial?"Save Changes":"Create Module"}</button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────
export default function ModulesPage() {
  const [modules,    setModules]    = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [tab,        setTab]        = useState("files");
  const [showModal,  setShowModal]  = useState(false);
  const [editMod,    setEditMod]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [confirm,    setConfirm]    = useState(null); // {title,message,onConfirm,danger?}

  const loadModules = async () => {
    const{data}=await supabase.from("modules").select("*, categories(name), module_files(count), assessments(id,is_published,title)").order("created_at",{ascending:false});
    setModules(data||[]); return data||[];
  };

  useEffect(()=>{
    let active=true;
    (async()=>{
      setLoading(true);
      const[{data:mods},{data:cats}]=await Promise.all([
        supabase.from("modules").select("*, categories(name), module_files(count), assessments(id,is_published,title)").order("created_at",{ascending:false}),
        supabase.from("categories").select("*").order("name"),
      ]);
      if(active){setModules(mods||[]);setCategories(cats||[]);if(mods?.length)setSelected(mods[0]);setLoading(false);}
    })();
    return()=>{ active=false; };
  },[]);

  const saveModule = async (form) => {
    const{data:{user}}=await supabase.auth.getUser();
    if(editMod){
      const{data}=await supabase.from("modules").update(form).eq("id",editMod.id).select("*, categories(name), module_files(count), assessments(id,is_published,title)").single();
      setModules(ms=>ms.map(m=>m.id===editMod.id?data:m));
      if(selected?.id===editMod.id)setSelected(data);
    } else {
      const{data}=await supabase.from("modules").insert({...form,created_by:user?.id}).select("*, categories(name), module_files(count), assessments(id,is_published,title)").single();
      setModules(ms=>[data,...ms]);setSelected(data);
    }
    setShowModal(false);setEditMod(null);
  };

  const togglePublish = (mod, e) => {
    e?.stopPropagation();
    const isPublishing = mod.status !== "published";
    if (isPublishing) {
      setConfirm({ title:"Publish Module", message:`Publish "${mod.title}"? It will become visible to all students in the app.`, confirmLabel:"Publish", danger:false,
        onConfirm: async () => {
          await supabase.from("modules").update({status:"published"}).eq("id",mod.id);
          const updated={...mod,status:"published"};
          setModules(ms=>ms.map(m=>m.id===mod.id?updated:m));
          if(selected?.id===mod.id)setSelected(updated);
          setConfirm(null);
        }
      });
    } else {
      setConfirm({ title:"Unpublish Module", message:`Unpublish "${mod.title}"? Students will no longer see this module.`, confirmLabel:"Unpublish", danger:true,
        onConfirm: async () => {
          await supabase.from("modules").update({status:"draft"}).eq("id",mod.id);
          const updated={...mod,status:"draft"};
          setModules(ms=>ms.map(m=>m.id===mod.id?updated:m));
          if(selected?.id===mod.id)setSelected(updated);
          setConfirm(null);
        }
      });
    }
  };

  const deleteMod = () => {
    if (!selected) return;
    setConfirm({
      title: "Delete Module",
      message: `Delete "${selected?.title}"? This will permanently remove the module, all files, and the linked assessment.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        await supabase.from("modules").delete().eq("id", selected.id);
        const rest = modules.filter(m => m.id !== selected.id);
        setModules(rest); setSelected(rest[0] || null);
        setConfirm(null);
      }
    });
  };

  const handleAssessmentChange = async () => {
    const data=await loadModules();
    if(selected){const updated=data.find(m=>m.id===selected.id);if(updated)setSelected(updated);}
  };

  const filtered  = modules.filter(m=>m.title.toLowerCase().includes(search.toLowerCase()));
  const fileCount = (m) => m?.module_files?.[0]?.count||0;
  const hasAssess = (m) => (m?.assessments?.length||0)>0;
  const assessPub = (m) => m?.assessments?.[0]?.is_published;

  return(
    <div style={s.page}>
      {/* SIDEBAR */}
      <div style={s.sidebar}>
        <div style={s.sidebarHdr}>
          <div style={s.sidebarTitle}><i className="bi bi-book me-2"/>Modules</div>
          <div style={s.sidebarSub}>{modules.length} module{modules.length!==1?"s":""}</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search modules…"
            style={{...s.input,marginTop:10,background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",fontSize:12}}/>
        </div>
        <button style={s.addBtn} onClick={()=>{setEditMod(null);setShowModal(true);}}>
          <i className="bi bi-plus-circle"/>New Module
        </button>
        <div style={s.moduleList}>
          {loading?<div style={{padding:"20px 16px",color:G.pale,fontSize:13}}>Loading…</div>
            :!filtered.length?<div style={{padding:"20px 16px",color:G.pale,fontSize:13}}>{search?"No results":"No modules yet"}</div>
            :filtered.map(mod=>(
              <div key={mod.id} style={s.moduleItem(selected?.id===mod.id)} onClick={()=>{setSelected(mod);setTab("files");}}>
                <div style={s.moduleIcon}><i className="bi bi-book" style={{color:"#fff",fontSize:15}}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={s.modTitle}>{mod.title}</div>
                  <div style={s.modMeta}>
                    {mod.categories?.name||"Uncategorized"} · {fileCount(mod)} file{fileCount(mod)!==1?"s":""}
                    {hasAssess(mod)&&(
                      <span style={{marginLeft:4,background:"rgba(76,175,80,.2)",color:"#86efac",borderRadius:4,padding:"0 5px",fontSize:10,fontWeight:700}}>
                        <i className="bi bi-clipboard-check me-1"/>Quiz{assessPub(mod)?" · Live":""}
                      </span>
                    )}
                  </div>
                </div>
                <div style={s.statusBadge(mod.status)}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:mod.status==="published"?"#16a34a":"#a16207",display:"inline-block"}}/>
                  {mod.status==="published"?"Published":"Draft"}
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* MAIN */}
      <div style={s.main}>
        {!selected?(
          <div style={{...s.emptyState,flex:1}}>
            <div style={{width:72,height:72,borderRadius:16,background:G.wash,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <i className="bi bi-book" style={{fontSize:34,color:G.base}}/>
            </div>
            <span style={{fontWeight:700,color:G.dark,fontSize:16}}>Select a module to get started</span>
            <span style={{fontSize:13,color:"#888"}}>or create one using the button above</span>
          </div>
        ):(
          <>
            <div style={s.topBar}>
              <div style={{flex:1,minWidth:0}}>
                <div style={s.topBarTitle}>{selected.title}</div>
                <div style={{fontSize:12,color:"#aaa"}}>{selected.categories?.name||"Uncategorized"}{selected.description?` · ${selected.description.slice(0,60)}…`:""}</div>
              </div>
              <span style={s.tag(selected.status==="published"?"green":"yellow")}>{selected.status==="published"?"Published":"Draft"}</span>
              <button style={s.btnSm(G.wash,G.dark)} onClick={e=>togglePublish(selected,e)}>{selected.status==="published"?"Unpublish":"Publish"}</button>
              <button style={s.btnSm(G.wash,G.dark)} onClick={()=>{setEditMod(selected);setShowModal(true);}}><i className="bi bi-pencil"/>Edit</button>
              <button style={s.btnSm("#fee2e2","#dc2626")} onClick={deleteMod}><i className="bi bi-trash"/></button>
            </div>

            <div style={s.tabBar}>
              <div style={s.tab(tab==="files")} onClick={()=>setTab("files")}>
                <i className="bi bi-folder2-open"/>Files{fileCount(selected)>0&&<span style={s.badge}>{fileCount(selected)}</span>}
              </div>
              <div style={s.tab(tab==="assessment")} onClick={()=>setTab("assessment")}>
                <i className="bi bi-clipboard-check"/>Assessment
                {hasAssess(selected)&&<span style={{...s.badge,background:"#dcfce7",color:"#16a34a"}}><i className="bi bi-check"/></span>}
              </div>
            </div>

            <div style={s.content}>
              {tab==="files"      &&<FilesPanel      key={selected.id+"_f"} module={selected} onConfirm={setConfirm}/>}
              {tab==="assessment" &&<AssessmentPanel key={selected.id+"_a"} module={selected} onAssessmentChange={handleAssessmentChange} onConfirm={setConfirm}/>}
            </div>
          </>
        )}
      </div>

      {confirm&&<ConfirmModal title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
      {showModal&&<ModuleModal initial={editMod} categories={categories} onSave={saveModule} onClose={()=>{setShowModal(false);setEditMod(null);}}/>}
    </div>
  );
}