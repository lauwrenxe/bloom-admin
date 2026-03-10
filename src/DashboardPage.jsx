import { G } from "../styles/theme";
import { Card, Tag } from "../components/ui";
import { ANALYTICS, SEED } from "../data/seed";

export default function DashboardPage() {
  const stats = [
    { icon: "👥", label: "Total Students",      val: ANALYTICS.totalStudents,               color: G.base     },
    { icon: "📈", label: "Completion Rate",      val: `${ANALYTICS.completionRate}%`,        color: "#4a90d9"  },
    { icon: "📚", label: "Active Modules",       val: ANALYTICS.activeModules,               color: "#e67e22"  },
    { icon: "🎙️", label: "Seminar Attendance",   val: ANALYTICS.seminarAttendance,           color: "#8e44ad"  },
    { icon: "🎓", label: "Certificates Issued",  val: ANALYTICS.certificatesIssued,          color: G.mid      },
    { icon: "📱", label: "Monthly Active Users", val: ANALYTICS.monthlyActive,               color: "#16a085"  },
  ];

  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "26px", color: G.dark, marginBottom: "6px" }}>
        Dashboard Overview
      </h2>
      <p style={{ color: "#777", fontSize: "13.5px", marginBottom: "32px" }}>
        Welcome back, Admin. Here's what's happening across BLOOM.
      </p>

      {/* Stat grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "16px", marginBottom: "36px" }}>
        {stats.map(s => (
          <Card key={s.label} style={{ textAlign: "center", padding: "24px 16px" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>{s.icon}</div>
            <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "28px", color: s.color, marginBottom: "4px" }}>
              {s.val}
            </div>
            <div style={{ fontSize: "12px", color: "#888", fontWeight: 500 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Recent modules */}
        <Card>
          <h4 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "16px", color: G.dark, marginBottom: "16px" }}>
            Recent Modules
          </h4>
          {SEED.modules.map(m => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${G.wash}` }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "13px", color: "#333" }}>{m.title}</div>
                <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>{m.category} · {m.updated}</div>
              </div>
              <Tag color={m.status === "Published" ? G.base : "#e67e22"} bg={m.status === "Published" ? G.wash : "#fef5e7"}>
                {m.status}
              </Tag>
            </div>
          ))}
        </Card>

        {/* Upcoming seminars */}
        <Card>
          <h4 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "16px", color: G.dark, marginBottom: "16px" }}>
            Upcoming Seminars
          </h4>
          {SEED.seminars.filter(s => s.status === "Upcoming").map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${G.wash}` }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "13px", color: "#333" }}>{s.title}</div>
                <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>{s.date} · {s.time}</div>
              </div>
              <Tag color="#4a90d9" bg="#eaf2fb">Live Soon</Tag>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
