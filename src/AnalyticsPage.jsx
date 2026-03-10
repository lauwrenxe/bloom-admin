import { G } from "../styles/theme";
import { Btn, Card } from "../components/ui";

const bars = [
  { label: "Jan", val: 55 }, { label: "Feb", val: 72 },
  { label: "Mar", val: 68 }, { label: "Apr", val: 80 },
  { label: "May", val: 61 }, { label: "Jun", val: 90 },
];

const topModules = [
  { name: "Intro to GAD",        pct: 88 },
  { name: "Workplace Equality",  pct: 74 },
  { name: "VAWC Awareness",      pct: 61 },
];

const MAX = Math.max(...bars.map(b => b.val));

export default function AnalyticsPage() {
  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "26px", color: G.dark, marginBottom: "6px" }}>
        Data Analytics & Reporting
      </h2>
      <p style={{ color: "#777", fontSize: "13px", marginBottom: "32px" }}>
        Monitor student engagement and learning outcomes.
      </p>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "16px", marginBottom: "28px" }}>
        {[
          { icon: "✅", label: "Completion Rate",    val: "68%", sub: "↑ 4% from last month"    },
          { icon: "👥", label: "Active Students",    val: "204", sub: "of 312 total enrolled"    },
          { icon: "📚", label: "Modules Completed",  val: "876", sub: "across all students"      },
          { icon: "🎓", label: "Certificates Issued",val: "147", sub: "this semester"            },
        ].map(s => (
          <Card key={s.label} style={{ padding: "22px 20px" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>{s.icon}</div>
            <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "26px", color: G.dark }}>{s.val}</div>
            <div style={{ fontWeight: 600, fontSize: "12px", color: G.base, margin: "4px 0 2px" }}>{s.label}</div>
            <div style={{ fontSize: "11px", color: "#aaa" }}>{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
        {/* Bar chart */}
        <Card>
          <h4 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "16px", color: G.dark, marginBottom: "24px" }}>
            Monthly Completion Rate (%)
          </h4>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", height: "160px" }}>
            {bars.map(b => (
              <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                  <div style={{
                    width: "100%", borderRadius: "6px 6px 0 0", minHeight: "4px",
                    height: `${(b.val / MAX) * 100}%`,
                    background: `linear-gradient(180deg,${G.light},${G.base})`,
                    transition: "height .4s ease",
                  }} />
                </div>
                <div style={{ fontSize: "11px", color: "#888", fontWeight: 600 }}>{b.label}</div>
                <div style={{ fontSize: "11px", color: G.base, fontWeight: 700 }}>{b.val}%</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top modules */}
        <Card>
          <h4 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "16px", color: G.dark, marginBottom: "20px" }}>
            Top Modules
          </h4>
          {topModules.map(m => (
            <div key={m.name} style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#444" }}>{m.name}</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: G.base }}>{m.pct}%</span>
              </div>
              <div style={{ background: G.wash, borderRadius: "4px", height: "6px" }}>
                <div style={{ width: `${m.pct}%`, height: "100%", borderRadius: "4px", background: `linear-gradient(90deg,${G.base},${G.light})`, transition: "width .4s" }} />
              </div>
            </div>
          ))}
          <Btn variant="ghost" small style={{ marginTop: "12px", width: "100%" }}>Download Report</Btn>
        </Card>
      </div>
    </div>
  );
}
