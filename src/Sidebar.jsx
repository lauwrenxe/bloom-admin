import { useState } from "react";

/* ─── Design tokens (inline to avoid import issues) ─── */
const T = {
  rail:       "#1A2E1A",
  railHover:  "rgba(255,255,255,.08)",
  railActive: "rgba(255,255,255,.14)",
  railText:   "rgba(255,255,255,.58)",
  railTextActive: "#FFFFFF",
  railBorder: "rgba(255,255,255,.07)",
  brand:      "#2D6A2D",
  brandAccent:"#4CAF50",
  pale:       "#C8E6C9",
};

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { id:"dashboard",    icon: HomeIcon,     label:"Dashboard"     },
      { id:"reports",      icon: ReportIcon,   label:"Reports"       },
    ],
  },
  {
    label: "Learning",
    items: [
      { id:"modules",      icon: BookIcon,     label:"Modules"       },
      { id:"assessments",  icon: QuizIcon,     label:"Assessments"   },
      { id:"certificates", icon: CertIcon,     label:"Certificates"  },
    ],
  },
  {
    label: "Events",
    items: [
      { id:"seminars",     icon: SeminarIcon,  label:"Seminars"      },
      { id:"calendar",     icon: CalIcon,      label:"Calendar"      },
    ],
  },
  {
    label: "Community",
    items: [
      { id:"students",      icon: PeopleIcon,  label:"Students"      },
      { id:"announcements", icon: BellIcon,    label:"Announcements" },
    ],
  },
];

/* SVG Icons */
function HomeIcon({s=17,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>; }
function ReportIcon({s=17,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>; }
function BookIcon({s=17,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>; }
function QuizIcon({s=17,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>; }
function CertIcon({s=17,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M8 12l-2 9 6-3 6 3-2-9"/></svg>; }
function SeminarIcon({s=17,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
function CalIcon({s=17,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function PeopleIcon({s=17,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
function BellIcon({s=17,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>; }
function LogoutIcon({s=16,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }

function BloomLogo({ collapsed }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, overflow:"hidden" }}>
      <svg width="24" height="24" viewBox="0 0 30 30" fill="none" style={{ flexShrink:0 }}>
        <circle cx="15" cy="15" r="4.8" fill="rgba(255,255,255,.9)"/>
        <circle cx="15" cy="5.5"  r="3.5" fill="rgba(255,255,255,.65)"/>
        <circle cx="15" cy="24.5" r="3.5" fill="rgba(255,255,255,.65)"/>
        <circle cx="5.5"  cy="15" r="3.5" fill="rgba(255,255,255,.65)"/>
        <circle cx="24.5" cy="15" r="3.5" fill="rgba(255,255,255,.65)"/>
        <circle cx="8"  cy="8"  r="2.4" fill="rgba(255,255,255,.35)"/>
        <circle cx="22" cy="8"  r="2.4" fill="rgba(255,255,255,.35)"/>
        <circle cx="8"  cy="22" r="2.4" fill="rgba(255,255,255,.35)"/>
        <circle cx="22" cy="22" r="2.4" fill="rgba(255,255,255,.35)"/>
      </svg>
      {!collapsed && (
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:"#fff", letterSpacing:".3px", lineHeight:1 }}>BLOOM</div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", letterSpacing:"1px", textTransform:"uppercase", marginTop:2 }}>GADRC CvSU</div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ active, setActive, onLogout, user }) {
  const [collapsed, setCollapsed] = useState(false);

  const initials = (user?.email ?? "A").slice(0,1).toUpperCase();

  return (
    <aside style={{
      width: collapsed ? 60 : 224,
      flexShrink: 0,
      background: T.rail,
      display: "flex", flexDirection: "column",
      height: "100vh", overflowY: "auto", overflowX: "hidden",
      transition: "width .2s cubic-bezier(.4,0,.2,1)",
      borderRight: `1px solid ${T.railBorder}`,
      position: "sticky", top: 0,
    }}>

      {/* Logo + collapse toggle */}
      <div style={{
        height: 56, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: collapsed ? "0 18px" : "0 16px",
        justifyContent: collapsed ? "center" : "space-between",
        borderBottom: `1px solid ${T.railBorder}`,
      }}>
        <BloomLogo collapsed={collapsed} />
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} style={{ background:"none", border:"none", color:T.railText, cursor:"pointer", padding:4, borderRadius:4, display:"flex", alignItems:"center", lineHeight:1, transition:"color .15s" }}
            onMouseEnter={e=>e.currentTarget.style.color="#fff"}
            onMouseLeave={e=>e.currentTarget.style.color=T.railText}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        )}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} style={{ background:"none", border:"none", color:T.railText, cursor:"pointer", padding:0, display:"flex", transition:"color .15s" }}
            onMouseEnter={e=>e.currentTarget.style.color="#fff"}
            onMouseLeave={e=>e.currentTarget.style.color=T.railText}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding: "8px 6px", overflowY:"auto" }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.label} style={{ marginBottom: collapsed ? 4 : 18 }}>
            {!collapsed && (
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"1.3px", textTransform:"uppercase", color:"rgba(255,255,255,.22)", padding:"0 8px 5px" }}>
                {section.label}
              </div>
            )}
            {section.items.map(item => {
              const isActive = active === item.id;
              const Icon = item.icon;
              return (
                <div key={item.id} style={{ position:"relative" }}>
                  <button onClick={() => setActive(item.id)}
                    title={collapsed ? item.label : ""}
                    style={{
                      display:"flex", alignItems:"center",
                      gap: collapsed ? 0 : 10,
                      justifyContent: collapsed ? "center" : "flex-start",
                      width:"100%", height:38,
                      padding: collapsed ? "0" : "0 10px",
                      border:"none", cursor:"pointer",
                      background: isActive ? T.railActive : "transparent",
                      color: isActive ? T.railTextActive : T.railText,
                      fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",
                      fontSize:13, fontWeight: isActive ? 600 : 400,
                      borderRadius:6, marginBottom:2,
                      transition:"background .12s, color .12s",
                      position:"relative",
                    }}
                    onMouseEnter={e=>{ if(!isActive){e.currentTarget.style.background=T.railHover;e.currentTarget.style.color="rgba(255,255,255,.9)";} }}
                    onMouseLeave={e=>{ if(!isActive){e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.railText;} }}
                  >
                    {isActive && (
                      <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:3, height:18, background:T.brandAccent, borderRadius:"0 3px 3px 0" }}/>
                    )}
                    <Icon s={17} c={isActive ? "#fff" : undefined}/>
                    {!collapsed && <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.label}</span>}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User + sign out */}
      <div style={{ padding: collapsed ? "10px 6px 16px" : "10px 10px 16px", borderTop:`1px solid ${T.railBorder}` }}>
        {!collapsed ? (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 8px", borderRadius:7, marginBottom:6 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${T.brand},${T.brandAccent})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>{initials}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,.88)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>GADRC Admin</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.38)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email ?? ""}</div>
              </div>
            </div>
            <button onClick={onLogout}
              style={{ display:"flex", alignItems:"center", gap:8, width:"100%", height:34, padding:"0 8px", border:"none", background:"transparent", color:"rgba(255,255,255,.38)", cursor:"pointer", fontFamily:"inherit", fontSize:12, borderRadius:6, transition:"all .12s" }}
              onMouseEnter={e=>{ e.currentTarget.style.background=T.railHover; e.currentTarget.style.color="rgba(255,255,255,.85)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,.38)"; }}>
              <LogoutIcon s={15}/> Sign out
            </button>
          </>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"center" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${T.brand},${T.brandAccent})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>{initials}</div>
            <button onClick={onLogout} title="Sign out"
              style={{ width:32, height:28, border:"none", background:"transparent", color:"rgba(255,255,255,.38)", cursor:"pointer", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .12s" }}
              onMouseEnter={e=>{ e.currentTarget.style.color="#fff"; }}
              onMouseLeave={e=>{ e.currentTarget.style.color="rgba(255,255,255,.38)"; }}>
              <LogoutIcon s={15}/>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}