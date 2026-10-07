import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import { supabase } from "./lib/supabase.js";
import { createClient } from "@supabase/supabase-js";
import ModulesPage       from "./ModulesPage.jsx";
import DashboardPage     from "./DashboardPage.jsx";
import SeminarsPage      from "./SeminarsPage.jsx";
import CertificatesPage  from "./CertificatesPage.jsx";
import CalendarPage      from "./CalendarPage.jsx";
import ReportsPage       from "./ReportsPage.jsx";
import StudentsPage      from "./StudentsPage.jsx";
import AnnouncementsPage from "./AnnouncementsPage.jsx";
import AdminProfilePage  from "./AdminProfilePage.jsx";
import SuperAdminPage    from "./SuperAdminPage.jsx";
import campusBg from "./assets/cvsu.jpg";

// Separate client for super admin to avoid auth lock conflicts
const supabaseSA = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { storageKey: "sa-auth-token", persistSession: false } }
);

/* ─── Bootstrap 5 + Libraries loader ─────────────────────────── */
const BOOTSTRAP_CSS = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
const BOOTSTRAP_JS  = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
const BI_CSS        = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";
const INTER_CSS     = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap";

/* ─── Mobile app download (QR code + button on the public landing page) ── */
// Direct-download link for the APK hosted on Google Drive
const APP_FILE_ID      = "1be2I0NZ91Md2QC0yaH_oz9D3pjtPH7f8";
const APP_DOWNLOAD_URL = `https://drive.google.com/uc?export=download&id=${APP_FILE_ID}`;
const QR_CODE_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(APP_DOWNLOAD_URL)}`;

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

  /* ── Page animation ──
     Fade only. A transform here would make every pop-up window (position: fixed)
     appear in the middle of the page instead of the middle of the screen. */
  @keyframes pageIn { from { opacity:0; } to { opacity:1; } }
  .page-enter { animation: pageIn .18s ease; }

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

  /* ── Deactivation modal animation ── */
  @keyframes fadeInScale {
    from { opacity: 0; transform: scale(.94); }
    to   { opacity: 1; transform: scale(1); }
  }

  /* ── Landing page ── */
  .landing-hero {
    min-height: 100vh; width: 100%; position: relative;
    display: flex; align-items: center; justify-content: center;
    padding: 20px; background-size: cover; background-position: center;
  }
  .landing-hero::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(160deg, rgba(10,26,10,.78) 0%, rgba(15,45,15,.62) 45%, rgba(10,26,10,.82) 100%);
  }
  .landing-hero > * { position: relative; z-index: 1; }
  .landing-admin-trigger {
    position: fixed; bottom: 18px; right: 18px; z-index: 2;
    width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,.08); border: none;
    color: rgba(255,255,255,.32); font-size: 14px; cursor: pointer;
    transition: background .15s, color .15s, transform .15s;
  }
  .landing-admin-trigger:hover {
    background: rgba(255,255,255,.18); color: rgba(255,255,255,.7); transform: scale(1.06);
  }
`;

/* ─── NAV CONFIG ─────────────────────────────────────────────── */
const NAV_SECTIONS = [
  { label:"Overview", items:[
    { id:"dashboard",    icon:"bi-speedometer2",          label:"Dashboard"     },
    { id:"reports",      icon:"bi-file-earmark-bar-graph", label:"Reports"      },
  ]},
  { label:"Learning", items:[
    { id:"modules",      icon:"bi-book",                  label:"Modules"       },
    { id:"certificates", icon:"bi-patch-check",           label:"Certificates"  },
  ]},
  { label:"Events", items:[
    { id:"seminars",     icon:"bi-people",                label:"Seminars"      },
    { id:"calendar",     icon:"bi-calendar3",             label:"Calendar"      },
  ]},
  { label:"Community", items:[
    { id:"students",      icon:"bi-people",               label:"Users"         },
    { id:"announcements", icon:"bi-megaphone",            label:"Announcements" },
  ]},
];
const ALL_NAV = NAV_SECTIONS.flatMap(s => s.items);

/* ─── Toast context ──────────────────────────────────────────── */
const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext) ?? ((msg) => alert(msg));
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{ position:"fixed", bottom:24, right:24, zIndex:99999, display:"flex", flexDirection:"column", gap:8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding:"11px 18px", borderRadius:8, fontSize:13, fontWeight:600, color:"#fff",
            background: t.type==="error" ? "#dc2626" : t.type==="warning" ? "#d97706" : "#16a34a",
            boxShadow:"0 4px 16px rgba(0,0,0,.18)", animation:"pageIn .2s ease",
            display:"flex", alignItems:"center", gap:8,
          }}>
            <i className={`bi bi-${t.type==="error"?"x-circle":t.type==="warning"?"exclamation-triangle":"check-circle"}`}/>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ─── Reusable ConfirmModal ──────────────────────────────────── */
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

/* ─── Deactivation Alert Modal ───────────────────────────────── */
function DeactivationModal({ onOk }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,.65)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 99999, padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420,
        boxShadow: "0 24px 64px rgba(0,0,0,.28)",
        overflow: "hidden", animation: "fadeInScale .2s ease",
      }}>
        {/* Red header strip */}
        <div style={{
          background: "linear-gradient(135deg,#dc2626,#b91c1c)",
          padding: "24px 28px 20px",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "rgba(255,255,255,.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <i className="bi bi-shield-x" style={{ color: "#fff", fontSize: 22 }}/>
          </div>
          <div>
            <div style={{ fontWeight: 800, color: "#fff", fontSize: 17, lineHeight: 1.2 }}>
              Account Deactivated
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginTop: 3 }}>
              Your session has been terminated
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px" }}>
          <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: "0 0 20px" }}>
            Your account has been <strong>deactivated by an administrator</strong>.
            You will be logged out and redirected to the login page.
          </p>
          <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, margin: "0 0 24px" }}>
            If you believe this is a mistake, please contact your system administrator for assistance.
          </p>
          <button
            onClick={onOk}
            style={{
              width: "100%", padding: "12px",
              background: "linear-gradient(135deg,#dc2626,#b91c1c)",
              color: "#fff", border: "none", borderRadius: 10,
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 4px 12px rgba(220,38,38,.35)",
              transition: "opacity .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            OK — Log Me Out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── PUBLIC LANDING PAGE ──────────────────────────────────────
   Public-facing page: app description + QR download + download button.
   A subtle, unlabeled button in the corner is the only way in
   to the admin login — nothing on this page advertises it. ── */
function LandingPage({ onAdminClick }) {
  return (
    <div className="landing-hero" style={{ backgroundImage:`url(${campusBg})` }}>

      <div style={{ width:"100%", maxWidth:460 }}>

        {/* Brand header */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center mb-3"
            style={{ width:64, height:64, borderRadius:16, background:"linear-gradient(135deg,#4CAF50,#2D6A2D)", boxShadow:"0 6px 18px rgba(0,0,0,.35)" }}>
            <i className="bi bi-flower2 text-white" style={{ fontSize:30 }}/>
          </div>
          <h3 className="fw-bold mb-1 text-white">BLOOM GAD</h3>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.75)" }}>Gender and Development Resource Center · CvSU</div>
        </div>

        {/* Description card */}
        <div className="card border-0 shadow-sm mb-3" style={{ borderRadius:16 }}>
          <div className="card-body p-4">
            <p style={{ fontSize:13.5, color:"#374151", lineHeight:1.75, margin:0 }}>
              BLOOM GAD is CvSU's Gender and Development learning platform. Students can complete
              GAD modules, join seminars, earn certificates, and stay up to date with announcements
              and events — all in one place.
            </p>
          </div>
        </div>

        {/* QR download card */}
        <div className="card border-0 shadow-sm" style={{ borderRadius:16 }}>
          <div className="card-body p-4 d-flex align-items-center gap-3">
            <img
              src={QR_CODE_SRC}
              alt="Scan to download the BLOOM GAD mobile app"
              width={110}
              height={110}
              style={{ borderRadius:10, border:"1px solid #DDE8DD", flexShrink:0 }}
            />
            <div>
              <div className="fw-semibold mb-1" style={{ fontSize:14, color:"#1A2E1A" }}>
                Get the BLOOM GAD app
              </div>
              <div className="text-muted mb-2" style={{ fontSize:12.5, lineHeight:1.6 }}>
                Scan this QR code with your phone camera, or tap the button below to download
                the app and access your modules, seminars, and certificates on the go.
              </div>
              <a
                href={APP_DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2"
                style={{ padding:"7px 14px" }}
              >
                <i className="bi bi-download"/> Download the App
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Hidden-in-plain-sight admin entry point */}
      <button
        onClick={onAdminClick}
        className="landing-admin-trigger"
        aria-label="Staff access"
      >
        <i className="bi bi-shield-lock"/>
      </button>
    </div>
  );
}

/* ─── ADMIN LOGIN (reached only via the landing page's hidden button) ── */
function LoginPage({ onLogin, onBack, notice }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [emailErr, setEmailErr] = useState(false);
  const [passErr,  setPassErr]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  // Forgot password
  const [mode,        setMode]        = useState("login"); // "login" | "forgot" | "sent"
  const [resetEmail,  setResetEmail]  = useState("");
  const [resetErr,    setResetErr]    = useState("");
  const [resetSending,setResetSending]= useState(false);

  const sendReset = async () => {
    setResetErr("");
    const clean = resetEmail.trim().toLowerCase();
    if (!clean) { setResetErr("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setResetErr("Please enter a valid email address."); return; }
    setResetSending(true);
    const { error: e } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetSending(false);
    if (e && /rate|too many|seconds/i.test(e.message)) {
      setResetErr("Too many requests. Please wait a minute before trying again.");
      return;
    }
    // Don't reveal whether the email has an account — always show the same message
    setMode("sent");
  };

  const submit = async () => {
    setError(""); setEmailErr(false); setPassErr(false);
    if (!email || !password) {
      if (!email)    setEmailErr(true);
      if (!password) setPassErr(true);
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) { setError("Invalid credentials. Please try again."); setLoading(false); return; }

      // 1. Check role
      const { data: rows } = await supabase.from("user_roles").select("roles(name)").eq("user_id", data.user.id);
      const roleNames = (rows || []).map(r => r.roles?.name).filter(Boolean);
      if (!roleNames.includes("admin") && !roleNames.includes("super_admin")) {
        await supabase.auth.signOut();
        setError("Access denied. Admin accounts only.");
        setLoading(false); return;
      }

      // 2. Check is_active BEFORE granting access
      const { data: profile } = await supabase
        .from("profiles").select("is_active").eq("id", data.user.id).maybeSingle();
      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        setError("Your account has been deactivated. Please contact an administrator for assistance.");
        setLoading(false); return;
      }

      const role = roleNames.includes("super_admin") ? "super_admin" : "admin";
      setLoading(false);
      onLogin(data.user, role);
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{ background:"linear-gradient(135deg,#F1F8F1 0%,#E8F5E9 50%,#D7EED7 100%)" }}>
      <div className="d-flex flex-column align-items-center" style={{ width:420, gap:16 }}>

        <div className="card border-0 shadow-lg overflow-hidden w-100" style={{ borderRadius:14 }}>
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
          {mode === "forgot" && (
            <div className="card-body p-4">
              <h5 className="fw-bold mb-1" style={{ color:"#1A2E1A" }}>Reset your password</h5>
              <p className="text-muted mb-4" style={{ fontSize:13 }}>Enter your admin email and we'll send you a link to set a new password.</p>
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize:12 }}>Email address</label>
                <input className={`form-control ${resetErr?"is-invalid":""}`} type="email" autoFocus
                  value={resetEmail} onChange={e=>{setResetEmail(e.target.value);setResetErr("");}}
                  placeholder="admin@cvsu.edu.ph" onKeyDown={e=>e.key==="Enter"&&!resetSending&&sendReset()}/>
                {resetErr&&<div className="invalid-feedback">{resetErr}</div>}
              </div>
              <button className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={sendReset} disabled={resetSending} style={{ padding:"10px" }}>
                {resetSending
                  ? <><span className="spinner-border spinner-border-sm"/>Sending…</>
                  : <><i className="bi bi-envelope"/>Send reset link</>}
              </button>
              <button className="btn btn-sm w-100 mt-2 border-0" style={{ color:"#5A7D5A", background:"transparent" }}
                onClick={()=>{setMode("login");setResetErr("");}}>
                <i className="bi bi-arrow-left me-1"/>Back to sign in
              </button>
            </div>
          )}

          {mode === "sent" && (
            <div className="card-body p-4 text-center">
              <div className="mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{ width:56,height:56,borderRadius:14,background:"#E8F5E9" }}>
                <i className="bi bi-envelope-check" style={{ fontSize:26,color:"#2D6A2D" }}/>
              </div>
              <h5 className="fw-bold mb-2" style={{ color:"#1A2E1A" }}>Check your email</h5>
              <p className="text-muted mb-4" style={{ fontSize:13,lineHeight:1.6 }}>
                If <strong>{resetEmail.trim()}</strong> belongs to a BLOOM account, a password reset link has been sent.
                Open it on this device to set a new password. Check your spam folder if you don't see it within a few minutes.
              </p>
              <button className="btn btn-primary w-100" style={{ padding:"10px" }}
                onClick={()=>{setMode("login");setEmail(resetEmail.trim());}}>
                Back to sign in
              </button>
            </div>
          )}

          {mode === "login" && (
          <div className="card-body p-4">
            {notice && (
              <div className="alert alert-success d-flex align-items-center gap-2 py-2" style={{ fontSize:13,borderRadius:8 }}>
                <i className="bi bi-check-circle-fill"/>{notice}
              </div>
            )}
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
              <div style={{ position:"relative" }}>
                <input className={`form-control ${passErr?"is-invalid":""}`} type={showPass?"text":"password"}
                  value={password} onChange={e=>{setPassword(e.target.value);if(e.target.value)setPassErr(false);}}
                  placeholder="Enter your password" onKeyDown={e=>e.key==="Enter"&&submit()}
                  autoComplete="current-password" style={{ paddingRight:40, backgroundImage:"none" }}/>
                <button type="button" onClick={()=>setShowPass(v=>!v)}
                  title={showPass?"Hide password":"Show password"} aria-label={showPass?"Hide password":"Show password"}
                  style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#888", cursor:"pointer", padding:"4px 6px", fontSize:15, lineHeight:1 }}>
                  <i className={`bi ${showPass?"bi-eye-slash":"bi-eye"}`}/>
                </button>
              </div>
              {passErr&&<div className="invalid-feedback d-block">This field is required</div>}
              <div className="text-end mt-1">
                <button type="button" className="btn btn-link p-0 border-0"
                  style={{ fontSize:12,color:"#2D6A2D",fontWeight:600,textDecoration:"none" }}
                  onClick={()=>{setResetEmail(email.trim());setResetErr("");setMode("forgot");}}>
                  Forgot password?
                </button>
              </div>
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
          )}
        </div>

        {onBack && (
          <button onClick={onBack} className="btn btn-sm border-0"
            style={{ color:"#5A7D5A", fontSize:12, background:"transparent" }}>
            <i className="bi bi-arrow-left me-1"/>Back to site
          </button>
        )}

      </div>
    </div>
  );
}

/* ─── SET NEW PASSWORD (opened from the reset email link) ──────── */
function ResetPasswordView({ onDone, onCancel }) {
  const [pw,       setPw]       = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [show,     setShow]     = useState(false);
  const [error,    setError]    = useState("");
  const [saving,   setSaving]   = useState(false);

  const save = async () => {
    setError("");
    if (pw.length < 8)  { setError("Password must be at least 8 characters."); return; }
    if (pw !== confirm) { setError("Passwords do not match."); return; }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSaving(false);
      setError("This reset link is invalid or has expired. Please request a new one.");
      return;
    }
    const { error: e } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (e) {
      setError(/same|different/i.test(e.message)
        ? "Your new password must be different from your old password."
        : "Could not update your password: " + e.message);
      return;
    }
    await supabase.auth.signOut();
    onDone();
  };

  const strength = (() => {
    let n = 0;
    if (pw.length >= 8) n++;
    if (/[A-Z]/.test(pw)) n++;
    if (/\d/.test(pw)) n++;
    if (/[^a-zA-Z0-9]/.test(pw)) n++;
    return n;
  })();
  const sColors = ["#e74c3c","#e67e22","#f1c40f","#2D6A2D"];
  const sLabels = ["Weak","Fair","Good","Strong"];

  const field = (label, value, setValue, auto) => (
    <div className="mb-3">
      <label className="form-label fw-semibold" style={{ fontSize:12 }}>{label}</label>
      <div style={{ position:"relative" }}>
        <input className="form-control" type={show?"text":"password"} value={value} autoComplete={auto}
          onChange={e=>{setValue(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&!saving&&save()}
          style={{ paddingRight:40 }}/>
        <button type="button" onClick={()=>setShow(v=>!v)} aria-label={show?"Hide password":"Show password"}
          style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#888", cursor:"pointer", padding:"4px 6px", fontSize:15, lineHeight:1 }}>
          <i className={`bi ${show?"bi-eye-slash":"bi-eye"}`}/>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{ background:"linear-gradient(135deg,#F1F8F1 0%,#E8F5E9 50%,#D7EED7 100%)" }}>
      <div className="card border-0 shadow-lg overflow-hidden" style={{ width:420, borderRadius:14 }}>
        <div className="p-4 d-flex align-items-center gap-3" style={{ background:"linear-gradient(135deg,#2D6A2D,#1A2E1A)" }}>
          <div className="icon-box bg-white bg-opacity-10 text-white" style={{ width:48,height:48,borderRadius:12,fontSize:22 }}>
            <i className="bi bi-shield-lock"/>
          </div>
          <div>
            <div className="fw-bold text-white" style={{ fontSize:18 }}>BLOOM GAD</div>
            <div style={{ fontSize:12,color:"rgba(255,255,255,.6)" }}>Set a new password</div>
          </div>
        </div>
        <div className="card-body p-4">
          <h5 className="fw-bold mb-1" style={{ color:"#1A2E1A" }}>Create a new password</h5>
          <p className="text-muted mb-4" style={{ fontSize:13 }}>Use at least 8 characters. A mix of uppercase letters, numbers, and symbols is stronger.</p>
          {field("New password", pw, setPw, "new-password")}
          {pw && (
            <div className="mb-3" style={{ marginTop:-6 }}>
              <div className="d-flex gap-1">
                {[0,1,2,3].map(i=>(
                  <div key={i} style={{ flex:1,height:4,borderRadius:2,background:i<strength?sColors[Math.max(strength-1,0)]:"#E8F5E9" }}/>
                ))}
              </div>
              <div style={{ fontSize:11,color:"#888",marginTop:4 }}>Strength: <strong style={{ color:strength?sColors[strength-1]:"#e74c3c" }}>{strength?sLabels[strength-1]:"Weak"}</strong></div>
            </div>
          )}
          {field("Confirm new password", confirm, setConfirm, "new-password")}
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2" style={{ fontSize:13,borderRadius:8 }}>
              <i className="bi bi-exclamation-triangle-fill"/>{error}
            </div>
          )}
          <button className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={save} disabled={saving} style={{ padding:"10px" }}>
            {saving ? <><span className="spinner-border spinner-border-sm"/>Saving…</> : <><i className="bi bi-check-lg"/>Save new password</>}
          </button>
          <button className="btn btn-sm w-100 mt-2 border-0" style={{ color:"#5A7D5A", background:"transparent" }} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── SUPER ADMIN LOGIN ──────────────────────────────────────── */
function SuperAdminLoginPage({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const submit = async () => {
    setError("");
    if (!email || !password) { setError("Please enter your credentials."); return; }
    setLoading(true);
    try {
      const { data, error: e } = await supabaseSA.auth.signInWithPassword({ email, password });
      if (e) { setError("Invalid credentials."); setLoading(false); return; }
      const { data: rows } = await supabaseSA.from("user_roles").select("roles(name)").eq("user_id", data.user.id);
      const roleNames = (rows || []).map(r => r.roles?.name).filter(Boolean);
      if (!roleNames.includes("super_admin")) {
        await supabaseSA.auth.signOut();
        setError("Access denied. Super Admin credentials only.");
        setLoading(false); return;
      }

      // Check is_active for super admin too
      const { data: profile } = await supabaseSA
        .from("profiles").select("is_active").eq("id", data.user.id).maybeSingle();
      if (profile?.is_active === false) {
        await supabaseSA.auth.signOut();
        setError("Your account has been deactivated. Please contact an administrator for assistance.");
        setLoading(false); return;
      }

      setLoading(false);
      onLogin(data.user, "super_admin");
    } catch(err) {
      console.error("SA login error:", err);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{ background: "linear-gradient(135deg,#0d0d1a 0%,#1A1A2E 50%,#16213E 100%)" }}>
      <div className="card border-0 shadow-lg overflow-hidden" style={{ width: 420, borderRadius: 16 }}>
        <div className="p-4 d-flex align-items-center gap-3"
          style={{ background: "linear-gradient(135deg,#1A1A2E,#E94560)" }}>
          <div style={{ width:48,height:48,borderRadius:12,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <i className="bi bi-shield-fill-check" style={{ color:"#fff",fontSize:24 }}/>
          </div>
          <div>
            <div className="fw-bold text-white" style={{ fontSize:18 }}>BLOOM GAD</div>
            <div style={{ fontSize:12,color:"rgba(255,255,255,.6)" }}>⚡ Super Admin Portal</div>
          </div>
        </div>
        <div className="card-body p-4">
          <h5 className="fw-bold mb-1" style={{ color:"#1A1A2E" }}>Super Admin Sign In</h5>
          <p className="text-muted mb-4" style={{ fontSize:13 }}>Restricted access — authorized personnel only</p>
          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize:12 }}>Email address</label>
            <input className="form-control" type="email" value={email}
              onChange={e=>setEmail(e.target.value)} placeholder="superadmin@cvsu.edu.ph"
              onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold" style={{ fontSize:12 }}>Password</label>
            <input className="form-control" type="password" value={password}
              onChange={e=>setPassword(e.target.value)} placeholder="Enter your password"
              onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2" style={{ fontSize:13,borderRadius:8 }}>
              <i className="bi bi-exclamation-triangle-fill"/>{error}
            </div>
          )}
          <button className="btn w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={submit} disabled={loading}
            style={{ padding:"10px",background:"linear-gradient(135deg,#1A1A2E,#E94560)",color:"#fff",fontWeight:700,borderRadius:8 }}>
            {loading
              ? <><span className="spinner-border spinner-border-sm"/>Signing in…</>
              : <>⚡ Sign In as Super Admin</>
            }
          </button>
          <div style={{ textAlign:"center",marginTop:16 }}>
            <a href="/" style={{ fontSize:12,color:"#888",textDecoration:"none" }}>← Back to Admin Login</a>
          </div>
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
            <div className="card p-3">
              <div className="skeleton mb-2" style={{ height:13,width:"60%" }}/>
              <div className="skeleton" style={{ height:28,width:"40%" }}/>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ height:200 }}/>
    </div>
  );
}

/* ─── ADMIN SHELL ────────────────────────────────────────────── */
function AdminShell({ onLogout, user, onDeactivated }) {
  const [active,      setActive]      = useState("dashboard");
  const [showProfile, setShowProfile] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  const [me,          setMe]          = useState({ full_name: "", avatar_url: "" });

  // Admin's own name + profile photo (refreshed when the profile window closes)
  const loadMe = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.from("profiles")
      .select("full_name, avatar_url").eq("id", user.id).maybeSingle();
    if (data) setMe({ full_name: data.full_name || "", avatar_url: data.avatar_url || "" });
  }, [user?.id]);
  useEffect(() => { loadMe(); }, [loadMe]);

  useEffect(() => {
    loadCSS(INTER_CSS); loadCSS(BI_CSS);
    loadJS(BOOTSTRAP_JS);
  }, []);

  // ── Real-time deactivation watcher ──────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    // Poll every 30 seconds as a reliable fallback
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("is_active")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.is_active === false) {
          clearInterval(pollInterval);
          onDeactivated();
        }
      } catch { /* network hiccup — ignore */ }
    }, 30_000);

    // Supabase Realtime for instant detection
    const channel = supabase
      .channel(`profile-active-${user.id}`)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new?.is_active === false) {
            onDeactivated();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [user?.id, onDeactivated]);

  const navigate = (id) => {
    if (id === active) return;
    setPageLoading(true); setActive(id);
    setTimeout(() => setPageLoading(false), 300);
  };

  const displayName = me.full_name || "GADRC Admin";
  const initials = (me.full_name
    ? me.full_name.split(" ").filter(Boolean).map(w => w[0]).slice(0,2).join("")
    : (user?.email ?? "A").slice(0,1)).toUpperCase();
  const avatarImg = (size) => me.avatar_url
    ? <img src={me.avatar_url} alt="" style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", display:"block" }}
        onError={() => setMe(m => ({ ...m, avatar_url: "" }))}/>
    : initials;
  const page     = ALL_NAV.find(n => n.id === active);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="d-flex" style={{ height:"100vh", overflow:"hidden" }}>

        {/* ── Sidebar ── */}
        <aside className={`bloom-sidebar ${collapsed?"collapsed":""}`}>
          <div className="sidebar-logo" style={{ justifyContent:collapsed?"center":"space-between" }}>
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

          <nav className="flex-grow-1 overflow-auto p-2">
            {NAV_SECTIONS.map(section => (
              <div key={section.label}>
                {!collapsed && <div className="sidebar-section-label">{section.label}</div>}
                {section.items.map(item => {
                  const isActive = active === item.id;
                  return (
                    <button key={item.id}
                      onClick={() => navigate(item.id)}
                      title={collapsed ? item.label : ""}
                      className={`nav-link-bloom ${isActive?"active":""}`}
                      style={{ justifyContent:collapsed?"center":"flex-start" }}>
                      <i className={`bi ${item.icon}`}/>
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="sidebar-user">
            {!collapsed ? (
              <>
                <div className="d-flex align-items-center gap-2 mb-2 px-1 py-1 rounded"
                  style={{ cursor:"pointer" }}
                  onClick={()=>setShowProfile(true)}>
                  <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                    style={{ width:30,height:30,background:"linear-gradient(135deg,#2D6A2D,#4CAF50)",fontSize:12 }}>
                    {avatarImg(30)}
                  </div>
                  <div className="overflow-hidden">
                    <div className="fw-semibold text-truncate" style={{ fontSize:12,color:"rgba(255,255,255,.88)" }}>{displayName}</div>
                    <div className="text-truncate" style={{ fontSize:10,color:"rgba(255,255,255,.38)" }}>{user?.email}</div>
                  </div>
                </div>
                <button onClick={()=>setShowSignOut(true)}
                  className="btn btn-sm w-100 d-flex align-items-center gap-2 border-0"
                  style={{ color:"rgba(255,255,255,.4)",background:"transparent",fontSize:12 }}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.08)";e.currentTarget.style.color="rgba(255,255,255,.8)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,.4)";}}>
                  <i className="bi bi-box-arrow-right"/>Sign out
                </button>
              </>
            ) : (
              <div className="d-flex flex-column align-items-center gap-2">
                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                  style={{ width:30,height:30,background:"linear-gradient(135deg,#2D6A2D,#4CAF50)",fontSize:11,cursor:"pointer" }}
                  onClick={()=>setShowProfile(true)}>
                  {avatarImg(30)}
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
              <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                style={{ width:32,height:32,background:"linear-gradient(135deg,#2D6A2D,#4CAF50)",fontSize:13,cursor:"pointer",
                  boxShadow:"0 1px 4px rgba(26,46,26,.2)",transition:"transform .12s" }}
                onClick={()=>setShowProfile(true)}
                onMouseEnter={e=>e.currentTarget.style.transform="scale(1.07)"}
                onMouseLeave={e=>e.currentTarget.style.transform=""}>
                {avatarImg(32)}
              </div>
            </div>
          </header>

          <main className="flex-grow-1 overflow-auto" style={{ background:"#F5F7F5" }}>
            <div className="page-enter" key={active}>
              {pageLoading ? <PageSkeleton/> : (
                <>
                  {active==="dashboard"     && <DashboardPage onNavigate={navigate}/>}
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

      {showSignOut && (
        <ConfirmModal
          title="Sign Out"
          message="Are you sure you want to sign out of BLOOM GAD?"
          confirmLabel="Sign Out"
          danger={false}
          onConfirm={()=>{setShowSignOut(false);onLogout();}}
          onCancel={()=>setShowSignOut(false)}
        />
      )}
      {showProfile && <AdminProfilePage user={user} onClose={()=>{ setShowProfile(false); loadMe(); }}/>}
    </>
  );
}

/* ─── ROOT ───────────────────────────────────────────────────── */
async function checkRole(userId) {
  try {
    const { data: rows } = await supabase.from("user_roles").select("roles(name)").eq("user_id", userId);
    if (!rows || rows.length === 0) return null;
    const roleNames = rows.map(r => r.roles?.name).filter(Boolean);
    if (roleNames.includes("super_admin")) return "super_admin";
    if (roleNames.includes("admin")) return "admin";
    return roleNames[0] || null;
  } catch { return null; }
}

async function checkIsActive(userId) {
  try {
    const { data } = await supabase
      .from("profiles").select("is_active").eq("id", userId).maybeSingle();
    return data?.is_active !== false; // true if active or null (unknown)
  } catch { return true; }
}

export default function App() {
  const [loggedIn,          setLoggedIn]          = useState(false);
  const [user,              setUser]              = useState(null);
  const [checking,          setChecking]          = useState(true);
  const [userRole,          setUserRole]          = useState(null);
  const [showDeactivated,   setShowDeactivated]   = useState(false);
  const [showAdminLogin,    setShowAdminLogin]    = useState(false); // gate: landing page vs admin login form
  // Password reset link (from the email) → show the "set new password" screen
  const [recoveryMode,      setRecoveryMode]      = useState(
    window.location.pathname === "/reset-password" || /type=recovery/.test(window.location.hash)
  );
  const [loginNotice,       setLoginNotice]       = useState("");
  const recoveryRef = useRef(recoveryMode);
  useEffect(() => { recoveryRef.current = recoveryMode; }, [recoveryMode]);

  const leaveRecovery = (notice) => {
    window.history.replaceState({}, "", "/");
    setRecoveryMode(false);
    setLoginNotice(notice || "");
    setShowAdminLogin(true);
  };
  const [isSuperAdminRoute, setIsSuperAdminRoute] = useState(
    window.location.pathname === "/super-admin" || window.location.hash === "#super-admin"
  );

  useEffect(() => {
    const onHashChange = () => {
      setIsSuperAdminRoute(window.location.hash === "#super-admin");
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    loadCSS(INTER_CSS); loadCSS(BI_CSS); loadCSS(BOOTSTRAP_CSS);
    loadJS(BOOTSTRAP_JS);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setChecking(false), 3000);
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      try {
        // Opened from a password-reset email: don't log in, let them set a new password
        if (recoveryRef.current) { setChecking(false); return; }
        if (session) {
          const role = await checkRole(session.user.id);
          const isSA = window.location.hash === "#super-admin";
          if (role === "super_admin" && !isSA) {
            await supabase.auth.signOut();
            setChecking(false);
            return;
          }
          // Guard: reject deactivated accounts even on session restore
          const active = await checkIsActive(session.user.id);
          if (!active) {
            await supabase.auth.signOut();
            setChecking(false);
            return;
          }
          setUser(session.user);
          setUserRole(role);
          setLoggedIn(true);
        }
      } catch (e) {
        console.error("Session check error:", e);
      } finally {
        setChecking(false);
      }
    }).catch(() => { clearTimeout(timeout); setChecking(false); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        return;
      }
      if (event === "SIGNED_OUT") {
        setUser(null); setLoggedIn(false); setUserRole(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Called by AdminShell when Realtime detects is_active → false
  const handleDeactivated = useCallback(() => {
    setShowDeactivated(true);
  }, []);

  // Called when user clicks OK on the deactivation modal
  const handleDeactivationOk = useCallback(async () => {
    setShowDeactivated(false);
    if (userRole === "super_admin") await supabaseSA.auth.signOut();
    else await supabase.auth.signOut();
    setLoggedIn(false); setUser(null); setUserRole(null);
    setShowAdminLogin(false); // back to the public landing page
  }, [userRole]);

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

  const handleLogout = async () => {
    if (userRole === "super_admin") await supabaseSA.auth.signOut();
    else await supabase.auth.signOut();
    setLoggedIn(false); setUser(null); setUserRole(null);
    setShowAdminLogin(false); // back to the public landing page
  };

  return (
    <ToastProvider>
      <style>{GLOBAL_CSS}</style>

      {/* Deactivation modal — shown on top of everything */}
      {showDeactivated && <DeactivationModal onOk={handleDeactivationOk}/>}

      {recoveryMode
        ? <ResetPasswordView
            onDone={() => leaveRecovery("Your password has been updated. Please sign in with your new password.")}
            onCancel={async () => { await supabase.auth.signOut(); leaveRecovery(""); }}
          />
        : loggedIn && userRole === "super_admin"
        ? <SuperAdminPage superUser={user} onLogout={handleLogout} db={supabaseSA}/>
        : isSuperAdminRoute && userRole !== "admin"
        ? <SuperAdminLoginPage onLogin={(u, role) => { setUser(u); setUserRole(role); setLoggedIn(true); }}/>
        : isSuperAdminRoute && userRole === "admin"
        ? <SuperAdminLoginPage onLogin={(u, role) => { setUser(u); setUserRole(role); setLoggedIn(true); }}/>
        : loggedIn && userRole === "admin"
        ? <AdminShell onLogout={handleLogout} user={user} onDeactivated={handleDeactivated}/>
        : showAdminLogin
        ? <LoginPage
            notice={loginNotice}
            onBack={()=>{ setShowAdminLogin(false); setLoginNotice(""); }}
            onLogin={(u, role) => { setUser(u); setUserRole(role); setLoggedIn(true); }}
          />
        : <LandingPage onAdminClick={()=>setShowAdminLogin(true)}/>
      }
    </ToastProvider>
  );
}