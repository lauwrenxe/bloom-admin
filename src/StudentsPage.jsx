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

function SkeletonStudentRow() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr auto", alignItems: "center", gap: 12, background: G.white, border: `1px solid ${G.pale}`, borderRadius: 12, padding: "12px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Shimmer w={38} h={38} r={19} />
        <div>
          <Shimmer w={100} h={14} style={{ marginBottom: 6 }} />
          <Shimmer w={70} h={11} />
        </div>
      </div>
      <Shimmer w="70%" h={13} />
      <Shimmer w="80%" h={12} />
      <Shimmer w="60%" h={12} />
      <Shimmer w={90} h={30} r={8} />
    </div>
  );
}

// ── UI Atoms ──────────────────────────────────────────────────────
function Btn({ children, onClick, variant = "primary", small, disabled, style = {} }) {
  const base = { border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, padding: small ? "6px 14px" : "9px 20px", fontSize: small ? 12 : 13, opacity: disabled ? 0.5 : 1, transition: "all .15s", ...style };
  const variants = {
    primary:   { background: G.dark,        color: "#fff" },
    secondary: { background: G.wash,        color: G.dark },
    danger:    { background: "#fef2f2",     color: "#c0392b" },
    ghost:     { background: "transparent", color: G.base, border: `1px solid ${G.pale}` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>;
}

function Tag({ children, color }) {
  const map = {
    green:  { bg: G.wash,    text: G.dark },
    yellow: { bg: "#fff8e1", text: "#7a5c00" },
    gray:   { bg: "#f0f0f0", text: "#555" },
    red:    { bg: "#fef2f2", text: "#c0392b" },
    blue:   { bg: "#e8f0fe", text: "#1a56a8" },
  };
  const c = map[color] || map.gray;
  return <span style={{ background: c.bg, color: c.text, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>{children}</span>;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: G.white, borderRadius: 16, width: "100%", maxWidth: wide ? 700 : 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${G.wash}`, position: "sticky", top: 0, background: G.white, zIndex: 1 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.dark, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>✕</button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
}

function Avatar({ name, size = 38 }) {
  const initials = (name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const colors = [G.dark, G.mid, G.base, "#1a56a8", "#6b21a8", "#0f766e"];
  const color  = colors[(name ?? "").charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
  );
}

function StatPill({ emoji, label, value }) {
  return (
    <div style={{ background: G.cream, borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 2, minWidth: 90 }}>
      <div style={{ fontSize: 18 }}>{emoji}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: G.dark }}>{value}</div>
      <div style={{ fontSize: 10, color: G.base, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export default function StudentsPage() {
  const [students,      setStudents]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [modal,         setModal]         = useState(null);
  const [selected,      setSelected]      = useState(null);
  const [detail,        setDetail]        = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    let studentRoleId = null;
    try {
      const { data: roleRow } = await supabase.from("roles").select("id").eq("name", "student").single();
      studentRoleId = roleRow?.id ?? null;
    } catch { /* non-critical */ }
    let studentIds = [];
    if (studentRoleId) {
      const { data: urRows } = await supabase.from("user_roles").select("user_id").eq("role_id", studentRoleId);
      studentIds = (urRows ?? []).map(r => r.user_id);
    }
    let profileQuery = supabase.from("profiles").select("*").order("full_name");
    if (studentIds.length > 0) profileQuery = profileQuery.in("id", studentIds);
    const { data: profiles } = await profileQuery;
    setStudents(profiles ?? []);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      setLoading(true);
      let studentRoleId = null;
      try {
        const { data: roleRow } = await supabase.from("roles").select("id").eq("name", "student").single();
        studentRoleId = roleRow?.id ?? null;
      } catch { /* non-critical */ }
      let studentIds = [];
      if (studentRoleId) {
        const { data: urRows } = await supabase.from("user_roles").select("user_id").eq("role_id", studentRoleId);
        studentIds = (urRows ?? []).map(r => r.user_id);
      }
      let profileQuery = supabase.from("profiles").select("*").order("full_name");
      if (studentIds.length > 0) profileQuery = profileQuery.in("id", studentIds);
      const { data: profiles } = await profileQuery;
      if (!cancelled) { setStudents(profiles ?? []); setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const openDetail = async (student) => {
    setSelected(student); setModal("detail"); setDetailLoading(true); setDetail(null);
    const [{ data: progress }, { data: badges }, { data: certs }, { data: regs }] = await Promise.all([
      supabase.from("student_progress").select("*, modules(title, status)").eq("user_id", student.id),
      supabase.from("student_badges").select("*, badges(name, description)").eq("user_id", student.id),
      supabase.from("certificates").select("*").eq("user_id", student.id),
      supabase.from("seminar_registrations").select("*, seminars(title)").eq("user_id", student.id),
    ]);
    setDetail({ progress: progress ?? [], badges: badges ?? [], certs: certs ?? [], registrations: regs ?? [] });
    setDetailLoading(false);
  };

  const filtered = students.filter(s =>
    !search ||
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(search.toLowerCase())
  );

  const completedModules = (detail?.progress ?? []).filter(p => p.status === "completed").length;
  const attendedSeminars = (detail?.registrations ?? []).filter(r => r.status === "attended").length;

  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: G.dark, margin: 0 }}>Students</h1>
            <p style={{ color: G.base, margin: "4px 0 0", fontSize: 14 }}>
              {loading ? "Loading…" : `${students.length} registered student${students.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button onClick={fetchStudents} style={{ background: "none", border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, color: G.base, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>↻ Refresh</button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search by name, email, or student ID…"
            style={{ border: `1px solid ${G.pale}`, borderRadius: 10, padding: "9px 14px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, color: G.dark, outline: "none", width: "100%", maxWidth: 400 }} />
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[...Array(6)].map((_, i) => <SkeletonStudentRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 14, boxShadow: "0 2px 8px rgba(45,74,24,.06)" }}>
            <div style={{ textAlign: "center", padding: "64px 40px" }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>👩‍🎓</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: G.dark, marginBottom: 6 }}>
                {search ? "No students match your search." : "No students registered yet."}
              </div>
              <div style={{ fontSize: 13, color: G.light }}>
                {search ? "Try a different name, email, or student ID." : "Students will appear here once they register."}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr auto", padding: "8px 20px", gap: 12, fontSize: 11, fontWeight: 700, color: G.base, letterSpacing: ".05em", textTransform: "uppercase", borderBottom: `2px solid ${G.wash}`, marginBottom: 4 }}>
              <span>Student</span><span>Email</span><span>Student ID</span><span>Joined</span><span></span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {filtered.map(s => (
                <div key={s.id}
                  style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr auto", alignItems: "center", gap: 12, background: G.white, border: `1px solid ${G.pale}`, borderRadius: 12, padding: "12px 20px", transition: "background .15s", boxShadow: "0 1px 3px rgba(45,74,24,.04)" }}
                  onMouseEnter={e => e.currentTarget.style.background = G.cream}
                  onMouseLeave={e => e.currentTarget.style.background = G.white}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <Avatar name={s.full_name} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: G.dark, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.full_name ?? "—"}</div>
                      {s.course && <div style={{ fontSize: 11, color: G.light }}>{s.course}</div>}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: G.base, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email ?? "—"}</div>
                  <div style={{ fontSize: 12, color: G.light, fontFamily: "monospace" }}>{s.student_id ?? "—"}</div>
                  <div style={{ fontSize: 12, color: G.light }}>{fmtDate(s.created_at)}</div>
                  <Btn small variant="secondary" onClick={() => openDetail(s)}>View Profile</Btn>
                </div>
              ))}
            </div>
          </>
        )}

        {modal === "detail" && selected && (
          <Modal title="Student Profile" onClose={() => { setModal(null); setSelected(null); setDetail(null); }} wide>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
              <Avatar name={selected.full_name} size={56} />
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: G.dark }}>{selected.full_name ?? "—"}</div>
                <div style={{ fontSize: 13, color: G.base, marginTop: 2 }}>{selected.email ?? "—"}</div>
                <div style={{ fontSize: 12, color: G.light, marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {selected.student_id && <span>🪪 {selected.student_id}</span>}
                  {selected.course     && <span>📚 {selected.course}</span>}
                  {selected.created_at && <span>📅 Joined {fmtDate(selected.created_at)}</span>}
                </div>
              </div>
            </div>

            {detailLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  {[...Array(5)].map((_, i) => <Shimmer key={i} w={90} h={64} r={10} />)}
                </div>
                {[...Array(3)].map((_, i) => (
                  <div key={i}>
                    <Shimmer w="30%" h={15} style={{ marginBottom: 12 }} />
                    {[...Array(2)].map((_, j) => <Shimmer key={j} w="100%" h={38} style={{ marginBottom: 6 }} />)}
                  </div>
                ))}
              </div>
            ) : detail && (
              <>
                <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                  <StatPill emoji="📚" label="Modules"   value={detail.progress.length} />
                  <StatPill emoji="✅" label="Completed" value={completedModules} />
                  <StatPill emoji="🎓" label="Seminars"  value={attendedSeminars} />
                  <StatPill emoji="🏅" label="Certs"     value={detail.certs.length} />
                  <StatPill emoji="⭐" label="Badges"    value={detail.badges.length} />
                </div>
                <Section title="📚 Module Progress" count={detail.progress.length}>
                  {detail.progress.length === 0
                    ? <Empty message="No module progress yet." />
                    : detail.progress.map((p, i) => <ProgressRow key={p.id ?? i} label={p.modules?.title ?? "Unknown Module"} status={p.status} score={p.score} />)
                  }
                </Section>
                <Section title="🎓 Seminar Registrations" count={detail.registrations.length}>
                  {detail.registrations.length === 0
                    ? <Empty message="No seminar registrations yet." />
                    : detail.registrations.map((r, i) => (
                      <div key={r.id ?? i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${G.wash}`, fontSize: 13 }}>
                        <span style={{ color: G.dark }}>{r.seminars?.title ?? "Unknown Seminar"}</span>
                        <Tag color={r.status === "attended" ? "green" : r.status === "cancelled" ? "red" : "yellow"}>{r.status ?? "registered"}</Tag>
                      </div>
                    ))
                  }
                </Section>
                <Section title="🏅 Certificates" count={detail.certs.length}>
                  {detail.certs.length === 0
                    ? <Empty message="No certificates yet." />
                    : detail.certs.map((c, i) => (
                      <div key={c.id ?? i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${G.wash}`, fontSize: 13 }}>
                        <span style={{ color: G.dark }}>{c.title ?? c.certificate_number ?? "Certificate"}</span>
                        <span style={{ fontSize: 11, color: G.light }}>{fmtDate(c.issued_at)}</span>
                      </div>
                    ))
                  }
                </Section>
                <Section title="⭐ Badges Earned" count={detail.badges.length}>
                  {detail.badges.length === 0
                    ? <Empty message="No badges earned yet." />
                    : (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {detail.badges.map((b, i) => (
                          <div key={b.id ?? i} style={{ background: G.wash, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: G.dark, fontWeight: 600, border: `1px solid ${G.pale}` }}>
                            ⭐ {b.badges?.name ?? "Badge"}
                          </div>
                        ))}
                      </div>
                    )
                  }
                </Section>
              </>
            )}
          </Modal>
        )}
      </div>
    </>
  );
}

function Section({ title, count, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: G.dark, margin: 0 }}>{title}</h4>
        <span style={{ fontSize: 11, color: G.light, fontWeight: 600 }}>({count})</span>
      </div>
      {children}
    </div>
  );
}

function Empty({ message }) {
  return <div style={{ fontSize: 13, color: "#aaa", padding: "8px 0" }}>{message}</div>;
}

function ProgressRow({ label, status, score }) {
  const color = status === "completed" ? "green" : status === "in_progress" ? "yellow" : "gray";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${G.wash}` }}>
      <span style={{ fontSize: 13, color: G.dark, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 12 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {score != null && <span style={{ fontSize: 12, color: G.light }}>{score}%</span>}
        <Tag color={color}>{status ?? "not started"}</Tag>
      </div>
    </div>
  );
}