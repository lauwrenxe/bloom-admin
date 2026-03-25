import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";
import ModulesPage       from "./ModulesPage.jsx";
import DashboardPage     from "./DashboardPage.jsx";
import SeminarsPage      from "./SeminarsPage.jsx";
import CertificatesPage  from "./CertificatesPage.jsx";
import CalendarPage      from "./CalendarPage.jsx";
import ReportsPage       from "./ReportsPage.jsx";
import StudentsPage      from "./StudentsPage.jsx";
import AnnouncementsPage from "./AnnouncementsPage.jsx";
import AdminProfilePage  from "./AdminProfilePage.jsx";

/* ─── Bootstrap 5 + Libraries loader ─────────────────────────── */
const BOOTSTRAP_CSS = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
const BOOTSTRAP_JS  = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
const BI_CSS        = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";
const INTER_CSS     = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap";

function loadCSS(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet"; l.href = href;
  document.head.appendChild(l);
}
function loadJS(src) {
  return new Promise(resolve => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = resolve;
    document.head.appendChild(s);
  });
}

/* ─── Global override styles ──────────────────────────────────── */
const GLOBAL_CSS = `
  :root {
    --bs-primary:       #2D6A2D;
    --bs-primary-rgb:   45,106,45;
    --bs-success:       #4CAF50;
    --bs-dark:          #1A2E1A;
    --bs-border-color:  #DDE8DD;
    --bs-body-bg:       #F5F7F5;
    --bs-body-color:    #1A2E1A;
    --bs-body-font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    --bs-border-radius: 0.5rem;
    --bs-border-radius-lg: 0.75rem;
  }
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { margin: 0; padding: 0; width: 100%; min-height: 100vh; overflow-x: hidden; }
  body {
    font-family: var(--bs-body-font-family) !important;
    font-size: 14px;
    background: var(--bs-body-bg) !important;
    color: var(--bs-body-color) !important;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #C8E6C9; border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: #4CAF50; }

  /* ── Bootstrap overrides ── */
  .btn { border-radius: 6px !important; font-size: 13px !important; font-weight: 500 !important; }
  .btn-primary { background-color: #2D6A2D !important; border-color: #2D6A2D !important; }
  .btn-primary:hover { background-color: #1F5C1F !important; border-color: #1F5C1F !important; }
  .btn-outline-primary { color: #2D6A2D !important; border-color: #2D6A2D !important; }
  .btn-outline-primary:hover { background-color: #2D6A2D !important; color: #fff !important; }
  .card { border-radius: 10px !important; border: 1px solid #DDE8DD !important; box-shadow: 0 1px 4px rgba(26,46,26,.06) !important; }
  .table th { font-size: 11px !important; text-transform: uppercase !important; letter-spacing: .5px !important; font-weight: 600 !important; color: #6C757D !important; }
  .form-control, .form-select {
    border-color: #DDE8DD !important; border-radius: 6px !important; font-size: 13px !important;
  }
  .form-control:focus, .form-select:focus {
    border-color: #2D6A2D !important; box-shadow: 0 0 0 0.2rem rgba(45,106,45,.15) !important;
  }
  .badge { font-size: 11px !important; font-weight: 600 !important; border-radius: 20px !important; }
  .modal-content { border-radius: 12px !important; border: none !important; box-shadow: 0 8px 32px rgba(0,0,0,.12) !important; }
  .modal-header { border-bottom: 1px solid #DDE8DD !important; padding: 1rem 1.25rem !important; }
  .modal-footer { border-top: 1px solid #DDE8DD !important; padding: .75rem 1.25rem !important; }
  .nav-tabs .nav-link { color: #6C757D !important; border: none !important; border-bottom: 2px solid transparent !important; padding: .5rem 1rem !important; font-size: 13px !important; font-weight: 500 !important; }
  .nav-tabs .nav-link.active { color: #2D6A2D !important; border-bottom-color: #2D6A2D !important; font-weight: 600 !important; background: transparent !important; }
  .nav-tabs { border-bottom: 1px solid #DDE8DD !important; }
  .dropdown-item:hover { background-color: #E8F5E9 !important; color: #2D6A2D !important; }
  .bg-success-subtle { background-color: #DFF6DD !important; }
  .bg-danger-subtle  { background-color: #FDE7E9 !important; }
  .bg-warning-subtle { background-color: #FFF4CE !important; }
  .bg-primary-subtle { background-color: #E8F5E9 !important; }
  .text-primary { color: #2D6A2D !important; }
  .text-success { color: #107C10 !important; }
  .text-danger  { color: #C50F1F !important; }

  /* ── Sidebar ── */
  .bloom-sidebar {
    width: 224px; min-width: 224px;
    background: #1A2E1A;
    height: 100vh; overflow-y: auto; overflow-x: hidden;
    display: flex; flex-direction: column;
    transition: width .2s cubic-bezier(.4,0,.2,1), min-width .2s;
    border-right: 1px solid rgba(255,255,255,.06);
    flex-shrink: 0;
    position: sticky; top: 0;
  }
  .bloom-sidebar.collapsed { width: 60px !important; min-width: 60px !important; }
  .bloom-sidebar .sidebar-logo {
    height: 56px; display: flex; align-items: center;
    padding: 0 16px; gap: 10px;
    border-bottom: 1px solid rgba(255,255,255,.07);
    flex-shrink: 0;
  }
  .bloom-sidebar .sidebar-section-label {
    font-size: 10px; font-weight: 700; letter-spacing: 1.3px;
    text-transform: uppercase; color: rgba(255,255,255,.22);
    padding: 0 8px 4px; margin-top: 12px; margin-bottom: 2px;
  }
  .bloom-sidebar .nav-link-bloom {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 8px 10px; border: none; background: transparent;
    color: rgba(255,255,255,.58); font-size: 13px; font-weight: 400;
    border-radius: 6px; margin-bottom: 2px; cursor: pointer;
    transition: background .12s, color .12s; text-align: left;
    white-space: nowrap; overflow: hidden;
    position: relative;
  }
  .bloom-sidebar .nav-link-bloom:hover { background: rgba(255,255,255,.08); color: rgba(255,255,255,.9); }
  .bloom-sidebar .nav-link-bloom.active { background: rgba(255,255,255,.14); color: #fff; font-weight: 600; }
  .bloom-sidebar .nav-link-bloom.active::before {
    content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
    width: 3px; height: 18px; background: #4CAF50; border-radius: 0 3px 3px 0;
  }
  .bloom-sidebar .nav-link-bloom i { font-size: 16px; flex-shrink: 0; }
  .bloom-sidebar .sidebar-user { border-top: 1px solid rgba(255,255,255,.07); padding: 10px; }

  /* ── Topbar ── */
  .bloom-topbar {
    height: 56px; background: #fff; border-bottom: 1px solid #DDE8DD;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; position: sticky; top: 0; z-index: 100;
    box-shadow: 0 1px 2px rgba(26,46,26,.04); flex-shrink: 0;
  }

  /* ── Icon box ── */
  .icon-box {
    width: 38px; height: 38px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px; flex-shrink: 0;
  }
  .icon-box-sm { width: 28px; height: 28px; border-radius: 7px; font-size: 14px; }

  /* ── Stat card ── */
  .stat-card { border-top: 3px solid transparent; }
  .stat-value { font-size: 2rem; font-weight: 800; line-height: 1; }

  /* ── Page animation ── */
  @keyframes pageIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
  .page-enter { animation: pageIn .18s ease forwards; }

  /* ── Skeleton ── */
  @keyframes shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
  .skeleton {
    background: linear-gradient(90deg,#EBF2EB 25%,#F5F7F5 50%,#EBF2EB 75%);
    background-size: 200% 100%; animation: shimmer 1.3s infinite; border-radius: 4px;
  }

  /* ── Hover lift ── */
  .hover-lift { transition: transform .18s, box-shadow .18s; }
  .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(26,46,26,.1) !important; }

  /* ── Priority strip ── */
  .priority-strip-urgent  { border-left: 3px solid #C50F1F !important; }
  .priority-strip-high    { border-left: 3px solid #F59E0B !important; }
  .priority-strip-normal  { border-left: 3px solid #DDE8DD !important; }

  /* ── Table ── */
  .table-bloom th { background: #F9FBF9; padding: 10px 14px; }
  .table-bloom td { padding: 11px 14px; vertical-align: middle; }
  .table-bloom tbody tr:hover { background: #F5F7F5; }
`;

/* ─── NAV CONFIG ─────────────────────────────────────────────── */
const NAV_SECTIONS = [
  { label:"Overview", items:[
    { id:"dashboard",    icon:"bi-speedometer2",      label:"Dashboard"     },
    { id:"reports",      icon:"bi-file-earmark-bar-graph", label:"Reports"  },
  ]},
  { label:"Learning", items:[
    { id:"modules",      icon:"bi-book",              label:"Modules"       },
    { id:"certificates", icon:"bi-patch-check",       label:"Certificates"  },
  ]},
  { label:"Events", items:[
    { id:"seminars",     icon:"bi-people",            label:"Seminars"      },
    { id:"calendar",     icon:"bi-calendar3",         label:"Calendar"      },
  ]},
  { label:"Community", items:[
    { id:"students",     icon:"bi-people",             label:"Users"     },
    { id:"announcements",icon:"bi-megaphone",         label:"Announcements" },
  ]},
];
const ALL_NAV = NAV_SECTIONS.flatMap(s => s.items);

/* ─── LOGIN ──────────────────────────────────────────────────── */
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
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{ background:"linear-gradient(135deg,#F1F8F1 0%,#E8F5E9 50%,#D7EED7 100%)" }}>
      <div className="card border-0 shadow-lg overflow-hidden" style={{ width:420, borderRadius:14 }}>
        {/* Brand strip */}
        <div className="p-4 d-flex align-items-center gap-3"
          style={{ background:"linear-gradient(135deg,#2D6A2D,#1A2E1A)" }}>
          <div className="icon-box bg-white bg-opacity-10 text-white" style={{ width:48,height:48,borderRadius:12,fontSize:22 }}>
            <i className="bi bi-flower2"/>
          </div>
          <div>
            <div className="fw-bold text-white" style={{ fontSize:18 }}>BLOOM GAD</div>
            <div style={{ fontSize:12,color:"rgba(255,255,255,.6)" }}>GADRC CvSU Admin Portal</div>
          </div>
        </div>

        {/* Form */}
        <div className="card-body p-4">
          <h5 className="fw-bold mb-1" style={{ color:"#1A2E1A" }}>Sign in</h5>
          <p className="text-muted mb-4" style={{ fontSize:13 }}>Use your GADRC admin credentials</p>

          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize:12 }}>Email address</label>
            <input className={`form-control ${emailErr?"is-invalid":""}`} type="email"
              value={email} onChange={e=>{setEmail(e.target.value);if(e.target.value)setEmailErr(false);}}
              placeholder="admin@cvsu.edu.ph" onKeyDown={e=>e.key==="Enter"&&submit()}/>
            {emailErr&&<div className="invalid-feedback">This field is required</div>}
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize:12 }}>Password</label>
            <input className={`form-control ${passErr?"is-invalid":""}`} type="password"
              value={password} onChange={e=>{setPassword(e.target.value);if(e.target.value)setPassErr(false);}}
              placeholder="Enter your password" onKeyDown={e=>e.key==="Enter"&&submit()}/>
            {passErr&&<div className="invalid-feedback">This field is required</div>}
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2" style={{ fontSize:13,borderRadius:8 }}>
              <i className="bi bi-exclamation-triangle-fill"/>{error}
            </div>
          )}

          <button className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={submit} disabled={loading} style={{ padding:"10px" }}>
            {loading
              ? <><span className="spinner-border spinner-border-sm"/>Signing in…</>
              : <>Sign in <i className="bi bi-arrow-right"/></>
            }
          </button>

          <p className="text-center text-muted mt-3 mb-0" style={{ fontSize:11 }}>
            Admin access only · Contact GADRC IT for support
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── SKELETON ───────────────────────────────────────────────── */
function PageSkeleton() {
  return (
    <div className="p-4">
      <div className="skeleton mb-2" style={{ width:180,height:22 }}/>
      <div className="skeleton mb-4" style={{ width:120,height:13 }}/>
      <div className="row g-3 mb-4">
        {[1,2,3,4].map(i=>(
          <div key={i} className="col-lg-3">
            <div className="card p-3"><div className="skeleton mb-2" style={{ height:13,width:"60%" }}/><div className="skeleton" style={{ height:28,width:"40%" }}/></div>
          </div>
        ))}
      </div>
      <div className="card" style={{ height:200 }}/>
    </div>
  );
}

/* ─── ADMIN SHELL ────────────────────────────────────────────── */
function AdminShell({ onLogout, user }) {
  const [active,      setActive]      = useState("dashboard");
  const [showProfile, setShowProfile] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  useEffect(() => {
    loadCSS(INTER_CSS); loadCSS(BI_CSS);
    loadJS(BOOTSTRAP_JS);
  }, []);

  const navigate = (id) => {
    if (id === active) return;
    setPageLoading(true); setActive(id);
    setTimeout(() => setPageLoading(false), 300);
  };

  const initials  = (user?.email ?? "A").slice(0,1).toUpperCase();
  const page      = ALL_NAV.find(n => n.id === active);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="d-flex" style={{ height:"100vh", overflow:"hidden" }}>

        {/* ── Sidebar ── */}
        <aside className={`bloom-sidebar ${collapsed?"collapsed":""}`}>
          {/* Logo */}
          <div className="sidebar-logo" style={{ justifyContent: collapsed?"center":"space-between" }}>
            {!collapsed && (
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-flower2 text-success" style={{ fontSize:22 }}/>
                <div>
                  <div className="fw-bold text-white" style={{ fontSize:14,lineHeight:1 }}>BLOOM</div>
                  <div style={{ fontSize:9,color:"rgba(255,255,255,.35)",letterSpacing:"1px",textTransform:"uppercase" }}>GADRC CvSU</div>
                </div>
              </div>
            )}
            <button onClick={()=>setCollapsed(!collapsed)}
              className="btn btn-sm border-0 p-1"
              style={{ color:"rgba(255,255,255,.45)",background:"rgba(255,255,255,.06)" }}
              title={collapsed?"Expand":"Collapse"}>
              <i className={`bi bi-${collapsed?"layout-sidebar":"layout-sidebar-reverse"}`} style={{ fontSize:15 }}/>
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-grow-1 overflow-auto p-2">
            {NAV_SECTIONS.map(section => (
              <div key={section.label}>
                {!collapsed && (
                  <div className="sidebar-section-label">{section.label}</div>
                )}
                {section.items.map(item => {
                  const isActive = active === item.id;
                  return (
                    <button key={item.id}
                      onClick={() => navigate(item.id)}
                      title={collapsed ? item.label : ""}
                      className={`nav-link-bloom ${isActive?"active":""}`}
                      style={{ justifyContent: collapsed?"center":"flex-start" }}>
                      <i className={`bi ${item.icon}`}/>
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User */}
          <div className="sidebar-user">
            {!collapsed ? (
              <>
                <div className="d-flex align-items-center gap-2 mb-2 px-1 py-1 rounded"
                  style={{ cursor:"pointer" }}
                  onClick={() => setShowProfile(true)}>
                  <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                    style={{ width:30,height:30,background:"linear-gradient(135deg,#2D6A2D,#4CAF50)",fontSize:12 }}>
                    {initials}
                  </div>
                  <div className="overflow-hidden">
                    <div className="fw-semibold text-truncate" style={{ fontSize:12,color:"rgba(255,255,255,.88)" }}>GADRC Admin</div>
                    <div className="text-truncate" style={{ fontSize:10,color:"rgba(255,255,255,.38)" }}>{user?.email}</div>
                  </div>
                </div>
                <button onClick={()=>setShowSignOut(true)}
                  className="btn btn-sm w-100 d-flex align-items-center gap-2 border-0"
                  style={{ color:"rgba(255,255,255,.4)",background:"transparent",fontSize:12 }}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.08)";e.currentTarget.style.color="rgba(255,255,255,.8)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,.4)";}}>
                  <i className="bi bi-box-arrow-right"/>{!collapsed&&"Sign out"}
                </button>
              </>
            ) : (
              <div className="d-flex flex-column align-items-center gap-2">
                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                  style={{ width:30,height:30,background:"linear-gradient(135deg,#2D6A2D,#4CAF50)",fontSize:11,cursor:"pointer" }}
                  onClick={()=>setShowProfile(true)}>
                  {initials}
                </div>
                <button onClick={()=>setShowSignOut(true)} title="Sign out"
                  className="btn btn-sm border-0 p-1"
                  style={{ color:"rgba(255,255,255,.4)" }}>
                  <i className="bi bi-box-arrow-right"/>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="d-flex flex-column flex-grow-1 overflow-hidden" style={{ minWidth:0 }}>
          {/* Topbar */}
          <header className="bloom-topbar">
            <div className="d-flex align-items-center gap-2">
              <div className="icon-box-sm bg-primary-subtle d-flex align-items-center justify-content-center">
                <i className={`bi ${page?.icon||"bi-grid"} text-primary`} style={{ fontSize:14 }}/>
              </div>
              <span className="fw-semibold" style={{ fontSize:15,color:"#1A2E1A" }}>{page?.label}</span>
              <span className="text-muted mx-1">·</span>
              <span className="text-muted" style={{ fontSize:12 }}>GADRC CvSU</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-success-subtle text-success d-flex align-items-center gap-1" style={{ borderRadius:20,padding:"4px 10px" }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:"#4CAF50",display:"inline-block" }}/>
                Live
              </span>
              <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                style={{ width:32,height:32,background:"linear-gradient(135deg,#2D6A2D,#4CAF50)",fontSize:13,cursor:"pointer",
                  boxShadow:"0 1px 4px rgba(26,46,26,.2)",transition:"transform .12s" }}
                onClick={()=>setShowProfile(true)}
                onMouseEnter={e=>e.currentTarget.style.transform="scale(1.07)"}
                onMouseLeave={e=>e.currentTarget.style.transform=""}>
                {initials}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-grow-1 overflow-auto" style={{ background:"#F5F7F5" }}>
            <div className="page-enter" key={active}>
              {pageLoading ? <PageSkeleton/> : (
                <>
                  {active==="dashboard"     && <DashboardPage/>}
                  {active==="modules"       && <ModulesPage/>}
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
      </div>

      {showSignOut&&<ConfirmModal title="Sign Out" message="Are you sure you want to sign out of BLOOM GAD?" confirmLabel="Sign Out" danger={false} onConfirm={()=>{setShowSignOut(false);onLogout();}} onCancel={()=>setShowSignOut(false)}/>}
      {showProfile && <AdminProfilePage user={user} onClose={()=>setShowProfile(false)}/>}
    </>
  );
}


/* ─── Reusable ConfirmModal ──────────────────────────────────────── */
export function ConfirmModal({ title, message, confirmLabel="Confirm", danger=false, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:16 }}
      onClick={e=>{ if(e.target===e.currentTarget) onCancel(); }}>
      <div style={{ background:"#fff", borderRadius:14, width:"100%", maxWidth:400, boxShadow:"0 8px 40px rgba(0,0,0,.18)", overflow:"hidden", animation:"fadeInScale .15s ease" }}>
        <div style={{ padding:"22px 24px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:danger?"#fee2e2":"#E8F5E9", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <i className={`bi ${danger?"bi-exclamation-triangle-fill":"bi-question-circle-fill"}`}
                style={{ color:danger?"#dc2626":"#2D6A2D", fontSize:16 }}/>
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:"#1A2E1A" }}>{title}</div>
          </div>
          <div style={{ fontSize:13, color:"#666", lineHeight:1.65, paddingLeft:46 }}>{message}</div>
        </div>
        <div style={{ padding:"12px 24px 20px", display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={{ padding:"9px 20px", background:"#F5F7F5", color:"#1A2E1A", border:"1px solid #DDE8DD", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:13 }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding:"9px 20px", background:danger?"#dc2626":"#1A2E1A", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ROOT ───────────────────────────────────────────────────── */
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user,     setUser]     = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    loadCSS(INTER_CSS); loadCSS(BI_CSS); loadCSS(BOOTSTRAP_CSS);
    loadJS(BOOTSTRAP_JS);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({data:{session}}) => {
      if (session) { setUser(session.user); setLoggedIn(true); }
      setChecking(false);
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session) => {
      if (session) { setUser(session.user); setLoggedIn(true); }
      else         { setUser(null); setLoggedIn(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (checking) return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="d-flex align-items-center justify-content-center flex-column gap-3 min-vh-100"
        style={{ background:"#1A2E1A" }}>
        <i className="bi bi-flower2 text-success" style={{ fontSize:48 }}/>
        <div className="d-flex gap-2">
          {[0,1,2].map(i=>(
            <div key={i} className="rounded-circle" style={{ width:8,height:8,background:"rgba(255,255,255,.4)",animation:`shimmer 1.2s ease ${i*.2}s infinite alternate` }}/>
          ))}
        </div>
        <span style={{ fontSize:12,color:"rgba(255,255,255,.3)",letterSpacing:2 }}>BLOOM GAD</span>
      </div>
    </>
  );

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {loggedIn
        ? <AdminShell onLogout={async()=>{await supabase.auth.signOut();setLoggedIn(false);setUser(null);}} user={user}/>
        : <LoginPage  onLogin={u=>{setUser(u);setLoggedIn(true);}}/>
      }
    </>
  );
}