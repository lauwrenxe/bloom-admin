import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";
import { ConfirmModal } from "./App.jsx";

const G = {
  dark:  "#1A2E1A", mid:   "#2D6A2D", base:  "#3A7A3A",
  light: "#4CAF50", pale:  "#C8E6C9", wash:  "#E8F5E9",
  cream: "#F5F7F5", white: "#FFFFFF",
};

// ── Role config ───────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  student:     { label: "Student",     bg: "#dbeafe", color: "#1d4ed8" },
  teacher:     { label: "Teacher",     bg: "#dcfce7", color: "#15803d" },
  faculty:     { label: "Faculty",     bg: "#f3e8ff", color: "#7e22ce" },
  guest:       { label: "Guest",       bg: "#f3f4f6", color: "#374151" },
  speaker:     { label: "Speaker",     bg: "#fff7ed", color: "#c2410c" },
  unknown:     { label: "No Role",     bg: "#f3f4f6", color: "#9ca3af" },
  admin:       { label: "Admin",       bg: "#fef9c3", color: "#92400e" },
  super_admin: { label: "Super Admin", bg: "#fee2e2", color: "#dc2626" },
};

// Role UUID map — matches your Supabase roles table exactly
const ROLE_ID_MAP = {
  student:     "0b4066e1-9430-467e-b224-c9ce3be0df5c",
  teacher:     "994750f0-9566-434a-95f2-f944826a1e1b",
  faculty:     "cab9e0b8-2d70-46eb-a514-cdc27d1427d6",
  guest:       "b70c09ad-7333-4c7e-9b53-656390af610b",
  speaker:     "35c41456-f09a-4562-b829-78ae40148112",
  admin:       "bb8b2973-cdcf-4f51-8065-7850dc47da54",
  super_admin: "f45418e4-f87f-43f2-b4a2-5a36f7f1894a",
};

// Roles assignable by a regular admin (not super_admin or admin)
const ASSIGNABLE_ROLES = ["student", "teacher", "faculty", "guest", "speaker"];

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || { label: role, bg: "#f3f4f6", color: "#555" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: 10, fontSize: 11, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  const utcStr = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  return new Date(utcStr).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric",
  });
}

// ── Alert/Info modal ──────────────────────────────────────────────────────────
function AlertModal({ title, message, onClose }) {
  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: 400 }}>
        <div style={s.mHeader}>
          <span style={s.mTitle}>{title}</span>
        </div>
        <div style={{ ...s.mBody, fontSize: 14, color: "#444", lineHeight: 1.6 }}>{message}</div>
        <div style={s.mFooter}>
          <button style={{ padding: "9px 20px", background: G.dark, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }} onClick={onClose}>OK</button>
        </div>
      </div>
    </div>
  );
}

const s = {
  page:      { padding: "28px 32px", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", background: "#F5F7F5", minHeight: "100vh" },
  header:    { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  title:     { fontSize: 22, fontWeight: 800, color: G.dark, margin: 0 },
  toolbar:   { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
  searchBar: { padding: "9px 14px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", width: 260, color: "#1A2E1A" },
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

// ── Deactivation notifications ────────────────────────────────────────────────
async function sendDeactivationNotification(userId, fullName) {
  try {
    await supabase.from("notifications").insert({
      user_id: userId, type: "account_deactivated", title: "Account Deactivated",
      body: `Hi ${fullName || "there"}, your BLOOM account has been deactivated by an administrator. Please contact your administrator for assistance.`,
      reference_type: "account", reference_id: userId, is_read: false,
    });
  } catch (e) { console.error("sendDeactivationNotification failed:", e); }
}

async function sendReactivationNotification(userId, fullName) {
  try {
    await supabase.from("notifications").insert({
      user_id: userId, type: "account_reactivated", title: "Account Reactivated",
      body: `Hi ${fullName || "there"}, your BLOOM account has been reactivated. You can now log in again.`,
      reference_type: "account", reference_id: userId, is_read: false,
    });
  } catch (e) { console.error("sendReactivationNotification failed:", e); }
}

// ── Role Assignment Panel (inside detail modal) ───────────────────────────────
function RoleAssignPanel({ user, currentRole, onRoleChanged }) {
  const [selectedRole, setSelectedRole] = useState(currentRole || "student");
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);

  // Sync if parent changes
  useEffect(() => {
    setSelectedRole(currentRole || "student");
    setSaved(false);
  }, [currentRole, user?.id]);

  const isDirty = selectedRole !== (currentRole || "student");

  const handleSave = async () => {
    const newRoleId = ROLE_ID_MAP[selectedRole];
    if (!newRoleId) return;

    setSaving(true);
    const { error } = await supabase
      .from("user_roles")
      .update({ role_id: newRoleId })
      .eq("user_id", user.id);

    if (error) {
      console.error("Role update failed:", error);
      setSaving(false);
      return;
    }

    // Notify user of role change
    try {
      await supabase.from("notifications").insert({
        user_id:        user.id,
        type:           "role_changed",
        title:          "Role Updated",
        body:           `Hi ${user.full_name || "there"}, your role in BLOOM has been updated to ${ROLE_CONFIG[selectedRole]?.label || selectedRole}.`,
        reference_type: "account",
        reference_id:   user.id,
        is_read:        false,
      });
    } catch (e) { /* non-critical */ }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onRoleChanged(user.id, selectedRole);
  };

  return (
    <div style={{
      background: "#f8faff", border: "1px solid #e0e7ff", borderRadius: 10,
      padding: "14px 16px", marginBottom: 4,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#4338ca", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <i className="bi bi-person-badge"/> Assign Role
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {/* Role option buttons */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {ASSIGNABLE_ROLES.map(role => {
            const cfg      = ROLE_CONFIG[role];
            const isActive = selectedRole === role;
            return (
              <button
                key={role}
                onClick={() => { setSelectedRole(role); setSaved(false); }}
                style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", transition: "all .15s",
                  border: isActive ? `2px solid ${cfg.color}` : "2px solid #e5e7eb",
                  background: isActive ? cfg.bg : "#fff",
                  color: isActive ? cfg.color : "#9ca3af",
                  boxShadow: isActive ? `0 0 0 3px ${cfg.bg}` : "none",
                }}>
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          style={{
            padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: isDirty && !saving ? "pointer" : "not-allowed",
            border: "none", transition: "all .15s",
            background: saved ? "#dcfce7" : isDirty ? "#4338ca" : "#e5e7eb",
            color:      saved ? "#16a34a" : isDirty ? "#fff"    : "#9ca3af",
            display: "flex", alignItems: "center", gap: 6,
            minWidth: 80,
          }}>
          {saving ? (
            <><i className="bi bi-hourglass-split"/> Saving…</>
          ) : saved ? (
            <><i className="bi bi-check-circle-fill"/> Saved!</>
          ) : (
            <><i className="bi bi-floppy"/> Save</>
          )}
        </button>
      </div>

      {isDirty && !saving && !saved && (
        <div style={{ fontSize: 11, color: "#6366f1", marginTop: 8 }}>
          <i className="bi bi-arrow-right me-1"/>
          Changing role from <strong>{ROLE_CONFIG[currentRole]?.label || currentRole}</strong> to <strong>{ROLE_CONFIG[selectedRole]?.label}</strong> — user will be notified.
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const [users, setUsers]           = useState([]);
  const [userRoles, setUserRoles]   = useState({});   // { userId: "student" | "teacher" | … }
  const [admins, setAdmins]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected]     = useState(null);
  const [detail, setDetail]         = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mainTab, setMainTab]       = useState("users");
  const [confirm, setConfirm]       = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [inactivityDays]            = useState(30);

  // ── Load users + their roles ───────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);

      const { data: allRoleRows, error: roleErr } = await supabase
        .from("user_roles")
        .select("user_id, roles(name)");

      if (roleErr) console.error("[UsersPage] role fetch error:", roleErr);

      // Build role map: userId → role name
      const roleMap = {};
      (allRoleRows || []).forEach(r => {
        if (!r.user_id) return;
        const name = r.roles?.name || r.role_name || r.role || null;
        if (name) roleMap[r.user_id] = name;
      });

      // IDs to exclude from users table (admins + super_admins)
      const excludeIds = (allRoleRows || [])
        .filter(r => r.roles?.name === "admin" || r.roles?.name === "super_admin")
        .map(r => r.user_id).filter(Boolean);

      // Load user profiles
      let query = supabase
        .from("profiles")
        .select("*, student_badges(count), module_progress(count), seminar_registrations(count)")
        .order("full_name");
      if (excludeIds.length > 0)
        query = query.not("id", "in", `(${excludeIds.join(",")})`);

      const { data, error } = await query;
      if (error) console.error("Users load error:", error.message);

      // Load admins
      const adminIds = (allRoleRows || [])
        .filter(r => r.roles?.name === "admin")
        .map(r => r.user_id).filter(Boolean);
      let adminProfiles = [];
      if (adminIds.length > 0) {
        const { data: ap } = await supabase.from("profiles").select("*").in("id", adminIds).order("full_name");
        adminProfiles = ap || [];
      }

      if (active) {
        setUsers(data || []);
        setUserRoles(roleMap);
        setAdmins(adminProfiles);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // ── Callback when RoleAssignPanel saves ───────────────────────────────────
  const handleRoleChanged = (userId, newRole) => {
    setUserRoles(prev => ({ ...prev, [userId]: newRole }));
    // Also update selected so the badge in header refreshes
    if (selected?.id === userId) {
      setSelected(u => ({ ...u, _roleRefresh: Date.now() }));
    }
  };

  // ── Open detail modal ──────────────────────────────────────────────────────
  const openDetail = async (user) => {
    setSelected(user); setDetailLoading(true); setDetail(null);
    const [{ data: progress }, { data: badges }, { data: attempts }, { data: regs }] = await Promise.all([
      supabase.from("module_progress").select("*, modules(title)").eq("user_id", user.id).order("last_accessed_at", { ascending: false }),
      supabase.from("student_badges").select("*, badges(name, icon_url, badge_type)").eq("user_id", user.id).order("awarded_at", { ascending: false }),
      supabase.from("assessment_attempts").select("*, assessments(title)").eq("user_id", user.id).order("submitted_at", { ascending: false }),
      supabase.from("seminar_registrations").select("*, seminars(title, scheduled_start, status)").eq("user_id", user.id).order("registered_at", { ascending: false }),
    ]);
    setDetail({ progress: progress || [], badges: badges || [], attempts: attempts || [], regs: regs || [] });
    setDetailLoading(false);
  };

  // ── Toggle active with notification ───────────────────────────────────────
  const toggleActive = (user) => {
    const newVal = !user.is_active;
    setConfirm({
      title: newVal ? "Reactivate Account" : "Deactivate Account",
      message: newVal
        ? `Reactivate ${user.full_name}'s account? They will regain access to BLOOM and receive a notification.`
        : `Deactivate ${user.full_name}'s account? They will be locked out immediately and notified to contact an administrator.`,
      confirmLabel: newVal ? "Reactivate" : "Deactivate",
      danger: !newVal,
      onConfirm: async () => {
        const updateData = { is_active: newVal };
        if (newVal === true) updateData.last_sign_in_at = new Date().toISOString();
        await supabase.from("profiles").update(updateData).eq("id", user.id);
        if (newVal) await sendReactivationNotification(user.id, user.full_name);
        else        await sendDeactivationNotification(user.id, user.full_name);
        setUsers(us => us.map(u => u.id === user.id ? { ...u, is_active: newVal } : u));
        if (selected?.id === user.id) setSelected(u => ({ ...u, is_active: newVal }));
        setConfirm(null);
      },
    });
  };

  // ── Check inactive users ───────────────────────────────────────────────────
  const checkInactiveUsers = async () => {
    const cutoff = new Date(Date.now() - inactivityDays * 86400000).toISOString();
    const inactive = users.filter(u =>
      u.is_active && u.last_sign_in_at && new Date(u.last_sign_in_at) < new Date(cutoff)
    );
    if (inactive.length === 0) {
      setAlertModal({ title: "No Inactive Users", message: `No users found who have been inactive for ${inactivityDays}+ days.` });
      return;
    }
    setConfirm({
      title: "Deactivate Inactive Users",
      message: `Found ${inactive.length} user(s) who haven't logged in for ${inactivityDays}+ days. Deactivate all and notify them?`,
      confirmLabel: `Deactivate ${inactive.length} Users`,
      danger: true,
      onConfirm: async () => {
        for (const u of inactive) {
          await supabase.from("profiles").update({ is_active: false }).eq("id", u.id);
          await sendDeactivationNotification(u.id, u.full_name);
        }
        setUsers(us => us.map(u => inactive.find(i => i.id === u.id) ? { ...u, is_active: false } : u));
        setConfirm(null);
        setAlertModal({ title: "Done", message: `${inactive.length} account(s) deactivated and users notified.` });
      },
    });
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const departments   = [...new Set(users.map(u => u.department).filter(Boolean))].sort();
  const totalActive   = users.filter(u => u.is_active !== false).length;
  const totalInactive = users.length - totalActive;

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = (u.full_name || "").toLowerCase().includes(q) ||
      (u.student_id || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q);
    const matchFilter = filter === "all" ? true : filter === "active" ? u.is_active !== false : u.is_active === false;
    const matchDept   = deptFilter === "all" ? true : u.department === deptFilter;
    const matchRole   = roleFilter === "all" ? true : (userRoles[u.id] || "unknown") === roleFilter;
    return matchSearch && matchFilter && matchDept && matchRole;
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}><i className="bi bi-people me-1"/> User Management</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{users.length} registered users</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total Users",  value: users.length,       color: G.base    },
          { label: "Active",       value: totalActive,        color: "#16a34a" },
          { label: "Inactive",     value: totalInactive,      color: "#dc2626" },
          { label: "Departments",  value: departments.length, color: "#2563eb" },
        ].map(stat => (
          <div key={stat.label} style={s.statCard(stat.color)}>
            <div style={{ ...s.statNum, color: stat.color }}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${G.wash}`, marginBottom: 20 }}>
        {[["users", "Users", "bi-people"], ["admins", "Administrators", "bi-shield-lock"]].map(([v, l, ic]) => (
          <div key={v} onClick={() => { setMainTab(v); setSearch(""); setSelected(null); }}
            style={{ padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              color: mainTab === v ? G.dark : "#999",
              borderBottom: mainTab === v ? `2px solid ${G.dark}` : "2px solid transparent", marginBottom: -2 }}>
            <i className={`bi ${ic}`}/>{l}
            <span style={{ background: G.wash, color: G.base, borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
              {v === "users" ? users.length : admins.length}
            </span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <input
          style={s.searchBar}
          placeholder="Search by name, ID, or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={s.select} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Users</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        <select style={s.select} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select style={s.select} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="faculty">Faculty</option>
          <option value="guest">Guest</option>
          <option value="speaker">Speaker</option>
        </select>
        {mainTab === "users" && (
          <button onClick={checkInactiveUsers}
            style={{ padding: "9px 14px", background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <i className="bi bi-clock-history"/> Check Inactive ({inactivityDays}d)
          </button>
        )}
      </div>

      {/* ── Users Table ── */}
      {mainTab === "users" && (
        loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading users…</div>
        ) : filtered.length === 0 ? (
          <div style={s.emptyBox}>
            <div style={{ fontSize: 32, marginBottom: 10, color: G.pale }}><i className="bi bi-people"/></div>
            <div style={{ fontWeight: 700, color: G.dark, marginBottom: 6 }}>No users found</div>
            <div style={{ fontSize: 13, color: "#aaa" }}>Try adjusting your search or filters</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>User</th>
                  <th style={s.th}>ID</th>
                  <th style={s.th}>Role</th>
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
                {filtered.map(user => {
                  const initials    = (user.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                  const moduleCount = user.module_progress?.[0]?.count  || 0;
                  const badgeCount  = user.student_badges?.[0]?.count   || 0;
                  const semCount    = user.seminar_registrations?.[0]?.count || 0;
                  const isActive    = user.is_active !== false;
                  const role        = userRoles[user.id] || "unknown";
                  return (
                    <tr key={user.id}
                      style={{ cursor: "pointer", transition: "background .1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = G.cream}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>

                      <td style={s.td} onClick={() => openDetail(user)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={s.avatar}>
                            {user.avatar_url
                              ? <img src={user.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                              : initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: G.dark }}>{user.full_name || "—"}</div>
                            <div style={{ fontSize: 11, color: "#aaa" }}>{user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={s.td} onClick={() => openDetail(user)}>{user.student_id || "—"}</td>
                      <td style={s.td} onClick={() => openDetail(user)}><RoleBadge role={role} /></td>
                      <td style={s.td} onClick={() => openDetail(user)}>{user.department || "—"}</td>
                      <td style={s.td} onClick={() => openDetail(user)}>{user.year_level ? `Year ${user.year_level}` : "—"}</td>
                      <td style={s.td} onClick={() => openDetail(user)}>
                        <span style={{ fontWeight: 700, color: G.base }}><i className="bi bi-book me-1"/>{moduleCount}</span>
                      </td>
                      <td style={s.td} onClick={() => openDetail(user)}>
                        <span style={{ fontWeight: 700, color: "#f59e0b" }}><i className="bi bi-award me-1"/>{badgeCount}</span>
                      </td>
                      <td style={s.td} onClick={() => openDetail(user)}>
                        <span style={{ fontWeight: 700, color: "#7c3aed" }}><i className="bi bi-mortarboard me-1"/>{semCount}</span>
                      </td>
                      <td style={s.td} onClick={() => openDetail(user)}>
                        <span style={s.tag(isActive ? "green" : "red")}>{isActive ? "Active" : "Inactive"}</span>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            style={{ padding: "5px 10px", border: "1px solid #DDE8DD", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600, color: G.dark }}
                            onClick={() => openDetail(user)}>View</button>
                          <button
                            style={{ padding: "5px 10px", border: "none", borderRadius: 6, background: isActive ? "#fee2e2" : "#dcfce7", fontSize: 12, cursor: "pointer", fontWeight: 600, color: isActive ? "#dc2626" : "#16a34a" }}
                            onClick={() => toggleActive(user)}>
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
        )
      )}

      {/* ── Admins Tab ── */}
      {mainTab === "admins" && (
        <div>
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#c2410c", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <i className="bi bi-exclamation-triangle-fill" style={{ flexShrink: 0, marginTop: 2 }}/>
            <div><strong>Administrator accounts</strong> have full access to this admin panel. Manage these accounts with care. Role assignments require database-level changes.</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #DDE8DD", overflow: "hidden" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Administrator</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Role</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0
                  ? <tr><td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#aaa" }}>No admin accounts found</td></tr>
                  : admins.map(a => (
                    <tr key={a.id}>
                      <td style={s.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#2D6A2D,#4CAF50)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                            {(a.full_name || a.email || "A").slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: G.dark }}>{a.full_name || "—"}</div>
                            <div style={{ fontSize: 11, color: "#aaa" }}>System Admin</div>
                          </div>
                        </div>
                      </td>
                      <td style={s.td}>{a.email || "—"}</td>
                      <td style={s.td}><RoleBadge role={userRoles[a.id] || "admin"} /></td>
                      <td style={s.td}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: a.is_active !== false ? "#dcfce7" : "#fee2e2", color: a.is_active !== false ? "#16a34a" : "#dc2626" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.is_active !== false ? "#16a34a" : "#dc2626", display: "inline-block" }}/>
                          {a.is_active !== false ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td style={{ ...s.td, fontSize: 12, color: "#888" }}>
                        {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "Never"}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── User Detail Modal ── */}
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={s.mTitle}>{selected.full_name || "User"}</span>
                    <RoleBadge role={userRoles[selected.id] || "unknown"} />
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                    {selected.student_id && <>{selected.student_id} · </>}
                    {selected.department || "No department"}
                    {selected.year_level && <> · Year {selected.year_level}</>}
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{selected.email}</div>
                </div>
              </div>
              <button style={s.iconBtn()} onClick={() => { setSelected(null); setDetail(null); }}>×</button>
            </div>

            <div style={s.mBody}>
              {/* Deactivated warning banner */}
              {selected.is_active === false && (
                <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
                  <i className="bi bi-slash-circle-fill"/>
                  <strong>Account Deactivated</strong> — This user cannot log in. They have been notified to contact an administrator.
                </div>
              )}

              {/* ── Role Assignment Panel ── */}
              <RoleAssignPanel
                user={selected}
                currentRole={userRoles[selected.id] || "student"}
                onRoleChanged={handleRoleChanged}
              />

              {detailLoading ? (
                <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading profile…</div>
              ) : detail && (
                <>
                  {/* Stats */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                    {[
                      { label: "Modules",  value: detail.progress.length, color: G.base    },
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
                          <div style={{ height: "100%", width: `${p.progress_percent || 0}%`, background: p.progress_percent === 100 ? "#16a34a" : G.base, borderRadius: 3 }}/>
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
              <button
                style={{ padding: "9px 20px", background: selected?.is_active !== false ? "#fee2e2" : "#dcfce7", color: selected?.is_active !== false ? "#dc2626" : "#16a34a", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 }}
                onClick={() => toggleActive(selected)}>
                {selected?.is_active !== false ? "Deactivate User" : "Activate User"}
              </button>
              <button
                style={{ padding: "9px 20px", background: G.wash, color: G.dark, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 }}
                onClick={() => { setSelected(null); setDetail(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {alertModal && (
        <AlertModal
          title={alertModal.title}
          message={alertModal.message}
          onClose={() => setAlertModal(null)}
        />
      )}
    </div>
  );
}