import { useState } from "react";
import { G } from "../styles/theme";
import Sidebar from "../components/layout/Sidebar";
import Topbar  from "../components/layout/Topbar";
import DashboardPage    from "../pages/DashboardPage";
import ModulesPage      from "../pages/ModulesPage";
import AssessmentsPage  from "../pages/AssessmentsPage";
import AnalyticsPage    from "../pages/AnalyticsPage";
import CertificatesPage from "../pages/CertificatesPage";
import SeminarsPage     from "../pages/SeminarsPage";
import CalendarPage     from "../pages/CalendarPage";

const VIEWS = {
  dashboard:    <DashboardPage    />,
  modules:      <ModulesPage      />,
  assessments:  <AssessmentsPage  />,
  analytics:    <AnalyticsPage    />,
  certificates: <CertificatesPage />,
  seminars:     <SeminarsPage     />,
  calendar:     <CalendarPage     />,
};

export default function AdminShell({ onLogout }) {
  const [active, setActive] = useState("dashboard");

  return (
    <div style={{ display: "flex", width: "100%", minHeight: "100vh", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <Sidebar active={active} setActive={setActive} onLogout={onLogout} />

      <main style={{ flex: 1, background: G.white, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <Topbar active={active} />
        <div style={{ padding: "36px", flex: 1 }}>
          {VIEWS[active]}
        </div>
      </main>
    </div>
  );
}
