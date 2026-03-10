import { useState, useRef } from "react";

/* ─── palette ─── */
const G = {
  dark:"#2d4a18", mid:"#3a5a20", base:"#5a7a3a",
  light:"#8ab060", pale:"#b5cc8e", wash:"#e8f2d8",
  cream:"#f6f9f0", white:"#fafdf6",
};

/* ─── seed data ─── */
const SEED = {
  modules:[
    { id:1, title:"Introduction to GAD", category:"Basics", status:"Published", updated:"2026-02-10" },
    { id:2, title:"Gender Equality in the Workplace", category:"Workplace", status:"Published", updated:"2026-02-18" },
    { id:3, title:"VAWC Awareness", category:"Policy", status:"Draft", updated:"2026-03-01" },
  ],
  assessments:[
    { id:1, title:"GAD Basics Quiz", module:"Introduction to GAD", questions:10, status:"Active" },
    { id:2, title:"Workplace Equality Assessment", module:"Gender Equality in the Workplace", questions:15, status:"Active" },
    { id:3, title:"VAWC Knowledge Check", module:"VAWC Awareness", questions:8, status:"Draft" },
  ],
  seminars:[
    { id:1, title:"International Women's Day Forum", date:"2026-03-08", time:"09:00 AM", status:"Upcoming", attendees:0 },
    { id:2, title:"GAD Planning Workshop", date:"2026-02-14", time:"02:00 PM", status:"Completed", attendees:47 },
    { id:3, title:"Gender Sensitivity Training", date:"2026-03-20", time:"10:00 AM", status:"Upcoming", attendees:0 },
  ],
  certificates:[
    { id:1, student:"Maria Santos", course:"Introduction to GAD", issued:"2026-02-15", template:"Standard" },
    { id:2, student:"Juan dela Cruz", course:"GAD Planning Workshop", issued:"2026-02-14", template:"Seminar" },
    { id:3, student:"Ana Reyes", course:"Introduction to GAD", issued:"2026-02-15", template:"Standard" },
  ],
  events:[
    { id:1, title:"GAD Orientation Day", date:"2026-03-10", type:"Activity", desc:"Annual orientation for new GAD advocates." },
    { id:2, title:"Women's Month Celebration", date:"2026-03-18", type:"Event", desc:"Month-long celebration of women's contributions." },
    { id:3, title:"GADRC Team Meeting", date:"2026-03-25", type:"Meeting", desc:"Quarterly planning and review meeting." },
  ],
};

const ANALYTICS = {
  totalStudents:312, completionRate:68, activeModules:12,
  seminarAttendance:89, certificatesIssued:147, monthlyActive:204,
};

/* ─── tiny UI atoms ─── */
const Tag = ({ children, color = G.base, bg = G.wash }) => (
  <span style={{ display:"inline-block", background:bg, color, borderRadius:"20px",
    padding:"3px 12px", fontSize:"11px", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>
    {children}
  </span>
);

const Btn = ({ children, onClick, variant="primary", small, style={} }) => {
  const base = {
    border:"none", borderRadius:"22px", fontFamily:"'DM Sans',sans-serif",
    fontWeight:600, cursor:"pointer", transition:"all .18s", letterSpacing:".3px",
    padding: small ? "7px 16px" : "11px 24px",
    fontSize: small ? "12px" : "13.5px",
    ...style,
  };
  const styles = {
    primary:{ background:G.base, color:"#fff" },
    danger: { background:"#c0392b", color:"#fff" },
    ghost:  { background:G.wash, color:G.base },
    dark:   { background:G.dark, color:"#fff" },
  };
  return (
    <button style={{ ...base, ...styles[variant] }} onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.opacity=".85"; e.currentTarget.style.transform="translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity="1";   e.currentTarget.style.transform=""; }}>
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, type="text", placeholder="" }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
    {label && <label style={{ fontSize:"12px", fontWeight:600, color:G.dark, letterSpacing:".4px", textTransform:"uppercase" }}>{label}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ border:`1.5px solid ${G.wash}`, borderRadius:"10px", padding:"10px 14px",
        fontSize:"13.5px", fontFamily:"'DM Sans',sans-serif", outline:"none",
        background:"#fff", color:"#222", transition:"border .18s" }}
      onFocus={e => e.target.style.borderColor = G.base}
      onBlur={e  => e.target.style.borderColor = G.wash}
    />
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
    {label && <label style={{ fontSize:"12px", fontWeight:600, color:G.dark, letterSpacing:".4px", textTransform:"uppercase" }}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ border:`1.5px solid ${G.wash}`, borderRadius:"10px", padding:"10px 14px",
        fontSize:"13.5px", fontFamily:"'DM Sans',sans-serif", outline:"none",
        background:"#fff", color:"#222" }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const Card = ({ children, style={} }) => (
  <div style={{ background:"#fff", borderRadius:"16px", border:`1.5px solid ${G.wash}`,
    boxShadow:"0 2px 16px rgba(58,90,32,.06)", padding:"28px 24px", ...style }}>
    {children}
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:999,
    display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
    <div style={{ background:"#fff", borderRadius:"20px", padding:"36px 32px",
      width:"100%", maxWidth:"520px", maxHeight:"85vh", overflowY:"auto",
      boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
        <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"20px", color:G.dark }}>{title}</h3>
        <button onClick={onClose} style={{ background:"none", border:"none", fontSize:"22px", cursor:"pointer", color:"#888", lineHeight:1 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const BloomLogo = ({ light }) => (
  <div style={{ display:"flex", alignItems:"center", gap:"9px" }}>
    <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
      <circle cx="15" cy="15" r="5.5" fill={light ? G.pale : G.base}/>
      <circle cx="15" cy="5"  r="4.2" fill={light ? "#fff" : G.light}/>
      <circle cx="15" cy="25" r="4.2" fill={light ? "#fff" : G.light}/>
      <circle cx="5"  cy="15" r="4.2" fill={light ? "#fff" : G.light}/>
      <circle cx="25" cy="15" r="4.2" fill={light ? "#fff" : G.light}/>
      <circle cx="7.5"  cy="7.5"  r="3" fill={light ? "rgba(255,255,255,.6)" : G.pale}/>
      <circle cx="22.5" cy="7.5"  r="3" fill={light ? "rgba(255,255,255,.6)" : G.pale}/>
      <circle cx="7.5"  cy="22.5" r="3" fill={light ? "rgba(255,255,255,.6)" : G.pale}/>
      <circle cx="22.5" cy="22.5" r="3" fill={light ? "rgba(255,255,255,.6)" : G.pale}/>
    </svg>
    <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"20px",
      color: light ? "#fff" : G.dark, letterSpacing:"1px" }}>BLOOM</span>
  </div>
);

/* ══════════════════════════════════════════════
   VIEWS
══════════════════════════════════════════════ */

/* ── Dashboard Home ── */
function DashboardHome() {
  const stats = [
    { icon:"👥", label:"Total Students",       val: ANALYTICS.totalStudents,      color:G.base },
    { icon:"📈", label:"Completion Rate",       val:`${ANALYTICS.completionRate}%`, color:"#4a90d9" },
    { icon:"📚", label:"Active Modules",        val: ANALYTICS.activeModules,      color:"#e67e22" },
    { icon:"🎙️", label:"Seminar Attendance",    val: ANALYTICS.seminarAttendance,  color:"#8e44ad" },
    { icon:"🎓", label:"Certificates Issued",   val: ANALYTICS.certificatesIssued, color:G.mid },
    { icon:"📱", label:"Monthly Active Users",  val: ANALYTICS.monthlyActive,      color:"#16a085" },
  ];
  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"26px", color:G.dark, marginBottom:"6px" }}>Dashboard Overview</h2>
      <p style={{ color:"#777", fontSize:"13.5px", marginBottom:"32px" }}>Welcome back, Admin. Here's what's happening across BLOOM.</p>

      {/* stat grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"16px", marginBottom:"36px" }}>
        {stats.map(s => (
          <Card key={s.label} style={{ textAlign:"center", padding:"24px 16px" }}>
            <div style={{ fontSize:"28px", marginBottom:"8px" }}>{s.icon}</div>
            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"28px", color:s.color, marginBottom:"4px" }}>{s.val}</div>
            <div style={{ fontSize:"12px", color:"#888", fontWeight:500 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* recent activity */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
        <Card>
          <h4 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"16px", color:G.dark, marginBottom:"16px" }}>Recent Modules</h4>
          {SEED.modules.map(m => (
            <div key={m.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"10px 0", borderBottom:`1px solid ${G.wash}` }}>
              <div>
                <div style={{ fontWeight:600, fontSize:"13px", color:"#333" }}>{m.title}</div>
                <div style={{ fontSize:"11px", color:"#aaa", marginTop:"2px" }}>{m.category} · {m.updated}</div>
              </div>
              <Tag color={m.status==="Published"?G.base:"#e67e22"} bg={m.status==="Published"?G.wash:"#fef5e7"}>
                {m.status}
              </Tag>
            </div>
          ))}
        </Card>
        <Card>
          <h4 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"16px", color:G.dark, marginBottom:"16px" }}>Upcoming Seminars</h4>
          {SEED.seminars.filter(s=>s.status==="Upcoming").map(s => (
            <div key={s.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"10px 0", borderBottom:`1px solid ${G.wash}` }}>
              <div>
                <div style={{ fontWeight:600, fontSize:"13px", color:"#333" }}>{s.title}</div>
                <div style={{ fontSize:"11px", color:"#aaa", marginTop:"2px" }}>{s.date} · {s.time}</div>
              </div>
              <Tag color="#4a90d9" bg="#eaf2fb">Live Soon</Tag>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ── Module Management ── */
function ModuleManager() {
  const [items, setItems] = useState(SEED.modules);
  const [modal, setModal] = useState(null); // null | "add" | {edit item}
  const [form, setForm] = useState({ title:"", category:"Basics", status:"Draft" });
  const categories = ["Basics","Workplace","Policy","Health","Culture"];

  const openAdd  = () => { setForm({ title:"", category:"Basics", status:"Draft" }); setModal("add"); };
  const openEdit = (item) => { setForm({ title:item.title, category:item.category, status:item.status }); setModal(item); };
  const save = () => {
    if (!form.title.trim()) return;
    if (modal === "add") {
      setItems(prev => [...prev, { id:Date.now(), ...form, updated: new Date().toISOString().slice(0,10) }]);
    } else {
      setItems(prev => prev.map(i => i.id===modal.id ? { ...i, ...form, updated:new Date().toISOString().slice(0,10) } : i));
    }
    setModal(null);
  };
  const del = (id) => setItems(prev => prev.filter(i => i.id!==id));

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"28px" }}>
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"26px", color:G.dark }}>Module Management</h2>
          <p style={{ color:"#777", fontSize:"13px", marginTop:"4px" }}>Upload and manage GAD learning modules.</p>
        </div>
        <Btn onClick={openAdd}>＋ Add Module</Btn>
      </div>

      <Card style={{ padding:0, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:G.cream }}>
              {["Title","Category","Status","Last Updated","Actions"].map(h => (
                <th key={h} style={{ padding:"14px 20px", textAlign:"left", fontSize:"11px",
                  fontWeight:700, color:G.base, letterSpacing:"1px", textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ borderTop:`1px solid ${G.wash}`, background: i%2===0?"#fff":G.white }}>
                <td style={{ padding:"14px 20px", fontWeight:600, fontSize:"13.5px", color:"#333" }}>{item.title}</td>
                <td style={{ padding:"14px 20px", fontSize:"13px", color:"#666" }}>{item.category}</td>
                <td style={{ padding:"14px 20px" }}>
                  <Tag color={item.status==="Published"?G.base:"#e67e22"} bg={item.status==="Published"?G.wash:"#fef5e7"}>
                    {item.status}
                  </Tag>
                </td>
                <td style={{ padding:"14px 20px", fontSize:"13px", color:"#888" }}>{item.updated}</td>
                <td style={{ padding:"14px 20px", display:"flex", gap:"8px" }}>
                  <Btn small variant="ghost" onClick={() => openEdit(item)}>Edit</Btn>
                  <Btn small variant="danger" onClick={() => del(item.id)}>Delete</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {modal && (
        <Modal title={modal==="add"?"Add Module":"Edit Module"} onClose={() => setModal(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <Input label="Module Title" value={form.title} onChange={v => setForm(f=>({...f,title:v}))} placeholder="e.g. Introduction to GAD"/>
            <Select label="Category" value={form.category} onChange={v => setForm(f=>({...f,category:v}))} options={categories}/>
            <Select label="Status" value={form.status} onChange={v => setForm(f=>({...f,status:v}))} options={["Draft","Published"]}/>
            <div style={{ display:"flex", gap:"12px", justifyContent:"flex-end", marginTop:"8px" }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={save}>Save Module</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Assessment Management ── */
function AssessmentManager() {
  const [items, setItems] = useState(SEED.assessments);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title:"", module:"Introduction to GAD", questions:"10", status:"Draft" });

  const openAdd  = () => { setForm({ title:"", module:"Introduction to GAD", questions:"10", status:"Draft" }); setModal("add"); };
  const openEdit = (item) => { setForm({ title:item.title, module:item.module, questions:String(item.questions), status:item.status }); setModal(item); };
  const save = () => {
    if (!form.title.trim()) return;
    if (modal==="add") setItems(p=>[...p,{id:Date.now(),...form,questions:Number(form.questions)}]);
    else setItems(p=>p.map(i=>i.id===modal.id?{...i,...form,questions:Number(form.questions)}:i));
    setModal(null);
  };
  const modules = SEED.modules.map(m=>m.title);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"28px" }}>
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"26px", color:G.dark }}>Assessment Management</h2>
          <p style={{ color:"#777", fontSize:"13px", marginTop:"4px" }}>Create quizzes and evaluations for students.</p>
        </div>
        <Btn onClick={openAdd}>＋ Add Assessment</Btn>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"16px" }}>
        {items.map(item => (
          <Card key={item.id}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"12px" }}>
              <span style={{ fontSize:"28px" }}>📝</span>
              <Tag color={item.status==="Active"?G.base:"#e67e22"} bg={item.status==="Active"?G.wash:"#fef5e7"}>{item.status}</Tag>
            </div>
            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"16px", color:G.dark, marginBottom:"6px" }}>{item.title}</div>
            <div style={{ fontSize:"12.5px", color:"#888", marginBottom:"4px" }}>Module: {item.module}</div>
            <div style={{ fontSize:"12.5px", color:"#888", marginBottom:"16px" }}>{item.questions} Questions</div>
            <div style={{ display:"flex", gap:"8px" }}>
              <Btn small variant="ghost" onClick={()=>openEdit(item)}>Edit</Btn>
              <Btn small variant="danger" onClick={()=>setItems(p=>p.filter(i=>i.id!==item.id))}>Delete</Btn>
            </div>
          </Card>
        ))}
      </div>

      {modal && (
        <Modal title={modal==="add"?"Add Assessment":"Edit Assessment"} onClose={()=>setModal(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <Input label="Assessment Title" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="e.g. GAD Basics Quiz"/>
            <Select label="Linked Module" value={form.module} onChange={v=>setForm(f=>({...f,module:v}))} options={modules}/>
            <Input label="Number of Questions" value={form.questions} onChange={v=>setForm(f=>({...f,questions:v}))} type="number"/>
            <Select label="Status" value={form.status} onChange={v=>setForm(f=>({...f,status:v}))} options={["Draft","Active"]}/>
            <div style={{ display:"flex", gap:"12px", justifyContent:"flex-end", marginTop:"8px" }}>
              <Btn variant="ghost" onClick={()=>setModal(null)}>Cancel</Btn>
              <Btn onClick={save}>Save Assessment</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Analytics ── */
function Analytics() {
  const bars = [
    { label:"Jan", val:55 },{ label:"Feb", val:72 },{ label:"Mar", val:68 },
    { label:"Apr", val:80 },{ label:"May", val:61 },{ label:"Jun", val:90 },
  ];
  const max = Math.max(...bars.map(b=>b.val));
  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"26px", color:G.dark, marginBottom:"6px" }}>Data Analytics & Reporting</h2>
      <p style={{ color:"#777", fontSize:"13px", marginBottom:"32px" }}>Monitor student engagement and learning outcomes.</p>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"16px", marginBottom:"28px" }}>
        {[
          { icon:"✅", label:"Completion Rate", val:"68%", sub:"↑ 4% from last month" },
          { icon:"👥", label:"Active Students", val:"204", sub:"of 312 total enrolled" },
          { icon:"📚", label:"Modules Completed", val:"876", sub:"across all students" },
          { icon:"🎓", label:"Certificates Issued", val:"147", sub:"this semester" },
        ].map(s => (
          <Card key={s.label} style={{ padding:"22px 20px" }}>
            <div style={{ fontSize:"24px", marginBottom:"8px" }}>{s.icon}</div>
            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"26px", color:G.dark }}>{s.val}</div>
            <div style={{ fontWeight:600, fontSize:"12px", color:G.base, margin:"4px 0 2px" }}>{s.label}</div>
            <div style={{ fontSize:"11px", color:"#aaa" }}>{s.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"20px" }}>
        <Card>
          <h4 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"16px", color:G.dark, marginBottom:"24px" }}>Monthly Completion Rate (%)</h4>
          <div style={{ display:"flex", alignItems:"flex-end", gap:"12px", height:"160px" }}>
            {bars.map(b => (
              <div key={b.label} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"6px", height:"100%" }}>
                <div style={{ flex:1, display:"flex", alignItems:"flex-end", width:"100%" }}>
                  <div style={{
                    width:"100%", borderRadius:"6px 6px 0 0",
                    height:`${(b.val/max)*100}%`,
                    background:`linear-gradient(180deg,${G.light},${G.base})`,
                    transition:"height .4s ease",
                    minHeight:"4px",
                  }}/>
                </div>
                <div style={{ fontSize:"11px", color:"#888", fontWeight:600 }}>{b.label}</div>
                <div style={{ fontSize:"11px", color:G.base, fontWeight:700 }}>{b.val}%</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h4 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"16px", color:G.dark, marginBottom:"20px" }}>Top Modules</h4>
          {[
            { name:"Intro to GAD", pct:88 },
            { name:"Workplace Equality", pct:74 },
            { name:"VAWC Awareness", pct:61 },
          ].map(m => (
            <div key={m.name} style={{ marginBottom:"16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
                <span style={{ fontSize:"12.5px", fontWeight:600, color:"#444" }}>{m.name}</span>
                <span style={{ fontSize:"12px", fontWeight:700, color:G.base }}>{m.pct}%</span>
              </div>
              <div style={{ background:G.wash, borderRadius:"4px", height:"6px" }}>
                <div style={{ width:`${m.pct}%`, height:"100%", borderRadius:"4px",
                  background:`linear-gradient(90deg,${G.base},${G.light})`, transition:"width .4s" }}/>
              </div>
            </div>
          ))}
          <Btn variant="ghost" small style={{ marginTop:"12px", width:"100%" }}>Download Report</Btn>
        </Card>
      </div>
    </div>
  );
}

/* ── Certification ── */
function CertManager() {
  const [items, setItems] = useState(SEED.certificates);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ student:"", course:"Introduction to GAD", template:"Standard" });

  const issue = () => {
    if (!form.student.trim()) return;
    setItems(p=>[...p,{ id:Date.now(), ...form, issued:new Date().toISOString().slice(0,10) }]);
    setModal(false);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"28px" }}>
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"26px", color:G.dark }}>Certification Management</h2>
          <p style={{ color:"#777", fontSize:"13px", marginTop:"4px" }}>Generate and distribute digital certificates.</p>
        </div>
        <Btn onClick={()=>{ setForm({student:"",course:"Introduction to GAD",template:"Standard"}); setModal(true); }}>＋ Issue Certificate</Btn>
      </div>

      <Card style={{ padding:0, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:G.cream }}>
              {["Student","Course","Template","Date Issued","Action"].map(h=>(
                <th key={h} style={{ padding:"14px 20px", textAlign:"left", fontSize:"11px",
                  fontWeight:700, color:G.base, letterSpacing:"1px", textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item,i)=>(
              <tr key={item.id} style={{ borderTop:`1px solid ${G.wash}`, background:i%2===0?"#fff":G.white }}>
                <td style={{ padding:"14px 20px", fontWeight:600, fontSize:"13.5px", color:"#333" }}>{item.student}</td>
                <td style={{ padding:"14px 20px", fontSize:"13px", color:"#666" }}>{item.course}</td>
                <td style={{ padding:"14px 20px" }}><Tag>{item.template}</Tag></td>
                <td style={{ padding:"14px 20px", fontSize:"13px", color:"#888" }}>{item.issued}</td>
                <td style={{ padding:"14px 20px" }}>
                  <Btn small variant="ghost">📥 Download</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {modal && (
        <Modal title="Issue Certificate" onClose={()=>setModal(false)}>
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <Input label="Student Name" value={form.student} onChange={v=>setForm(f=>({...f,student:v}))} placeholder="e.g. Maria Santos"/>
            <Select label="Course / Seminar" value={form.course} onChange={v=>setForm(f=>({...f,course:v}))}
              options={[...SEED.modules.map(m=>m.title),...SEED.seminars.map(s=>s.title)]}/>
            <Select label="Certificate Template" value={form.template} onChange={v=>setForm(f=>({...f,template:v}))} options={["Standard","Seminar","Excellence"]}/>
            <div style={{ display:"flex", gap:"12px", justifyContent:"flex-end", marginTop:"8px" }}>
              <Btn variant="ghost" onClick={()=>setModal(false)}>Cancel</Btn>
              <Btn onClick={issue}>Issue Certificate</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Seminar Manager ── */
function SeminarManager() {
  const [items, setItems] = useState(SEED.seminars);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title:"", date:"", time:"10:00 AM", status:"Upcoming" });

  const openAdd  = () => { setForm({ title:"", date:"", time:"10:00 AM", status:"Upcoming" }); setModal("add"); };
  const openEdit = (item) => { setForm({ title:item.title, date:item.date, time:item.time, status:item.status }); setModal(item); };
  const save = () => {
    if (!form.title.trim()||!form.date) return;
    if (modal==="add") setItems(p=>[...p,{id:Date.now(),...form,attendees:0}]);
    else setItems(p=>p.map(i=>i.id===modal.id?{...i,...form}:i));
    setModal(null);
  };

  const statusColor = s => s==="Upcoming"?{color:"#4a90d9",bg:"#eaf2fb"}:s==="Live"?{color:"#c0392b",bg:"#fdecea"}:{color:G.base,bg:G.wash};

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"28px" }}>
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"26px", color:G.dark }}>Seminar & Webinar Management</h2>
          <p style={{ color:"#777", fontSize:"13px", marginTop:"4px" }}>Schedule and host live GAD webinars.</p>
        </div>
        <Btn onClick={openAdd}>＋ Schedule Seminar</Btn>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"16px" }}>
        {items.map(item => {
          const sc = statusColor(item.status);
          return (
            <Card key={item.id} style={{ borderTop:`4px solid ${sc.color}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"14px" }}>
                <span style={{ fontSize:"28px" }}>🎙️</span>
                <Tag color={sc.color} bg={sc.bg}>{item.status}</Tag>
              </div>
              <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"16px", color:G.dark, marginBottom:"8px" }}>{item.title}</div>
              <div style={{ fontSize:"12.5px", color:"#888", marginBottom:"2px" }}>📅 {item.date} · {item.time}</div>
              <div style={{ fontSize:"12.5px", color:"#888", marginBottom:"16px" }}>👥 {item.attendees} attendees</div>
              <div style={{ display:"flex", gap:"8px" }}>
                {item.status==="Upcoming" && <Btn small variant="dark">Go Live</Btn>}
                <Btn small variant="ghost" onClick={()=>openEdit(item)}>Edit</Btn>
                <Btn small variant="danger" onClick={()=>setItems(p=>p.filter(i=>i.id!==item.id))}>Delete</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal==="add"?"Schedule Seminar":"Edit Seminar"} onClose={()=>setModal(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <Input label="Seminar Title" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="e.g. Women's Rights Forum"/>
            <Input label="Date" value={form.date} onChange={v=>setForm(f=>({...f,date:v}))} type="date"/>
            <Input label="Time" value={form.time} onChange={v=>setForm(f=>({...f,time:v}))} placeholder="e.g. 09:00 AM"/>
            <Select label="Status" value={form.status} onChange={v=>setForm(f=>({...f,status:v}))} options={["Upcoming","Live","Completed"]}/>
            <div style={{ display:"flex", gap:"12px", justifyContent:"flex-end", marginTop:"8px" }}>
              <Btn variant="ghost" onClick={()=>setModal(null)}>Cancel</Btn>
              <Btn onClick={save}>Save Seminar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Calendar ── */
function CalendarView() {
  const [items, setItems] = useState(SEED.events);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title:"", date:"", type:"Event", desc:"" });

  const openAdd  = () => { setForm({ title:"", date:"", type:"Event", desc:"" }); setModal("add"); };
  const openEdit = (item) => { setForm({ title:item.title, date:item.date, type:item.type, desc:item.desc }); setModal(item); };
  const save = () => {
    if (!form.title.trim()||!form.date) return;
    if (modal==="add") setItems(p=>[...p,{id:Date.now(),...form}]);
    else setItems(p=>p.map(i=>i.id===modal.id?{...i,...form}:i));
    setModal(null);
  };

  const typeColor = t => t==="Event"?{color:"#8e44ad",bg:"#f5eef8"}:t==="Meeting"?{color:"#e67e22",bg:"#fef5e7"}:{color:G.base,bg:G.wash};

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"28px" }}>
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"26px", color:G.dark }}>Calendar & Activity Management</h2>
          <p style={{ color:"#777", fontSize:"13px", marginTop:"4px" }}>Schedule GADRC events, activities, and meetings.</p>
        </div>
        <Btn onClick={openAdd}>＋ Add Event</Btn>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
        {items.sort((a,b)=>a.date.localeCompare(b.date)).map(item => {
          const tc = typeColor(item.type);
          return (
            <Card key={item.id} style={{ display:"flex", alignItems:"center", gap:"20px", padding:"20px 24px" }}>
              <div style={{ background:tc.bg, borderRadius:"12px", padding:"14px 16px", textAlign:"center", minWidth:"64px" }}>
                <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700, fontSize:"20px", color:tc.color }}>
                  {item.date.slice(8)}
                </div>
                <div style={{ fontSize:"10px", fontWeight:700, color:tc.color, letterSpacing:"1px", textTransform:"uppercase" }}>
                  {new Date(item.date+"T00:00:00").toLocaleString("default",{month:"short"})}
                </div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:"14px", color:"#333", marginBottom:"4px" }}>{item.title}</div>
                <div style={{ fontSize:"12.5px", color:"#888" }}>{item.desc}</div>
              </div>
              <Tag color={tc.color} bg={tc.bg}>{item.type}</Tag>
              <div style={{ display:"flex", gap:"8px" }}>
                <Btn small variant="ghost" onClick={()=>openEdit(item)}>Edit</Btn>
                <Btn small variant="danger" onClick={()=>setItems(p=>p.filter(i=>i.id!==item.id))}>Delete</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal==="add"?"Add Event":"Edit Event"} onClose={()=>setModal(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <Input label="Event Title" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="e.g. GAD Orientation"/>
            <Input label="Date" value={form.date} onChange={v=>setForm(f=>({...f,date:v}))} type="date"/>
            <Select label="Type" value={form.type} onChange={v=>setForm(f=>({...f,type:v}))} options={["Event","Activity","Meeting"]}/>
            <Input label="Description" value={form.desc} onChange={v=>setForm(f=>({...f,desc:v}))} placeholder="Brief description..."/>
            <div style={{ display:"flex", gap:"12px", justifyContent:"flex-end", marginTop:"8px" }}>
              <Btn variant="ghost" onClick={()=>setModal(null)}>Cancel</Btn>
              <Btn onClick={save}>Save Event</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════════════ */
function LoginPage({ onLogin }) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const submit = () => {
    setError("");
    if (!email || !password) { setError("Please enter your credentials."); return; }
    setLoading(true);
    setTimeout(() => {
      if (email === "admin@bloom.edu" && password === "admin123") {
        onLogin();
      } else {
        setError("Invalid credentials. Use admin@bloom.edu / admin123");
        setLoading(false);
      }
    }, 900);
  };

  return (
    <div style={{
      width:"100%", minHeight:"100vh",
      background:`linear-gradient(135deg,${G.dark} 0%,${G.mid} 50%,${G.base} 100%)`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'DM Sans','Segoe UI',sans-serif",
      position:"relative", overflow:"hidden",
    }}>
      {/* decorative blobs */}
      <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%",
        background:G.light, filter:"blur(90px)", opacity:.12, top:-120, right:-80 }}/>
      <div style={{ position:"absolute", width:300, height:300, borderRadius:"50%",
        background:G.pale, filter:"blur(70px)", opacity:.1, bottom:-60, left:40 }}/>

      {/* left panel - branding */}
      <div style={{ flex:"1 1 420px", maxWidth:480, padding:"60px 48px", color:"#fff", display:"flex", flexDirection:"column", gap:"28px" }}>
        <BloomLogo light/>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700,
            fontSize:"clamp(32px,4vw,52px)", lineHeight:1.1, marginBottom:"16px" }}>
            Admin<br/><span style={{ color:G.pale, fontStyle:"italic" }}>Control Center</span>
          </h1>
          <p style={{ fontSize:"15px", color:"rgba(255,255,255,.7)", lineHeight:1.75, maxWidth:"360px" }}>
            Manage GAD learning modules, run live seminars, track analytics, and issue certificates — all from one platform.
          </p>
        </div>

        {/* feature pills */}
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          {[
            { icon:"📂", text:"Module & Assessment Management" },
            { icon:"📊", text:"Real-time Analytics & Reports" },
            { icon:"🎙️", text:"Live Seminar Hosting" },
            { icon:"🎓", text:"Automated Certifications" },
          ].map(f => (
            <div key={f.text} style={{ display:"flex", alignItems:"center", gap:"12px",
              background:"rgba(255,255,255,.08)", borderRadius:"10px", padding:"10px 16px",
              border:"1px solid rgba(255,255,255,.12)" }}>
              <span style={{ fontSize:"18px" }}>{f.icon}</span>
              <span style={{ fontSize:"13px", color:"rgba(255,255,255,.85)", fontWeight:500 }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* right panel - form */}
      <div style={{ flex:"0 0 auto", width:"440px", margin:"40px 60px 40px 0",
        background:"#fff", borderRadius:"24px", padding:"48px 44px",
        boxShadow:"0 24px 80px rgba(0,0,0,.2)" }}>
        <div style={{ marginBottom:"32px" }}>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700,
            fontSize:"26px", color:G.dark, marginBottom:"6px" }}>Welcome back</h2>
          <p style={{ fontSize:"13.5px", color:"#888" }}>Sign in to your GADRC admin account.</p>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:"18px" }}>
          <Input label="Email Address" value={email} onChange={setEmail} type="email" placeholder="admin@bloom.edu"/>
          <Input label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••"/>

          {error && (
            <div style={{ background:"#fdecea", border:"1px solid #f5c6cb", borderRadius:"10px",
              padding:"10px 14px", fontSize:"12.5px", color:"#c0392b" }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={loading} style={{
            marginTop:"8px", background:`linear-gradient(135deg,${G.base},${G.dark})`,
            color:"#fff", border:"none", borderRadius:"12px", padding:"14px",
            fontSize:"15px", fontWeight:700, cursor: loading?"wait":"pointer",
            fontFamily:"'DM Sans',sans-serif", letterSpacing:".3px",
            transition:"opacity .2s, transform .15s",
            opacity: loading ? .7 : 1,
          }}
          onMouseEnter={e=>{ if(!loading) e.currentTarget.style.transform="translateY(-1px)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform=""; }}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>

          <div style={{ textAlign:"center", fontSize:"12px", color:"#bbb", marginTop:"4px" }}>
            Demo credentials: <strong style={{ color:G.base }}>admin@bloom.edu</strong> / <strong style={{ color:G.base }}>admin123</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   ADMIN SHELL
══════════════════════════════════════════════ */
const NAV_ITEMS = [
  { id:"dashboard",    icon:"🏠", label:"Dashboard" },
  { id:"modules",      icon:"📂", label:"Modules" },
  { id:"assessments",  icon:"📝", label:"Assessments" },
  { id:"analytics",    icon:"📊", label:"Analytics" },
  { id:"certificates", icon:"🎓", label:"Certificates" },
  { id:"seminars",     icon:"🎙️", label:"Seminars" },
  { id:"calendar",     icon:"📅", label:"Calendar" },
];

function AdminShell({ onLogout }) {
  const [active, setActive] = useState("dashboard");

  const views = {
    dashboard:    <DashboardHome/>,
    modules:      <ModuleManager/>,
    assessments:  <AssessmentManager/>,
    analytics:    <Analytics/>,
    certificates: <CertManager/>,
    seminars:     <SeminarManager/>,
    calendar:     <CalendarView/>,
  };

  return (
    <div style={{ display:"flex", width:"100%", minHeight:"100vh", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width:"240px", flexShrink:0,
        background:`linear-gradient(180deg,${G.dark} 0%,${G.mid} 100%)`,
        display:"flex", flexDirection:"column",
        position:"sticky", top:0, height:"100vh",
        overflowY:"auto",
      }}>
        <div style={{ padding:"28px 24px 20px" }}>
          <BloomLogo light/>
          <div style={{ marginTop:"8px", fontSize:"10px", color:"rgba(255,255,255,.4)",
            letterSpacing:"1.5px", textTransform:"uppercase" }}>Admin Portal</div>
        </div>

        <div style={{ height:"1px", background:"rgba(255,255,255,.1)", margin:"0 20px" }}/>

        <nav style={{ padding:"16px 12px", flex:1 }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={()=>setActive(item.id)} style={{
              display:"flex", alignItems:"center", gap:"12px",
              width:"100%", padding:"11px 14px", borderRadius:"10px",
              border:"none", cursor:"pointer", textAlign:"left",
              fontFamily:"'DM Sans',sans-serif", fontSize:"13.5px", fontWeight:500,
              marginBottom:"4px", transition:"all .18s",
              background: active===item.id ? "rgba(255,255,255,.15)" : "transparent",
              color: active===item.id ? "#fff" : "rgba(255,255,255,.6)",
              borderLeft: active===item.id ? `3px solid ${G.pale}` : "3px solid transparent",
            }}>
              <span style={{ fontSize:"16px" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding:"16px 20px 28px" }}>
          <div style={{ background:"rgba(255,255,255,.08)", borderRadius:"12px",
            padding:"14px 16px", marginBottom:"12px" }}>
            <div style={{ fontSize:"12px", fontWeight:700, color:"rgba(255,255,255,.9)" }}>GADRC Admin</div>
            <div style={{ fontSize:"11px", color:"rgba(255,255,255,.45)", marginTop:"2px" }}>admin@bloom.edu</div>
          </div>
          <button onClick={onLogout} style={{
            width:"100%", padding:"9px", borderRadius:"10px",
            border:"1px solid rgba(255,255,255,.15)", background:"transparent",
            color:"rgba(255,255,255,.55)", fontSize:"12.5px", cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif", transition:"all .18s",
          }}
          onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,.08)"; e.currentTarget.style.color="#fff"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,.55)"; }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex:1, background:G.white, overflowY:"auto" }}>
        {/* topbar */}
        <div style={{ background:"#fff", borderBottom:`1px solid ${G.wash}`,
          padding:"0 36px", height:"60px", display:"flex", alignItems:"center",
          justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
          <div style={{ fontSize:"14px", color:"#888" }}>
            <span style={{ color:G.base, fontWeight:600 }}>BLOOM</span>
            <span style={{ margin:"0 8px", color:"#ccc" }}>/</span>
            {NAV_ITEMS.find(n=>n.id===active)?.label}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ width:"36px", height:"36px", borderRadius:"50%",
              background:`linear-gradient(135deg,${G.base},${G.dark})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"14px", color:"#fff", fontWeight:700 }}>A</div>
          </div>
        </div>

        <div style={{ padding:"36px" }}>
          {views[active]}
        </div>
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════ */
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body,#root{width:100%;min-height:100vh;overflow-x:hidden;}
        body{margin:0!important;padding:0!important;}
        ::-webkit-scrollbar{width:6px;}
        ::-webkit-scrollbar-track{background:${G.cream};}
        ::-webkit-scrollbar-thumb{background:${G.pale};border-radius:3px;}
      `}</style>
      {loggedIn
        ? <AdminShell onLogout={() => setLoggedIn(false)}/>
        : <LoginPage  onLogin={()  => setLoggedIn(true)}/>
      }
    </>
  );
}