import { useState } from "react";
import { supabase } from "./lib/supabase.js";

const G={dark:"#1A2E1A",mid:"#2D6A2D",base:"#3A7A3A",wash:"#E8F5E9",pale:"#C8E6C9"};

const REPORT_TYPES=[
  {id:"students",     label:"Student Report",       icon:"bi-mortarboard",       desc:"Registered students with progress"},
  {id:"modules",      label:"Module Report",         icon:"bi-book",              desc:"Completion rates and engagement"},
  {id:"assessments",  label:"Assessment Report",     icon:"bi-clipboard-check",   desc:"Quiz attempts and scores"},
  {id:"seminars",     label:"Seminar Report",        icon:"bi-people",            desc:"Registrations and attendance"},
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

const FETCHERS={students:fetchStudentsReport,modules:fetchModulesReport,assessments:fetchAssessmentsReport,seminars:fetchSeminarsReport,certificates:fetchCertificatesReport,badges:fetchBadgesReport,activity:fetchActivityReport,announcements:fetchAnnouncementsReport};

async function exportToExcel(cols,rows,filename){const XLSX=await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");const ws=XLSX.utils.aoa_to_sheet([cols.map(c=>c.label),...rows.map(r=>cols.map(c=>r[c.key]??"—"))]);ws["!cols"]=cols.map(c=>({wch:Math.max(c.label.length+4,16)}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Report");XLSX.writeFile(wb,`${filename}.xlsx`);}

async function exportToPdf(title,subtitle,cols,rows,filename){await new Promise((resolve,reject)=>{if(window.jspdf){resolve();return;}const s1=document.createElement("script");s1.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";s1.onload=()=>{const s2=document.createElement("script");s2.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";s2.onload=resolve;s2.onerror=reject;document.head.appendChild(s2);};s1.onerror=reject;document.head.appendChild(s1);});const{jsPDF}=window.jspdf;const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});doc.setFillColor(26,46,26);doc.rect(0,0,297,20,"F");doc.setTextColor(255,255,255);doc.setFontSize(13);doc.setFont("helvetica","bold");doc.text("BLOOM GAD — GADRC CvSU",14,12);doc.setFontSize(9);doc.setFont("helvetica","normal");doc.text(title,14,18);doc.setTextColor(80,80,80);doc.setFontSize(8);doc.text(subtitle,14,26);doc.text(`Generated: ${new Date().toLocaleString("en-PH",{timeZone:"Asia/Manila"})}`,14,31);doc.autoTable({startY:36,head:[cols.map(c=>c.label)],body:rows.map(r=>cols.map(c=>String(r[c.key]??"—"))),headStyles:{fillColor:[45,106,45],textColor:255,fontStyle:"bold",fontSize:8},bodyStyles:{fontSize:7.5,textColor:[40,40,40]},alternateRowStyles:{fillColor:[232,245,233]},styles:{cellPadding:2.5,overflow:"linebreak"},margin:{left:14,right:14}});const pc=doc.internal.getNumberOfPages();for(let i=1;i<=pc;i++){doc.setPage(i);doc.setFontSize(7);doc.setTextColor(150);doc.text(`Page ${i} of ${pc}`,14,doc.internal.pageSize.height-7);doc.text("BLOOM GAD — GADRC CvSU",297-14,doc.internal.pageSize.height-7,{align:"right"});}doc.save(`${filename}.pdf`);}

async function exportToDocx(title,subtitle,cols,rows,filename){const th=`<tr>${cols.map(c=>`<th style="background:#1A2E1A;color:#fff;padding:7px 10px;font-size:11px;">${c.label}</th>`).join("")}</tr>`;const tb=rows.map((r,i)=>`<tr style="background:${i%2===0?"#F5F7F5":"#fff"}">${cols.map(c=>`<td style="padding:6px 10px;font-size:10px;border-bottom:1px solid #DDE8DD;">${r[c.key]??"—"}</td>`).join("")}</tr>`).join("");const html=`<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><title>${title}</title><style>body{font-family:Calibri,Arial,sans-serif;color:#222;margin:28px;}h1{color:#1A2E1A;font-size:18px;}p{color:#555;font-size:11px;}table{width:100%;border-collapse:collapse;}</style></head><body><h1>BLOOM GAD — ${title}</h1><p>${subtitle}<br/>Generated: ${new Date().toLocaleString("en-PH",{timeZone:"Asia/Manila"})}</p><table>${th}${tb}</table></body></html>`;const blob=new Blob(["\ufeff"+html],{type:"application/msword"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${filename}.doc`;a.click();URL.revokeObjectURL(url);}

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
                <small className="text-muted">{filtered.length} record{filtered.length!==1?"s":""} · {fromDate} to {toDate}</small>
              </div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <div className="input-group input-group-sm" style={{width:220}}>
                  <span className="input-group-text bg-white"><i className="bi bi-search text-muted"/></span>
                  <input type="text" className="form-control" placeholder="Search results…" value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <div className="dropdown">
                  <button className="btn btn-outline-secondary btn-sm dropdown-toggle d-flex align-items-center gap-1" disabled={exporting} data-bs-toggle="dropdown">
                    <i className="bi bi-download"/>{exporting?"Exporting…":"Export"}
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li><button className="dropdown-item d-flex align-items-center gap-2" onClick={async()=>{setExporting(true);try{await exportToExcel(reportData.cols,filtered,filename);}catch(e){alert(e.message);}finally{setExporting(false);};}}><i className="bi bi-file-earmark-spreadsheet text-success"/>Excel (.xlsx)</button></li>
                    <li><button className="dropdown-item d-flex align-items-center gap-2" onClick={async()=>{setExporting(true);try{await exportToPdf(meta?.label??"Report",subtitle,reportData.cols,filtered,filename);}catch(e){alert(e.message);}finally{setExporting(false);};}}><i className="bi bi-file-earmark-pdf text-danger"/>PDF (.pdf)</button></li>
                    <li><button className="dropdown-item d-flex align-items-center gap-2" onClick={async()=>{setExporting(true);try{await exportToDocx(meta?.label??"Report",subtitle,reportData.cols,filtered,filename);}catch(e){alert(e.message);}finally{setExporting(false);};}}><i className="bi bi-file-earmark-word text-primary"/>Word (.doc)</button></li>
                  </ul>
                </div>
              </div>
            </div>

            {filtered.length===0
              ?<div className="text-center py-5 text-muted"><i className="bi bi-inbox d-block mb-2" style={{fontSize:36}}/><div className="fw-semibold">No records found</div></div>
              :<div className="table-responsive"><table className="table table-hover table-bloom align-middle mb-0">
                <thead><tr>{reportData.cols.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead>
                <tbody>{filtered.map((row,i)=><tr key={i}>{reportData.cols.map(c=><td key={c.key} style={{fontSize:13}}>{statusBadge(c.key,row[c.key])}</td>)}</tr>)}</tbody>
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