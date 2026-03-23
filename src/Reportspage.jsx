import { useState } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark:"#2d4a18", mid:"#3a5a20", base:"#5a7a3a",
  light:"#8ab060", pale:"#b5cc8e", wash:"#e8f2d8",
  cream:"#f6f9f0", white:"#fafdf6",
};

const REPORT_TYPES = [
  { id:"students",     label:"Student Report",      emoji:"👩‍🎓", desc:"All registered students with progress overview" },
  { id:"modules",      label:"Module Report",        emoji:"📚", desc:"Module completion rates and student engagement" },
  { id:"assessments",  label:"Assessment Report",    emoji:"📝", desc:"Quiz attempts, scores, pass/fail breakdown" },
  { id:"seminars",     label:"Seminar Report",       emoji:"🎓", desc:"Seminar registrations and attendance" },
  { id:"certificates", label:"Certificate Report",   emoji:"🏆", desc:"Issued certificates by student and type" },
  { id:"badges",       label:"Badge Report",         emoji:"🏅", desc:"Badges earned per student" },
  { id:"activity",     label:"Activity Log Report",  emoji:"🕐", desc:"System activity and user actions" },
  { id:"announcements",label:"Announcements Report", emoji:"📢", desc:"Published announcements and reach" },
];

function fmtDate(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z")||iso.includes("+") ? iso : iso+"Z";
  return new Date(s).toLocaleString("en-PH",{timeZone:"Asia/Manila",month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true});
}

function fmtDateShort(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z")||iso.includes("+") ? iso : iso+"Z";
  return new Date(s).toLocaleDateString("en-PH",{timeZone:"Asia/Manila",month:"short",day:"numeric",year:"numeric"});
}

const s = {
  page:    { padding:"28px 32px", fontFamily:"'Segoe UI',system-ui,sans-serif", background:G.cream, minHeight:"100vh" },
  card:    { background:G.white, border:`1px solid ${G.pale}`, borderRadius:14, padding:"20px 22px", boxShadow:"0 2px 8px rgba(45,74,24,.06)" },
  btn:     (active, color) => ({ padding:"8px 16px", borderRadius:9, border:`1.5px solid ${active?(color||G.base):G.pale}`, background:active?(color||G.base):"#fff", color:active?"#fff":(color||G.dark), fontWeight:700, fontSize:13, cursor:"pointer", transition:"all .15s" }),
  th:      { background:G.wash, padding:"10px 14px", fontSize:11, fontWeight:800, color:G.dark, textAlign:"left", letterSpacing:".04em", textTransform:"uppercase", whiteSpace:"nowrap" },
  td:      { padding:"10px 14px", fontSize:12.5, color:"#333", borderBottom:`1px solid ${G.wash}`, verticalAlign:"top" },
  input:   { padding:"8px 12px", border:`1.5px solid ${G.pale}`, borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none", background:"#fff" },
  label:   { fontSize:11, fontWeight:700, color:G.mid, letterSpacing:".04em", textTransform:"uppercase", marginBottom:4, display:"block" },
};

function ExportButtons({ onExcel, onPdf, onDocx, loading }) {
  return (
    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
      <button onClick={onExcel} disabled={loading} style={{ ...s.btn(false), background:"#16a34a", color:"#fff", border:"none", display:"flex", alignItems:"center", gap:6 }}>
        📊 Export Excel
      </button>
      <button onClick={onPdf} disabled={loading} style={{ ...s.btn(false), background:"#dc2626", color:"#fff", border:"none", display:"flex", alignItems:"center", gap:6 }}>
        📄 Export PDF
      </button>
      <button onClick={onDocx} disabled={loading} style={{ ...s.btn(false), background:"#2563eb", color:"#fff", border:"none", display:"flex", alignItems:"center", gap:6 }}>
        📝 Export DOCX
      </button>
    </div>
  );
}

// ── Export helpers (client-side) ──────────────────────────────
async function exportToExcel(columns, rows, filename) {
  const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
  const wsData = [columns.map(c=>c.label), ...rows.map(r=>columns.map(c=>r[c.key]??"—"))];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Style header row bold
  columns.forEach((_,i)=>{
    const cell=ws[XLSX.utils.encode_cell({r:0,c:i})];
    if(cell) cell.s={font:{bold:true}};
  });
  // Auto column width
  ws["!cols"] = columns.map(c=>({wch:Math.max(c.label.length+4, 16)}));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

async function exportToPdf(title, subtitle, columns, rows, filename) {
  // Load jsPDF via script tag to avoid constructor issues
  await new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(); return; }
    const s1 = document.createElement("script");
    s1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s1.onload = () => {
      const s2 = document.createElement("script");
      s2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
      s2.onload = resolve;
      s2.onerror = reject;
      document.head.appendChild(s2);
    };
    s1.onerror = reject;
    document.head.appendChild(s1);
  });
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
  // Header
  doc.setFillColor(45,74,24);
  doc.rect(0,0,297,22,"F");
  doc.setTextColor(255,255,255);
  doc.setFontSize(14); doc.setFont("helvetica","bold");
  doc.text("BLOOM GAD — GADRC CvSU", 14, 10);
  doc.setFontSize(10); doc.setFont("helvetica","normal");
  doc.text(title, 14, 17);
  // Subtitle
  doc.setTextColor(80,80,80);
  doc.setFontSize(9);
  doc.text(subtitle, 14, 28);
  doc.text(`Generated: ${new Date().toLocaleString("en-PH",{timeZone:"Asia/Manila"})}`, 14, 33);
  // Table
  doc.autoTable({
    startY: 38,
    head: [columns.map(c=>c.label)],
    body: rows.map(r=>columns.map(c=>String(r[c.key]??"—"))),
    headStyles: { fillColor:[45,74,24], textColor:255, fontStyle:"bold", fontSize:9 },
    bodyStyles: { fontSize:8.5, textColor:[40,40,40] },
    alternateRowStyles: { fillColor:[240,247,234] },
    styles: { cellPadding:3, overflow:"linebreak" },
    margin: { left:14, right:14 },
  });
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for(let i=1;i<=pageCount;i++){
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height-8);
    doc.text("BLOOM GAD — GADRC CvSU", 297-14, doc.internal.pageSize.height-8, {align:"right"});
  }
  doc.save(`${filename}.pdf`);
}

async function exportToDocx(title, subtitle, columns, rows, filename) {
  // Build a styled HTML then trigger download as .doc (Word-compatible)
  const theadHtml = `<tr>${columns.map(c=>`<th style="background:#2d4a18;color:#fff;padding:8px 12px;font-size:12px;text-align:left;white-space:nowrap;">${c.label}</th>`).join("")}</tr>`;
  const tbodyHtml = rows.map((r,i)=>`<tr style="background:${i%2===0?"#f6f9f0":"#fff"}">${columns.map(c=>`<td style="padding:7px 12px;font-size:11px;border-bottom:1px solid #e8f2d8;">${r[c.key]??"—"}</td>`).join("")}</tr>`).join("");
  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
    <head><meta charset='utf-8'><title>${title}</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; color: #222; margin: 32px; }
      h1   { color: #2d4a18; font-size: 20px; margin-bottom: 4px; }
      p    { color: #555; font-size: 12px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; }
    </style></head>
    <body>
      <h1>🌸 BLOOM GAD — ${title}</h1>
      <p>${subtitle}<br/>Generated: ${new Date().toLocaleString("en-PH",{timeZone:"Asia/Manila"})}</p>
      <table>${theadHtml}${tbodyHtml}</table>
    </body></html>`;
  const blob = new Blob(["\ufeff"+html], { type:"application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`${filename}.doc`; a.click();
  URL.revokeObjectURL(url);
}

// ── Individual report fetchers ────────────────────────────────
async function fetchStudentsReport(from, to) {
  let q = supabase.from("profiles").select("full_name, student_id, email, department, year_level, is_active, created_at");
  if(from) q=q.gte("created_at", new Date(from).toISOString());
  if(to)   q=q.lte("created_at", new Date(to+"T23:59:59").toISOString());
  const { data } = await q.order("created_at",{ascending:false});
  const cols = [
    {key:"full_name",   label:"Full Name"},
    {key:"student_id",  label:"Student ID"},
    {key:"email",       label:"Email"},
    {key:"department",  label:"Department"},
    {key:"year_level",  label:"Year Level"},
    {key:"status",      label:"Status"},
    {key:"created_at",  label:"Registered"},
  ];
  const rows = (data??[]).map(r=>({...r, status:r.is_active?"Active":"Deactivated", created_at:fmtDateShort(r.created_at)}));
  return { cols, rows };
}

async function fetchModulesReport() {
  const { data } = await supabase.from("v_module_completion_stats").select("*");
  const rows = data??[];
  const cols = [
    {key:"module_title",           label:"Module"},
    {key:"category_name",          label:"Category"},
    {key:"module_status",          label:"Status"},
    {key:"total_students",         label:"Total Students"},
    {key:"completed_count",        label:"Completed"},
    {key:"in_progress_count",      label:"In Progress"},
    {key:"not_started_count",      label:"Not Started"},
    {key:"completion_rate_percent",label:"Completion Rate %"},
  ];
  return { cols, rows };
}

async function fetchAssessmentsReport(from, to) {
  let q = supabase.from("assessment_attempts").select("*, profiles(full_name, student_id), assessments(title)");
  if(from) q=q.gte("submitted_at", new Date(from).toISOString());
  if(to)   q=q.lte("submitted_at", new Date(to+"T23:59:59").toISOString());
  const { data } = await q.order("submitted_at",{ascending:false}).limit(500);
  const cols = [
    {key:"student",    label:"Student"},
    {key:"student_id", label:"Student ID"},
    {key:"assessment", label:"Assessment"},
    {key:"score",      label:"Score (%)"},
    {key:"passed",     label:"Result"},
    {key:"submitted",  label:"Submitted"},
  ];
  const rows = (data??[]).map(r=>({
    student:    r.profiles?.full_name??"—",
    student_id: r.profiles?.student_id??"—",
    assessment: r.assessments?.title??"—",
    score:      r.score??0,
    passed:     r.passed?"PASSED":"FAILED",
    submitted:  fmtDate(r.submitted_at),
  }));
  return { cols, rows };
}

async function fetchSeminarsReport() {
  const { data } = await supabase.from("v_seminar_attendance_summary").select("*");
  const cols = [
    {key:"seminar_title",          label:"Seminar"},
    {key:"seminar_type",           label:"Type"},
    {key:"seminar_status",         label:"Status"},
    {key:"scheduled_start",        label:"Date"},
    {key:"registered_count",       label:"Registered"},
    {key:"attended_count",         label:"Attended"},
    {key:"attendance_rate_percent",label:"Attendance %"},
  ];
  const rows = (data??[]).map(r=>({...r, scheduled_start:fmtDateShort(r.scheduled_start)}));
  return { cols, rows };
}

async function fetchCertificatesReport(from, to) {
  let q = supabase.from("certificates").select("*, profiles(full_name, student_id)");
  if(from) q=q.gte("issued_at", new Date(from).toISOString());
  if(to)   q=q.lte("issued_at", new Date(to+"T23:59:59").toISOString());
  const { data } = await q.order("issued_at",{ascending:false}).limit(500);
  const cols = [
    {key:"student",    label:"Student"},
    {key:"student_id", label:"Student ID"},
    {key:"code",       label:"Certificate Code"},
    {key:"type",       label:"Type"},
    {key:"status",     label:"Status"},
    {key:"issued",     label:"Issued"},
  ];
  const rows = (data??[]).map(r=>({
    student:    r.profiles?.full_name??"—",
    student_id: r.profiles?.student_id??"—",
    code:       r.certificate_code??"—",
    type:       r.reference_type??"manual",
    status:     r.is_revoked?"Revoked":"Valid",
    issued:     fmtDateShort(r.issued_at),
  }));
  return { cols, rows };
}

async function fetchBadgesReport(from, to) {
  let q = supabase.from("student_badges").select("*, profiles(full_name, student_id), badges(name, description)");
  if(from) q=q.gte("awarded_at", new Date(from).toISOString());
  if(to)   q=q.lte("awarded_at", new Date(to+"T23:59:59").toISOString());
  const { data } = await q.order("awarded_at",{ascending:false}).limit(500);
  const cols = [
    {key:"student",    label:"Student"},
    {key:"student_id", label:"Student ID"},
    {key:"badge",      label:"Badge"},
    {key:"awarded",    label:"Awarded"},
  ];
  const rows = (data??[]).map(r=>({
    student:    r.profiles?.full_name??"—",
    student_id: r.profiles?.student_id??"—",
    badge:      r.badges?.name??"—",
    awarded:    fmtDateShort(r.awarded_at),
  }));
  return { cols, rows };
}

async function fetchActivityReport(from, to) {
  let q = supabase.from("activity_logs").select("*, profiles(full_name)");
  if(from) q=q.gte("created_at", new Date(from).toISOString());
  if(to)   q=q.lte("created_at", new Date(to+"T23:59:59").toISOString());
  const { data } = await q.order("created_at",{ascending:false}).limit(500);
  const cols = [
    {key:"user",        label:"User"},
    {key:"action",      label:"Action"},
    {key:"ref_type",    label:"Reference Type"},
    {key:"created_at",  label:"Timestamp"},
  ];
  const rows = (data??[]).map(r=>({
    user:       r.profiles?.full_name??"—",
    action:     (r.action_type??"—").replace(/_/g," "),
    ref_type:   r.reference_type??"—",
    created_at: fmtDate(r.created_at),
  }));
  return { cols, rows };
}

async function fetchAnnouncementsReport(from, to) {
  let q = supabase.from("announcements").select("title, target_audience, is_pinned, is_published, published_at, expires_at, created_at");
  if(from) q=q.gte("created_at", new Date(from).toISOString());
  if(to)   q=q.lte("created_at", new Date(to+"T23:59:59").toISOString());
  const { data } = await q.order("created_at",{ascending:false});
  const cols = [
    {key:"title",     label:"Title"},
    {key:"audience",  label:"Target Audience"},
    {key:"pinned",    label:"Pinned"},
    {key:"published", label:"Published"},
    {key:"pub_date",  label:"Publish Date"},
    {key:"expires",   label:"Expires"},
  ];
  const rows = (data??[]).map(r=>({
    title:     r.title??"—",
    audience:  r.target_audience??"all",
    pinned:    r.is_pinned?"Yes":"No",
    published: r.is_published?"Yes":"No",
    pub_date:  fmtDateShort(r.published_at),
    expires:   r.expires_at?fmtDateShort(r.expires_at):"Never",
  }));
  return { cols, rows };
}

const FETCHERS = {
  students:     fetchStudentsReport,
  modules:      fetchModulesReport,
  assessments:  fetchAssessmentsReport,
  seminars:     fetchSeminarsReport,
  certificates: fetchCertificatesReport,
  badges:       fetchBadgesReport,
  activity:     fetchActivityReport,
  announcements:fetchAnnouncementsReport,
};

export default function ReportsPage() {
  const today     = new Date().toISOString().split("T")[0];
  const monthAgo  = new Date(Date.now()-30*86400000).toISOString().split("T")[0];

  const [selectedType, setSelectedType] = useState(null);
  const [fromDate,     setFromDate]     = useState(monthAgo);
  const [toDate,       setToDate]       = useState(today);
  const [loading,      setLoading]      = useState(false);
  const [exporting,    setExporting]    = useState(false);
  const [reportData,   setReportData]   = useState(null); // { cols, rows }
  const [search,       setSearch]       = useState("");

  const handleGenerate = async () => {
    if (!selectedType) return;
    setLoading(true);
    setSearch("");
    try {
      const data = await FETCHERS[selectedType](fromDate, toDate);
      setReportData(data);
    } catch(e) {
      alert("Error generating report: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const reportMeta = REPORT_TYPES.find(r=>r.id===selectedType);
  const subtitle   = `${reportMeta?.label??""} · ${fromDate} to ${toDate}`;
  const filename   = `BLOOM_${selectedType}_${fromDate}_${toDate}`;

  const filtered = (reportData?.rows??[]).filter(row =>
    !search || Object.values(row).some(v => String(v??"").toLowerCase().includes(search.toLowerCase()))
  );

  const handleExcel = async () => {
    setExporting(true);
    try { await exportToExcel(reportData.cols, filtered, filename); }
    catch(e){ alert("Export failed: "+e.message); }
    finally { setExporting(false); }
  };

  const handlePdf = async () => {
    setExporting(true);
    try { await exportToPdf(reportMeta?.label??"Report", subtitle, reportData.cols, filtered, filename); }
    catch(e){ alert("Export failed: "+e.message); }
    finally { setExporting(false); }
  };

  const handleDocx = async () => {
    setExporting(true);
    try { await exportToDocx(reportMeta?.label??"Report", subtitle, reportData.cols, filtered, filename); }
    catch(e){ alert("Export failed: "+e.message); }
    finally { setExporting(false); }
  };

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:900, color:G.dark, margin:0 }}>📋 Reports</h1>
        <p style={{ color:G.base, margin:"4px 0 0", fontSize:13 }}>Generate, filter, and export detailed reports from the BLOOM GAD system.</p>
      </div>

      {/* Report type selector */}
      <div style={{ ...s.card, marginBottom:18 }}>
        <div style={{ fontSize:13, fontWeight:800, color:G.dark, marginBottom:14 }}>1. Select Report Type</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
          {REPORT_TYPES.map(r=>(
            <button key={r.id} onClick={()=>{ setSelectedType(r.id); setReportData(null); }}
              style={{ padding:"12px 14px", borderRadius:10, border:`2px solid ${selectedType===r.id?G.base:G.pale}`, background:selectedType===r.id?G.wash:"#fff", cursor:"pointer", textAlign:"left", transition:"all .15s" }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{r.emoji}</div>
              <div style={{ fontSize:13, fontWeight:700, color:G.dark }}>{r.label}</div>
              <div style={{ fontSize:11, color:G.light, marginTop:2 }}>{r.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ ...s.card, marginBottom:18 }}>
        <div style={{ fontSize:13, fontWeight:800, color:G.dark, marginBottom:14 }}>2. Set Filters</div>
        <div style={{ display:"flex", gap:16, flexWrap:"wrap", alignItems:"flex-end" }}>
          <div>
            <label style={s.label}>From Date</label>
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} style={s.input}/>
          </div>
          <div>
            <label style={s.label}>To Date</label>
            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} style={s.input}/>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {[
              { label:"Last 7 days",  days:7 },
              { label:"Last 30 days", days:30 },
              { label:"Last 90 days", days:90 },
              { label:"This year",    days:365 },
            ].map(q=>(
              <button key={q.label} onClick={()=>{ setFromDate(new Date(Date.now()-q.days*86400000).toISOString().split("T")[0]); setToDate(today); }}
                style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${G.pale}`, background:"#fff", cursor:"pointer", fontSize:12, color:G.mid, fontWeight:600 }}>
                {q.label}
              </button>
            ))}
          </div>
          <button onClick={handleGenerate} disabled={!selectedType||loading}
            style={{ padding:"10px 24px", borderRadius:9, border:"none", background:selectedType?G.dark:"#ccc", color:"#fff", fontWeight:700, fontSize:13, cursor:selectedType?"pointer":"not-allowed" }}>
            {loading ? "Generating…" : "▶ Generate Report"}
          </button>
        </div>
      </div>

      {/* Results */}
      {reportData && (
        <div style={s.card}>
          {/* Result header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:12 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:G.dark }}>{reportMeta?.emoji} {reportMeta?.label}</div>
              <div style={{ fontSize:12, color:G.light, marginTop:2 }}>
                {filtered.length} record{filtered.length!==1?"s":""} · {fromDate} to {toDate}
              </div>
            </div>
            <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
              <input placeholder="🔍 Search results…" value={search} onChange={e=>setSearch(e.target.value)}
                style={{ ...s.input, width:200, fontSize:12 }}/>
              <ExportButtons onExcel={handleExcel} onPdf={handlePdf} onDocx={handleDocx} loading={exporting}/>
            </div>
          </div>

          {filtered.length===0
            ? <div style={{ textAlign:"center", padding:"40px 0", color:G.light }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📭</div>
                <div style={{ fontSize:14, fontWeight:600 }}>No records found for the selected filters</div>
              </div>
            : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead>
                    <tr>{reportData.cols.map(c=><th key={c.key} style={s.th}>{c.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filtered.map((row,i)=>(
                      <tr key={i} style={{ background:i%2===0?"#fff":G.cream }}>
                        {reportData.cols.map(c=>(
                          <td key={c.key} style={s.td}>
                            {c.key==="status"||c.key==="passed"||c.key==="published"
                              ? <span style={{ padding:"2px 8px", borderRadius:10, fontSize:11, fontWeight:700,
                                  background: ["PASSED","Active","Valid","Yes"].includes(row[c.key]) ? "#dcfce7" : ["FAILED","Deactivated","Revoked"].includes(row[c.key]) ? "#fee2e2" : "#f3f4f6",
                                  color:      ["PASSED","Active","Valid","Yes"].includes(row[c.key]) ? "#16a34a" : ["FAILED","Deactivated","Revoked"].includes(row[c.key]) ? "#dc2626" : "#555",
                                }}>{row[c.key]??"—"}</span>
                              : row[c.key]??"—"
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }

          {/* Summary row */}
          <div style={{ marginTop:14, padding:"10px 14px", background:G.wash, borderRadius:8, fontSize:12, color:G.mid, display:"flex", gap:20, flexWrap:"wrap" }}>
            <span>📊 Total records: <strong>{filtered.length}</strong></span>
            <span>📅 Period: <strong>{fromDate}</strong> → <strong>{toDate}</strong></span>
            <span>🕐 Generated: <strong>{new Date().toLocaleString("en-PH",{timeZone:"Asia/Manila"})}</strong></span>
          </div>
        </div>
      )}

      {/* Empty state before generation */}
      {!reportData && !loading && (
        <div style={{ textAlign:"center", padding:"60px 0", color:G.light }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:16, fontWeight:700, color:G.mid }}>Select a report type and click Generate</div>
          <div style={{ fontSize:13, marginTop:6 }}>Reports can be exported to Excel, PDF, or Word document</div>
        </div>
      )}

    </div>
  );
}