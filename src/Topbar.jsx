const T = {
  brand:     "#2D6A2D",
  brandAccent:"#4CAF50",
  brandLight:"#E8F5E9",
  text1:     "#1A2E1A",
  text3:     "#8A9E8A",
  border:    "#DDE8DD",
  surfaceL1: "#FFFFFF",
  appBg:     "#F5F7F5",
};

const NAV_LABELS = {
  dashboard:    { label:"Dashboard",    icon: DashIcon    },
  reports:      { label:"Reports",      icon: ReportIcon  },
  modules:      { label:"Modules",      icon: BookIcon    },
  assessments:  { label:"Assessments",  icon: QuizIcon    },
  certificates: { label:"Certificates", icon: CertIcon    },
  seminars:     { label:"Seminars",     icon: SeminarIcon },
  calendar:     { label:"Calendar",     icon: CalIcon     },
  students:     { label:"Students",     icon: PeopleIcon  },
  announcements:{ label:"Announcements",icon: BellIcon    },
};

function DashIcon({s=15,c})    { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>; }
function ReportIcon({s=15,c})  { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>; }
function BookIcon({s=15,c})    { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>; }
function QuizIcon({s=15,c})    { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/></svg>; }
function CertIcon({s=15,c})    { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M8 12l-2 9 6-3 6 3-2-9"/></svg>; }
function SeminarIcon({s=15,c}) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>; }
function CalIcon({s=15,c})     { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function PeopleIcon({s=15,c})  { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>; }
function BellIcon({s=15,c})    { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c||"currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg>; }

export default function Topbar({ active, user, onProfileClick }) {
  const page = NAV_LABELS[active] ?? { label: active, icon: DashIcon };
  const Icon = page.icon;
  const initials = (user?.email ?? "A").slice(0,1).toUpperCase();

  return (
    <div style={{
      height: 56, flexShrink: 0,
      background: T.surfaceL1,
      borderBottom: `1px solid ${T.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px",
      boxShadow: "0 1px 2px rgba(26,46,26,.04)",
      position: "sticky", top: 0, zIndex: 50,
    }}>

      {/* Breadcrumb */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:26, height:26, borderRadius:6, background:T.brandLight, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon s={14} c={T.brand}/>
        </div>
        <span style={{ fontSize:15, fontWeight:600, color:T.text1 }}>{page.label}</span>
        <span style={{ color:"#D0D0D0", fontSize:14 }}>·</span>
        <span style={{ fontSize:12, color:T.text3 }}>GADRC CvSU</span>
      </div>

      {/* Right */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {/* Live pill */}
        <div style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 10px", background:T.brandLight, borderRadius:4, border:`1px solid ${T.brandAccent}22` }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:T.brandAccent }}/>
          <span style={{ fontSize:11, fontWeight:600, color:T.brand }}>Live</span>
        </div>

        {/* Avatar */}
        <button
          onClick={onProfileClick}
          style={{ width:32, height:32, borderRadius:"50%", background:`linear-gradient(135deg,${T.brand},${T.brandAccent})`, border:"none", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer", transition:"transform .12s", boxShadow:"0 1px 4px rgba(26,46,26,.2)" }}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.07)"}
          onMouseLeave={e=>e.currentTarget.style.transform=""}>
          {initials}
        </button>
      </div>
    </div>
  );
}