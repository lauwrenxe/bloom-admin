import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";
import ModulesPage from "./ModulesPage.jsx";
import AssessmentsPage from "./AssessmentsPage.jsx";
import DashboardPage from "./DashboardPage.jsx";
import SeminarsPage from "./SeminarsPage.jsx";
import CertificatesPage from "./CertificatesPage.jsx";
import CalendarPage from "./CalendarPage.jsx";
import AnalyticsPage from "./AnalyticsPage.jsx";
import StudentsPage from "./StudentsPage.jsx";
import AnnouncementsPage from "./AnnouncementsPage.jsx";

/* ─── palette ─── */
const G = {
  dark:"#2d4a18", mid:"#3a5a20", base:"#5a7a3a",
  light:"#8ab060", pale:"#b5cc8e", wash:"#e8f2d8",
  cream:"#f6f9f0", white:"#fafdf6",
};

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
    <span style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700,
      fontSize:"20px", color: light ? "#fff" : G.dark, letterSpacing:"1px" }}>BLOOM</span>
  </div>
);

const Input = ({ label, value, onChange, type="text", placeholder="" }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
    {label && <label style={{ fontSize:"12px", fontWeight:600, color:G.dark,
      letterSpacing:".4px", textTransform:"uppercase" }}>{label}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ border:`1.5px solid ${G.wash}`, borderRadius:"10px", padding:"10px 14px",
        fontSize:"13.5px", fontFamily:"'DM Sans',sans-serif", outline:"none",
        background:"#fff", color:"#222", transition:"border .18s" }}
      onFocus={e => e.target.style.borderColor = G.base}
      onBlur={e  => e.target.style.borderColor = G.wash}
    />
  </div>
);

function LoginPage({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const submit = async () => {
    setError("");
    if (!email || !password) { setError("Please enter your credentials."); return; }
    setLoading(true);

    const { data, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Invalid credentials. Please try again.");
      setLoading(false);
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", data.user.id)
      .single();

    if (roleData?.roles?.name !== "admin") {
      await supabase.auth.signOut();
      setError("Access denied. Admin accounts only.");
      setLoading(false);
      return;
    }

    onLogin(data.user);
  };

  const onKey = e => { if (e.key === "Enter") submit(); };

  return (
    <div style={{
      width:"100%", minHeight:"100vh",
      background:`linear-gradient(135deg,${G.dark} 0%,${G.mid} 50%,${G.base} 100%)`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'DM Sans','Segoe UI',sans-serif",
      position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%",
        background:G.light, filter:"blur(90px)", opacity:.12, top:-120, right:-80 }}/>
      <div style={{ position:"absolute", width:300, height:300, borderRadius:"50%",
        background:G.pale, filter:"blur(70px)", opacity:.1, bottom:-60, left:40 }}/>

      <div style={{ flex:"1 1 420px", maxWidth:480, padding:"60px 48px", color:"#fff",
        display:"flex", flexDirection:"column", gap:"28px" }}>
        <BloomLogo light/>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700,
            fontSize:"clamp(32px,4vw,52px)", lineHeight:1.1, marginBottom:"16px" }}>
            Admin<br/><span style={{ color:G.pale, fontStyle:"italic" }}>Control Center</span>
          </h1>
          <p style={{ fontSize:"15px", color:"rgba(255,255,255,.7)", lineHeight:1.75, maxWidth:"360px" }}>
            Manage GAD learning modules, run live seminars, track analytics, and issue certificates.
          </p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {[
            { icon:"📂", text:"Module & Assessment Management" },
            { icon:"📊", text:"Real-time Analytics & Reports"  },
            { icon:"🎙️", text:"Live Seminar Hosting"           },
            { icon:"🎓", text:"Automated Certifications"       },
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

      <div style={{ flex:"0 0 auto", width:"440px", margin:"40px 60px 40px 0",
        background:"#fff", borderRadius:"24px", padding:"48px 44px",
        boxShadow:"0 24px 80px rgba(0,0,0,.2)" }}>
        <div style={{ marginBottom:"32px" }}>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700,
            fontSize:"26px", color:G.dark, marginBottom:"6px" }}>Welcome back</h2>
          <p style={{ fontSize:"13.5px", color:"#888" }}>Sign in to your GADRC admin account.</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"18px" }} onKeyDown={onKey}>
          <Input label="Email Address" value={email} onChange={setEmail}
            type="email" placeholder="gadrc.admin@cvsu.edu.ph"/>
          <Input label="Password" value={password} onChange={setPassword}
            type="password" placeholder="••••••••"/>
          {error && (
            <div style={{ background:"#fdecea", border:"1px solid #f5c6cb",
              borderRadius:"10px", padding:"10px 14px", fontSize:"12.5px", color:"#c0392b" }}>
              {error}
            </div>
          )}
          <button onClick={submit} disabled={loading} style={{
            marginTop:"8px", border:"none", borderRadius:"12px", padding:"14px",
            background:`linear-gradient(135deg,${G.base},${G.dark})`,
            color:"#fff", fontSize:"15px", fontWeight:700,
            cursor: loading ? "wait" : "pointer",
            fontFamily:"'DM Sans',sans-serif", letterSpacing:".3px",
            opacity: loading ? .7 : 1, transition:"opacity .2s, transform .15s",
          }}
          onMouseEnter={e=>{ if(!loading) e.currentTarget.style.transform="translateY(-1px)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform=""; }}>
            {loading ? "Signing in…" : "Sign In →"}
          </button>
          <div style={{ textAlign:"center", fontSize:"12px", color:"#bbb" }}>
            Use your GADRC admin account credentials
          </div>
        </div>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { id:"dashboard",    icon:"🏠", label:"Dashboard"    },
  { id:"modules",      icon:"📂", label:"Modules"      },
  { id:"assessments",  icon:"📝", label:"Assessments"  },
  { id:"analytics",    icon:"📊", label:"Analytics"    },
  { id:"certificates", icon:"🎓", label:"Certificates" },
  { id:"seminars",     icon:"🎙️", label:"Seminars"     },
  { id:"calendar",     icon:"📅", label:"Calendar"     },
  { id: "students", icon: "👩‍🎓", label: "Students" },
  { id: "announcements", icon: "📢", label: "Announcements" }
];

function AdminShell({ onLogout, user }) {
  const [active, setActive] = useState("dashboard");

  return (
    <div style={{ display:"flex", width:"100%", minHeight:"100vh",
      fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>

      <aside style={{ width:"240px", flexShrink:0,
        background:`linear-gradient(180deg,${G.dark} 0%,${G.mid} 100%)`,
        display:"flex", flexDirection:"column",
        position:"sticky", top:0, height:"100vh", overflowY:"auto" }}>
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
              color:      active===item.id ? "#fff" : "rgba(255,255,255,.6)",
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
            <div style={{ fontSize:"12px", fontWeight:700, color:"rgba(255,255,255,.9)" }}>
              GADRC Admin
            </div>
            <div style={{ fontSize:"11px", color:"rgba(255,255,255,.45)", marginTop:"2px" }}>
              {user?.email}
            </div>
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

      <main style={{ flex:1, background:G.white, overflowY:"auto" }}>
        <div style={{ background:"#fff", borderBottom:`1px solid ${G.wash}`,
          padding:"0 36px", height:"60px", display:"flex", alignItems:"center",
          justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
          <div style={{ fontSize:"14px", color:"#888" }}>
            <span style={{ color:G.base, fontWeight:600 }}>BLOOM</span>
            <span style={{ margin:"0 8px", color:"#ccc" }}>/</span>
            {NAV_ITEMS.find(n=>n.id===active)?.label}
          </div>
          <div style={{ width:"36px", height:"36px", borderRadius:"50%",
            background:`linear-gradient(135deg,${G.base},${G.dark})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"14px", color:"#fff", fontWeight:700 }}>A</div>
        </div>
       <div style={{ padding:"36px" }}>
  {active === "dashboard"    && <DashboardPage />}
  {active === "modules"      && <ModulesPage />}
  {active === "assessments"  && <AssessmentsPage />}
  {active === "seminars" && <SeminarsPage />}
  {active === "certificates" && <CertificatesPage />}
  {active === "calendar" && <CalendarPage />}
  {active === "analytics" && <AnalyticsPage />}
  {active === "students" && <StudentsPage />}
  {active === "announcements" && <AnnouncementsPage />}
</div>
      </main>
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user,     setUser]     = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setUser(session.user); setLoggedIn(true); }
      setChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) { setUser(session.user); setLoggedIn(true); }
      else         { setUser(null); setLoggedIn(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLoggedIn(false);
    setUser(null);
  };

  if (checking) return (
    <div style={{ width:"100%", height:"100vh", display:"flex",
      alignItems:"center", justifyContent:"center",
      background:"#f6f9f0", fontFamily:"'DM Sans',sans-serif",
      fontSize:"14px", color:"#888" }}>
      Loading BLOOM…
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body,#root{width:100%;min-height:100vh;overflow-x:hidden;}
        body{margin:0!important;padding:0!important;}
        ::-webkit-scrollbar{width:6px;}
        ::-webkit-scrollbar-track{background:#f6f9f0;}
        ::-webkit-scrollbar-thumb{background:#b5cc8e;border-radius:3px;}
      `}</style>
      {loggedIn
        ? <AdminShell onLogout={handleLogout} user={user}/>
        : <LoginPage  onLogin={(u) => { setUser(u); setLoggedIn(true); }}/>
      }
    </>
  );
}
