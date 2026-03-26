import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";
import { ConfirmModal } from "./App.jsx";

const G = {
  dark:  "#1A2E1A", mid:   "#2D6A2D", base:  "#3A7A3A",
  light: "#4CAF50", pale:  "#C8E6C9", wash:  "#E8F5E9",
  cream: "#F5F7F5", white: "#FFFFFF",
};

function formatDate(iso) {
  if (!iso) return "—";
  const utcStr = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  return new Date(utcStr).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric",
  });
}

const s = {
  page:      { padding: "28px 32px", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", background: "#F5F7F5", minHeight: "100vh" },
  header:    { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  title:     { fontSize: 22, fontWeight: 800, color: G.dark, margin: 0 },
  toolbar:   { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
  searchBar: { padding: "9px 14px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", width: 260 },
  select:    { padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", color: G.dark },
  table:     { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" },
  th:        { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `2px solid ${G.wash}`, background: "#F5F7F5" },
  td:        { padding: "13px 16px", borderBottom: `1px solid ${G.wash}`, color: G.dark, verticalAlign: "middle" },
  avatar:    { width: 36, height: 36, borderRadius: "50%", background: G.mid, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0, overflow: "hidden" },
  tag:      (c) => ({ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: c === "green" ? "#dcfce7" : c === "red" ? "#fee2e2" : c === "yellow" ? "#fef9c3" : c === "blue" ? "#dbeafe" : "#f3f4f6", color: c === "green" ? "#16a34a" : c === "red" ? "#dc2626" : c === "yellow" ? "#92400e" : c === "blue" ? "#1d4ed8" : "#555" }),
  overlay:   { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal:     { background: "#fff", borderRadius: 10, width: "100%", maxWidth: 660, maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" },
  mHeader:   { padding: "20px 24px 16px", borderBottom: `1px solid ${G.wash}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 },
  mTitle:    { fontSize: 17, fontWeight: 700, color: G.dark },
  mBody:     { padding: "20px 24px" },
  mFooter:   { padding: "16px 24px", borderTop: `1px solid ${G.wash}`, display: "flex", gap: 8, justifyContent: "flex-end", position: "sticky", bottom: 0, background: "#fff" },
  iconBtn:  (c) => ({ background: "none", border: "none", cursor: "pointer", color: c || "#999", fontSize: 14, padding: "4px 6px", borderRadius: 6 }),
  statCard: (c) => ({ flex: 1, minWidth: 100, background: "#fff", borderRadius: 10, padding: "14px 16px", border: "1px solid #DDE8DD", borderTop: `3px solid ${c || G.base}` }),
  statNum:   { fontSize: 24, fontWeight: 900, color: G.dark },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  secTitle:  { fontSize: 13, fontWeight: 700, color: G.dark, marginBottom: 10, marginTop: 20, display: "flex", alignItems: "center", gap: 8 },
  card:      { background: "#F5F7F5", borderRadius: 10, padding: "12px 16px", border: "1px solid #DDE8DD", marginBottom: 8 },
  emptyBox:  { background: "#fff", borderRadius: 14, border: `2px dashed ${G.pale}`, padding: "50px 20px", textAlign: "center" },
};

export default function StudentsPage() {
  const [students, setStudents]     = useState([]);
  const [admins, setAdmins]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selected, setSelected]     = useState(null);
  const [detail, setDetail]         = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mainTab, setMainTab]       = useState("students"); // students | admins

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      // Only get users with student role
      const { data: studentRoles } = await supabase
        .from("user_roles")
        .select("user_id, roles(name)");
      const studentIds = (studentRoles || [])
        .filter(r => r.roles?.name === "student")
        .map(r => r.user_id)
        .filter(Boolean);

      let query = supabase
        .from("profiles")
        .select("*, student_badges(count), module_progress(count), seminar_registrations(count)")
        .order("full_name");
      if (studentIds.length > 0) {
        query = query.in("id", studentIds);
      }
      const { data, error } = await query;
      if (error) console.error("Students load error:", error.message);
      if (active) { setStudents(data || []); }

      // Load admins
      const { data: adminRoles } = await supabase.from("user_roles").select("user_id, roles(name)");
      const adminIds = (adminRoles || []).filter(r => r.roles?.name === "admin").map(r => r.user_id).filter(Boolean);
      if (adminIds.length > 0) {
        const { data: adminProfiles } = await supabase.from("profiles").select("*").in("id", adminIds).order("full_name");
        if (active) setAdmins(adminProfiles || []);
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const openDetail = async (student) => {
    setSelected(student); setDetailLoading(true); setDetail(null);
    const [{ data: progress }, { data: badges }, { data: attempts }, { data: regs }] = await Promise.all([
      supabase.from("module_progress").select("*, modules(title)").eq("user_id", student.id).order("last_accessed_at", { ascending: false }),
      supabase.from("student_badges").select("*, badges(name, icon_url, badge_type)").eq("user_id", student.id).order("awarded_at", { ascending: false }),
      supabase.from("assessment_attempts").select("*, assessments(title)").eq("user_id", student.id).order("submitted_at", { ascending: false }),
      supabase.from("seminar_registrations").select("*, seminars(title, scheduled_start, status)").eq("user_id", student.id).order("registered_at", { ascending: false }),
    ]);
    setDetail({ progress: progress || [], badges: badges || [], attempts: attempts || [], regs: regs || [] });
    setDetailLoading(false);
  };

  const [confirm, setConfirm] = useState(null);
  const [inactivityDays] = useState(0.001); // Policy: deactivate after 30 days

  const toggleActive = (student) => {
    const newVal = !student.is_active;
    setConfirm({
      title: newVal ? "Reactivate Account" : "Deactivate Account",
      message: newVal
        ? `Reactivate ${student.full_name}'s account? They will regain access to BLOOM.`
        : `Deactivate ${student.full_name}'s account? They will be locked out and shown a notice to contact the admin.`,
      confirmLabel: newVal ? "Reactivate" : "Deactivate",
      danger: !newVal,
      onConfirm: async () => {
        await supabase.from("profiles").update({ is_active: newVal }).eq("id", student.id);
        setStudents(ss => ss.map(s => s.id === student.id ? { ...s, is_active: newVal } : s));
        if (selected?.id === student.id) setSelected(s => ({ ...s, is_active: newVal }));
        setConfirm(null);
      }
    });
  };

  const checkInactiveUsers = async () => {
    const cutoff = new Date(Date.now() - inactivityDays * 86400000).toISOString();
    const inactive = students.filter(s =>
      s.is_active && s.last_sign_in_at && new Date(s.last_sign_in_at) < new Date(cutoff)
    );
    if (inactive.length === 0) { alert("No inactive users found based on current policy."); return; }
    setConfirm({
      title: "Deactivate Inactive Users",
      message: `Found ${inactive.length} user(s) who haven't logged in for ${inactivityDays}+ days. Deactivate all?`,
      confirmLabel: `Deactivate ${inactive.length} Users`,
      danger: true,
      onConfirm: async () => {
        for (const s of inactive) {
          await supabase.from("profiles").update({ is_active: false }).eq("id", s.id);
        }
        setStudents(ss => ss.map(s => inactive.find(i => i.id === s.id) ? { ...s, is_active: false } : s));
        setConfirm(null);
        alert(`${inactive.length} account(s) deactivated.`);
      }
    });
  };

  const departments = [...new Set(students.map(s => s.department).filter(Boolean))].sort();

  const filtered = students.filter(s => {
    const matchSearch = (s.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.student_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" ? true : filter === "active" ? s.is_active !== false : s.is_active === false;
    const matchDept   = deptFilter === "all" ? true : s.department === deptFilter;
    return matchSearch && matchFilter && matchDept;
  });

  const totalActive   = students.filter(s => s.is_active !== false).length;
  const totalInactive = students.length - totalActive;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}><i className="bi bi-people me-1"/> User Management</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{students.length} registered students</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total Students", value: students.length,    color: G.base },
          { label: "Active",         value: totalActive,        color: "#16a34a" },
          { label: "Inactive",       value: totalInactive,      color: "#dc2626" },
          { label: "Departments",    value: departments.length, color: "#2563eb" },
        ].map(stat => (
          <div key={stat.label} style={s.statCard(stat.color)}>
            <div style={{ ...s.statNum, color: stat.color }}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main tabs */}
      <div style={{ display:"flex", gap:0, borderBottom:`2px solid ${G.wash}`, marginBottom:20 }}>
        {[["students","Students","bi-mortarboard"],["admins","Administrators","bi-shield-lock"]].map(([v,l,ic])=>(
          <div key={v} onClick={()=>{ setMainTab(v); setSearch(""); setSelected(null); }}
            style={{ padding:"10px 22px", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6,
              color:mainTab===v?G.dark:"#999",
              borderBottom:mainTab===v?`2px solid ${G.dark}`:"2px solid transparent", marginBottom:-2 }}>
            <i className={`bi ${ic}`}/>{l}
            <span style={{ background:G.wash, color:G.base, borderRadius:10, padding:"1px 8px", fontSize:11, fontWeight:700 }}>
              {v==="students"?students.length:admins.length}
            </span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <input style={s.searchBar} placeholder="Search by name, ID, or email…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={s.select} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Students</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        <select style={s.select} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {mainTab === "students" && (
          <button onClick={checkInactiveUsers}
            style={{ padding:"9px 14px", background:"#fff7ed", color:"#c2410c", border:"1px solid #fed7aa", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
            <i className="bi bi-clock-history"/>Check Inactive Users ({inactivityDays}d)
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading students…</div>
      ) : filtered.length === 0 ? (
        <div style={s.emptyBox}>
          <div style={{ fontSize: 40, marginBottom: 10 }}><i className="bi bi-person me-1"/>‍<i className="bi bi-mortarboard me-1"/></div>
          <div style={{ fontWeight: 700, color: G.dark, marginBottom: 6 }}>No students found</div>
          <div style={{ fontSize: 13, color: "#aaa" }}>Try adjusting your search or filters</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Student</th>
                <th style={s.th}>Student ID</th>
                <th style={s.th}>Department</th>
                <th style={s.th}>Year</th>
                <th style={s.th}>Modules</th>
                <th style={s.th}>Badges</th>
                <th style={s.th}>Seminars</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(student => {
                const initials    = (student.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                const moduleCount = student.module_progress?.[0]?.count || 0;
                const badgeCount  = student.student_badges?.[0]?.count || 0;
                const semCount    = student.seminar_registrations?.[0]?.count || 0;
                const isActive    = student.is_active !== false;
                return (
                  <tr key={student.id} style={{ cursor: "pointer", transition: "background .1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = G.cream}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={s.td} onClick={() => openDetail(student)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={s.avatar}>
                          {student.avatar_url
                            ? <img src={student.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                            : initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: G.dark }}>{student.full_name || "—"}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={s.td} onClick={() => openDetail(student)}>{student.student_id || "—"}</td>
                    <td style={s.td} onClick={() => openDetail(student)}>{student.department || "—"}</td>
                    <td style={s.td} onClick={() => openDetail(student)}>{student.year_level ? `Year ${student.year_level}` : "—"}</td>
                    <td style={s.td} onClick={() => openDetail(student)}><span style={{ fontWeight: 700, color: G.base }}><i className="bi bi-book me-1"/> {moduleCount}</span></td>
                    <td style={s.td} onClick={() => openDetail(student)}><span style={{ fontWeight: 700, color: "#f59e0b" }}><i className="bi bi-award me-1"/> {badgeCount}</span></td>
                    <td style={s.td} onClick={() => openDetail(student)}><span style={{ fontWeight: 700, color: "#7c3aed" }}><i className="bi bi-mortarboard me-1"/> {semCount}</span></td>
                    <td style={s.td} onClick={() => openDetail(student)}>
                      <span style={s.tag(isActive ? "green" : "red")}>{isActive ? "Active" : "Inactive"}</span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button style={{ padding: "5px 10px", border: "1px solid #DDE8DD", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600, color: G.dark }}
                          onClick={() => openDetail(student)}>View</button>
                        <button style={{ padding: "5px 10px", border: "none", borderRadius: 6, background: isActive ? "#fee2e2" : "#dcfce7", fontSize: 12, cursor: "pointer", fontWeight: 600, color: isActive ? "#dc2626" : "#16a34a" }}
                          onClick={() => toggleActive(student)}>
                          {isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {/* Admins tab */}
      {mainTab==="admins"&&(
        <div>
          <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:8, padding:"12px 16px", fontSize:13, color:"#c2410c", marginBottom:20, display:"flex", gap:10, alignItems:"flex-start" }}>
            <i className="bi bi-exclamation-triangle-fill" style={{ flexShrink:0, marginTop:2 }}/>
            <div><strong>Administrator accounts</strong> have full access to this admin panel. Manage these accounts with care. Role assignments require database-level changes.</div>
          </div>
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #DDE8DD", overflow:"hidden" }}>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>Administrator</th>
                <th style={s.th}>Email</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Last Active</th>
              </tr></thead>
              <tbody>
                {admins.length===0?
                  <tr><td colSpan={4} style={{...s.td, textAlign:"center", color:"#aaa"}}>No admin accounts found</td></tr>
                  :admins.map(a=>(
                  <tr key={a.id}>
                    <td style={s.td}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#2D6A2D,#4CAF50)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:14, fontWeight:700, flexShrink:0 }}>
                          {(a.full_name||a.email||"A").slice(0,1).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, color:G.dark }}>{a.full_name||"—"}</div>
                          <div style={{ fontSize:11, color:"#aaa" }}>System Admin</div>
                        </div>
                      </div>
                    </td>
                    <td style={s.td}>{a.email||"—"}</td>
                    <td style={s.td}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                        background:a.is_active!==false?"#dcfce7":"#fee2e2", color:a.is_active!==false?"#16a34a":"#dc2626" }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:a.is_active!==false?"#16a34a":"#dc2626", display:"inline-block" }}/>
                        {a.is_active!==false?"Active":"Deactivated"}
                      </span>
                    </td>
                    <td style={{...s.td, fontSize:12, color:"#888"}}>{a.last_sign_in_at?new Date(a.last_sign_in_at).toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"}):"Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirm&&<ConfirmModal title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
      {selected && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.mHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ ...s.avatar, width: 46, height: 46, fontSize: 18 }}>
                  {selected.avatar_url
                    ? <img src={selected.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                    : (selected.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={s.mTitle}>{selected.full_name || "Student"}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>
                    {selected.student_id} · {selected.department || "No department"} · Year {selected.year_level || "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{selected.email}</div>
                </div>
              </div>
              <button style={s.iconBtn()} onClick={() => { setSelected(null); setDetail(null); }}>×</button>
            </div>

            <div style={s.mBody}>
              {detailLoading ? (
                <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading profile…</div>
              ) : detail && (
                <>
                  {/* Stats */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                    {[
                      { label: "Modules",  value: detail.progress.length, color: G.base },
                      { label: "Badges",   value: detail.badges.length,   color: "#f59e0b" },
                      { label: "Quizzes",  value: detail.attempts.length, color: "#2563eb" },
                      { label: "Seminars", value: detail.regs.length,     color: "#7c3aed" },
                    ].map(stat => (
                      <div key={stat.label} style={{ ...s.statCard(stat.color), flex: "1 1 100px" }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: stat.color }}>{stat.value}</div>
                        <div style={s.statLabel}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Module Progress */}
                  <div style={s.secTitle}><i className="bi bi-book me-1"/> Module Progress <span style={{ fontSize: 11, color: "#aaa", fontWeight: 400 }}>({detail.progress.length})</span></div>
                  {detail.progress.length === 0
                    ? <div style={{ fontSize: 13, color: "#aaa", marginBottom: 12 }}>No modules started yet.</div>
                    : detail.progress.map(p => (
                      <div key={p.id} style={s.card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: G.dark }}>{p.modules?.title || "—"}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={s.tag(p.status === "completed" ? "green" : "yellow")}>{p.status || "in progress"}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: p.progress_percent === 100 ? "#16a34a" : G.base }}>{p.progress_percent || 0}%</span>
                          </div>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: G.wash, marginTop: 8, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${p.progress_percent || 0}%`, background: p.progress_percent === 100 ? "#16a34a" : G.base, borderRadius: 3 }} />
                        </div>
                        <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Last accessed: {formatDate(p.last_accessed_at)}</div>
                      </div>
                    ))
                  }

                  {/* Badges */}
                  <div style={s.secTitle}><i className="bi bi-award me-1"/> Badges Earned <span style={{ fontSize: 11, color: "#aaa", fontWeight: 400 }}>({detail.badges.length})</span></div>
                  {detail.badges.length === 0
                    ? <div style={{ fontSize: 13, color: "#aaa", marginBottom: 12 }}>No badges earned yet.</div>
                    : <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        {detail.badges.map(b => (
                          <div key={b.id} style={{ background: "#fef9c3", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#92400e", border: "1px solid #fde047", display: "flex", alignItems: "center", gap: 6 }}>
                            <i className="bi bi-award me-1"/> {b.badges?.name || "Badge"}
                            <span style={{ fontSize: 10, color: "#aaa", fontWeight: 400 }}>· {formatDate(b.awarded_at)}</span>
                          </div>
                        ))}
                      </div>
                  }

                  {/* Assessment Results */}
                  <div style={s.secTitle}><i className="bi bi-clipboard-check me-1"/> Assessment Results <span style={{ fontSize: 11, color: "#aaa", fontWeight: 400 }}>({detail.attempts.length})</span></div>
                  {detail.attempts.length === 0
                    ? <div style={{ fontSize: 13, color: "#aaa", marginBottom: 12 }}>No assessments taken yet.</div>
                    : detail.attempts.map(a => (
                      <div key={a.id} style={s.card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: G.dark }}>{a.assessments?.title || "—"}</span>
                          <span style={s.tag(a.passed ? "green" : "red")}>{a.score}% · {a.passed ? "Passed" : "Failed"}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>{formatDate(a.submitted_at)}</div>
                      </div>
                    ))
                  }

                  {/* Seminar Registrations */}
                  <div style={s.secTitle}><i className="bi bi-mortarboard me-1"/> Seminar Registrations <span style={{ fontSize: 11, color: "#aaa", fontWeight: 400 }}>({detail.regs.length})</span></div>
                  {detail.regs.length === 0
                    ? <div style={{ fontSize: 13, color: "#aaa" }}>No seminar registrations yet.</div>
                    : detail.regs.map(r => (
                      <div key={r.id} style={s.card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: G.dark }}>{r.seminars?.title || "—"}</span>
                          <span style={s.tag(r.status === "registered" ? "green" : r.status === "cancelled" ? "red" : "yellow")}>{r.status}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                          {formatDate(r.seminars?.scheduled_start)} · Registered {formatDate(r.registered_at)}
                        </div>
                      </div>
                    ))
                  }
                </>
              )}
            </div>

            <div style={s.mFooter}>
              <button style={{ padding: "9px 20px", background: selected?.is_active !== false ? "#fee2e2" : "#dcfce7", color: selected?.is_active !== false ? "#dc2626" : "#16a34a", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 }}
                onClick={() => toggleActive(selected)}>
                {selected?.is_active !== false ? "Deactivate Student" : "Activate Student"}
              </button>
              <button style={{ padding: "9px 20px", background: G.wash, color: G.dark, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 }}
                onClick={() => { setSelected(null); setDetail(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}