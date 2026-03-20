import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark:  "#2d4a18", mid:   "#3a5a20", base:  "#5a7a3a",
  light: "#8ab060", pale:  "#b5cc8e", wash:  "#e8f2d8",
  cream: "#f6f9f0", white: "#fafdf6",
};

const SHIMMER_CSS = `
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.shimmer {
  background: linear-gradient(90deg, ${G.wash} 25%, ${G.cream} 50%, ${G.wash} 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 8px;
}`;

function fmtDate(iso) {
  if (!iso) return "—";
  const utcStr = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  return new Date(utcStr).toLocaleString("en-PH", {
    timeZone: "Asia/Manila", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function Shimmer({ w = "100%", h = 16, r = 8, style = {} }) {
  return <div className="shimmer" style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />;
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 14, padding: "24px 28px", boxShadow: "0 2px 8px rgba(45,74,24,.06)", ...style }}>
      {children}
    </div>
  );
}

function StatCard({ emoji, label, value, sub, color, border }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: border ? `3px solid ${border}` : undefined }}>
      <div style={{ fontSize: 28 }}>{emoji}</div>
      <div style={{ fontSize: 11, color: G.base, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 900, color: color || G.dark, lineHeight: 1 }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize: 12, color: G.light, marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

function SectionTitle({ children }) {
  return <h2 style={{ fontFamily: "'Segoe UI', sans-serif", fontSize: 16, fontWeight: 800, color: G.dark, margin: "0 0 16px 0" }}>{children}</h2>;
}

function Tag({ children, color }) {
  const map = { green: { bg: G.wash, text: G.dark }, yellow: { bg: "#fff8e1", text: "#7a5c00" }, gray: { bg: "#f0f0f0", text: "#555" }, blue: { bg: "#e8f0fe", text: "#1a56a8" } };
  const c = map[color] || map.gray;
  return <span style={{ background: c.bg, color: c.text, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>{children}</span>;
}

function MiniBar({ label, value, max, color, sub }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: G.mid, marginBottom: 5 }}>
        <span style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{label}</span>
        <span style={{ fontWeight: 700, color: G.dark }}>{value}<span style={{ fontWeight: 400, color: "#aaa" }}>/{max}</span></span>
      </div>
      <div style={{ background: G.wash, borderRadius: 6, height: 8 }}>
        <div style={{ width: `${pct}%`, height: 8, borderRadius: 6, background: color || G.base, transition: "width .6s ease" }} />
      </div>
      {sub && <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function EmptyState({ emoji, title, message }) {
  return (
    <div style={{ textAlign: "center", padding: "28px 16px" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{emoji}</div>
      {title && <div style={{ fontSize: 14, fontWeight: 600, color: G.base, marginBottom: 4 }}>{title}</div>}
      <div style={{ fontSize: 13, color: G.light }}>{message}</div>
    </div>
  );
}

function SkeletonStatCard() {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Shimmer w={32} h={28} r={6} />
      <Shimmer w="60%" h={11} />
      <Shimmer w="40%" h={34} r={6} />
      <Shimmer w="80%" h={11} />
    </Card>
  );
}

function SkeletonListCard({ rows = 4 }) {
  return (
    <Card>
      <Shimmer w="45%" h={18} style={{ marginBottom: 20 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <Shimmer w="55%" h={13} />
            <Shimmer w="12%" h={13} />
          </div>
          <Shimmer w="100%" h={8} />
        </div>
      ))}
    </Card>
  );
}

function getActivityEmoji(action) {
  if (!action) return "📌";
  const a = action.toLowerCase();
  if (a.includes("module"))      return "📚";
  if (a.includes("seminar"))     return "🎓";
  if (a.includes("certificate")) return "🏆";
  if (a.includes("assessment") || a.includes("quiz")) return "📝";
  if (a.includes("login"))       return "🔑";
  if (a.includes("register"))    return "✏️";
  if (a.includes("badge"))       return "🏅";
  if (a.includes("file"))        return "📄";
  if (a.includes("forum"))       return "💬";
  return "📌";
}

export default function DashboardPage() {
  const [stats,        setStats]        = useState(null);
  const [moduleStats,  setModuleStats]  = useState([]);
  const [seminarStats, setSeminarStats] = useState([]);
  const [leaderboard,  setLeaderboard]  = useState([]);
  const [activity,     setActivity]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true); setError(null);
    try {
      // ── Core counts ──
      const [
        { count: totalModules },
        { count: publishedModules },
        { count: totalAssessments },
        { count: publishedAssessments },
        { count: totalSeminars },
        { count: totalCerts },
        { count: totalBadgesAwarded },
        { data: modStats },
        { data: semStats },
      ] = await Promise.all([
        supabase.from("modules").select("*", { count: "exact", head: true }),
        supabase.from("modules").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("assessments").select("*", { count: "exact", head: true }),
        supabase.from("assessments").select("*", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("seminars").select("*", { count: "exact", head: true }),
        supabase.from("certificates").select("*", { count: "exact", head: true }).eq("is_revoked", false),
        supabase.from("student_badges").select("*", { count: "exact", head: true }),
        supabase.from("v_module_completion_stats").select("*").order("completion_rate_percent", { ascending: false }).limit(5),
        supabase.from("v_seminar_attendance_summary").select("*").order("scheduled_start", { ascending: false }).limit(5),
      ]);

      setStats(prev => ({
        ...prev,
        totalModules:         totalModules ?? 0,
        publishedModules:     publishedModules ?? 0,
        totalAssessments:     totalAssessments ?? 0,
        publishedAssessments: publishedAssessments ?? 0,
        totalSeminars:        totalSeminars ?? 0,
        totalCerts:           totalCerts ?? 0,
        totalBadgesAwarded:   totalBadgesAwarded ?? 0,
      }));
      setModuleStats(modStats ?? []);
      setSeminarStats(semStats ?? []);

      // ── Student count (role-based) ──
      const { data: roleRow } = await supabase.from("roles").select("id").eq("name", "student").single();
      if (roleRow) {
        const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role_id", roleRow.id);
        setStats(prev => ({ ...prev, totalStudents: count ?? 0 }));
      }

      // ── Badge leaderboard ──
      const { data: lb } = await supabase.from("student_badges").select("user_id, profiles(full_name)");
      const map = {};
      (lb ?? []).forEach((row, idx) => {
        const uid = row.user_id ?? `unknown_${idx}`;
        if (!map[uid]) map[uid] = { user_id: uid, full_name: row.profiles?.full_name ?? "—", badge_count: 0 };
        map[uid].badge_count += 1;
      });
      setLeaderboard(Object.values(map).sort((a, b) => b.badge_count - a.badge_count).slice(0, 5));

      // ── Recent activity logs ──
      const { data: logs } = await supabase
        .from("activity_logs").select("*").order("created_at", { ascending: false }).limit(10);
      setActivity(logs ?? []);

    } catch (err) {
      setError("Failed to load dashboard: " + err.message);
    }
    setLoading(false);
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <>
        <style>{SHIMMER_CSS}</style>
        <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <Shimmer w={160} h={32} r={10} style={{ marginBottom: 10 }} />
            <Shimmer w={300} h={14} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
            {[...Array(6)].map((_, i) => <SkeletonStatCard key={i} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <SkeletonListCard rows={4} />
            <SkeletonListCard rows={4} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <SkeletonListCard rows={4} />
            <SkeletonListCard rows={5} />
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return <div style={{ padding: 40, color: "#c0392b", background: "#fff5f5", borderRadius: 12, margin: 24 }}>⚠️ {error}</div>;
  }

  const draftCount = (stats.totalModules ?? 0) - (stats.publishedModules ?? 0);

  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "'Segoe UI', sans-serif", fontSize: 26, fontWeight: 900, color: G.dark, margin: 0 }}>📊 Dashboard</h1>
            <p style={{ color: G.base, margin: "4px 0 0", fontSize: 14 }}>Welcome back — here's what's happening at GADRC today.</p>
          </div>
          <button onClick={fetchAll} style={{ background: G.wash, border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, color: G.base, cursor: "pointer", fontWeight: 600 }}>↻ Refresh</button>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 14, marginBottom: 24 }}>
          <StatCard emoji="👩‍🎓" label="Students"           value={stats.totalStudents ?? "—"} color={G.dark}    border={G.dark} />
          <StatCard emoji="📚"   label="Modules"            value={stats.totalModules ?? 0}    sub={`${stats.publishedModules ?? 0} published · ${draftCount} draft`} border={G.base} />
          <StatCard emoji="📝"   label="Assessments"        value={stats.totalAssessments ?? 0} sub={`${stats.publishedAssessments ?? 0} published`} border="#2563eb" color="#2563eb" />
          <StatCard emoji="🎓"   label="Seminars"           value={stats.totalSeminars ?? 0}   border="#7c3aed" color="#7c3aed" />
          <StatCard emoji="🏅"   label="Badges Awarded"     value={stats.totalBadgesAwarded ?? 0} border="#f59e0b" color="#f59e0b" />
          <StatCard emoji="🏆"   label="Certificates"       value={stats.totalCerts ?? 0}      border="#16a34a" color="#16a34a" />
        </div>

        {/* Module + Seminar completion */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <Card>
            <SectionTitle>📊 Module Completion Rate (Top 5)</SectionTitle>
            {moduleStats.length === 0
              ? <EmptyState emoji="📊" title="No data yet" message="Completion stats appear once students start modules." />
              : moduleStats.map((m, i) => (
                <MiniBar
                  key={m.module_id ?? i}
                  label={m.module_title ?? "Untitled"}
                  value={m.completed_count ?? 0}
                  max={m.total_students ?? 1}
                  color={i === 0 ? G.dark : i === 1 ? G.mid : G.base}
                  sub={`${m.completion_rate_percent ?? 0}% completion · ${m.in_progress_count ?? 0} in progress`}
                />
              ))
            }
          </Card>

          <Card>
            <SectionTitle>🎓 Seminar Attendance (Recent 5)</SectionTitle>
            {seminarStats.length === 0
              ? <EmptyState emoji="🎓" title="No seminars yet" message="Attendance stats appear after seminars are held." />
              : seminarStats.map((s, i) => (
                <MiniBar
                  key={s.seminar_id ?? i}
                  label={s.seminar_title ?? "Untitled"}
                  value={s.attended_count ?? 0}
                  max={s.registered_count ?? 1}
                  color={i === 0 ? "#7c3aed" : i === 1 ? "#2563eb" : G.base}
                  sub={`${s.attendance_rate_percent ?? 0}% attendance · ${s.registered_count ?? 0} registered`}
                />
              ))
            }
          </Card>
        </div>

        {/* Leaderboard + Activity */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card>
            <SectionTitle>🏆 Badge Leaderboard (Top 5)</SectionTitle>
            {leaderboard.length === 0
              ? <EmptyState emoji="🏆" title="No leaderboard yet" message="Students appear here as they earn badges." />
              : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${G.wash}` }}>
                      {["Rank", "Student", "Badges"].map(h => (
                        <th key={h} style={{ textAlign: h === "Rank" ? "center" : "left", padding: "6px 8px", fontSize: 11, fontWeight: 700, color: G.base, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row, i) => (
                      <tr key={row.user_id} style={{ borderBottom: `1px solid ${G.wash}`, background: i === 0 ? G.cream : "transparent" }}>
                        <td style={{ textAlign: "center", padding: "10px 8px", fontSize: 18 }}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                        </td>
                        <td style={{ padding: "10px 8px", fontSize: 14, color: G.dark, fontWeight: i === 0 ? 700 : 500 }}>{row.full_name}</td>
                        <td style={{ padding: "10px 8px", fontSize: 14, color: "#f59e0b", fontWeight: 700 }}>🏅 {row.badge_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </Card>

          <Card>
            <SectionTitle>🕐 Recent Activity</SectionTitle>
            {activity.length === 0
              ? <EmptyState emoji="🕐" title="No activity yet" message="Recent student actions will appear here." />
              : activity.map((log, i) => (
                <div key={log.id ?? i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: i < activity.length - 1 ? `1px solid ${G.wash}` : "none" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: G.wash, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                    {getActivityEmoji(log.action_type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: G.dark, fontWeight: 500 }}>
                      {log.action_type?.replace(/_/g, " ") ?? "Activity"}
                      {log.reference_type ? <span style={{ color: "#aaa", fontWeight: 400 }}> · {log.reference_type}</span> : ""}
                    </div>
                    <div style={{ fontSize: 11, color: G.light, marginTop: 2 }}>{fmtDate(log.created_at)}</div>
                  </div>
                  <Tag color="gray">{log.action_type?.split("_")[0] ?? "event"}</Tag>
                </div>
              ))
            }
          </Card>
        </div>

      </div>
    </>
  );
}