import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase.js"; // used as fallback only

const G = {
  dark: "#1A1A2E", mid: "#16213E", base: "#0F3460",
  accent: "#E94560", gold: "#F5A623",
  wash: "#f0f4ff", pale: "#c7d2fe", text: "#1e293b",
};

const s = {
  page:     { padding: "28px 32px", fontFamily: "'Inter', system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" },
  card:     { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0", marginBottom: 20 },
  title:    { fontSize: 22, fontWeight: 800, color: G.dark, margin: 0 },
  subtitle: { fontSize: 13, color: "#888", marginTop: 2 },
  label:    { fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.6 },
  input:    { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.text },
  select:   { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.text },
  fg:       { marginBottom: 16 },
  overlay:  { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal:    { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" },
  mHeader:  { padding: "20px 24px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" },
  mBody:    { padding: "20px 24px" },
  mFooter:  { padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 8, justifyContent: "flex-end" },
  btnPrimary:   { padding: "9px 20px", background: G.base, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnDanger:    { padding: "9px 20px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnSecondary: { padding: "9px 20px", background: "#f1f5f9", color: G.text, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  tag: (c) => ({
    display: "inline-flex", alignItems: "center", padding: "2px 9px",
    borderRadius: 10, fontSize: 11, fontWeight: 700,
    background: c === "green" ? "#dcfce7" : c === "red" ? "#fee2e2" : c === "blue" ? "#dbeafe" : c === "gold" ? "#fef3c7" : "#f3f4f6",
    color: c === "green" ? "#16a34a" : c === "red" ? "#dc2626" : c === "blue" ? "#1d4ed8" : c === "gold" ? "#92400e" : "#555",
  }),
  table:  { width: "100%", borderCollapse: "collapse" },
  th:     { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "2px solid #e2e8f0" },
  td:     { padding: "12px 14px", fontSize: 13, color: G.text, borderBottom: "1px solid #f1f5f9" },
};

export default function SuperAdminPage({ superUser, onLogout, db }) {
  const client = supabase; // always use main supabase client for data queries
  const [tab, setTab]             = useState("admins");
  const [admins, setAdmins]       = useState([]);
  const [students, setStudents]   = useState([]);
  const [activity, setActivity]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [stats, setStats]         = useState({});
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);

    // Fetch ALL user_roles with role names
    const { data: allUserRoles } = await supabase
      .from("user_roles")
      .select("user_id, assigned_at, roles(name)");

    // Filter admin role rows
    const adminRoleRows = (allUserRoles || []).filter(r => r.roles?.name === "admin");
    const adminIds = adminRoleRows.map(r => r.user_id);

    // Get all non-student role user IDs (admin + super_admin) to exclude from students list
    const nonStudentIds = new Set(
      (allUserRoles || [])
        .filter(r => r.roles?.name === "admin" || r.roles?.name === "super_admin")
        .map(r => r.user_id)
    );

    let adminProfiles = [];
    if (adminIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, is_active, last_sign_in_at, created_at")
        .in("id", adminIds);
      adminProfiles = (profiles || []).map(p => ({
        ...p,
        role: "admin",
        assigned_at: adminRoleRows.find(r => r.user_id === p.id)?.assigned_at,
      }));
    }
    setAdmins(adminProfiles);

    // Fetch all profiles then filter out admins and super_admins
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, student_id, department, is_active, last_sign_in_at, created_at")
      .order("created_at", { ascending: false });
    const studentProfiles = (allProfiles || []).filter(p => !nonStudentIds.has(p.id));
    setStudents(studentProfiles);

    // Fetch full activity log
    const { data: logs } = await supabase
      .from("activity_logs")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(100);
    setActivity(logs || []);

    // Stats
    const { count: totalModules } = await supabase.from("modules").select("*", { count: "exact", head: true });
    const { count: totalLogs } = await supabase.from("activity_logs").select("*", { count: "exact", head: true });
    const activeAdmins = adminProfiles.filter(a => a.is_active !== false).length;
    setStats({ totalStudents: studentProfiles.length, totalModules, totalLogs, totalAdmins: adminProfiles.length, activeAdmins });

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createAdmin = async () => {
    if (!form.email?.trim() || !form.password?.trim() || !form.full_name?.trim()) {
      setError("Full name, email and password are required."); return;
    }
    setSaving(true); setError("");
    try {
      // Create user in Supabase Auth via admin API
      const { data: signUpData, error: signUpErr } = await client.auth.signUp({
        email: form.email.trim(),
        password: form.password.trim(),
        options: { data: { full_name: form.full_name.trim() } },
      });
      if (signUpErr) { setError(signUpErr.message); setSaving(false); return; }
      const newUserId = signUpData.user?.id;
      if (!newUserId) { setError("Failed to create user. Please try again."); setSaving(false); return; }

      // Create profile
      await client.from("profiles").insert({
        id: newUserId,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        is_active: true,
        created_at: new Date().toISOString(),
      });

      // Assign admin role
      const { data: roleData } = await client.from("roles").select("id").eq("name", "admin").single();
      await client.from("user_roles").insert({
        user_id: newUserId,
        role_id: roleData.id,
        assigned_at: new Date().toISOString(),
        assigned_by: superUser.id,
      });

      setShowAdd(false); setForm({});
      load();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const deleteAdmin = async (admin) => {
    if (!confirm(`Permanently delete admin account "${admin.full_name || admin.email}"?\n\nThis cannot be undone.`)) return;
    // Remove from user_roles
    await client.from("user_roles").delete().eq("user_id", admin.id);
    // Deactivate profile
    await client.from("profiles").update({ is_active: false }).eq("id", admin.id);
    load();
  };

  const toggleAdmin = async (admin) => {
    const newVal = !admin.is_active;
    await client.from("profiles").update({ is_active: newVal }).eq("id", admin.id);
    setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, is_active: newVal } : a));
  };

  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const filteredAdmins = admins.filter(a =>
    (a.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredStudents = students.filter(s =>
    (s.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.student_id || "").toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    { id: "admins",   label: "Admin Accounts",  icon: "bi-shield-lock" },
    { id: "students", label: "All Students",     icon: "bi-people" },
    { id: "activity", label: "Full Activity Log",icon: "bi-activity" },
    { id: "system",   label: "System Overview",  icon: "bi-speedometer2" },
  ];

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#1A1A2E,#E94560)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-shield-fill-check" style={{ color: "#fff", fontSize: 20 }}/>
          </div>
          <div>
            <div style={s.title}>⚡ Super Admin Panel</div>
            <div style={s.subtitle}>Absolute system control · BLOOM GAD · CvSU GADRC</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={s.tag("gold")}>👑 Super Admin</span>
          <span style={{ fontSize: 12, color: "#888" }}>{superUser?.email}</span>
          <button style={{ ...s.btnSecondary, fontSize: 12 }} onClick={onLogout}>
            <i className="bi bi-box-arrow-right me-1"/>Sign Out
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Admin Accounts", value: stats.totalAdmins || 0, icon: "bi-shield-lock", color: "#fef3c7" },
            { label: "Active Admins", value: stats.activeAdmins || 0, icon: "bi-shield-check", color: "#dcfce7" },
            { label: "Total Students", value: stats.totalStudents || 0, icon: "bi-people", color: "#dbeafe" },
            { label: "Total Modules", value: stats.totalModules || 0, icon: "bi-book", color: "#f3e8ff" },
            { label: "System Logs", value: stats.totalLogs || 0, icon: "bi-activity", color: "#fce7f3" },
          ].map(stat => (
            <div key={stat.label} style={{ ...s.card, marginBottom: 0, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: stat.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`bi ${stat.icon}`} style={{ fontSize: 18, color: G.base }}/>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: G.dark }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: "#888" }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #e2e8f0", paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); }}
            style={{ padding: "9px 18px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? G.base : "#888", borderBottom: `2px solid ${tab === t.id ? G.base : "transparent"}`, marginBottom: -2, display: "flex", alignItems: "center", gap: 6 }}>
            <i className={`bi ${t.icon}`}/>{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>
          <i className="bi bi-hourglass-split" style={{ fontSize: 32, marginBottom: 12, display: "block" }}/>
          Loading system data…
        </div>
      ) : (
        <>
          {/* ── ADMINS TAB ── */}
          {tab === "admins" && (
            <div style={s.card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, color: G.dark, fontSize: 15 }}>Admin Accounts</div>
                  <div style={{ fontSize: 12, color: "#888" }}>{admins.length} admin{admins.length !== 1 ? "s" : ""} registered</div>
                </div>
                <button style={{ ...s.btnPrimary, display: "flex", alignItems: "center", gap: 6 }}
                  onClick={() => { setForm({}); setError(""); setShowAdd(true); }}>
                  <i className="bi bi-plus-circle"/>Create Admin Account
                </button>
              </div>
              <input style={{ ...s.input, maxWidth: 320, marginBottom: 16, color: G.text }}
                placeholder="Search admins…" value={search} onChange={e => setSearch(e.target.value)}/>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["Name", "Email", "Status", "Last Sign In", "Created", "Actions"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.length === 0 ? (
                    <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No admin accounts found</td></tr>
                  ) : filteredAdmins.map(admin => (
                    <tr key={admin.id}>
                      <td style={s.td}>
                        <div style={{ fontWeight: 600, color: G.dark }}>{admin.full_name || "—"}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>ID: {admin.id?.slice(0, 8)}…</div>
                      </td>
                      <td style={s.td}>{admin.email}</td>
                      <td style={s.td}>
                        <span style={s.tag(admin.is_active ? "green" : "red")}>
                          {admin.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ ...s.td, fontSize: 12, color: "#888" }}>{fmtDate(admin.last_sign_in_at)}</td>
                      <td style={{ ...s.td, fontSize: 12, color: "#888" }}>{fmtDate(admin.created_at)}</td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ ...s.btnSecondary, padding: "5px 12px", fontSize: 12 }}
                            onClick={() => toggleAdmin(admin)}>
                            {admin.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button style={{ ...s.btnDanger, padding: "5px 12px", fontSize: 12 }}
                            onClick={() => deleteAdmin(admin)}>
                            <i className="bi bi-trash"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── STUDENTS TAB ── */}
          {tab === "students" && (
            <div style={s.card}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: G.dark, fontSize: 15 }}>All Students</div>
                <div style={{ fontSize: 12, color: "#888" }}>{students.length} total students across all departments</div>
              </div>
              <input style={{ ...s.input, maxWidth: 320, marginBottom: 16, color: G.text }}
                placeholder="Search by name, email, or ID…" value={search} onChange={e => setSearch(e.target.value)}/>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["Name", "Student ID", "Email", "Department", "Status", "Last Active"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.slice(0, 50).map(student => (
                    <tr key={student.id}>
                      <td style={s.td}><div style={{ fontWeight: 600 }}>{student.full_name || "—"}</div></td>
                      <td style={{ ...s.td, fontSize: 12 }}>{student.student_id || "—"}</td>
                      <td style={{ ...s.td, fontSize: 12, color: "#888" }}>{student.email}</td>
                      <td style={{ ...s.td, fontSize: 12 }}>{student.department || "—"}</td>
                      <td style={s.td}>
                        <span style={s.tag(student.is_active ? "green" : "red")}>
                          {student.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ ...s.td, fontSize: 12, color: "#888" }}>{fmtDate(student.last_sign_in_at)}</td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No students found</td></tr>
                  )}
                </tbody>
              </table>
              {filteredStudents.length > 50 && (
                <div style={{ textAlign: "center", padding: 12, fontSize: 12, color: "#888" }}>
                  Showing 50 of {filteredStudents.length} students
                </div>
              )}
            </div>
          )}

          {/* ── ACTIVITY TAB ── */}
          {tab === "activity" && (
            <div style={s.card}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: G.dark, fontSize: 15 }}>Full Activity Log</div>
                <div style={{ fontSize: 12, color: "#888" }}>Last 100 actions across all users</div>
              </div>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["User", "Action", "Details", "Time"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activity.map((log, i) => (
                    <tr key={log.id || i}>
                      <td style={s.td}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{log.profiles?.full_name || "Unknown"}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>{log.profiles?.email}</div>
                      </td>
                      <td style={s.td}>
                        <span style={s.tag(log.action_type === "login" ? "green" : log.action_type === "logout" ? "red" : "blue")}>
                          {log.action_type?.replace(/_/g, " ") || "—"}
                        </span>
                      </td>
                      <td style={{ ...s.td, fontSize: 12, color: "#888", maxWidth: 200 }}>
                        {log.action_data ? JSON.stringify(log.action_data).slice(0, 80) : "—"}
                      </td>
                      <td style={{ ...s.td, fontSize: 12, color: "#888", whiteSpace: "nowrap" }}>{fmtDate(log.created_at)}</td>
                    </tr>
                  ))}
                  {activity.length === 0 && (
                    <tr><td colSpan={4} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No activity logged yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── SYSTEM TAB ── */}
          {tab === "system" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={s.card}>
                <div style={{ fontWeight: 700, color: G.dark, marginBottom: 16 }}>🔐 Super Admin Info</div>
                {[
                  ["Account", superUser?.email],
                  ["Role", "Super Administrator"],
                  ["User ID", superUser?.id?.slice(0, 16) + "…"],
                  ["Last Login", fmtDate(superUser?.last_sign_in_at)],
                  ["Status", "Cannot be deactivated"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
                    <span style={{ color: "#888" }}>{label}</span>
                    <span style={{ fontWeight: 600, color: G.dark }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={s.card}>
                <div style={{ fontWeight: 700, color: G.dark, marginBottom: 16 }}>⚙️ System Configuration</div>
                {[
                  ["Platform", "BLOOM GAD e-Learning"],
                  ["Institution", "Cavite State University"],
                  ["Department", "GADRC"],
                  ["Backend", "Supabase (PostgreSQL)"],
                  ["Admin Panel", "React 19 + Vite"],
                  ["Mobile App", "Flutter 3.x"],
                  ["Inactivity Policy", "30-day auto-deactivation"],
                  ["AI Provider", "Groq (LLaMA 3.1 8B)"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
                    <span style={{ color: "#888" }}>{label}</span>
                    <span style={{ fontWeight: 600, color: G.dark }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Create Admin Modal ── */}
      {showAdd && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ padding: "18px 24px", background: "linear-gradient(135deg,#1A1A2E,#0F3460)", borderRadius: "16px 16px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-shield-plus" style={{ color: "#fff", fontSize: 16 }}/>
                </div>
                <div style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>Create Admin Account</div>
              </div>
              <button style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 16, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div style={s.mBody}>
              {error && <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{error}</div>}
              <div style={s.fg}>
                <label style={s.label}>Full Name *</label>
                <input style={s.input} value={form.full_name || ""} onChange={e => setF("full_name", e.target.value)} placeholder="e.g. Juan Dela Cruz"/>
              </div>
              <div style={s.fg}>
                <label style={s.label}>Email Address *</label>
                <input style={s.input} type="email" value={form.email || ""} onChange={e => setF("email", e.target.value)} placeholder="admin@cvsu.edu.ph"/>
              </div>
              <div style={s.fg}>
                <label style={s.label}>Password *</label>
                <input style={s.input} type="password" value={form.password || ""} onChange={e => setF("password", e.target.value)} placeholder="Minimum 8 characters"/>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Admin will be able to change this after first login.</div>
              </div>
              <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#92400e" }}>
                <i className="bi bi-info-circle me-1"/>This account will have full admin access to the BLOOM GAD platform.
              </div>
            </div>
            <div style={s.mFooter}>
              <button style={s.btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
              <button style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={createAdmin} disabled={saving}>
                {saving ? "Creating…" : "Create Admin Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}