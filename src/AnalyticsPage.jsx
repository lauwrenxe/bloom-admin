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

function Shimmer({ w = "100%", h = 16, r = 8, style = {} }) {
  return <div className="shimmer" style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />;
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 14, padding: "22px 26px", boxShadow: "0 2px 8px rgba(45,74,24,.06)", ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: G.dark, margin: "0 0 16px 0" }}>{children}</h2>;
}

function StatCard({ emoji, label, value, sub, color }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ fontSize: 26 }}>{emoji}</div>
      <div style={{ fontSize: 12, color: G.base, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 800, color: color || G.dark, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: G.light, marginTop: 1 }}>{sub}</div>}
    </Card>
  );
}

function MiniBar({ label, value, max, color, sub }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: G.mid, marginBottom: 4 }}>
        <span style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <span style={{ fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{value}{sub ? ` ${sub}` : ""}</span>
      </div>
      <div style={{ background: G.wash, borderRadius: 6, height: 8 }}>
        <div style={{ width: `${pct}%`, height: 8, borderRadius: 6, background: color || G.base, transition: "width .7s ease" }} />
      </div>
    </div>
  );
}

function EmptyState({ emoji, message }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 16px" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontSize: 13, color: G.light }}>{message}</div>
    </div>
  );
}

function DonutChart({ segments, size = 120 }) {
  const r = 40, cx = 60, cy = 60, circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={G.wash} strokeWidth={18} />
      {total === 0 ? null : segments.map((seg, i) => {
        const dash = (seg.value / total) * circumference;
        const gap  = circumference - dash;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={18}
            strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px", transition: "stroke-dasharray .7s" }} />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="16" fontWeight="800" fill={G.dark}>{total}</text>
    </svg>
  );
}

// ── Skeleton screens ──────────────────────────────────────────────
function SkeletonStatGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
      {[...Array(6)].map((_, i) => (
        <Card key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Shimmer w={28} h={26} r={6} />
          <Shimmer w="60%" h={11} />
          <Shimmer w="40%" h={30} r={6} />
        </Card>
      ))}
    </div>
  );
}

function SkeletonBarCard({ rows = 4 }) {
  return (
    <Card>
      <Shimmer w="50%" h={16} style={{ marginBottom: 20 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <Shimmer w="50%" h={13} />
            <Shimmer w="15%" h={13} />
          </div>
          <Shimmer w="100%" h={8} />
        </div>
      ))}
    </Card>
  );
}

export default function AnalyticsPage() {
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [overview,     setOverview]     = useState({});
  const [moduleStats,  setModuleStats]  = useState([]);
  const [seminarStats, setSeminarStats] = useState([]);
  const [leaderboard,  setLeaderboard]  = useState([]);
  const [certStats,    setCertStats]    = useState({});
  const [assessStats,  setAssessStats]  = useState({});

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    await Promise.allSettled([fetchOverview(), fetchModuleStats(), fetchSeminarStats(), fetchLeaderboard(), fetchCertStats(), fetchAssessStats()]);
    isRefresh ? setRefreshing(false) : setLoading(false);
  };

  const fetchOverview = async () => {
    const [{ count: modules }, { count: published }, { count: assessments }, { count: seminars }, { count: certificates }] = await Promise.all([
      supabase.from("modules").select("*", { count: "exact", head: true }),
      supabase.from("modules").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("assessments").select("*", { count: "exact", head: true }),
      supabase.from("seminars").select("*", { count: "exact", head: true }),
      supabase.from("certificates").select("*", { count: "exact", head: true }),
    ]);
    let students = 0;
    try {
      const { data: roleRow } = await supabase.from("roles").select("id").eq("name", "student").single();
      if (roleRow) {
        const { count } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role_id", roleRow.id);
        students = count ?? 0;
      }
    } catch (_) {}
    setOverview({ modules: modules ?? 0, published: published ?? 0, assessments: assessments ?? 0, seminars: seminars ?? 0, certificates: certificates ?? 0, attempts: 0, students });
  };

  const fetchModuleStats = async () => {
    try {
      const { data } = await supabase.from("v_module_completion_stats").select("*");
      setModuleStats(data ?? []);
    } catch (_) {
      try {
        const { data: mods } = await supabase.from("modules").select("id, title, status").eq("status", "published");
        const { data: prog } = await supabase.from("student_progress").select("module_id, status");
        const map = {};
        (mods ?? []).forEach(m => { map[m.id] = { title: m.title, total: 0, completed: 0 }; });
        (prog ?? []).forEach(p => { if (map[p.module_id]) { map[p.module_id].total++; if (p.status === "completed") map[p.module_id].completed++; } });
        setModuleStats(Object.values(map).map(m => ({ title: m.title, total_students: m.total, completed_students: m.completed })));
      } catch (_) {}
    }
  };

  const fetchSeminarStats = async () => {
    try {
      const { data } = await supabase.from("v_seminar_attendance_summary").select("*");
      setSeminarStats(data ?? []);
    } catch (_) {
      try {
        const { data: sems } = await supabase.from("seminars").select("id, title");
        const { data: regs } = await supabase.from("seminar_registrations").select("seminar_id, status");
        const map = {};
        (sems ?? []).forEach(s => { map[s.id] = { title: s.title, registered: 0, attended: 0 }; });
        (regs ?? []).forEach(r => { if (map[r.seminar_id]) { map[r.seminar_id].registered++; if (r.status === "attended") map[r.seminar_id].attended++; } });
        setSeminarStats(Object.values(map).map(s => ({ title: s.title, total_registered: s.registered, total_attended: s.attended })));
      } catch (_) {}
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data: lb } = await supabase.from("student_badges").select("user_id, profiles(full_name)");
      const map = {};
      (lb ?? []).forEach((row, idx) => {
        const uid = row.user_id ?? `u_${idx}`;
        if (!map[uid]) map[uid] = { user_id: uid, full_name: row.profiles?.full_name ?? "—", badge_count: 0 };
        map[uid].badge_count += 1;
      });
      setLeaderboard(Object.values(map).sort((a, b) => b.badge_count - a.badge_count).slice(0, 8));
    } catch (_) {}
  };

  const fetchCertStats = async () => {
    try {
      const { data, error } = await supabase.from("certificates").select("*");
      if (error || !data) { setCertStats({}); return; }
      const byType = {}; let valid = 0, revoked = 0;
      data.forEach(c => {
        const t = c.certificate_type ?? c.type ?? c.cert_type ?? "other";
        byType[t] = (byType[t] ?? 0) + 1;
        const isRev = c.is_revoked ?? c.revoked ?? false;
        if (isRev) revoked++; else valid++;
      });
      setCertStats({ byType, valid, revoked, total: data.length });
    } catch (_) { setCertStats({}); }
  };

  const fetchAssessStats = async () => { setAssessStats({}); };

  const certTypeColors = { module: G.base, seminar: "#3b82f6", course: "#ca8a04", other: "#888" };
  const certSegments = Object.entries(certStats.byType ?? {}).map(([type, value]) => ({ label: type, value, color: certTypeColors[type] ?? "#888" }));

  if (loading) {
    return (
      <>
        <style>{SHIMMER_CSS}</style>
        <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <Shimmer w={140} h={32} r={10} style={{ marginBottom: 10 }} />
            <Shimmer w={320} h={14} />
          </div>
          <SkeletonStatGrid />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <SkeletonBarCard rows={5} />
            <SkeletonBarCard rows={5} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <SkeletonBarCard rows={3} />
            <SkeletonBarCard rows={3} />
          </div>
          <SkeletonBarCard rows={2} />
        </div>
      </>
    );
  }

  const maxModuleStudents = Math.max(...moduleStats.map(m => m.total_students ?? 0), 1);
  const maxSeminarReg     = Math.max(...seminarStats.map(s => s.total_registered ?? 0), 1);

  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: G.dark, margin: 0 }}>Analytics</h1>
            <p style={{ color: G.base, margin: "4px 0 0", fontSize: 14 }}>Live insights across modules, seminars, assessments, and students.</p>
          </div>
          <button onClick={() => fetchAll(true)} disabled={refreshing}
            style={{ background: "none", border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, color: G.base, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, opacity: refreshing ? 0.6 : 1 }}>
            {refreshing ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
          <StatCard emoji="👩‍🎓" label="Students"     value={overview.students ?? "—"} />
          <StatCard emoji="📚" label="Modules"       value={overview.modules ?? 0} sub={`${overview.published ?? 0} published`} />
          <StatCard emoji="📝" label="Assessments"   value={overview.assessments ?? 0} />
          <StatCard emoji="🎓" label="Seminars"      value={overview.seminars ?? 0} />
          <StatCard emoji="🏅" label="Certificates"  value={overview.certificates ?? 0} color={G.mid} />
          <StatCard emoji="✏️" label="Quiz Attempts" value={overview.attempts ?? 0} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <Card>
            <SectionTitle>📚 Module Completion Rate</SectionTitle>
            {moduleStats.length === 0
              ? <EmptyState emoji="📚" message="No module progress data yet." />
              : moduleStats.slice(0, 6).map((m, i) => {
                  const completed = m.completed_students ?? 0;
                  const total     = m.total_students     ?? 0;
                  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return <MiniBar key={m.module_id ?? i} label={m.title ?? "Untitled"} value={`${pct}%`} max={100} color={pct >= 75 ? G.dark : pct >= 40 ? G.base : G.light} sub={`(${completed}/${total})`} />;
                })
            }
          </Card>

          <Card>
            <SectionTitle>🎓 Seminar Attendance Rate</SectionTitle>
            {seminarStats.length === 0
              ? <EmptyState emoji="🎓" message="No seminar attendance data yet." />
              : seminarStats.slice(0, 6).map((s, i) => {
                  const attended   = s.total_attended   ?? 0;
                  const registered = s.total_registered ?? 0;
                  const pct        = registered > 0 ? Math.round((attended / registered) * 100) : 0;
                  return <MiniBar key={s.seminar_id ?? i} label={s.title ?? s.seminar_title ?? "Untitled"} value={`${pct}%`} max={100} color={pct >= 75 ? G.mid : pct >= 40 ? G.base : G.light} sub={`(${attended}/${registered})`} />;
                })
            }
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <Card>
            <SectionTitle>✏️ Assessment Performance</SectionTitle>
            {!assessStats.total
              ? <EmptyState emoji="📝" message="No assessment attempts yet." />
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[{ label: "Total Attempts", value: assessStats.total, emoji: "✏️" }, { label: "Avg Score", value: `${assessStats.avg}%`, emoji: "📊" }, { label: "Passed", value: assessStats.passed, emoji: "✅" }, { label: "Pass Rate", value: `${assessStats.passRate}%`, emoji: "🎯" }].map(({ label, value, emoji }) => (
                      <div key={label} style={{ background: G.cream, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{emoji}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: G.dark }}>{value}</div>
                        <div style={{ fontSize: 11, color: G.base, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <MiniBar label="Pass Rate" value={assessStats.passRate} max={100} color={assessStats.passRate >= 70 ? G.dark : "#e67e22"} sub="%" />
                </div>
              )
            }
          </Card>

          <Card>
            <SectionTitle>🏅 Certificates by Type</SectionTitle>
            {!certStats.total
              ? <EmptyState emoji="🏅" message="No certificates issued yet." />
              : (
                <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                  <DonutChart segments={certSegments} size={120} />
                  <div style={{ flex: 1, minWidth: 140 }}>
                    {certSegments.map(seg => (
                      <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: seg.color, flexShrink: 0 }} />
                        <span style={{ color: G.dark, fontWeight: 500, textTransform: "capitalize" }}>{seg.label}</span>
                        <span style={{ marginLeft: "auto", fontWeight: 700, color: G.mid }}>{seg.value}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: `1px solid ${G.wash}`, paddingTop: 8, marginTop: 4, fontSize: 12, color: G.light, display: "flex", gap: 16 }}>
                      <span>✅ Valid: {certStats.valid ?? 0}</span>
                      <span>❌ Revoked: {certStats.revoked ?? 0}</span>
                    </div>
                  </div>
                </div>
              )
            }
          </Card>
        </div>

        <Card>
          <SectionTitle>🏆 Student Leaderboard — Top Badge Earners</SectionTitle>
          {leaderboard.length === 0
            ? <EmptyState emoji="🏆" message="No badge data yet. Students will appear here as they earn badges." />
            : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {leaderboard.map((row, i) => (
                  <div key={row.user_id} style={{ background: i === 0 ? `linear-gradient(135deg, ${G.wash}, ${G.cream})` : G.cream, border: i === 0 ? `2px solid ${G.pale}` : `1px solid ${G.wash}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 22, flexShrink: 0 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: G.dark, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.full_name}</div>
                      <div style={{ fontSize: 11, color: G.base }}>⭐ {row.badge_count} badge{row.badge_count !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </Card>
      </div>
    </>
  );
}