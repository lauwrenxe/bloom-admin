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
import AdminProfilePage from "./AdminProfilePage.jsx";

/* ─── palette ─── */
const G = {
  dark:"#2d4a18", mid:"#3a5a20", base:"#5a7a3a",
  light:"#8ab060", pale:"#b5cc8e", wash:"#e8f2d8",
  cream:"#f6f9f0", white:"#fafdf6",
};

/* ─── Logo ─── */
const BloomLogo = ({ light, small }) => (
  <div style={{ display:"flex", alignItems:"center", gap: small ? 7 : 9 }}>
    <svg width={small ? 22 : 28} height={small ? 22 : 28} viewBox="0 0 30 30" fill="none">
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
    <span style={{
      fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700,
      fontSize: small ? 16 : 20, color: light ? "#fff" : G.dark, letterSpacing:"1px",
    }}>BLOOM</span>
  </div>
);

/* ─── Input — supports hasError for field highlighting (BLOOM-W-AUTH-03) ─── */
const Input = ({ label, value, onChange, type="text", placeholder="", hasError=false }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
    {label && (
      <label style={{
        fontSize:"12px", fontWeight:600,
        color: hasError ? "#c0392b" : G.dark,
        letterSpacing:".4px", textTransform:"uppercase",
      }}>{label}</label>
    )}
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        border: `1.5px solid ${hasError ? "#e74c3c" : G.wash}`,
        borderRadius:"10px", padding:"10px 14px",
        fontSize:"13.5px", fontFamily:"'DM Sans',sans-serif",
        outline:"none",
        background: hasError ? "#fff8f8" : "#fff",
        color:"#222", transition:"border .18s",
      }}
      onFocus={e => e.target.style.borderColor = hasError ? "#e74c3c" : G.base}
      onBlur={e  => e.target.style.borderColor = hasError ? "#e74c3c" : G.wash}
    />
    {hasError && (
      <span style={{ fontSize:"11px", color:"#c0392b", fontWeight:600, marginTop:"2px" }}>
        This field is required
      </span>
    )}
  </div>
);

/* ─── Skeleton loader ─── */
function Skeleton({ width = "100%", height = 16, radius = 8, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: `linear-gradient(90deg, ${G.wash} 25%, ${G.cream} 50%, ${G.wash} 75%)`,
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      ...style,
    }} />
  );
}

function PageSkeleton() {
  return (
    <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
      <Skeleton width={220} height={28} />
      <Skeleton width={160} height={14} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 8 }}>
        {[1,2,3,4].map(i => <Skeleton key={i} height={90} radius={14} />)}
      </div>
      <Skeleton height={200} radius={14} />
      <Skeleton height={140} radius={14} />
    </div>
  );
}

/* ─── Login ─── */
function LoginPage({ onLogin }) {
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [error,         setError]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [emailError,    setEmailError]    = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const submit = async () => {
    setError("");
    setEmailError(false);
    setPasswordError(false);

    // Field validation with visual highlighting (BLOOM-W-AUTH-03)
    if (!email || !password) {
      if (!email)    setEmailError(true);
      if (!password) setPasswordError(true);
      setError("Please enter your credentials.");
      return;
    }

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
          <Input
            label="Email Address"
            value={email}
            onChange={v => { setEmail(v); if (v) setEmailError(false); }}
            type="email"
            placeholder="gadrc.admin@cvsu.edu.ph"
            hasError={emailError}
          />
          <Input
            label="Password"
            value={password}
            onChange={v => { setPassword(v); if (v) setPasswordError(false); }}
            type="password"
            placeholder="••••••••"
            hasError={passwordError}
          />
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

/* ─── Nav items ─── */
const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { id:"dashboard",    icon:"🏠", label:"Dashboard"    },
      { id:"analytics",    icon:"📊", label:"Analytics"    },
    ],
  },
  {
    label: "Learning",
    items: [
      { id:"modules",      icon:"📂", label:"Modules"      },
      { id:"assessments",  icon:"📝", label:"Assessments"  },
      { id:"certificates", icon:"🎓", label:"Certificates" },
    ],
  },
  {
    label: "Events",
    items: [
      { id:"seminars",     icon:"🎙️", label:"Seminars"     },
      { id:"calendar",     icon:"📅", label:"Calendar"     },
    ],
  },
  {
    label: "Community",
    items: [
      { id:"students",       icon:"👩‍🎓", label:"Students"       },
      { id:"announcements",  icon:"📢", label:"Announcements"  },
    ],
  },
];

const ALL_NAV = NAV_SECTIONS.flatMap(s => s.items);

/* ─── Admin Shell ─── */
function AdminShell({ onLogout, user }) {
  const [active,      setActive]      = useState("dashboard");
  const [showProfile, setShowProfile] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);

  const navigate = (id) => {
    if (id === active) return;
    setPageLoading(true);
    setActive(id);
    setTimeout(() => setPageLoading(false), 420);
  };

  const initials = (user?.email ?? "A").slice(0, 1).toUpperCase();
  const currentPage = ALL_NAV.find(n => n.id === active);

  return (
    <div style={{ display:"flex", width:"100%", height:"100vh", overflow:"hidden",
      fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 68 : 240,
        flexShrink: 0,
        background:`linear-gradient(180deg,${G.dark} 0%,${G.mid} 100%)`,
        display:"flex", flexDirection:"column",
        height:"100vh", overflowY:"auto",
        overflowX:"hidden",
        transition:"width .22s cubic-bezier(.4,0,.2,1)",
      }}>
        <div style={{
          padding: collapsed ? "24px 0" : "26px 22px 18px",
          display:"flex", alignItems:"center",
          justifyContent: collapsed ? "center" : "space-between",
        }}>
          {!collapsed && <BloomLogo light />}
          {collapsed && (
            <svg width="22" height="22" viewBox="0 0 30 30" fill="none">
              <circle cx="15" cy="15" r="5.5" fill={G.pale}/>
              <circle cx="15" cy="5"  r="4.2" fill="#fff"/>
              <circle cx="15" cy="25" r="4.2" fill="#fff"/>
              <circle cx="5"  cy="15" r="4.2" fill="#fff"/>
              <circle cx="25" cy="15" r="4.2" fill="#fff"/>
            </svg>
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} style={{
              background:"rgba(255,255,255,.1)", border:"none", borderRadius:6,
              color:"rgba(255,255,255,.6)", cursor:"pointer", padding:"4px 7px", fontSize:14,
            }}>‹</button>
          )}
        </div>

        {collapsed && (
          <button onClick={() => setCollapsed(false)} style={{
            background:"rgba(255,255,255,.1)", border:"none", borderRadius:6, margin:"0 auto 12px",
            color:"rgba(255,255,255,.6)", cursor:"pointer", padding:"4px 8px", fontSize:14,
          }}>›</button>
        )}

        <div style={{ height:"1px", background:"rgba(255,255,255,.1)", margin:"0 16px 8px" }}/>

        <nav style={{ padding: collapsed ? "8px 6px" : "8px 10px", flex:1 }}>
          {NAV_SECTIONS.map(section => (
            <div key={section.label} style={{ marginBottom: collapsed ? 12 : 20 }}>
              {!collapsed && (
                <div style={{
                  fontSize:10, fontWeight:700, letterSpacing:"1.2px",
                  textTransform:"uppercase", color:"rgba(255,255,255,.3)",
                  padding:"0 8px", marginBottom:6,
                }}>{section.label}</div>
              )}
              {section.items.map(item => {
                const isActive = active === item.id;
                return (
                  <button key={item.id} onClick={() => navigate(item.id)}
                    title={collapsed ? item.label : ""}
                    style={{
                      display:"flex", alignItems:"center",
                      gap: collapsed ? 0 : 10,
                      justifyContent: collapsed ? "center" : "flex-start",
                      width:"100%", padding: collapsed ? "10px 0" : "9px 12px",
                      borderRadius:"10px", border:"none", cursor:"pointer",
                      textAlign:"left", fontFamily:"'DM Sans',sans-serif",
                      fontSize:"13px", fontWeight: isActive ? 600 : 400,
                      marginBottom:"2px", transition:"all .15s",
                      background: isActive ? "rgba(255,255,255,.16)" : "transparent",
                      color: isActive ? "#fff" : "rgba(255,255,255,.55)",
                      borderLeft: !collapsed
                        ? `3px solid ${isActive ? G.pale : "transparent"}`
                        : "none",
                      boxShadow: isActive && !collapsed
                        ? "inset 0 0 0 1px rgba(255,255,255,.08)"
                        : "none",
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = "rgba(255,255,255,.08)";
                        e.currentTarget.style.color = "rgba(255,255,255,.85)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "rgba(255,255,255,.55)";
                      }
                    }}
                  >
                    <span style={{ fontSize:16, flexShrink:0 }}>{item.icon}</span>
                    {!collapsed && item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: collapsed ? "12px 6px" : "12px 14px 24px" }}>
          <div style={{ height:"1px", background:"rgba(255,255,255,.08)", marginBottom:12 }}/>
          {!collapsed ? (
            <>
              <div style={{
                background:"rgba(255,255,255,.07)", borderRadius:12,
                padding:"12px 14px", marginBottom:10,
                border:"1px solid rgba(255,255,255,.08)",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{
                    width:32, height:32, borderRadius:"50%",
                    background:`linear-gradient(135deg,${G.light},${G.base})`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:13, fontWeight:700, color:"#fff", flexShrink:0,
                  }}>{initials}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.9)",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      GADRC Admin
                    </div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.4)",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {user?.email}
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={onLogout} style={{
                width:"100%", padding:"8px", borderRadius:10,
                border:"1px solid rgba(255,255,255,.12)", background:"transparent",
                color:"rgba(255,255,255,.5)", fontSize:"12px", cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif", transition:"all .15s",
              }}
              onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,.08)"; e.currentTarget.style.color="#fff"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,.5)"; }}>
                Sign Out
              </button>
            </>
          ) : (
            <button onClick={onLogout} title="Sign Out" style={{
              width:"100%", padding:"8px 0", borderRadius:10,
              border:"1px solid rgba(255,255,255,.12)", background:"transparent",
              color:"rgba(255,255,255,.5)", fontSize:16, cursor:"pointer",
              transition:"all .15s",
            }}
            onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,255,255,.08)"; e.currentTarget.style.color="#fff"; }}
            onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,.5)"; }}>
              ⏻
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex:1, background:G.cream, overflowY:"auto", minWidth:0, height:"100vh" }}>
        <div style={{
          background:G.white, borderBottom:`1px solid ${G.wash}`,
          padding:"0 32px", height:58,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          position:"sticky", top:0, zIndex:50,
          boxShadow:"0 1px 8px rgba(45,74,24,.05)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:18 }}>{currentPage?.icon}</span>
            <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:700,
              fontSize:16, color:G.dark }}>{currentPage?.label}</span>
            <span style={{ fontSize:12, color:G.pale, margin:"0 4px" }}>•</span>
            <span style={{ fontSize:12, color:"#aaa" }}>GADRC Admin Portal</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ fontSize:12, color:G.light, fontWeight:500,
              background:G.wash, padding:"4px 10px", borderRadius:20 }}>
              🌸 BLOOM
            </div>
            <div onClick={() => setShowProfile(true)}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
              onMouseLeave={e => e.currentTarget.style.transform = ""}
              style={{
                width:34, height:34, borderRadius:"50%",
                background:`linear-gradient(135deg,${G.base},${G.dark})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, color:"#fff", fontWeight:700,
                boxShadow:`0 2px 8px rgba(45,74,24,.25)`,
                cursor:"pointer", transition:"transform .15s",
              }}>{initials}</div>
          </div>
        </div>

        <div>
          {pageLoading ? <PageSkeleton /> : (
            <>
              {active === "dashboard"     && <DashboardPage />}
              {active === "modules"       && <ModulesPage />}
              {active === "assessments"   && <AssessmentsPage />}
              {active === "seminars"      && <SeminarsPage />}
              {active === "certificates"  && <CertificatesPage />}
              {active === "calendar"      && <CalendarPage />}
              {active === "analytics"     && <AnalyticsPage />}
              {active === "students"      && <StudentsPage />}
              {active === "announcements" && <AnnouncementsPage />}
            </>
          )}
        </div>
      </main>

      {showProfile && <AdminProfilePage user={user} onClose={() => setShowProfile(false)} />}
    </div>
  );
}

/* ─── Root ─── */
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
      alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16,
      background:G.cream, fontFamily:"'DM Sans',sans-serif" }}>
      <svg width="40" height="40" viewBox="0 0 30 30" fill="none">
        <circle cx="15" cy="15" r="5.5" fill={G.base}/>
        <circle cx="15" cy="5"  r="4.2" fill={G.light}/>
        <circle cx="15" cy="25" r="4.2" fill={G.light}/>
        <circle cx="5"  cy="15" r="4.2" fill={G.light}/>
        <circle cx="25" cy="15" r="4.2" fill={G.light}/>
      </svg>
      <div style={{ fontSize:14, color:G.base, fontWeight:500 }}>Loading BLOOM…</div>
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
        ::-webkit-scrollbar-track{background:${G.cream};}
        ::-webkit-scrollbar-thumb{background:${G.pale};border-radius:3px;}
        ::-webkit-scrollbar-thumb:hover{background:${G.light};}
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {loggedIn
        ? <AdminShell onLogout={handleLogout} user={user}/>
        : <LoginPage  onLogin={(u) => { setUser(u); setLoggedIn(true); }}/>
      }
    </>
  );
}