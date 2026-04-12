import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "./lib/supabase.js";

const TODAY    = new Date().toISOString().split("T")[0];
const MONTH_AGO= new Date(Date.now()-30*86400000).toISOString().split("T")[0];
const PRESETS  = [{label:"Today",days:0},{label:"This Week",days:7},{label:"This Month",days:30},{label:"This Year",days:365},{label:"All Time",days:-1}];

function toISO(d,end=false){if(!d)return null;return end?`${d}T23:59:59.999+08:00`:`${d}T00:00:00.000+08:00`;}
function fmt(iso){if(!iso)return"—";const s=iso.endsWith("Z")||iso.includes("+")?iso:iso+"Z";return new Date(s).toLocaleString("en-PH",{timeZone:"Asia/Manila",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:true});}
function loadChart(){return new Promise(r=>{if(window.Chart){r();return;}const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";s.onload=r;document.head.appendChild(s);});}

/* ── LUNO-style extra CSS ───────────────────────────────────── */
const CSS = `
  .dash-stat-card { border:none !important; border-radius:12px !important; box-shadow:0 2px 10px rgba(0,0,0,.06) !important; overflow:hidden; transition:transform .18s,box-shadow .18s; }
  .dash-stat-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.1) !important; }
  .dash-stat-card .stat-bar { height:4px; border-radius:0 0 0 0; margin-top:auto; }
  .dash-welcome-card { background:linear-gradient(135deg,#1A2E1A 0%,#2D6A2D 60%,#4CAF50 100%); border-radius:14px !important; border:none !important; color:#fff; overflow:hidden; position:relative; }
  .dash-welcome-card::before { content:''; position:absolute; width:200px; height:200px; border-radius:50%; background:rgba(255,255,255,.05); top:-60px; right:-40px; }
  .dash-welcome-card::after  { content:''; position:absolute; width:120px; height:120px; border-radius:50%; background:rgba(255,255,255,.04); bottom:-30px; right:60px; }
  .dash-chart-card { border-radius:12px !important; border:1px solid #E8F5E9 !important; box-shadow:0 2px 8px rgba(0,0,0,.05) !important; }
  .section-header-line { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .section-header-line h6 { font-size:13px; font-weight:700; color:#1A2E1A; margin:0; }
  .dash-activity-item { display:flex; align-items:flex-start; gap:10px; padding:8px 0; border-bottom:1px solid #F0F4F0; }
  .dash-activity-item:last-child { border-bottom:none; }
  .dash-icon-circle { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:13px; }
  .progress-bloom { height:6px; border-radius:4px; background:#E8F5E9; }
  .progress-bloom .progress-bar { border-radius:4px; }
  .stat-trend-up   { color:#107C10; font-size:11px; font-weight:700; }
  .stat-trend-down { color:#C50F1F; font-size:11px; font-weight:700; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
  .dash-animate { animation:fadeUp .25s ease forwards; }
  .dash-animate:nth-child(2){animation-delay:.05s;}
  .dash-animate:nth-child(3){animation-delay:.1s;}
  .dash-animate:nth-child(4){animation-delay:.15s;}
`;

/* ── Stat card (LUNO-style) ─────────────────────────────────── */
function StatCard({icon,label,value,sub,color,trend,trendUp}){
  return(
    <div className="card dash-stat-card h-100">
      <div className="card-body p-3 d-flex flex-column">
        <div className="d-flex align-items-start justify-content-between mb-2">
          <div>
            <div className="text-uppercase fw-bold mb-1" style={{fontSize:10,letterSpacing:.8,color:"#9EAD9E"}}>{label}</div>
            <div style={{fontSize:26,fontWeight:800,color:"#1A2E1A",lineHeight:1}}>{value??"—"}</div>
            {sub&&<small className="text-muted" style={{fontSize:11}}>{sub}</small>}
          </div>
          <div className="d-flex align-items-center justify-content-center rounded-3" style={{width:42,height:42,background:`${color}15`,flexShrink:0}}>
            <i className={`bi ${icon}`} style={{fontSize:19,color}}/>
          </div>
        </div>
        {trend!=null&&(
          <div className="mt-auto pt-2">
            <span className={trendUp?"stat-trend-up":"stat-trend-down"}>
              <i className={`bi bi-arrow-${trendUp?"up":"down"}-short`}/>
              {Math.abs(trend)}%
            </span>
            <span className="text-muted ms-1" style={{fontSize:11}}>vs last period</span>
          </div>
        )}
      </div>
      <div className="stat-bar" style={{background:color}}/>
    </div>
  );
}

/* ── Section header ─────────────────────────────────────────── */
function SH({title,icon,action,onAction}){
  return(
    <div className="section-header-line">
      <h6><i className={`bi ${icon} me-2`} style={{color:"#2D6A2D"}}/>{title}</h6>
      {action&&<button className="btn btn-sm btn-outline-secondary py-0 px-2" style={{fontSize:11}} onClick={onAction}>{action}</button>}
    </div>
  );
}

/* ── Mini progress bar ──────────────────────────────────────── */
function MBar({label,value,max,color,sub}){
  const pct=max>0?Math.min(Math.round((value/max)*100),100):0;
  return(
    <div className="mb-3">
      <div className="d-flex justify-content-between mb-1">
        <span className="text-truncate fw-semibold" style={{fontSize:12,color:"#1A2E1A",maxWidth:180}}>{label}</span>
        <span className="fw-bold ms-2" style={{fontSize:12,color:"#1A2E1A",flexShrink:0}}>{sub??`${pct}%`}</span>
      </div>
      <div className="progress-bloom"><div className="progress-bar" style={{width:`${pct}%`,background:color||"#2D6A2D"}}/></div>
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────── */
function Empty({icon,msg}){
  return(<div className="text-center py-4 text-muted"><i className={`bi ${icon} d-block mb-2`} style={{fontSize:28,opacity:.4}}/><span style={{fontSize:13}}>{msg}</span></div>);
}

/* ── Chart.js canvases ─────────────────────────────────────── */
function BarCanvas({data}){
  const ref=useRef(null),chart=useRef(null);
  useEffect(()=>{
    loadChart().then(()=>{
      if(!ref.current||!window.Chart)return;
      if(chart.current)chart.current.destroy();
      chart.current=new window.Chart(ref.current,{
        type:"bar",
        data:{
          labels:data.map(d=>d.label),
          datasets:[{
            data:data.map(d=>d.value),
            backgroundColor:data.map((_,i)=>`rgba(45,106,45,${0.4+i*0.09})`),
            borderRadius:5,borderSkipped:false,
          }]
        },
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:(c)=>`${c.raw} actions`}}},scales:{y:{beginAtZero:true,grid:{color:"rgba(0,0,0,.04)"},ticks:{font:{size:10},color:"#9E9E9E"}},x:{grid:{display:false},ticks:{font:{size:10},color:"#9E9E9E"}}}}
      });
    });
    return()=>{if(chart.current)chart.current.destroy();};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[JSON.stringify(data)]);
  return <canvas ref={ref} style={{maxHeight:160}}/>;
}

function DonutCanvas({segments}){
  const ref=useRef(null),chart=useRef(null);
  useEffect(()=>{
    if(!segments.length)return;
    loadChart().then(()=>{
      if(!ref.current||!window.Chart)return;
      if(chart.current)chart.current.destroy();
      const total=segments.reduce((s,g)=>s+g.value,0);
      chart.current=new window.Chart(ref.current,{
        type:"doughnut",
        data:{
          labels:segments.map(s=>s.label),
          datasets:[{data:segments.map(s=>s.value),backgroundColor:["#2D6A2D","#4CAF50","#81C784","#A5D6A7"],borderWidth:3,borderColor:"#fff",hoverBorderColor:"#fff"}]
        },
        options:{
          responsive:true,maintainAspectRatio:false,cutout:"70%",
          plugins:{
            legend:{position:"bottom",labels:{font:{size:11},boxWidth:10,padding:12,color:"#616161"}},
            tooltip:{callbacks:{label:(c)=>`${c.label}: ${c.raw} (${Math.round((c.raw/total)*100)}%)`}}
          }
        }
      });
    });
    return()=>{if(chart.current)chart.current.destroy();};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[JSON.stringify(segments)]);
  return <canvas ref={ref} style={{maxHeight:180}}/>;
}

function getActIcon(a){
  if(!a)return"bi-pin-angle";const t=a.toLowerCase();
  if(t.includes("module"))return"bi-book";
  if(t.includes("seminar"))return"bi-people";
  if(t.includes("certificate"))return"bi-patch-check";
  if(t.includes("assessment"))return"bi-clipboard-check";
  if(t.includes("login"))return"bi-key";
  if(t.includes("badge"))return"bi-award";
  return"bi-activity";
}
const ACT_COLORS=["#E8F5E9","#E3F2FD","#FFF3E0","#FCE4EC","#F3E5F5","#E0F7FA","#F9FBE7","#FBE9E7"];
const ACT_ICON_COLORS=["#2D6A2D","#1565C0","#E65100","#C62828","#6A1B9A","#00695C","#827717","#BF360C"];

/* ── MAIN ───────────────────────────────────────────────────── */
export default function DashboardPage(){
  const [loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false);
  const [stats,setStats]=useState({}),[modStats,setModStats]=useState([]),[semStats,setSemStats]=useState([]);
  const [leaderboard,setLeaderboard]=useState([]),[activity,setActivity]=useState([]);
  const [certStats,setCertStats]=useState({}),[assessStats,setAssessStats]=useState({});
  const [recentMods,setRecentMods]=useState([]),[weeklyAct,setWeeklyAct]=useState([]);
  const [fromDate,setFromDate]=useState(MONTH_AGO),[toDate,setToDate]=useState(TODAY),[preset,setPreset]=useState("This Month");

  // applyPreset is defined after fetchAll below

  const fetchStats=useCallback(async(from,to)=>{const f=toISO(from),t=toISO(to,true);const rng=(q,col="created_at")=>{if(f)q=q.gte(col,f);if(t)q=q.lte(col,t);return q;};const[{count:tm},{count:pm},{count:ta},{count:ts},{count:us},{count:tc},{count:tb},{count:tat}]=await Promise.all([rng(supabase.from("modules").select("*",{count:"exact",head:true})),rng(supabase.from("modules").select("*",{count:"exact",head:true}).eq("status","published")),rng(supabase.from("assessments").select("*",{count:"exact",head:true})),rng(supabase.from("seminars").select("*",{count:"exact",head:true})),rng(supabase.from("seminars").select("*",{count:"exact",head:true}).eq("status","upcoming")),rng(supabase.from("certificates").select("*",{count:"exact",head:true}).eq("is_revoked",false),"issued_at"),rng(supabase.from("student_badges").select("*",{count:"exact",head:true}),"awarded_at"),rng(supabase.from("assessment_attempts").select("*",{count:"exact",head:true}),"submitted_at")]);let students=0;try{const{data:r}=await supabase.from("roles").select("id").eq("name","student").single();if(r){const{count}=await supabase.from("user_roles").select("*",{count:"exact",head:true}).eq("role_id",r.id);students=count??0;}}catch(e){console.error(e);}setStats({totalMods:tm??0,pubMods:pm??0,totalAssess:ta??0,totalSems:ts??0,upcomingSems:us??0,totalCerts:tc??0,totalBadges:tb??0,totalAttempts:tat??0,students});},[]);
  const fetchModStats=useCallback(async()=>{const{data}=await supabase.from("v_module_completion_stats").select("*").order("completion_rate_percent",{ascending:false}).limit(6);setModStats(data??[]);},[]);
  const fetchSemStats=useCallback(async()=>{const{data}=await supabase.from("v_seminar_attendance_summary").select("*").order("scheduled_start",{ascending:false}).limit(5);setSemStats(data??[]);},[]);
  const fetchActivity=useCallback(async(from,to)=>{let q=supabase.from("activity_logs").select("*").order("created_at",{ascending:false}).limit(10);if(from)q=q.gte("created_at",toISO(from));if(to)q=q.lte("created_at",toISO(to,true));const{data}=await q;setActivity(data??[]);},[]);
  const fetchRecentMods=useCallback(async(from,to)=>{let q=supabase.from("modules").select("id,title,status,created_at").order("created_at",{ascending:false}).limit(5);if(from)q=q.gte("created_at",toISO(from));if(to)q=q.lte("created_at",toISO(to,true));const{data}=await q;setRecentMods(data??[]);},[]);
  const fetchLeaderboard=useCallback(async(from,to)=>{let q=supabase.from("student_badges").select("user_id,awarded_at,profiles(full_name)");if(from)q=q.gte("awarded_at",toISO(from));if(to)q=q.lte("awarded_at",toISO(to,true));const{data}=await q;const map={};(data??[]).forEach((r,i)=>{const uid=r.user_id??`u${i}`;if(!map[uid])map[uid]={uid,name:r.profiles?.full_name??"—",count:0};map[uid].count++;});setLeaderboard(Object.values(map).sort((a,b)=>b.count-a.count).slice(0,5));},[]);
  const fetchCertStats=useCallback(async(from,to)=>{let q=supabase.from("certificates").select("reference_type,is_revoked,issued_at");if(from)q=q.gte("issued_at",toISO(from));if(to)q=q.lte("issued_at",toISO(to,true));const{data}=await q;if(!data)return;const byType={},valid=data.filter(c=>!c.is_revoked).length,revoked=data.length-valid;data.forEach(c=>{const t=c.reference_type??"manual";byType[t]=(byType[t]??0)+1;});setCertStats({byType,valid,revoked,total:data.length});},[]);
  const fetchAssessStats=useCallback(async(from,to)=>{let q=supabase.from("assessment_attempts").select("score,passed,submitted_at");if(from)q=q.gte("submitted_at",toISO(from));if(to)q=q.lte("submitted_at",toISO(to,true));const{data}=await q;if(!data||!data.length){setAssessStats({});return;}const passed=data.filter(a=>a.passed).length,avg=Math.round(data.reduce((s,a)=>s+(a.score??0),0)/data.length);setAssessStats({total:data.length,passed,failed:data.length-passed,avg,passRate:Math.round((passed/data.length)*100)});},[]);
  const fetchWeeklyAct=useCallback(async(from,to)=>{const end=to?new Date(to):new Date();const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],result=[];for(let i=6;i>=0;i--){const d=new Date(end);d.setDate(d.getDate()-i);const s=new Date(d);s.setHours(0,0,0,0);const e=new Date(d);e.setHours(23,59,59,999);const{count}=await supabase.from("activity_logs").select("*",{count:"exact",head:true}).gte("created_at",s.toISOString()).lte("created_at",e.toISOString());result.push({label:days[d.getDay()],value:count??0});}setWeeklyAct(result);},[]);

  const fetchAll=useCallback(async(from,to,isRef=false)=>{isRef?setRefreshing(true):setLoading(true);await Promise.allSettled([fetchStats(from,to),fetchModStats(),fetchSemStats(),fetchLeaderboard(from,to),fetchActivity(from,to),fetchCertStats(from,to),fetchAssessStats(from,to),fetchRecentMods(from,to),fetchWeeklyAct(from,to)]);isRef?setRefreshing(false):setLoading(false);},[fetchStats,fetchModStats,fetchSemStats,fetchLeaderboard,fetchActivity,fetchCertStats,fetchAssessStats,fetchRecentMods,fetchWeeklyAct]); // eslint-disable-line

  const applyPreset=useCallback((p)=>{
    setPreset(p.label);
    let from,to=TODAY;
    if(p.days===-1){from="2020-01-01";}
    else if(p.days===0){from=TODAY;}
    else{const d=new Date();d.setDate(d.getDate()-p.days);from=d.toISOString().split("T")[0];}
    setFromDate(from);setToDate(to);
    fetchAll(from,to,true);
  },[fetchAll]);

  useState(()=>{fetchAll(MONTH_AGO,TODAY);});

  const certSegs=Object.entries(certStats.byType??{}).map(([t,v])=>({label:t,value:v}));
  const draftCount=(stats.totalMods??0)-(stats.pubMods??0);
  const hour=new Date().getHours();
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";

  if(loading) return(
    <div className="p-4">
      <div className="skeleton mb-2" style={{width:220,height:26,borderRadius:6}}/><div className="skeleton mb-4" style={{width:140,height:14,borderRadius:4}}/>
      <div className="row g-3 mb-4">{[1,2,3,4].map(i=><div key={i} className="col-lg-3 col-6"><div className="card" style={{height:100,borderRadius:12}}><div className="card-body p-3"><div className="skeleton mb-2" style={{height:11,width:"55%"}}/><div className="skeleton" style={{height:28,width:"35%"}}/></div></div></div>)}</div>
      <div className="row g-3">{[1,2].map(i=><div key={i} className="col-lg-6"><div className="card" style={{height:220,borderRadius:12}}/></div>)}</div>
    </div>
  );

  return(
    <>
      <style>{CSS}</style>
      <div className="p-4" style={{maxWidth:1400,margin:"0 auto",background:"#F5F7F5",minHeight:"100vh"}}>

        {/* ── Page header ── */}
        <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-3">
          <div>
            <h4 className="fw-bold mb-1" style={{color:"#1A2E1A",fontSize:22}}>{greeting}, Admin</h4>
            <p className="mb-0" style={{fontSize:13,color:"#6C757D"}}>
              Here's what's happening in your GADRC system today.
            </p>
          </div>
          {/* Filter bar inline */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="btn-group btn-group-sm" role="group">
              {PRESETS.map(p=>(
                <button key={p.label} type="button" onClick={()=>applyPreset(p)}
                  className={`btn ${preset===p.label?"btn-primary":"btn-outline-secondary"}`}
                  style={{fontSize:11,fontWeight:preset===p.label?700:400}}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="d-flex align-items-center gap-1 bg-white border rounded px-2 py-1" style={{fontSize:12}}>
              <i className="bi bi-calendar3 text-muted" style={{fontSize:13}}/>
              <input type="date" className="border-0 p-0 bg-transparent" style={{fontSize:11,width:110,outline:"none",color:"#1A2E1A",colorScheme:"light"}}
                value={fromDate} max={toDate} onChange={e=>{const v=e.target.value;setFromDate(v);setPreset("Custom");fetchAll(v,toDate,true);}}/>
              <span className="text-muted">—</span>
              <input type="date" className="border-0 p-0 bg-transparent" style={{fontSize:11,width:110,outline:"none",color:"#1A2E1A",colorScheme:"light"}}
                value={toDate} min={fromDate} max={TODAY} onChange={e=>{const v=e.target.value;setToDate(v);setPreset("Custom");fetchAll(fromDate,v,true);}}/>
            </div>

          </div>
        </div>

        {/* ── Row 1: 8 Stat cards ── */}
        <div className="row g-3 mb-4">
          {[
            {icon:"bi-mortarboard",     label:"Students",      value:stats.students??0,                                          color:"#1A2E1A"},
            {icon:"bi-book",            label:"Modules",       value:stats.totalMods??0,   sub:`${stats.pubMods??0} pub · ${draftCount} draft`, color:"#2D6A2D"},
            {icon:"bi-clipboard-check", label:"Assessments",   value:stats.totalAssess??0,                                       color:"#2563EB"},
            {icon:"bi-people",          label:"Seminars",      value:stats.totalSems??0,   sub:`${stats.upcomingSems??0} upcoming`, color:"#7C3AED"},
            {icon:"bi-award",           label:"Badges",        value:stats.totalBadges??0,                                       color:"#D97706"},
            {icon:"bi-patch-check",     label:"Certificates",  value:stats.totalCerts??0,                                        color:"#059669"},
            {icon:"bi-pencil-square",   label:"Quiz Attempts", value:stats.totalAttempts??0,                                     color:"#0891B2"},
            {icon:"bi-graph-up-arrow",  label:"Pass Rate",     value:assessStats.passRate!=null?`${assessStats.passRate}%`:"—",  color:"#DC2626"},
          ].map((c,i)=>(
            <div key={i} className={`col-xl-3 col-md-4 col-6 dash-animate`} style={{animationDelay:`${i*0.04}s`}}>
              <StatCard {...c}/>
            </div>
          ))}
        </div>

        {/* ── Row 2: Welcome card + Activity chart ── */}
        <div className="row g-3 mb-3">
          {/* Welcome gradient card */}
          <div className="col-lg-4">
            <div className="card dash-welcome-card h-100 p-4">
              <div style={{position:"relative",zIndex:1}}>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="rounded-circle d-flex align-items-center justify-content-center" style={{width:42,height:42,background:"rgba(255,255,255,.2)"}}>
                    <i className="bi bi-flower2 text-white" style={{fontSize:20}}/>
                  </div>
                  <div>
                    <div className="fw-bold text-white" style={{fontSize:15}}>BLOOM GAD</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>GADRC CvSU</div>
                  </div>
                </div>
                <h5 className="fw-bold text-white mb-2" style={{fontSize:18}}>
                  Welcome back,<br/>GADRC Admin!
                </h5>
                <p style={{fontSize:12,color:"rgba(255,255,255,.7)",lineHeight:1.7,marginBottom:20}}>
                  Manage GAD learning modules, track student progress, run seminars, and issue certificates — all from one dashboard.
                </p>
                <div className="row g-2">
                  {[
                    {label:"Active Students", value:stats.students??0,   icon:"bi-people"},
                    {label:"Published Mods",  value:stats.pubMods??0,    icon:"bi-book"},
                    {label:"Upcoming Sems",   value:stats.upcomingSems??0,icon:"bi-calendar3"},
                  ].map(s=>(
                    <div key={s.label} className="col-4">
                      <div className="text-center p-2 rounded-3" style={{background:"rgba(255,255,255,.12)"}}>
                        <i className={`bi ${s.icon} d-block mb-1 text-white`} style={{fontSize:16}}/>
                        <div className="fw-bold text-white" style={{fontSize:16}}>{s.value}</div>
                        <div style={{fontSize:9,color:"rgba(255,255,255,.6)",textTransform:"uppercase",letterSpacing:.4}}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Activity bar chart */}
          <div className="col-lg-8">
            <div className="card dash-chart-card h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <SH title="System Activity This Week" icon="bi-bar-chart-line"/>
                  <div className="d-flex gap-3">
                    {[{label:"Attempts",value:assessStats.total??0,color:"#2563EB"},{label:"Passed",value:assessStats.passed??0,color:"#059669"},{label:"Failed",value:assessStats.failed??0,color:"#DC2626"},{label:"Avg Score",value:assessStats.avg!=null?`${assessStats.avg}%`:"—",color:"#2D6A2D"}].map(s=>(
                      <div key={s.label} className="text-center">
                        <div className="fw-bold" style={{fontSize:15,color:s.color}}>{s.value}</div>
                        <small className="text-muted" style={{fontSize:9,textTransform:"uppercase",letterSpacing:.4}}>{s.label}</small>
                      </div>
                    ))}
                  </div>
                </div>
                {weeklyAct.length>0?<BarCanvas data={weeklyAct}/>:<Empty icon="bi-bar-chart" msg="No activity data"/>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 3: Module bars + Certs donut + Leaderboard ── */}
        <div className="row g-3 mb-3">
          <div className="col-lg-5">
            <div className="card dash-chart-card h-100">
              <div className="card-body p-3">
                <SH title="Module Completion Rate" icon="bi-book"/>
                {modStats.length===0?<Empty icon="bi-book" msg="No data yet"/>:modStats.map((m,i)=>(
                  <MBar key={m.module_id??i} label={m.module_title??"Untitled"} value={m.completion_rate_percent??0} max={100}
                    color={["#1A2E1A","#2D6A2D","#3A7A3A","#4CAF50","#81C784","#A5D6A7"][i]||"#2D6A2D"}
                    sub={`${m.completion_rate_percent??0}% · ${m.completed_count??0}/${m.total_students??0}`}/>
                ))}
              </div>
            </div>
          </div>

          <div className="col-lg-3">
            <div className="card dash-chart-card h-100">
              <div className="card-body p-3">
                <SH title="Certificates" icon="bi-patch-check"/>
                {!certStats.total?<Empty icon="bi-patch-check" msg="None in this period"/>:(
                  <>
                    <DonutCanvas segments={certSegs}/>
                    <div className="row g-2 mt-2">
                      <div className="col-6"><div className="rounded-3 text-center py-2" style={{background:"#DFF6DD"}}><div className="fw-bold text-success" style={{fontSize:18}}>{certStats.valid??0}</div><small className="text-success fw-semibold" style={{fontSize:9,textTransform:"uppercase"}}>Valid</small></div></div>
                      <div className="col-6"><div className="rounded-3 text-center py-2" style={{background:"#FDE7E9"}}><div className="fw-bold text-danger" style={{fontSize:18}}>{certStats.revoked??0}</div><small className="text-danger fw-semibold" style={{fontSize:9,textTransform:"uppercase"}}>Revoked</small></div></div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card dash-chart-card h-100">
              <div className="card-body p-3">
                <SH title="Badge Leaderboard" icon="bi-trophy"/>
                {leaderboard.length===0?<Empty icon="bi-award" msg="No badges yet"/>:leaderboard.map((r,i)=>(
                  <div key={r.uid} className={`d-flex align-items-center gap-3 p-2 rounded-3 mb-1 ${i===0?"":"hover-row"}`}
                    style={{background:i===0?"linear-gradient(135deg,#F9FBE7,#E8F5E9)":"transparent",transition:"background .15s"}}>
                    <div className="fw-bold text-center" style={{width:24,fontSize:i<3?18:13,color:i===0?"#F59E0B":i===1?"#9E9E9E":i===2?"#CD7F32":"#6C757D"}}>
                      {i===0?"#1":i===1?"#2":i===2?"#3":`#${i+1}`}
                    </div>
                    <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                      style={{width:32,height:32,background:`linear-gradient(135deg,#2D6A2D,#4CAF50)`,fontSize:12}}>
                      {r.name.slice(0,1).toUpperCase()}
                    </div>
                    <span className="flex-grow-1 text-truncate fw-semibold" style={{fontSize:12}}>{r.name}</span>
                    <span className="badge rounded-pill" style={{background:"#FEF3C7",color:"#D97706",fontSize:11}}>
                      <i className="bi bi-award me-1"/>{r.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 4: Seminar attendance + Recent modules + Activity log ── */}
        <div className="row g-3">
          <div className="col-lg-4">
            <div className="card dash-chart-card h-100">
              <div className="card-body p-3">
                <SH title="Seminar Attendance" icon="bi-people"/>
                {semStats.length===0?<Empty icon="bi-people" msg="No seminars yet"/>:semStats.map((s,i)=>(
                  <MBar key={s.seminar_id??i} label={s.seminar_title??"Untitled"} value={s.attendance_rate_percent??0} max={100}
                    color={i===0?"#7C3AED":"#2563EB"}
                    sub={`${s.attendance_rate_percent??0}% · ${s.attended_count??0}/${s.registered_count??0}`}/>
                ))}
              </div>
            </div>
          </div>

          <div className="col-lg-3">
            <div className="card dash-chart-card h-100">
              <div className="card-body p-3">
                <SH title="Recent Modules" icon="bi-clock-history"/>
                {recentMods.length===0?<Empty icon="bi-book" msg="No modules"/>:recentMods.map(m=>(
                  <div key={m.id} className="d-flex align-items-center gap-2 py-2" style={{borderBottom:"1px solid #F0F4F0"}}>
                    <div className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{width:30,height:30,background:m.status==="published"?"#DFF6DD":"#FFF4CE"}}>
                      <i className={`bi bi-book`} style={{fontSize:13,color:m.status==="published"?"#107C10":"#835B00"}}/>
                    </div>
                    <div className="flex-grow-1 overflow-hidden">
                      <div className="fw-semibold text-truncate" style={{fontSize:12}}>{m.title}</div>
                      <small className="text-muted" style={{fontSize:10}}>{fmt(m.created_at)}</small>
                    </div>
                    <span className={`badge rounded-pill ${m.status==="published"?"bg-success-subtle text-success":"bg-warning-subtle text-warning"}`} style={{fontSize:9}}>
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="card dash-chart-card h-100">
              <div className="card-body p-3">
                <SH title="Recent Activity" icon="bi-activity" action="Refresh" onAction={()=>fetchActivity(fromDate,toDate)}/>
                {activity.length===0?<Empty icon="bi-activity" msg="No activity"/>:activity.map((log,i)=>(
                  <div key={log.id??i} className="dash-activity-item">
                    <div className="dash-icon-circle" style={{background:ACT_COLORS[i%ACT_COLORS.length]}}>
                      <i className={`bi ${getActIcon(log.action_type)}`} style={{color:ACT_ICON_COLORS[i%ACT_ICON_COLORS.length],fontSize:13}}/>
                    </div>
                    <div className="flex-grow-1 overflow-hidden">
                      <div className="fw-semibold text-truncate" style={{fontSize:12,color:"#1A2E1A"}}>
                        {(log.action_type??"Activity").replace(/_/g," ")}
                        {log.reference_type&&<span className="text-muted fw-normal"> · {log.reference_type}</span>}
                      </div>
                      <small className="text-muted" style={{fontSize:11}}>{fmt(log.created_at)}</small>
                    </div>
                    <span className="badge rounded-pill bg-light text-secondary" style={{fontSize:10,flexShrink:0}}>
                      {(log.action_type??"—").split("_")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}