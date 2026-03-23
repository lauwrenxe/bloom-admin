import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark:"#2d4a18", mid:"#3a5a20", base:"#5a7a3a",
  light:"#8ab060", pale:"#b5cc8e", wash:"#e8f2d8",
  cream:"#f6f9f0", white:"#fafdf6",
};

const SHIMMER = `@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}.shimmer{background:linear-gradient(90deg,${G.wash} 25%,${G.cream} 50%,${G.wash} 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:8px;}`;

function fmtDate(iso) {
  if (!iso) return "—";
  const s = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  return new Date(s).toLocaleString("en-PH", { timeZone:"Asia/Manila", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit", hour12:true });
}

function Shimmer({ w="100%", h=16, r=8, style={} }) {
  return <div className="shimmer" style={{ width:w, height:h, borderRadius:r, flexShrink:0, ...style }} />;
}

function Card({ children, style={} }) {
  return <div style={{ background:G.white, border:`1px solid ${G.pale}`, borderRadius:14, padding:"20px 22px", boxShadow:"0 2px 8px rgba(45,74,24,.06)", ...style }}>{children}</div>;
}

function StatCard({ emoji, label, value, sub, color }) {
  return (
    <Card style={{ display:"flex", flexDirection:"column", gap:5, borderTop:`3px solid ${color||G.base}` }}>
      <div style={{ fontSize:24 }}>{emoji}</div>
      <div style={{ fontSize:11, color:G.base, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontSize:32, fontWeight:900, color:color||G.dark, lineHeight:1 }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize:11, color:G.light, marginTop:1 }}>{sub}</div>}
    </Card>
  );
}

function BarChart({ data, color }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:64 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <div title={`${d.label}: ${d.value}`} style={{ width:"100%", minHeight:4, height:`${Math.max(4,(d.value/max)*54)}px`, background:color||G.base, borderRadius:"3px 3px 0 0", transition:"height .5s", opacity:0.6+(i/data.length)*0.4 }} />
          <div style={{ fontSize:9, color:"#aaa" }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, size=96 }) {
  const r=38, cx=50, cy=50, circ=2*Math.PI*r;
  const total = segments.reduce((s,g)=>s+g.value,0);
  let offset=0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={G.wash} strokeWidth={15}/>
      {total>0 && segments.map((seg,i)=>{
        const dash=(seg.value/total)*circ, gap=circ-dash;
        const el=<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={15}
          strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset}
          style={{ transform:"rotate(-90deg)", transformOrigin:"50px 50px" }}/>;
        offset+=dash; return el;
      })}
      <text x={cx} y={cy+5} textAnchor="middle" fontSize="14" fontWeight="800" fill={G.dark}>{total}</text>
    </svg>
  );
}

function MiniBar({ label, value, max, color, sub }) {
  const pct = max > 0 ? Math.min(Math.round((value/max)*100),100) : 0;
  return (
    <div style={{ marginBottom:11 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:G.mid, marginBottom:4 }}>
        <span style={{ maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:600 }}>{label}</span>
        <span style={{ fontWeight:700, color:G.dark, flexShrink:0, marginLeft:8 }}>{sub ?? `${pct}%`}</span>
      </div>
      <div style={{ background:G.wash, borderRadius:5, height:7 }}>
        <div style={{ width:`${pct}%`, height:7, borderRadius:5, background:color||G.base, transition:"width .6s" }}/>
      </div>
    </div>
  );
}

function SectionTitle({ children, action, onAction }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
      <h3 style={{ fontSize:14, fontWeight:800, color:G.dark, margin:0 }}>{children}</h3>
      {action && <button onClick={onAction} style={{ background:"none", border:`1px solid ${G.pale}`, borderRadius:7, padding:"3px 10px", fontSize:11, color:G.base, cursor:"pointer", fontWeight:600 }}>{action}</button>}
    </div>
  );
}

function Empty({ emoji, msg }) {
  return <div style={{ textAlign:"center", padding:"20px 0", color:G.light, fontSize:13 }}><div style={{ fontSize:28, marginBottom:6 }}>{emoji}</div>{msg}</div>;
}

function getEmoji(a) {
  if (!a) return "📌";
  const t=a.toLowerCase();
  if (t.includes("module")) return "📚";
  if (t.includes("seminar")) return "🎓";
  if (t.includes("certificate")) return "🏆";
  if (t.includes("assessment")||t.includes("quiz")) return "📝";
  if (t.includes("login")) return "🔑";
  if (t.includes("badge")) return "🏅";
  return "📌";
}

export default function DashboardPage() {
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats,      setStats]      = useState({});
  const [modStats,   setModStats]   = useState([]);
  const [semStats,   setSemStats]   = useState([]);
  const [leaderboard,setLeaderboard]= useState([]);
  const [activity,   setActivity]   = useState([]);
  const [certStats,  setCertStats]  = useState({});
  const [assessStats,setAssessStats]= useState({});
  const [recentMods, setRecentMods] = useState([]);
  const [weeklyAct,  setWeeklyAct]  = useState([]);

  const fetchAll = async (isRefresh=false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    await Promise.allSettled([fetchStats(), fetchModStats(), fetchSemStats(), fetchLeaderboard(), fetchActivity(), fetchCertStats(), fetchAssessStats(), fetchRecentMods(), fetchWeeklyAct()]);
    isRefresh ? setRefreshing(false) : setLoading(false);
  };

  const fetchStats = async () => {
    const [
      {count:totalMods},{count:pubMods},{count:totalAssess},{count:totalSems},{count:upcomingSems},{count:totalCerts},{count:totalBadges},{count:totalAttempts}
    ] = await Promise.all([
      supabase.from("modules").select("*",{count:"exact",head:true}),
      supabase.from("modules").select("*",{count:"exact",head:true}).eq("status","published"),
      supabase.from("assessments").select("*",{count:"exact",head:true}),
      supabase.from("seminars").select("*",{count:"exact",head:true}),
      supabase.from("seminars").select("*",{count:"exact",head:true}).eq("status","upcoming"),
      supabase.from("certificates").select("*",{count:"exact",head:true}).eq("is_revoked",false),
      supabase.from("student_badges").select("*",{count:"exact",head:true}),
      supabase.from("assessment_attempts").select("*",{count:"exact",head:true}),
    ]);
    let students=0;
    try {
      const {data:r}=await supabase.from("roles").select("id").eq("name","student").single();
      if(r){const{count}=await supabase.from("user_roles").select("*",{count:"exact",head:true}).eq("role_id",r.id);students=count??0;}
    } catch(e){ console.error("Role fetch:", e); }
    setStats({totalMods:totalMods??0,pubMods:pubMods??0,totalAssess:totalAssess??0,totalSems:totalSems??0,upcomingSems:upcomingSems??0,totalCerts:totalCerts??0,totalBadges:totalBadges??0,totalAttempts:totalAttempts??0,students});
  };

  const fetchModStats  = async () => { const{data}=await supabase.from("v_module_completion_stats").select("*").order("completion_rate_percent",{ascending:false}).limit(6); setModStats(data??[]); };
  const fetchSemStats  = async () => { const{data}=await supabase.from("v_seminar_attendance_summary").select("*").order("scheduled_start",{ascending:false}).limit(5); setSemStats(data??[]); };
  const fetchActivity  = async () => { const{data}=await supabase.from("activity_logs").select("*").order("created_at",{ascending:false}).limit(8); setActivity(data??[]); };
  const fetchRecentMods= async () => { const{data}=await supabase.from("modules").select("id,title,status,created_at").order("created_at",{ascending:false}).limit(5); setRecentMods(data??[]); };

  const fetchLeaderboard = async () => {
    const{data}=await supabase.from("student_badges").select("user_id, profiles(full_name)");
    const map={};
    (data??[]).forEach((r,i)=>{ const uid=r.user_id??`u${i}`; if(!map[uid]) map[uid]={uid,name:r.profiles?.full_name??"—",count:0}; map[uid].count++; });
    setLeaderboard(Object.values(map).sort((a,b)=>b.count-a.count).slice(0,5));
  };

  const fetchCertStats = async () => {
    const{data}=await supabase.from("certificates").select("reference_type, is_revoked");
    if(!data)return;
    const byType={},valid=data.filter(c=>!c.is_revoked).length,revoked=data.length-valid;
    data.forEach(c=>{const t=c.reference_type??"manual";byType[t]=(byType[t]??0)+1;});
    setCertStats({byType,valid,revoked,total:data.length});
  };

  const fetchAssessStats = async () => {
    const{data}=await supabase.from("assessment_attempts").select("score, passed");
    if(!data||!data.length)return;
    const passed=data.filter(a=>a.passed).length,avg=Math.round(data.reduce((s,a)=>s+(a.score??0),0)/data.length);
    setAssessStats({total:data.length,passed,failed:data.length-passed,avg,passRate:Math.round((passed/data.length)*100)});
  };

  const fetchWeeklyAct = async () => {
    const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],now=new Date(),result=[];
    for(let i=6;i>=0;i--){
      const d=new Date(now);d.setDate(d.getDate()-i);
      const start=new Date(d);start.setHours(0,0,0,0);
      const end=new Date(d);end.setHours(23,59,59,999);
      const{count}=await supabase.from("activity_logs").select("*",{count:"exact",head:true}).gte("created_at",start.toISOString()).lte("created_at",end.toISOString());
      result.push({label:days[d.getDay()],value:count??0});
    }
    setWeeklyAct(result);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); }, []);

  const certColors={manual:G.base,module:"#2563eb",seminar:"#7c3aed",assessment:"#f59e0b"};
  const certSegs=Object.entries(certStats.byType??{}).map(([t,v])=>({color:certColors[t]??"#888",value:v,label:t}));
  const draftCount=(stats.totalMods??0)-(stats.pubMods??0);

  if(loading) return (
    <>
      <style>{SHIMMER}</style>
      <div style={{padding:"28px 32px",maxWidth:1300,margin:"0 auto"}}>
        <Shimmer w={200} h={28} style={{marginBottom:22}}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:14,marginBottom:20}}>
          {[...Array(8)].map((item,i)=><Card key={i} style={{height:95}}><Shimmer h={18} w="60%" style={{marginBottom:8}}/><Shimmer h={32} w="40%"/></Card>)}
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{SHIMMER}</style>
      <div style={{padding:"28px 32px",maxWidth:1300,margin:"0 auto",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}>
          <div>
            <h1 style={{fontSize:24,fontWeight:900,color:G.dark,margin:0}}>📊 Dashboard</h1>
            <p style={{color:G.base,margin:"4px 0 0",fontSize:13}}>Real-time overview — GADRC CvSU learning management system.</p>
          </div>
          <button onClick={()=>fetchAll(true)} disabled={refreshing}
            style={{background:G.wash,border:`1px solid ${G.pale}`,borderRadius:8,padding:"8px 16px",fontSize:13,color:G.base,cursor:"pointer",fontWeight:600,opacity:refreshing?.6:1}}>
            {refreshing?"Refreshing…":"↻ Refresh"}
          </button>
        </div>

        {/* Stat cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:14,marginBottom:20}}>
          <StatCard emoji="👩‍🎓" label="Students"       value={stats.students??0}                                       color={G.dark}/>
          <StatCard emoji="📚"   label="Modules"         value={stats.totalMods??0}   sub={`${stats.pubMods??0} pub · ${draftCount} draft`} color={G.base}/>
          <StatCard emoji="📝"   label="Assessments"     value={stats.totalAssess??0}                                   color="#2563eb"/>
          <StatCard emoji="🎓"   label="Seminars"        value={stats.totalSems??0}   sub={`${stats.upcomingSems??0} upcoming`}             color="#7c3aed"/>
          <StatCard emoji="🏅"   label="Badges Awarded"  value={stats.totalBadges??0}                                   color="#f59e0b"/>
          <StatCard emoji="🏆"   label="Certificates"    value={stats.totalCerts??0}                                    color="#16a34a"/>
          <StatCard emoji="✏️"   label="Quiz Attempts"   value={stats.totalAttempts??0}                                 color="#0891b2"/>
          <StatCard emoji="🎯"   label="Pass Rate"       value={assessStats.passRate!=null?`${assessStats.passRate}%`:"—"} color="#dc2626"/>
        </div>

        {/* Module completion + Weekly bar chart */}
        <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr",gap:18,marginBottom:18}}>
          <Card>
            <SectionTitle>📚 Module Completion Rate (Top 6)</SectionTitle>
            {modStats.length===0?<Empty emoji="📚" msg="No data yet — students haven't started modules"/>
              :modStats.map((m,i)=>(
                <MiniBar key={m.module_id??i}
                  label={m.module_title??"Untitled"}
                  value={m.completion_rate_percent??0} max={100}
                  color={i===0?G.dark:i===1?G.mid:G.base}
                  sub={`${m.completion_rate_percent??0}% · ${m.completed_count??0}/${m.total_students??0} students`}
                />
              ))
            }
          </Card>
          <Card>
            <SectionTitle>📈 Activity This Week</SectionTitle>
            {weeklyAct.length===0?<Empty emoji="📈" msg="No activity logged"/>:<BarChart data={weeklyAct} color={G.base}/>}
            <div style={{marginTop:14,display:"flex",gap:10,flexWrap:"wrap"}}>
              {[{label:"Total",value:assessStats.total??0,color:"#2563eb"},{label:"Passed",value:assessStats.passed??0,color:"#16a34a"},{label:"Failed",value:assessStats.failed??0,color:"#dc2626"},{label:"Avg Score",value:assessStats.avg!=null?`${assessStats.avg}%`:"—",color:G.base}].map(s=>(
                <div key={s.label} style={{flex:1,minWidth:60,background:G.cream,borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                  <div style={{fontSize:16,fontWeight:900,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:9,color:"#888",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Seminar + Certificates + Leaderboard */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:18,marginBottom:18}}>
          <Card>
            <SectionTitle>🎓 Seminar Attendance</SectionTitle>
            {semStats.length===0?<Empty emoji="🎓" msg="No seminars held yet"/>
              :semStats.map((s,i)=>(
                <MiniBar key={s.seminar_id??i}
                  label={s.seminar_title??"Untitled"}
                  value={s.attendance_rate_percent??0} max={100}
                  color={i===0?"#7c3aed":"#2563eb"}
                  sub={`${s.attendance_rate_percent??0}% · ${s.attended_count??0}/${s.registered_count??0}`}
                />
              ))
            }
          </Card>

          <Card>
            <SectionTitle>🏆 Certificates by Type</SectionTitle>
            {!certStats.total?<Empty emoji="🏆" msg="No certificates issued yet"/>:(
              <div>
                <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:12}}>
                  <DonutChart segments={certSegs} size={96}/>
                  <div style={{flex:1}}>
                    {certSegs.map(seg=>(
                      <div key={seg.label} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,fontSize:12}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:seg.color,flexShrink:0}}/>
                        <span style={{flex:1,color:G.dark,fontWeight:500,textTransform:"capitalize"}}>{seg.label}</span>
                        <span style={{fontWeight:700,color:G.mid}}>{seg.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <div style={{flex:1,background:"#dcfce7",borderRadius:8,padding:"8px",textAlign:"center"}}>
                    <div style={{fontSize:16,fontWeight:900,color:"#16a34a"}}>{certStats.valid??0}</div>
                    <div style={{fontSize:9,color:"#16a34a",fontWeight:700}}>VALID</div>
                  </div>
                  <div style={{flex:1,background:"#fee2e2",borderRadius:8,padding:"8px",textAlign:"center"}}>
                    <div style={{fontSize:16,fontWeight:900,color:"#dc2626"}}>{certStats.revoked??0}</div>
                    <div style={{fontSize:9,color:"#dc2626",fontWeight:700}}>REVOKED</div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle>🥇 Badge Leaderboard</SectionTitle>
            {leaderboard.length===0?<Empty emoji="🏅" msg="No badges awarded yet"/>
              :leaderboard.map((r,i)=>(
                <div key={r.uid} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9,padding:"5px 8px",borderRadius:8,background:i===0?G.wash:"transparent"}}>
                  <div style={{fontSize:17}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</div>
                  <div style={{flex:1,fontSize:12,fontWeight:i===0?700:500,color:G.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#f59e0b"}}>🏅 {r.count}</div>
                </div>
              ))
            }
          </Card>
        </div>

        {/* Recent modules + Activity log */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:18}}>
          <Card>
            <SectionTitle>🆕 Recently Added Modules</SectionTitle>
            {recentMods.length===0?<Empty emoji="📚" msg="No modules yet"/>
              :recentMods.map(m=>(
                <div key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${G.wash}`}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:G.dark}}>{m.title}</div>
                    <div style={{fontSize:11,color:"#aaa",marginTop:1}}>{fmtDate(m.created_at)}</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:m.status==="published"?"#dcfce7":"#fef9c3",color:m.status==="published"?"#16a34a":"#92400e"}}>{m.status}</span>
                </div>
              ))
            }
          </Card>

          <Card>
            <SectionTitle action="Refresh" onAction={fetchActivity}>🕐 Recent Activity</SectionTitle>
            {activity.length===0?<Empty emoji="🕐" msg="No recent activity"/>
              :activity.map((log,i)=>(
                <div key={log.id??i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"7px 0",borderBottom:i<activity.length-1?`1px solid ${G.wash}`:"none"}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:G.wash,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{getEmoji(log.action_type)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:G.dark,fontWeight:500}}>{(log.action_type??"Activity").replace(/_/g," ")}{log.reference_type&&<span style={{color:"#aaa",fontWeight:400}}> · {log.reference_type}</span>}</div>
                    <div style={{fontSize:11,color:G.light,marginTop:1}}>{fmtDate(log.created_at)}</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,background:"#f3f4f6",color:"#555"}}>{(log.action_type??"event").split("_")[0]}</span>
                </div>
              ))
            }
          </Card>
        </div>

      </div>
    </>
  );
}