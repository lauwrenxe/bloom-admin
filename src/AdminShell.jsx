import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar  from "./Topbar";
import DashboardPage     from "./DashboardPage";
import ModulesPage       from "./ModulesPage";
import AssessmentsPage   from "./AssessmentsPage";
import SeminarsPage      from "./SeminarsPage";
import CertificatesPage  from "./CertificatesPage";
import CalendarPage      from "./CalendarPage";
import ReportsPage       from "./ReportsPage";
import StudentsPage      from "./StudentsPage";
import AnnouncementsPage from "./AnnouncementsPage";
import AdminProfilePage  from "./AdminProfilePage";

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; min-height: 100vh; }
  body { margin: 0 !important; padding: 0 !important; font-family: 'Inter','Segoe UI',system-ui,sans-serif; background: #F5F7F5; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #C8E6C9; border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: #A5D6A7; }
  @keyframes fadeSlideIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
  @keyframes shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .page-anim { animation: fadeSlideIn .18s ease forwards; }
`;

function Sk({ w="100%", h=14, r=4 }) {
  return <div style={{ width:w, height:h, borderRadius:r, background:"linear-gradient(90deg,#EBF2EB 25%,#F5F7F5 50%,#EBF2EB 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.3s infinite" }}/>;
}

function PageSkeleton() {
  return (
    <div style={{ padding:"28px 32px", display:"flex", flexDirection:"column", gap:18 }}>
      <Sk w={180} h={22} r={4}/> <Sk w={120} h={13} r={3}/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginTop:6 }}>
        {[1,2,3,4].map(i=>(
          <div key={i} style={{ background:"#fff", border:"1px solid #DDE8DD", borderRadius:10, padding:18, boxShadow:"0 1px 3px rgba(26,46,26,.06)" }}>
            <Sk h={13} w="60%" r={3}/> <div style={{ height:8 }}/> <Sk h={28} w="40%" r={4}/>
          </div>
        ))}
      </div>
      <div style={{ background:"#fff", border:"1px solid #DDE8DD", borderRadius:10, height:200, boxShadow:"0 1px 3px rgba(26,46,26,.06)" }}/>
    </div>
  );
}

export default function AdminShell({ onLogout, user }) {
  const [active,      setActive]      = useState("dashboard");
  const [showProfile, setShowProfile] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);

  const navigate = (id) => {
    if (id === active) return;
    setPageLoading(true);
    setActive(id);
    setTimeout(() => setPageLoading(false), 350);
  };

  return (
    <>
      <style>{STYLE}</style>
      <div style={{ display:"flex", width:"100%", height:"100vh", overflow:"hidden", fontFamily:"'Inter','Segoe UI',system-ui,sans-serif" }}>

        <Sidebar active={active} setActive={navigate} onLogout={onLogout} user={user}/>

        <div style={{ flex:1, display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", minWidth:0 }}>
          <Topbar active={active} user={user} onProfileClick={() => setShowProfile(true)}/>

          <main style={{ flex:1, overflowY:"auto", background:"#F5F7F5" }}>
            <div className="page-anim" key={active}>
              {pageLoading ? <PageSkeleton/> : (
                <>
                  {active === "dashboard"     && <DashboardPage/>}
                  {active === "modules"       && <ModulesPage/>}
                  {active === "assessments"   && <AssessmentsPage/>}
                  {active === "seminars"      && <SeminarsPage/>}
                  {active === "certificates"  && <CertificatesPage/>}
                  {active === "calendar"      && <CalendarPage/>}
                  {active === "reports"       && <ReportsPage/>}
                  {active === "students"      && <StudentsPage/>}
                  {active === "announcements" && <AnnouncementsPage/>}
                </>
              )}
            </div>
          </main>
        </div>

        {showProfile && <AdminProfilePage user={user} onClose={() => setShowProfile(false)}/>}
      </div>
    </>
  );
}