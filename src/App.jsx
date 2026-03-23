import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";
import ModulesPage       from "./ModulesPage.jsx";
import AssessmentsPage   from "./AssessmentsPage.jsx";
import DashboardPage     from "./DashboardPage.jsx";
import SeminarsPage      from "./SeminarsPage.jsx";
import CertificatesPage  from "./CertificatesPage.jsx";
import CalendarPage      from "./CalendarPage.jsx";
import ReportsPage       from "./ReportsPage.jsx";
import StudentsPage      from "./StudentsPage.jsx";
import AnnouncementsPage from "./AnnouncementsPage.jsx";
import AdminProfilePage  from "./AdminProfilePage.jsx";

/* ─── Fluent / Teams Design Tokens ──────────────────────────── */
const T = {
  // Backgrounds
  appBg:      "#F5F5F5",
  surfaceL1:  "#FFFFFF",
  surfaceL2:  "#F9F9F9",
  surfaceL3:  "#F0F0F0",

  // Sidebar (Teams dark rail)
  rail:       "#1A2E1A",
  railHover:  "rgba(255,255,255,.08)",
  railActive: "rgba(255,255,255,.14)",
  railText:   "rgba(255,255,255,.6)",
  railTextActive: "#FFFFFF",
  railBorder: "rgba(255,255,255,.06)",

  // Brand — Teams purple-blue
  brand:      "#2D6A2D",
  brand2:     "#1F5C1F",
  brandLight: "#E8F5E9",
  brandBg:    "#F1F8F1",

  // Text
  text1:      "#242424",
  text2:      "#616161",
  text3:      "#9E9E9E",
  textInvert: "#FFFFFF",

  // Borders & Dividers
  border:     "#E0E0E0",
  borderSoft: "#EBEBEB",

  // Status
  success:    "#107C10",
  successBg:  "#DFF6DD",
  danger:     "#C50F1F",
  dangerBg:   "#FDE7E9",
  warning:    "#835B00",
  warningBg:  "#FFF4CE",
  info:       "#0078D4",
  infoBg:     "#DDEEFF",

  // Shadows
  shadow1:    "0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05)",
  shadow2:    "0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04)",
  shadow3:    "0 8px 24px rgba(0,0,0,.1),  0 4px 8px rgba(0,0,0,.05)",
};

const GLOBAL = `
  @import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@300;400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; min-height: 100vh; overflow-x: hidden; }
  body {
    margin: 0 !important;
    padding: 0 !important;
    background: ${T.appBg};
    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 14px;
    color: ${T.text1};
    -webkit-font-smoothing: antialiased;
  }
  ::-webkit-scrollbar       { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #D0D0D0; border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: #B0B0B0; }

  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(5px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: .4; }
  }

  .page-content { animation: fadeSlideIn .18s ease forwards; }
  .nav-tooltip  {
    position: absolute; left: 100%; top: 50%; transform: translateY(-50%);
    background: ${T.text1}; color: #fff; font-size: 12px; font-weight: 500;
    padding: 5px 10px; border-radius: 6px; white-space: nowrap;
    pointer-events: none; opacity: 0; transition: opacity .15s;
    margin-left: 10px; z-index: 999;
    box-shadow: ${T.shadow2};
  }
  .nav-item:hover .nav-tooltip { opacity: 1; }
`;

/* ─── BLOOM Logo ─────────────────────────────────────────────── */
const BloomLogo = ({ size=24, color="#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 30 30" fill="none">
    <circle cx="15" cy="15" r="4.8" fill={color} opacity=".9"/>
    <circle cx="15" cy="5.5"  r="3.5" fill={color} opacity=".7"/>
    <circle cx="15" cy="24.5" r="3.5" fill={color} opacity=".7"/>
    <circle cx="5.5"  cy="15" r="3.5" fill={color} opacity=".7"/>
    <circle cx="24.5" cy="15" r="3.5" fill={color} opacity=".7"/>
    <circle cx="8"  cy="8"  r="2.4" fill={color} opacity=".4"/>
    <circle cx="22" cy="8"  r="2.4" fill={color} opacity=".4"/>
    <circle cx="8"  cy="22" r="2.4" fill={color} opacity=".4"/>
    <circle cx="22" cy="22" r="2.4" fill={color} opacity=".4"/>
  </svg>
);

/* ─── Teams-style Input ──────────────────────────────────────── */
const TeamsInput = ({ label, value, onChange, type="text", placeholder="", hasError=false }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
    {label && (
      <label style={{ fontSize:12, fontWeight:600, color: hasError ? T.danger : T.text2 }}>
        {label}
      </label>
    )}
    <input
      type={type} value={value} onChange={e=>onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        border: `1px solid ${hasError ? T.danger : T.border}`,
        borderRadius:4, padding:"9px 12px", fontSize:14,
        fontFamily:"inherit", outline:"none",
        background: T.surfaceL1, color:T.text1,
        transition:"border-color .12s, box-shadow .12s",
      }}
      onFocus={e=>{ e.target.style.borderColor=hasError?T.danger:T.brand; e.target.style.borderWidth="2px"; e.target.style.boxShadow="none"; e.target.style.padding="8px 11px"; }}
      onBlur={e=>{ e.target.style.borderColor=hasError?T.danger:T.border; e.target.style.borderWidth="1px"; e.target.style.padding="9px 12px"; }}
    />
    {hasError && <span style={{ fontSize:11, color:T.danger }}>This field is required</span>}
  </div>
);

/* ─── Skeleton ───────────────────────────────────────────────── */
function Sk({ w="100%", h=14, r=4 }) {
  return <div style={{ width:w, height:h, borderRadius:r, background:`linear-gradient(90deg,${T.borderSoft} 25%,${T.appBg} 50%,${T.borderSoft} 75%)`, backgroundSize:"200% 100%", animation:"shimmer 1.3s infinite" }}/>;
}
function PageSkeleton() {
  return (
    <div style={{ padding:"28px 32px", display:"flex", flexDirection:"column", gap:18 }}>
      <Sk w={180} h={22} r={4}/> <Sk w={120} h={13} r={3}/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginTop:6 }}>
        {[1,2,3,4].map(i=><div key={i} style={{ background:T.surfaceL1, border:`1px solid ${T.border}`, borderRadius:8, padding:18, boxShadow:T.shadow1 }}><Sk h={13} w="60%" style={{marginBottom:10}}/><Sk h={28} w="40%"/></div>)}
      </div>
      <div style={{ background:T.surfaceL1, border:`1px solid ${T.border}`, borderRadius:8, height:200, boxShadow:T.shadow1 }}/>
    </div>
  );
}

/* ─── Nav Config ─────────────────────────────────────────────── */
const NAV = [
  { id:"dashboard",    icon:HomeIcon,        label:"Dashboard"     },
  { id:"reports",      icon:ReportIcon,      label:"Reports"       },
  null, // divider
  { id:"modules",      icon:BookIcon,        label:"Modules"       },
  { id:"assessments",  icon:QuizIcon,        label:"Assessments"   },
  { id:"certificates", icon:CertIcon,        label:"Certificates"  },
  null,
  { id:"seminars",     icon:SeminarIcon,     label:"Seminars"      },
  { id:"calendar",     icon:CalendarIcon,    label:"Calendar"      },
  null,
  { id:"students",     icon:StudentsIcon,    label:"Students"      },
  { id:"announcements",icon:AnnounceIcon,    label:"Announcements" },
];

/* ─── SVG Icon components ────────────────────────────────────── */
function HomeIcon({s=18,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>; }
function ReportIcon({s=18,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>; }
function BookIcon({s=18,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>; }
function QuizIcon({s=18,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01"/><line x1="9" y1="12" x2="15" y2="12"/></svg>; }
function CertIcon({s=18,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M8 12l-2 9 6-3 6 3-2-9"/></svg>; }
function SeminarIcon({s=18,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>; }
function CalendarIcon({s=18,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function StudentsIcon({s=18,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
function AnnounceIcon({s=18,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>; }

/* ─── Login ──────────────────────────────────────────────────── */
function LoginPage({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [emailErr, setEmailErr] = useState(false);
  const [passErr,  setPassErr]  = useState(false);

  const submit = async () => {
    setError(""); setEmailErr(false); setPassErr(false);
    if (!email || !password) {
      if (!email)    setEmailErr(true);
      if (!password) setPassErr(true);
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
    if (e) { setError("Invalid credentials. Please try again."); setLoading(false); return; }
    const { data: r } = await supabase.from("user_roles").select("roles(name)").eq("user_id", data.user.id).single();
    if (r?.roles?.name !== "admin") {
      await supabase.auth.signOut();
      setError("Access denied. Admin accounts only.");
      setLoading(false); return;
    }
    onLogin(data.user);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:`linear-gradient(135deg, #F1F8F1 0%, #E8F5E9 50%, #D7EED7 100%)`, fontFamily:"inherit", padding:20 }}>

      {/* Card */}
      <div style={{ background:T.surfaceL1, borderRadius:12, boxShadow:T.shadow3, width:"100%", maxWidth:420, overflow:"hidden" }}>

        {/* Top brand strip */}
        <div style={{ background:`linear-gradient(135deg, ${T.brand} 0%, ${T.brand2} 100%)`, padding:"28px 36px", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:10, background:"rgba(255,255,255,.18)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <BloomLogo size={26}/>
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:"#fff", letterSpacing:".2px" }}>BLOOM GAD</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.65)", marginTop:1 }}>GADRC CvSU Admin Portal</div>
          </div>
        </div>

        {/* Form area */}
        <div style={{ padding:"32px 36px 36px" }}>
          <h2 style={{ fontSize:20, fontWeight:600, color:T.text1, marginBottom:6 }}>Sign in</h2>
          <p style={{ fontSize:13, color:T.text3, marginBottom:28 }}>Use your GADRC admin account</p>

          <div style={{ display:"flex", flexDirection:"column", gap:16 }} onKeyDown={e=>e.key==="Enter"&&submit()}>
            <TeamsInput label="Email address" value={email} onChange={v=>{setEmail(v);if(v)setEmailErr(false);}} type="email" placeholder="admin@cvsu.edu.ph" hasError={emailErr}/>
            <TeamsInput label="Password" value={password} onChange={v=>{setPassword(v);if(v)setPassErr(false);}} type="password" placeholder="Enter your password" hasError={passErr}/>

            {error && (
              <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"10px 12px", background:T.dangerBg, borderRadius:4, borderLeft:`3px solid ${T.danger}` }}>
                <span style={{ fontSize:14, flexShrink:0 }}>⚠</span>
                <span style={{ fontSize:13, color:T.danger }}>{error}</span>
              </div>
            )}

            <button onClick={submit} disabled={loading} style={{
              marginTop:4, border:"none", borderRadius:4, padding:"10px 20px",
              background: loading ? T.brandLight : T.brand,
              color: loading ? T.brand : "#fff",
              fontSize:14, fontWeight:600, cursor:loading?"not-allowed":"pointer",
              fontFamily:"inherit", transition:"background .15s",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              {loading
                ? <><div style={{ width:14, height:14, border:`2px solid ${T.brand}`, borderTop:"2px solid transparent", borderRadius:"50%", animation:"spin .7s linear infinite" }}/> Signing in…</>
                : "Sign in"
              }
            </button>
          </div>

          <div style={{ marginTop:24, paddingTop:20, borderTop:`1px solid ${T.borderSoft}`, fontSize:12, color:T.text3, textAlign:"center" }}>
            Admin access only · Contact GADRC IT support for help
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Admin Shell ────────────────────────────────────────────── */
function AdminShell({ onLogout, user }) {
  const [active,      setActive]      = useState("dashboard");
  const [showProfile, setShowProfile] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);

  const navigate = (id) => {
    if (id === active) return;
    setPageLoading(true); setActive(id);
    setTimeout(()=>setPageLoading(false), 350);
  };

  const initials  = (user?.email??"A").slice(0,1).toUpperCase();
  const navItem   = NAV.filter(Boolean).find(n=>n.id===active);

  return (
    <div style={{ display:"flex", width:"100%", height:"100vh", overflow:"hidden", fontFamily:"inherit" }}>

      {/* ── Left rail (Teams-style icon bar) ── */}
      <aside style={{
        width: collapsed ? 60 : 220,
        flexShrink:0, background:T.rail,
        display:"flex", flexDirection:"column",
        height:"100vh",
        transition:"width .2s cubic-bezier(.4,0,.2,1)",
        overflow:"hidden",
        borderRight:`1px solid ${T.railBorder}`,
      }}>

        {/* Logo header */}
        <div style={{
          height:56, flexShrink:0,
          display:"flex", alignItems:"center",
          padding: collapsed ? "0" : "0 16px",
          justifyContent: collapsed ? "center" : "space-between",
          borderBottom:`1px solid ${T.railBorder}`,
        }}>
          {!collapsed ? (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <BloomLogo size={22}/>
                <span style={{ fontSize:15, fontWeight:700, color:"#fff", letterSpacing:".3px", whiteSpace:"nowrap" }}>BLOOM</span>
              </div>
              <button onClick={()=>setCollapsed(true)} style={{ background:"none", border:"none", color:T.railText, cursor:"pointer", padding:4, borderRadius:4, display:"flex", alignItems:"center", transition:"color .15s" }}
                onMouseEnter={e=>e.currentTarget.style.color="#fff"}
                onMouseLeave={e=>e.currentTarget.style.color=T.railText}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            </>
          ) : (
            <button onClick={()=>setCollapsed(false)} title="Expand sidebar" style={{ background:"none", border:"none", color:T.railText, cursor:"pointer", padding:4, display:"flex", alignItems:"center", transition:"color .15s" }}
              onMouseEnter={e=>e.currentTarget.style.color="#fff"}
              onMouseLeave={e=>e.currentTarget.style.color=T.railText}>
              <BloomLogo size={22}/>
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex:1, padding:"8px 0", overflowY:"auto", overflowX:"hidden" }}>
          {NAV.map((item, i) => {
            if (!item) return (
              <div key={`div-${i}`} style={{ height:1, background:T.railBorder, margin:"6px 10px" }}/>
            );
            const isActive = active === item.id;
            const Icon = item.icon;
            return (
              <div key={item.id} className="nav-item" style={{ position:"relative" }}>
                <button onClick={()=>navigate(item.id)}
                  style={{
                    display:"flex", alignItems:"center",
                    gap: collapsed ? 0 : 12,
                    justifyContent: collapsed ? "center" : "flex-start",
                    width:"100%", height:40,
                    padding: collapsed ? "0" : "0 16px",
                    border:"none", cursor:"pointer",
                    background: isActive ? T.railActive : "transparent",
                    color: isActive ? T.railTextActive : T.railText,
                    fontFamily:"inherit", fontSize:13, fontWeight: isActive ? 600 : 400,
                    transition:"background .12s, color .12s",
                    position:"relative",
                    borderRadius: 0,
                  }}
                  onMouseEnter={e=>{ if(!isActive){ e.currentTarget.style.background=T.railHover; e.currentTarget.style.color="rgba(255,255,255,.9)"; } }}
                  onMouseLeave={e=>{ if(!isActive){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.railText; } }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:3, height:20, background:T.brand, borderRadius:"0 3px 3px 0" }}/>
                  )}
                  <Icon s={18} c={isActive ? "#fff" : undefined}/>
                  {!collapsed && <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.label}</span>}
                </button>
                {/* Tooltip when collapsed */}
                {collapsed && <div className="nav-tooltip">{item.label}</div>}
              </div>
            );
          })}
        </nav>

        {/* Bottom: user avatar */}
        <div style={{ padding: collapsed ? "12px 0 16px" : "12px 12px 16px", borderTop:`1px solid ${T.railBorder}`, display:"flex", flexDirection:"column", gap:6 }}>
          {!collapsed ? (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 8px", borderRadius:6, cursor:"pointer", transition:"background .12s" }}
              onClick={()=>setShowProfile(true)}
              onMouseEnter={e=>e.currentTarget.style.background=T.railHover}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg, ${T.brand} 0%, #4CAF50 100%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>{initials}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.9)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>GADRC Admin</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.4)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email}</div>
              </div>
            </div>
          ) : (
            <button onClick={()=>setShowProfile(true)} title="Profile" style={{ background:"none", border:"none", cursor:"pointer", display:"flex", justifyContent:"center", padding:"4px 0" }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg,${T.brand},#4CAF50)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff" }}>{initials}</div>
            </button>
          )}
          <button onClick={onLogout}
            style={{ display:"flex", alignItems:"center", gap: collapsed?0:8, justifyContent: collapsed?"center":"flex-start", width:"100%", height:34, padding: collapsed?"0":"0 8px", border:"none", background:"transparent", color:"rgba(255,255,255,.35)", cursor:"pointer", fontFamily:"inherit", fontSize:12, borderRadius:6, transition:"all .12s" }}
            title={collapsed?"Sign Out":undefined}
            onMouseEnter={e=>{ e.currentTarget.style.background=T.railHover; e.currentTarget.style.color="rgba(255,255,255,.8)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,.35)"; }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", minWidth:0 }}>

        {/* Topbar */}
        <header style={{
          height:56, flexShrink:0,
          background:T.surfaceL1,
          borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 24px",
          boxShadow:"0 1px 2px rgba(0,0,0,.05)",
        }}>
          {/* Page title + breadcrumb */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {navItem && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:6, background:T.brandLight, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {navItem.icon && <navItem.icon s={15} c={T.brand}/>}
                </div>
                <span style={{ fontSize:15, fontWeight:600, color:T.text1 }}>{navItem.label}</span>
              </div>
            )}
            <span style={{ color:T.border, fontSize:16, marginLeft:2 }}>·</span>
            <span style={{ fontSize:12, color:T.text3 }}>GADRC CvSU</span>
          </div>

          {/* Right actions */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {/* Status badge */}
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px", background:T.brandLight, borderRadius:4, border:`1px solid ${T.brand}22` }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:T.brand, animation:"pulse 2s infinite" }}/>
              <span style={{ fontSize:11, fontWeight:600, color:T.brand }}>Live</span>
            </div>

            {/* Avatar button */}
            <button onClick={()=>setShowProfile(true)}
              style={{ width:32, height:32, borderRadius:"50%", background:`linear-gradient(135deg,${T.brand},#4CAF50)`, border:"none", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer", boxShadow:T.shadow1, transition:"transform .12s" }}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.07)"}
              onMouseLeave={e=>e.currentTarget.style.transform=""}>
              {initials}
            </button>
          </div>
        </header>

        {/* Page */}
        <main style={{ flex:1, overflowY:"auto", background:T.appBg }}>
          <div className="page-content" key={active}>
            {pageLoading ? <PageSkeleton/> : (
              <>
                {active==="dashboard"     && <DashboardPage/>}
                {active==="modules"       && <ModulesPage/>}
                {active==="assessments"   && <AssessmentsPage/>}
                {active==="seminars"      && <SeminarsPage/>}
                {active==="certificates"  && <CertificatesPage/>}
                {active==="calendar"      && <CalendarPage/>}
                {active==="reports"       && <ReportsPage/>}
                {active==="students"      && <StudentsPage/>}
                {active==="announcements" && <AnnouncementsPage/>}
              </>
            )}
          </div>
        </main>
      </div>

      {showProfile && <AdminProfilePage user={user} onClose={()=>setShowProfile(false)}/>}
    </div>
  );
}

/* ─── Root ───────────────────────────────────────────────────── */
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user,     setUser]     = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session){setUser(session.user);setLoggedIn(true);}
      setChecking(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      if(session){setUser(session.user);setLoggedIn(true);}
      else{setUser(null);setLoggedIn(false);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  const handleLogout=async()=>{
    await supabase.auth.signOut();
    setLoggedIn(false);setUser(null);
  };

  if(checking) return (
    <>
      <style>{GLOBAL}</style>
      <div style={{ width:"100%", height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:20, background:T.rail }}>
        <BloomLogo size={36}/>
        <div style={{ display:"flex", gap:5 }}>
          {[0,1,2].map(i=>(
            <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"rgba(255,255,255,.4)", animation:`pulse 1.2s ease ${i*.2}s infinite` }}/>
          ))}
        </div>
        <span style={{ fontSize:12, color:"rgba(255,255,255,.3)", marginTop:4, letterSpacing:1 }}>BLOOM GAD</span>
      </div>
    </>
  );

  return (
    <>
      <style>{GLOBAL}</style>
      {loggedIn
        ? <AdminShell onLogout={handleLogout} user={user}/>
        : <LoginPage  onLogin={u=>{setUser(u);setLoggedIn(true);}}/>
      }
    </>
  );
}