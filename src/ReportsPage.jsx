import { useState } from "react";
import { supabase } from "./lib/supabase.js";

const G={dark:"#1A2E1A",mid:"#2D6A2D",base:"#3A7A3A",wash:"#E8F5E9",pale:"#C8E6C9"};

const REPORT_TYPES=[
  {id:"students",     label:"Student Report",       icon:"bi-mortarboard",       desc:"Registered students with progress"},
  {id:"modules",      label:"Module Report",         icon:"bi-book",              desc:"Completion rates and engagement"},
  {id:"assessments",  label:"Assessment Report",     icon:"bi-clipboard-check",   desc:"Quiz attempts and scores"},
  {id:"seminars",     label:"Seminar Report",        icon:"bi-people",            desc:"Registrations and attendance"},
  {id:"sdd",          label:"Seminar SDD Report",    icon:"bi-gender-ambiguous",  desc:"Sex-disaggregated seminar data (GAD)"},
  {id:"certificates", label:"Certificate Report",    icon:"bi-patch-check",       desc:"Issued certificates by student"},
  {id:"badges",       label:"Badge Report",          icon:"bi-award",             desc:"Badges earned per student"},
  {id:"activity",     label:"Activity Log Report",   icon:"bi-activity",          desc:"System actions and events"},
  {id:"announcements",label:"Announcements Report",  icon:"bi-megaphone",         desc:"Published announcements"},
];

function fmtDate(iso){if(!iso)return"—";const s=iso.endsWith("Z")||iso.includes("+")?iso:iso+"Z";return new Date(s).toLocaleString("en-PH",{timeZone:"Asia/Manila",month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true});}
function fmtShort(iso){if(!iso)return"—";const s=iso.endsWith("Z")||iso.includes("+")?iso:iso+"Z";return new Date(s).toLocaleDateString("en-PH",{timeZone:"Asia/Manila",month:"short",day:"numeric",year:"numeric"});}

async function fetchStudentsReport(from,to){let q=supabase.from("profiles").select("full_name,student_id,email,department,year_level,is_active,created_at");if(from)q=q.gte("created_at",new Date(from).toISOString());if(to)q=q.lte("created_at",new Date(to+"T23:59:59").toISOString());const{data}=await q.order("created_at",{ascending:false});return{cols:[{key:"full_name",label:"Full Name"},{key:"student_id",label:"Student ID"},{key:"email",label:"Email"},{key:"department",label:"Department"},{key:"year_level",label:"Year"},{key:"status",label:"Status"},{key:"created_at",label:"Registered"}],rows:(data??[]).map(r=>({...r,status:r.is_active?"Active":"Deactivated",created_at:fmtShort(r.created_at)}))};};
async function fetchModulesReport(){const{data}=await supabase.from("v_module_completion_stats").select("*");return{cols:[{key:"module_title",label:"Module"},{key:"category_name",label:"Category"},{key:"module_status",label:"Status"},{key:"total_students",label:"Students"},{key:"completed_count",label:"Completed"},{key:"in_progress_count",label:"In Progress"},{key:"not_started_count",label:"Not Started"},{key:"completion_rate_percent",label:"Rate %"}],rows:data??[]};}
async function fetchAssessmentsReport(from,to){let q=supabase.from("assessment_attempts").select("*,profiles(full_name,student_id),assessments(title)");if(from)q=q.gte("submitted_at",new Date(from).toISOString());if(to)q=q.lte("submitted_at",new Date(to+"T23:59:59").toISOString());const{data}=await q.order("submitted_at",{ascending:false}).limit(500);return{cols:[{key:"student",label:"Student"},{key:"student_id",label:"Student ID"},{key:"assessment",label:"Assessment"},{key:"score",label:"Score %"},{key:"passed",label:"Result"},{key:"submitted",label:"Submitted"}],rows:(data??[]).map(r=>({student:r.profiles?.full_name??"—",student_id:r.profiles?.student_id??"—",assessment:r.assessments?.title??"—",score:r.score??0,passed:r.passed?"PASSED":"FAILED",submitted:fmtDate(r.submitted_at)}))};};
async function fetchSeminarsReport(){const{data}=await supabase.from("v_seminar_attendance_summary").select("*");return{cols:[{key:"seminar_title",label:"Seminar"},{key:"seminar_type",label:"Type"},{key:"seminar_status",label:"Status"},{key:"scheduled_start",label:"Date"},{key:"registered_count",label:"Registered"},{key:"attended_count",label:"Attended"},{key:"attendance_rate_percent",label:"Rate %"}],rows:(data??[]).map(r=>({...r,scheduled_start:fmtShort(r.scheduled_start)}))};};
async function fetchCertificatesReport(from,to){let q=supabase.from("certificates").select("*,profiles(full_name,student_id)");if(from)q=q.gte("issued_at",new Date(from).toISOString());if(to)q=q.lte("issued_at",new Date(to+"T23:59:59").toISOString());const{data}=await q.order("issued_at",{ascending:false}).limit(500);return{cols:[{key:"student",label:"Student"},{key:"student_id",label:"ID"},{key:"code",label:"Code"},{key:"type",label:"Type"},{key:"status",label:"Status"},{key:"issued",label:"Issued"}],rows:(data??[]).map(r=>({student:r.profiles?.full_name??"—",student_id:r.profiles?.student_id??"—",code:r.certificate_code??"—",type:r.reference_type??"manual",status:r.is_revoked?"Revoked":"Valid",issued:fmtShort(r.issued_at)}))};};
async function fetchBadgesReport(from,to){let q=supabase.from("student_badges").select("*,profiles(full_name,student_id),badges(name)");if(from)q=q.gte("awarded_at",new Date(from).toISOString());if(to)q=q.lte("awarded_at",new Date(to+"T23:59:59").toISOString());const{data}=await q.order("awarded_at",{ascending:false}).limit(500);return{cols:[{key:"student",label:"Student"},{key:"student_id",label:"ID"},{key:"badge",label:"Badge"},{key:"awarded",label:"Awarded"}],rows:(data??[]).map(r=>({student:r.profiles?.full_name??"—",student_id:r.profiles?.student_id??"—",badge:r.badges?.name??"—",awarded:fmtShort(r.awarded_at)}))};};
async function fetchActivityReport(from,to){let q=supabase.from("activity_logs").select("*,profiles(full_name)");if(from)q=q.gte("created_at",new Date(from).toISOString());if(to)q=q.lte("created_at",new Date(to+"T23:59:59").toISOString());const{data}=await q.order("created_at",{ascending:false}).limit(500);return{cols:[{key:"user",label:"User"},{key:"action",label:"Action"},{key:"ref_type",label:"Reference"},{key:"created_at",label:"Timestamp"}],rows:(data??[]).map(r=>({user:r.profiles?.full_name??"—",action:(r.action_type??"—").replace(/_/g," "),ref_type:r.reference_type??"—",created_at:fmtDate(r.created_at)}))};};
async function fetchAnnouncementsReport(from,to){let q=supabase.from("announcements").select("title,target_audience,is_pinned,is_published,published_at,expires_at,created_at");if(from)q=q.gte("created_at",new Date(from).toISOString());if(to)q=q.lte("created_at",new Date(to+"T23:59:59").toISOString());const{data}=await q.order("created_at",{ascending:false});return{cols:[{key:"title",label:"Title"},{key:"audience",label:"Audience"},{key:"pinned",label:"Pinned"},{key:"published",label:"Published"},{key:"pub_date",label:"Publish Date"},{key:"expires",label:"Expires"}],rows:(data??[]).map(r=>({title:r.title??"—",audience:r.target_audience??"all",pinned:r.is_pinned?"Yes":"No",published:r.is_published?"Yes":"No",pub_date:fmtShort(r.published_at),expires:r.expires_at?fmtShort(r.expires_at):"Never"}))};};

// ─────────────────────────────────────────────────────────────────────────────
//  SEMINAR SDD (Sex-Disaggregated Data) REPORT
//  Sex comes from the user's profile (chosen at app sign-up or set by an admin),
//  falling back to the masterlist (entered by the admin for outsiders/staff).
// ─────────────────────────────────────────────────────────────────────────────
const SEXES = ["female","male","unspecified"];
const SEX_LABEL = { female:"Female", male:"Male", unspecified:"Not specified" };
const EVAL_KEYS = ["q_content","q_speaker","q_organization","q_relevance","q_materials","q_overall"];
const EVAL_LABELS = {
  q_content:"Content Quality", q_speaker:"Speaker Effectiveness", q_organization:"Event Organization",
  q_relevance:"Relevance to GAD", q_materials:"Materials & Resources", q_overall:"Overall Satisfaction",
};
const TYPE_LABEL = {
  student:"Students", faculty:"Faculty / Teachers", teacher:"Faculty / Teachers",
  staff:"Non-Academic Staff", guest:"Guests (Non-CvSU)", speaker:"Speakers",
};

const emptyCounts = () => ({ female:0, male:0, unspecified:0 });
const total = (c) => c.female + c.male + c.unspecified;
const pct = (part, whole) => whole ? `${Math.round((part / whole) * 100)}%` : "—";
const avg = (arr) => arr.length ? (arr.reduce((a,b)=>a+b,0) / arr.length) : null;

// Supabase .in() works best with modest lists
async function selectIn(table, columns, column, values, chunkSize = 200) {
  const out = [];
  for (let i = 0; i < values.length; i += chunkSize) {
    const { data, error } = await supabase.from(table).select(columns).in(column, values.slice(i, i + chunkSize));
    if (error) throw error;
    out.push(...(data ?? []));
  }
  return out;
}

async function fetchSddReport(from, to) {
  // 1. Seminars held in the date range
  let sq = supabase.from("seminars")
    .select("id,title,scheduled_start,seminar_type,status")
    .neq("status", "cancelled");
  if (from) sq = sq.gte("scheduled_start", new Date(from).toISOString());
  if (to)   sq = sq.lte("scheduled_start", new Date(to + "T23:59:59").toISOString());
  const { data: seminars, error: semErr } = await sq.order("scheduled_start", { ascending: true });
  if (semErr) throw semErr;

  const semIds = (seminars ?? []).map(s => s.id);
  const empty = { cols: [], rows: [], sdd: null };
  if (semIds.length === 0) return { ...empty, sdd: { empty: true } };

  // 2. Registrations, attendance, evaluations for those seminars
  const [regs, logs, evals] = await Promise.all([
    selectIn("seminar_registrations", "seminar_id,user_id,status", "seminar_id", semIds),
    selectIn("seminar_attendance_logs", "seminar_id,user_id,is_eligible", "seminar_id", semIds),
    selectIn("seminar_evaluations", `seminar_id,user_id,submitted_at,${EVAL_KEYS.join(",")}`, "seminar_id", semIds),
  ]);
  const activeRegs = regs.filter(r => r.status !== "cancelled");

  // 3. Who these people are: sex + participant type
  const userIds = [...new Set([...activeRegs, ...logs, ...evals].map(r => r.user_id).filter(Boolean))];
  const [profiles, roleRows] = await Promise.all([
    userIds.length ? selectIn("profiles", "id,email,sex,role", "id", userIds) : [],
    userIds.length ? selectIn("user_roles", "user_id,roles(name)", "user_id", userIds) : [],
  ]);
  const emails = [...new Set(profiles.map(p => (p.email || "").toLowerCase()).filter(Boolean))];
  let masterRows = [];
  try { masterRows = emails.length ? await selectIn("masterlist", "cvsu_email,sex", "cvsu_email", emails) : []; }
  catch { masterRows = []; } // masterlist sex column optional

  const masterSex = {};
  masterRows.forEach(m => { masterSex[(m.cvsu_email || "").toLowerCase()] = m.sex; });
  const roleOf = {};
  roleRows.forEach(r => { if (r.roles?.name) roleOf[r.user_id] = r.roles.name; });

  const sexOf = {}, typeOf = {};
  profiles.forEach(p => {
    const s = (p.sex || masterSex[(p.email || "").toLowerCase()] || "").toLowerCase();
    sexOf[p.id]  = s === "female" || s === "male" ? s : "unspecified";
    typeOf[p.id] = roleOf[p.id] || p.role || "student";
  });
  const sx = (uid) => sexOf[uid] || "unspecified";

  // 4. Count per seminar and overall
  const overall = { registered: emptyCounts(), attended: emptyCounts(), eligible: emptyCounts(), evaluated: emptyCounts() };
  const byType = {}; // type → { registered, attended }
  const ratingsBySex = { female: [], male: [], unspecified: [] };
  const criteriaBySex = {}; EVAL_KEYS.forEach(k => { criteriaBySex[k] = { female: [], male: [], unspecified: [] }; });

  const perSem = {};
  (seminars ?? []).forEach(s => {
    perSem[s.id] = { registered: emptyCounts(), attended: emptyCounts(), eligible: emptyCounts(), evaluated: emptyCounts() };
  });

  const bump = (bucket, uid) => { bucket[sx(uid)] += 1; };
  const typeBucket = (uid) => {
    const label = TYPE_LABEL[typeOf[uid]] || "Others";
    if (!byType[label]) byType[label] = { registered: emptyCounts(), attended: emptyCounts() };
    return byType[label];
  };

  activeRegs.forEach(r => {
    bump(perSem[r.seminar_id].registered, r.user_id);
    bump(overall.registered, r.user_id);
    bump(typeBucket(r.user_id).registered, r.user_id);
  });
  logs.forEach(l => {
    bump(perSem[l.seminar_id].attended, l.user_id);
    bump(overall.attended, l.user_id);
    bump(typeBucket(l.user_id).attended, l.user_id);
    if (l.is_eligible) { bump(perSem[l.seminar_id].eligible, l.user_id); bump(overall.eligible, l.user_id); }
  });
  evals.filter(e => e.submitted_at).forEach(e => {
    bump(perSem[e.seminar_id].evaluated, e.user_id);
    bump(overall.evaluated, e.user_id);
    const vals = EVAL_KEYS.map(k => e[k]).filter(v => typeof v === "number");
    const a = avg(vals);
    if (a != null) ratingsBySex[sx(e.user_id)].push(a);
    EVAL_KEYS.forEach(k => { if (typeof e[k] === "number") criteriaBySex[k][sx(e.user_id)].push(e[k]); });
  });

  // 5. Main table (one row per seminar) — this is also what search/export use
  const cols = [
    { key:"seminar",   label:"Seminar" },
    { key:"date",      label:"Date" },
    { key:"reg_f",     label:"Registered F" },
    { key:"reg_m",     label:"Registered M" },
    { key:"reg_t",     label:"Registered Total" },
    { key:"att_f",     label:"Attended F" },
    { key:"att_m",     label:"Attended M" },
    { key:"att_t",     label:"Attended Total" },
    { key:"elig_f",    label:"Certified F" },
    { key:"elig_m",    label:"Certified M" },
    { key:"eval_f",    label:"Evaluated F" },
    { key:"eval_m",    label:"Evaluated M" },
    { key:"unspec",    label:"Sex Not Specified" },
  ];
  const rowFor = (title, date, c) => ({
    seminar: title, date,
    reg_f: c.registered.female, reg_m: c.registered.male, reg_t: total(c.registered),
    att_f: c.attended.female,   att_m: c.attended.male,   att_t: total(c.attended),
    elig_f: c.eligible.female,  elig_m: c.eligible.male,
    eval_f: c.evaluated.female, eval_m: c.evaluated.male,
    unspec: c.registered.unspecified,
  });
  const rows = (seminars ?? []).map(s => rowFor(s.title ?? "Untitled", fmtShort(s.scheduled_start), perSem[s.id]));
  const totalRow = rowFor("TOTAL", `${(seminars ?? []).length} seminar(s)`, overall);

  // 6. Summary sections (shown on screen and included in exports)
  const summaryRows = [
    ["Registered", overall.registered],
    ["Attended", overall.attended],
    ["Certificate-eligible", overall.eligible],
    ["Submitted evaluation", overall.evaluated],
  ].map(([label, c]) => ({
    metric: label, female: c.female, male: c.male, unspecified: c.unspecified, total: total(c),
    pct_f: pct(c.female, total(c)), pct_m: pct(c.male, total(c)),
  }));

  const typeRows = Object.entries(byType)
    .sort((a, b) => total(b[1].registered) - total(a[1].registered))
    .map(([label, c]) => ({
      type: label,
      reg_f: c.registered.female, reg_m: c.registered.male, reg_u: c.registered.unspecified, reg_t: total(c.registered),
      att_f: c.attended.female,   att_m: c.attended.male,   att_u: c.attended.unspecified,   att_t: total(c.attended),
    }));

  const fmtAvg = (arr) => { const a = avg(arr); return a == null ? "—" : a.toFixed(2); };
  const ratingRows = [
    { criterion: "Average of all criteria", female: fmtAvg(ratingsBySex.female), male: fmtAvg(ratingsBySex.male), unspecified: fmtAvg(ratingsBySex.unspecified),
      n: `${ratingsBySex.female.length} F · ${ratingsBySex.male.length} M` },
    ...EVAL_KEYS.map(k => ({
      criterion: EVAL_LABELS[k],
      female: fmtAvg(criteriaBySex[k].female), male: fmtAvg(criteriaBySex[k].male), unspecified: fmtAvg(criteriaBySex[k].unspecified),
      n: `${criteriaBySex[k].female.length} F · ${criteriaBySex[k].male.length} M`,
    })),
  ];

  const sections = [
    { title: "Summary by Sex", cols: [
        { key:"metric", label:"Metric" }, { key:"female", label:"Female" }, { key:"male", label:"Male" },
        { key:"unspecified", label:"Not Specified" }, { key:"total", label:"Total" },
        { key:"pct_f", label:"% Female" }, { key:"pct_m", label:"% Male" },
      ], rows: summaryRows },
    { title: "By Participant Type and Sex", cols: [
        { key:"type", label:"Participant Type" },
        { key:"reg_f", label:"Registered F" }, { key:"reg_m", label:"Registered M" }, { key:"reg_u", label:"Registered N/S" }, { key:"reg_t", label:"Registered Total" },
        { key:"att_f", label:"Attended F" }, { key:"att_m", label:"Attended M" }, { key:"att_u", label:"Attended N/S" }, { key:"att_t", label:"Attended Total" },
      ], rows: typeRows },
    { title: "Average Evaluation Ratings by Sex (1–5)", cols: [
        { key:"criterion", label:"Criterion" }, { key:"female", label:"Female" }, { key:"male", label:"Male" },
        { key:"unspecified", label:"Not Specified" }, { key:"n", label:"Responses" },
      ], rows: ratingRows },
  ];

  return {
    cols, rows, totalRow,
    sdd: {
      empty: false,
      seminarCount: (seminars ?? []).length,
      overall, sections,
      unspecifiedPeople: Object.values(sexOf).filter(v => v === "unspecified").length,
    },
  };
}

const FETCHERS={students:fetchStudentsReport,modules:fetchModulesReport,assessments:fetchAssessmentsReport,seminars:fetchSeminarsReport,sdd:fetchSddReport,certificates:fetchCertificatesReport,badges:fetchBadgesReport,activity:fetchActivityReport,announcements:fetchAnnouncementsReport};

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORTS — each export takes a list of sections: [{ title, cols, rows }]
// ─────────────────────────────────────────────────────────────────────────────
async function exportToExcel(sections, filename){
  const XLSX=await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
  const wb=XLSX.utils.book_new();
  const used=new Set();
  sections.forEach((sec,i)=>{
    const ws=XLSX.utils.aoa_to_sheet([sec.cols.map(c=>c.label),...sec.rows.map(r=>sec.cols.map(c=>r[c.key]??"—"))]);
    ws["!cols"]=sec.cols.map(c=>({wch:Math.max(c.label.length+4,16)}));
    let name=(sec.sheet||sec.title||`Sheet ${i+1}`).replace(/[\\/?*[\]:]/g,"").slice(0,31)||`Sheet ${i+1}`;
    while(used.has(name)) name=(name.slice(0,28)+"_"+i);
    used.add(name);
    XLSX.utils.book_append_sheet(wb,ws,name);
  });
  XLSX.writeFile(wb,`${filename}.xlsx`);
}

async function exportToPdf(title,subtitle,sections,filename){
  await new Promise((resolve,reject)=>{if(window.jspdf){resolve();return;}const s1=document.createElement("script");s1.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";s1.onload=()=>{const s2=document.createElement("script");s2.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";s2.onload=resolve;s2.onerror=reject;document.head.appendChild(s2);};s1.onerror=reject;document.head.appendChild(s1);});
  const{jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
  doc.setFillColor(26,46,26);doc.rect(0,0,297,20,"F");doc.setTextColor(255,255,255);doc.setFontSize(13);doc.setFont("helvetica","bold");doc.text("BLOOM GAD — GADRC CvSU",14,12);doc.setFontSize(9);doc.setFont("helvetica","normal");doc.text(title,14,18);
  doc.setTextColor(80,80,80);doc.setFontSize(8);doc.text(subtitle,14,26);doc.text(`Generated: ${new Date().toLocaleString("en-PH",{timeZone:"Asia/Manila"})}`,14,31);
  let y=36;
  sections.forEach(sec=>{
    if(sections.length>1&&sec.title){
      if(y>180){doc.addPage();y=16;}
      doc.setFontSize(10);doc.setFont("helvetica","bold");doc.setTextColor(26,46,26);doc.text(sec.title,14,y+4);y+=7;doc.setFont("helvetica","normal");
    }
    doc.autoTable({startY:y,head:[sec.cols.map(c=>c.label)],body:sec.rows.map(r=>sec.cols.map(c=>String(r[c.key]??"—"))),headStyles:{fillColor:[45,106,45],textColor:255,fontStyle:"bold",fontSize:8},bodyStyles:{fontSize:7.5,textColor:[40,40,40]},alternateRowStyles:{fillColor:[232,245,233]},styles:{cellPadding:2.5,overflow:"linebreak"},margin:{left:14,right:14},
      didParseCell:(d)=>{ if(d.section==="body"&&String(d.row.raw?.[0]??"")==="TOTAL"){ d.cell.styles.fontStyle="bold"; d.cell.styles.fillColor=[200,230,201]; } }});
    y=doc.lastAutoTable.finalY+10;
  });
  const pc=doc.internal.getNumberOfPages();for(let i=1;i<=pc;i++){doc.setPage(i);doc.setFontSize(7);doc.setTextColor(150);doc.text(`Page ${i} of ${pc}`,14,doc.internal.pageSize.height-7);doc.text("BLOOM GAD — GADRC CvSU",297-14,doc.internal.pageSize.height-7,{align:"right"});}
  doc.save(`${filename}.pdf`);
}

function escapeHtml(v){return String(v??"—").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
async function exportToDocx(title,subtitle,sections,filename){
  const tables=sections.map(sec=>{
    const th=`<tr>${sec.cols.map(c=>`<th style="background:#1A2E1A;color:#fff;padding:7px 10px;font-size:11px;">${escapeHtml(c.label)}</th>`).join("")}</tr>`;
    const tb=sec.rows.map((r,i)=>`<tr style="background:${String(r[sec.cols[0].key])==="TOTAL"?"#C8E6C9":i%2===0?"#F5F7F5":"#fff"}">${sec.cols.map(c=>`<td style="padding:6px 10px;font-size:10px;border-bottom:1px solid #DDE8DD;">${escapeHtml(r[c.key])}</td>`).join("")}</tr>`).join("");
    return `${sections.length>1&&sec.title?`<h2>${escapeHtml(sec.title)}</h2>`:""}<table>${th}${tb}</table>`;
  }).join("<br/>");
  const html=`<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><title>${escapeHtml(title)}</title><style>body{font-family:Calibri,Arial,sans-serif;color:#222;margin:28px;}h1{color:#1A2E1A;font-size:18px;}h2{color:#2D6A2D;font-size:14px;margin-top:18px;}p{color:#555;font-size:11px;}table{width:100%;border-collapse:collapse;}</style></head><body><h1>BLOOM GAD — ${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}<br/>Generated: ${new Date().toLocaleString("en-PH",{timeZone:"Asia/Manila"})}</p>${tables}</body></html>`;
  const blob=new Blob(["\ufeff"+html],{type:"application/msword"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${filename}.doc`;a.click();URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
//  SDD summary panel (on screen)
// ─────────────────────────────────────────────────────────────────────────────
function SexBar({ c }) {
  const t = total(c);
  if (!t) return <div className="text-muted" style={{ fontSize: 11 }}>No data</div>;
  const w = (n) => `${(n / t) * 100}%`;
  return (
    <div>
      <div className="d-flex" style={{ height: 10, borderRadius: 6, overflow: "hidden", background: "#eee" }}>
        <div style={{ width: w(c.female), background: "#C2185B" }} title={`Female: ${c.female}`} />
        <div style={{ width: w(c.male), background: "#1565C0" }} title={`Male: ${c.male}`} />
        <div style={{ width: w(c.unspecified), background: "#BDBDBD" }} title={`Not specified: ${c.unspecified}`} />
      </div>
      <div className="d-flex gap-3 mt-1" style={{ fontSize: 11, color: "#555" }}>
        <span><span style={{ color: "#C2185B", fontWeight: 700 }}>●</span> F {c.female} ({pct(c.female, t)})</span>
        <span><span style={{ color: "#1565C0", fontWeight: 700 }}>●</span> M {c.male} ({pct(c.male, t)})</span>
        {c.unspecified > 0 && <span><span style={{ color: "#9E9E9E", fontWeight: 700 }}>●</span> N/S {c.unspecified}</span>}
      </div>
    </div>
  );
}

function SddSummary({ sdd }) {
  if (!sdd || sdd.empty) return null;
  const cards = [
    { label: "Registered", c: sdd.overall.registered, icon: "bi-person-check" },
    { label: "Attended", c: sdd.overall.attended, icon: "bi-camera-video" },
    { label: "Certificate-eligible", c: sdd.overall.eligible, icon: "bi-patch-check" },
    { label: "Evaluated", c: sdd.overall.evaluated, icon: "bi-star" },
  ];
  return (
    <div className="mb-4">
      <div className="alert d-flex align-items-start gap-2 py-2" style={{ background: G.wash, border: `1px solid ${G.pale}`, fontSize: 12, color: G.dark, borderRadius: 8 }}>
        <i className="bi bi-info-circle-fill" style={{ color: G.mid, marginTop: 2 }} />
        <div>
          <strong>Sex-Disaggregated Data (SDD)</strong> for {sdd.seminarCount} seminar(s) in this period.
          Sex is taken from each participant's profile (chosen at app sign-up or set by an admin), or from the masterlist for admin-added participants.
          {sdd.unspecifiedPeople > 0 && <> <strong>{sdd.unspecifiedPeople}</strong> participant(s) have no sex recorded — set it in <strong>Users → Edit Profile</strong>.</>}
        </div>
      </div>

      <div className="row g-3 mb-3">
        {cards.map(card => (
          <div key={card.label} className="col-lg-3 col-md-6">
            <div className="card h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fw-semibold" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: .5 }}>{card.label}</span>
                  <i className={`bi ${card.icon}`} style={{ color: G.mid }} />
                </div>
                <div className="fw-bold mb-2" style={{ fontSize: 24, color: G.dark }}>{total(card.c)}</div>
                <SexBar c={card.c} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {sdd.sections.map(sec => (
        <div key={sec.title} className="card mb-3">
          <div className="card-body">
            <h6 className="fw-bold mb-3" style={{ fontSize: 13, color: G.dark }}>{sec.title}</h6>
            {sec.rows.length === 0
              ? <div className="text-muted" style={{ fontSize: 12 }}>No data</div>
              : <div className="table-responsive">
                  <table className="table table-bloom align-middle mb-0">
                    <thead><tr>{sec.cols.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
                    <tbody>{sec.rows.map((r, i) => <tr key={i}>{sec.cols.map(c => <td key={c.key} style={{ fontSize: 13 }}>{r[c.key] ?? "—"}</td>)}</tr>)}</tbody>
                  </table>
                </div>}
          </div>
        </div>
      ))}

      <h6 className="fw-bold mt-4 mb-2" style={{ fontSize: 13, color: G.dark }}>Per Seminar</h6>
    </div>
  );
}

export default function ReportsPage(){
  const today=new Date().toISOString().split("T")[0];
  const monthAgo=new Date(Date.now()-30*86400000).toISOString().split("T")[0];
  const [selType,setSelType]=useState(null),[fromDate,setFromDate]=useState(monthAgo),[toDate,setToDate]=useState(today);
  const [loading,setLoading]=useState(false),[exporting,setExporting]=useState(false);
  const [reportData,setReportData]=useState(null),[search,setSearch]=useState("");

  const handleGenerate=async()=>{if(!selType)return;setLoading(true);setSearch("");try{const data=await FETCHERS[selType](fromDate,toDate);setReportData(data);}catch(e){alert("Error: "+e.message);}finally{setLoading(false);};};
  const meta=REPORT_TYPES.find(r=>r.id===selType);
  const subtitle=`${meta?.label??""} · ${fromDate} to ${toDate}`;
  const filename=`BLOOM_${selType}_${fromDate}_${toDate}`;
  const filtered=(reportData?.rows??[]).filter(row=>!search||Object.values(row).some(v=>String(v??"").toLowerCase().includes(search.toLowerCase())));
  const isSdd=selType==="sdd";

  // Rows shown in the main table (SDD adds a TOTAL row at the bottom)
  const tableRows=isSdd&&reportData?.totalRow&&filtered.length>0&&!search?[...filtered,reportData.totalRow]:filtered;

  // What gets exported: SDD exports every section + the per-seminar table
  const exportSections=()=>{
    const main={title:isSdd?"Per Seminar":(meta?.label??"Report"),sheet:isSdd?"Per Seminar":"Report",cols:reportData.cols,rows:tableRows};
    if(isSdd&&reportData?.sdd?.sections) return [...reportData.sdd.sections,main];
    return [main];
  };

  const statusBadge=(key,val)=>{if(!["status","passed","published"].includes(key))return val??"—";const pos=["PASSED","Active","Valid","Yes"];const neg=["FAILED","Deactivated","Revoked"];const cls=pos.includes(val)?"bg-success-subtle text-success":neg.includes(val)?"bg-danger-subtle text-danger":"bg-light text-secondary";return<span className={`badge ${cls}`}>{val??"—"}</span>;};

  const quickDates=[{label:"7d",days:7},{label:"30d",days:30},{label:"90d",days:90},{label:"1yr",days:365}];

  return(
    <div className="p-4" style={{maxWidth:1300,margin:"0 auto"}}>
      <div className="mb-4">
        <h4 className="fw-bold mb-1" style={{color:"#1A2E1A"}}>Reports</h4>
        <p className="text-muted mb-0" style={{fontSize:13}}>Generate, filter, and export detailed reports</p>
      </div>

      {/* Step 1 */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-3">
            <span className="badge bg-primary rounded-circle" style={{width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>1</span>
            <h6 className="fw-bold mb-0" style={{fontSize:13}}>Select Report Type</h6>
          </div>
          <div className="row g-2">
            {REPORT_TYPES.map(r=>(
              <div key={r.id} className="col-lg-3 col-md-4 col-6">
                <div className={`card hover-lift cursor-pointer ${selType===r.id?"border-primary bg-primary-subtle":""}`}
                  style={{cursor:"pointer",transition:"all .15s"}}
                  onClick={()=>{setSelType(r.id);setReportData(null);}}>
                  <div className="card-body p-3">
                    <i className={`bi ${r.icon} d-block mb-2 ${selType===r.id?"text-primary":"text-muted"}`} style={{fontSize:20}}/>
                    <div className="fw-semibold" style={{fontSize:13,color:"#1A2E1A"}}>{r.label}</div>
                    <small className="text-muted">{r.desc}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-3">
            <span className="badge bg-primary rounded-circle" style={{width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>2</span>
            <h6 className="fw-bold mb-0" style={{fontSize:13}}>Set Date Range</h6>
            {isSdd&&<small className="text-muted ms-2">(seminars scheduled within this period)</small>}
          </div>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div className="d-flex align-items-center gap-2">
              <label className="fw-semibold text-muted" style={{fontSize:12,whiteSpace:"nowrap"}}>From</label>
              <input type="date" className="form-control form-control-sm" style={{width:150}} value={fromDate} onChange={e=>setFromDate(e.target.value)}/>
            </div>
            <div className="d-flex align-items-center gap-2">
              <label className="fw-semibold text-muted" style={{fontSize:12}}>To</label>
              <input type="date" className="form-control form-control-sm" style={{width:150}} value={toDate} onChange={e=>setToDate(e.target.value)}/>
            </div>
            <div className="btn-group btn-group-sm">
              {quickDates.map(q=><button key={q.label} className="btn btn-outline-secondary" style={{fontSize:11}} onClick={()=>{setFromDate(new Date(Date.now()-q.days*86400000).toISOString().split("T")[0]);setToDate(today);}}>{q.label}</button>)}
            </div>
            <button className="btn btn-primary btn-sm d-flex align-items-center gap-2 ms-auto"
              onClick={handleGenerate} disabled={!selType||loading}>
              {loading?<><span className="spinner-border spinner-border-sm"/>Generating…</>:<><i className="bi bi-play-fill"/>Generate Report</>}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {reportData&&(
        <div className="card">
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <i className={`bi ${meta?.icon} text-primary`} style={{fontSize:18}}/>
                  <h6 className="fw-bold mb-0" style={{fontSize:15}}>{meta?.label}</h6>
                </div>
                <small className="text-muted">{filtered.length} {isSdd?"seminar":"record"}{filtered.length!==1?"s":""} · {fromDate} to {toDate}</small>
              </div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <div className="input-group input-group-sm" style={{width:220}}>
                  <span className="input-group-text bg-white"><i className="bi bi-search text-muted"/></span>
                  <input type="text" className="form-control" placeholder="Search results…" value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <div className="dropdown">
                  <button className="btn btn-outline-secondary btn-sm dropdown-toggle d-flex align-items-center gap-1" disabled={exporting||(isSdd&&reportData?.sdd?.empty)} data-bs-toggle="dropdown">
                    <i className="bi bi-download"/>{exporting?"Exporting…":"Export"}
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li><button className="dropdown-item d-flex align-items-center gap-2" onClick={async()=>{setExporting(true);try{await exportToExcel(exportSections(),filename);}catch(e){alert(e.message);}finally{setExporting(false);};}}><i className="bi bi-file-earmark-spreadsheet text-success"/>Excel (.xlsx)</button></li>
                    <li><button className="dropdown-item d-flex align-items-center gap-2" onClick={async()=>{setExporting(true);try{await exportToPdf(meta?.label??"Report",subtitle,exportSections(),filename);}catch(e){alert(e.message);}finally{setExporting(false);};}}><i className="bi bi-file-earmark-pdf text-danger"/>PDF (.pdf)</button></li>
                    <li><button className="dropdown-item d-flex align-items-center gap-2" onClick={async()=>{setExporting(true);try{await exportToDocx(meta?.label??"Report",subtitle,exportSections(),filename);}catch(e){alert(e.message);}finally{setExporting(false);};}}><i className="bi bi-file-earmark-word text-primary"/>Word (.doc)</button></li>
                  </ul>
                </div>
              </div>
            </div>

            {isSdd&&<SddSummary sdd={reportData.sdd}/>}

            {tableRows.length===0
              ?<div className="text-center py-5 text-muted"><i className="bi bi-inbox d-block mb-2" style={{fontSize:36}}/><div className="fw-semibold">{isSdd?"No seminars in this period":"No records found"}</div></div>
              :<div className="table-responsive"><table className="table table-hover table-bloom align-middle mb-0">
                <thead><tr>{reportData.cols.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead>
                <tbody>{tableRows.map((row,i)=>{
                  const isTotal=isSdd&&row.seminar==="TOTAL";
                  return <tr key={i} style={isTotal?{background:G.wash,fontWeight:700}:undefined}>{reportData.cols.map(c=><td key={c.key} style={{fontSize:13}}>{statusBadge(c.key,row[c.key])}</td>)}</tr>;
                })}</tbody>
              </table></div>
            }

            <div className="mt-3 pt-2 border-top d-flex gap-3 flex-wrap" style={{fontSize:12,color:"#6C757D"}}>
              <span><i className="bi bi-bar-chart me-1"/>Records: <strong>{filtered.length}</strong></span>
              <span><i className="bi bi-calendar me-1"/>Period: <strong>{fromDate} → {toDate}</strong></span>
              <span><i className="bi bi-clock me-1"/>Generated: <strong>{new Date().toLocaleString("en-PH",{timeZone:"Asia/Manila"})}</strong></span>
            </div>
          </div>
        </div>
      )}

      {!reportData&&!loading&&(
        <div className="text-center py-5 text-muted">
          <i className="bi bi-file-earmark-bar-graph d-block mb-3" style={{fontSize:48,opacity:.3}}/>
          <div className="fw-semibold mb-1" style={{fontSize:16}}>Select a report type and click Generate</div>
          <small>Reports can be exported to Excel, PDF, or Word document</small>
        </div>
      )}
    </div>
  );
}