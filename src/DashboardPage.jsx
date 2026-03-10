import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark:  "#2d4a18",
  mid:   "#3a5a20",
  base:  "#5a7a3a",
  light: "#8ab060",
  pale:  "#b5cc8e",
  wash:  "#e8f2d8",
  cream: "#f6f9f0",
  white: "#fafdf6",
};

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: G.white, border: `1px solid ${G.pale}`,
      borderRadius: 14, padding: "24px 28px", ...style,
    }}>
      {children}
    </div>
  );
}

function StatCard({ emoji, label, value, sub, color }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 28 }}>{emoji}</div>
      <div style={{ fontSize: 13, color: G.base, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 38, fontWeight: 800, color: color || G.dark, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: G.light, marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: G.dark, margin: "0 0 14px 0" }}>
      {children}
    </h2>
  );
}

function Tag({ children, color }) {
  const colors = {
    green:  { bg: G.wash,    text: G.dark },
    yellow: { bg: "#fff8e1", text: "#7a5c00" },
    gray:   { bg: "#f0f0f0", text: "#555" },
    blue:   { bg: "#e8f0fe", text: "#1a56a8" },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{
      background: c.bg, color: c.text, borderRadius: 20, padding: "2px 10px",
      fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase",
    }}>
      {children}
    </span>
  );
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: G.mid, marginBottom: 4 }}>
        <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ background: G.wash, borderRadius: 6, height: 8 }}>
        <div style={{ width: `${pct}%`, height: 8, borderRadius: 6, background: color || G.base, transition: "width .6s ease" }} />
      </div>
    </div>
  );
}

function getActivityEmoji(action) {
  if (!action) return "📌";
  const a = action.toLowerCase();
  if (a.includes("module"))      return "📚";
  if (a.includes("seminar"))     return "🎓";
  if (a.includes("certificate")) return "🏅";
  if (a.includes("assessment"))  return "📝";
  if (a.includes("login"))       return "🔑";
  if (a.includes("register"))    return "✍️";
  if (a.includes("badge"))       return "⭐";
  return "📌";
}

export default function DashboardPage() {
  const [stats,       setStats]       = useState(null);
  const [moduleStats, setModuleStats] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activity,    setActivity]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);

    // ── core counts ──────────────────────────────────────────────────
    try {
      const [
        { count: totalModules },
        { count: publishedModules },
        { count: totalAssessments },
        { count: totalSeminars },
        { count: totalCerts },
        { data: modStats },
      ] = await Promise.all([
        supabase.from("modules").select("*", { count: "exact", head: true }),
        supabase.from("modules").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("assessments").select("*", { count: "exact", head: true }),
        supabase.from("seminars").select("*", { count: "exact", head: true }),
        supabase.from("certificates").select("*", { count: "exact", head: true }),
        supabase.from("v_module_completion_stats").select("*").limit(5),
      ]);

      setStats(prev => ({
        ...prev,
        totalModules:     totalModules     ?? 0,
        publishedModules: publishedModules ?? 0,
        totalAssessments: totalAssessments ?? 0,
        totalSeminars:    totalSeminars    ?? 0,
        totalCerts:       totalCerts       ?? 0,
      }));
      setModuleStats(modStats ?? []);
    } catch (err) {
      setError("Failed to load dashboard data: " + err.message);
      setLoading(false);
      return;
    }

    // ── student count (two-step) ─────────────────────────────────────
    try {
      const { data: roleRow } = await supabase
        .from("roles").select("id").eq("name", "student").single();
      if (roleRow) {
        const { count } = await supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role_id", roleRow.id);
        setStats(prev => ({ ...prev, totalStudents: count ?? 0 }));
      }
    } catch (_) {}

    // ── leaderboard: deduplicate student_badges by user_id ───────────
    try {
      const { data: lb } = await supabase
        .from("student_badges")
        .select("user_id, profiles(full_name)");

      const map = {};
      (lb ?? []).forEach((row, idx) => {
        const uid = row.user_id ?? `unknown_${idx}`;
        if (!map[uid]) {
          map[uid] = { user_id: uid, full_name: row.profiles?.full_name ?? "—", badge_count: 0 };
        }
        map[uid].badge_count += 1;
      });

      setLeaderboard(
        Object.values(map).sort((a, b) => b.badge_count - a.badge_count).slice(0, 5)
      );
    } catch (_) {}

    // ── activity logs ────────────────────────────────────────────────
    try {
      const { data: logs, error: logErr } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      if (!logErr) setActivity(logs ?? []);
    } catch (_) {}

    setLoading(false);
  };

  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320, flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 36 }}>🌸</div>
        <div style={{ color: G.base, fontSize: 15 }}>Loading dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, color: "#c0392b", background: "#fff5f5", borderRadius: 12, margin: 24 }}>
        ⚠️ {error}
      </div>
    );
  }

  const draftCount = (stats.totalModules ?? 0) - (stats.publishedModules ?? 0);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: G.dark, margin: 0 }}>
          Dashboard
        </h1>
        <p style={{ color: G.base, margin: "4px 0 0", fontSize: 14 }}>
          Welcome back — here's what's happening at GADRC today.
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard emoji="📚" label="Total Modules"       value={stats.totalModules ?? 0}
          sub={`${stats.publishedModules ?? 0} published · ${draftCount} draft`} />
        <StatCard emoji="📝" label="Assessments"         value={stats.totalAssessments ?? 0} />
        <StatCard emoji="🎓" label="Seminars"            value={stats.totalSeminars ?? 0} />
        <StatCard emoji="🏅" label="Certificates Issued" value={stats.totalCerts ?? 0} color={G.mid} />
        <StatCard emoji="👩‍🎓" label="Students"           value={stats.totalStudents ?? "—"} />
      </div>

      {/* Middle row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

        {/* Module Completion */}
        <Card>
          <SectionTitle>📊 Module Completion (Top 5)</SectionTitle>
          {moduleStats.length === 0 ? (
            <p style={{ color: G.light, fontSize: 14 }}>No module data yet.</p>
          ) : (
            moduleStats.map((m, i) => (
              <MiniBar
                key={m.module_id ?? i}
                label={m.title ?? "Untitled Module"}
                value={m.completed_students ?? 0}
                max={Math.max(m.total_students ?? 0, 1)}
                color={i === 0 ? G.dark : i === 1 ? G.mid : G.base}
              />
            ))
          )}
        </Card>

        {/* Leaderboard */}
        <Card>
          <SectionTitle>🏆 Student Leaderboard (Top 5)</SectionTitle>
          {leaderboard.length === 0 ? (
            <p style={{ color: G.light, fontSize: 14 }}>No leaderboard data yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${G.wash}` }}>
                  {["Rank", "Name", "Badges"].map(h => (
                    <th key={h} style={{
                      textAlign: h === "Rank" ? "center" : "left",
                      padding: "6px 8px", fontSize: 11, fontWeight: 700,
                      color: G.base, letterSpacing: ".05em", textTransform: "uppercase",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => (
                  <tr key={row.user_id} style={{
                    borderBottom: `1px solid ${G.wash}`,
                    background: i === 0 ? G.cream : "transparent",
                  }}>
                    <td style={{ textAlign: "center", padding: "8px", fontSize: 18 }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </td>
                    <td style={{ padding: "8px", fontSize: 14, color: G.dark, fontWeight: i === 0 ? 700 : 500 }}>
                      {row.full_name}
                    </td>
                    <td style={{ padding: "8px", fontSize: 14, color: G.base }}>
                      {row.badge_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <SectionTitle>🕐 Recent Activity</SectionTitle>
          <button onClick={fetchAll} style={{
            background: "none", border: `1px solid ${G.pale}`,
            borderRadius: 8, padding: "4px 12px",
            fontSize: 12, color: G.base, cursor: "pointer",
          }}>
            ↻ Refresh
          </button>
        </div>
        {activity.length === 0 ? (
          <p style={{ color: G.light, fontSize: 14 }}>No recent activity logged.</p>
        ) : (
          <div>
            {activity.map((log, i) => (
              <div key={log.id ?? i} style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "10px 0",
                borderBottom: i < activity.length - 1 ? `1px solid ${G.wash}` : "none",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", background: G.wash,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, flexShrink: 0,
                }}>
                  {getActivityEmoji(log.action)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: G.dark, fontWeight: 500 }}>
                    {log.description ?? log.action ?? "Activity"}
                  </div>
                  <div style={{ fontSize: 11, color: G.light, marginTop: 2 }}>
                    {fmtDate(log.created_at)}
                  </div>
                </div>
                <Tag color="gray">{log.action ?? "event"}</Tag>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div style={{ marginTop: 20 }}>
        <SectionTitle>⚡ Quick Actions</SectionTitle>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {["📚 Manage Modules", "📝 Manage Assessments", "🎓 Manage Seminars", "🏅 Certificates", "📅 Calendar"].map(label => (
            <div key={label} style={{
              background: G.white, border: `1px solid ${G.pale}`, borderRadius: 12,
              padding: "12px 20px", fontSize: 13, color: G.mid, fontWeight: 600,
              cursor: "default", display: "flex", alignItems: "center", gap: 8,
            }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}