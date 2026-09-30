import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase.js";
import { ConfirmModal, useToast } from "./App.jsx";
import { V, FieldError } from "./lib/Validate.jsx";
import { logActivity } from "./lib/activityLog.js";

const G = {
  dark:  "#1A2E1A", mid:   "#2D6A2D", base:  "#3A7A3A",
  light: "#4CAF50", pale:  "#C8E6C9", wash:  "#E8F5E9",
  cream: "#F5F7F5", white: "#FFFFFF",
};

const ROLE_CONFIG = {
  student:     { label: "Student",            bg: "#dbeafe", color: "#1d4ed8" },
  teacher:     { label: "Teacher",            bg: "#dcfce7", color: "#15803d" },
  faculty:     { label: "Faculty",            bg: "#f3e8ff", color: "#7e22ce" },
  staff:       { label: "Non-Academic Staff", bg: "#cffafe", color: "#0e7490" },
  guest:       { label: "Guest (Non-CvSU)",   bg: "#f3f4f6", color: "#374151" },
  speaker:     { label: "Speaker",            bg: "#fff7ed", color: "#c2410c" },
  unknown:     { label: "No Role",            bg: "#f3f4f6", color: "#9ca3af" },
  admin:       { label: "Admin",              bg: "#fef9c3", color: "#92400e" },
  super_admin: { label: "Super Admin",        bg: "#fee2e2", color: "#dc2626" },
};

// Fallback ids — the real ids are loaded from the "roles" table on page load,
// so new roles (like "staff") work without editing this list.
const ROLE_ID_FALLBACK = {
  student:     "0b4066e1-9430-467e-b224-c9ce3be0df5c",
  teacher:     "994750f0-9566-434a-95f2-f944826a1e1b",
  faculty:     "cab9e0b8-2d70-46eb-a514-cdc27d1427d6",
  guest:       "b70c09ad-7333-4c7e-9b53-656390af610b",
  speaker:     "35c41456-f09a-4562-b829-78ae40148112",
  admin:       "bb8b2973-cdcf-4f51-8065-7850dc47da54",
  super_admin: "f45418e4-f87f-43f2-b4a2-5a36f7f1894a",
};

const ASSIGNABLE_ROLES = ["student", "teacher", "faculty", "staff", "guest", "speaker"];

// Roles an admin can add from the "Add User" form, with a short explanation
const ADD_USER_TYPES = [
  { role: "staff",   icon: "bi-person-workspace", hint: "CvSU non-academic employees (admin office, maintenance, security, etc.)" },
  { role: "guest",   icon: "bi-globe2",           hint: "Participants from outside CvSU (LGU, partner agencies, community, parents)" },
  { role: "faculty", icon: "bi-person-badge",     hint: "CvSU faculty members" },
  { role: "teacher", icon: "bi-person-video3",    hint: "Teachers" },
  { role: "speaker", icon: "bi-mic",              hint: "Resource speakers for seminars" },
  { role: "student", icon: "bi-mortarboard",      hint: "CvSU students without access to the app" },
];

const isCvsuRole = (role) => ["student", "teacher", "faculty", "staff"].includes(role);

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || { label: role, bg: "#f3f4f6", color: "#555" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, whiteSpace: "nowrap" }}>
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

const isPlaceholderEmail = (email) => /@guest\.bloomgad\.xyz$/i.test(email || "");
const sexLabel = (sx) => sx === "male" ? "Male" : sx === "female" ? "Female" : "—";

function AlertModal({ title, message, onClose }) {
  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: 400 }}>
        <div style={s.mHeader}><span style={s.mTitle}>{title}</span></div>
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
  select:    { padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", color: G.dark, colorScheme: "light" },
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
  input:     { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark },
  inputSel:  { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark, appearance: "auto", colorScheme: "light" },
  label:     { fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.6 },
  fg:        { marginBottom: 14 },
  row:       { display: "flex", gap: 12, flexWrap: "wrap" },
  btnPrimary:  { padding: "9px 20px", background: G.dark, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnSecondary:{ padding: "9px 20px", background: G.wash, color: G.dark, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 },
};

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

// ── Add User Modal — adds non-academic staff / non-CvSU guests to the masterlist ──
function AddUserModal({ onCreated, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({
    role: "staff", full_name: "", sex: "", email: "", contact_number: "",
    organization: "", position: "", department: "", student_id: "",
  });
  const [err,    setErr]    = useState({});
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(e => ({ ...e, [k]: null })); };

  const isGuest   = form.role === "guest";
  const isStudent = form.role === "student";

  const save = async () => {
    const errs = V.all({
      full_name:      V.name(form.full_name, "Full name"),
      sex:            !form.sex ? "Please select sex (needed for sex-disaggregated reports)." : null,
      email:          !form.email.trim() ? "Email is required — they will use it to sign up in the app."
                        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? "Please enter a valid email address." : null,
      contact_number: form.contact_number.trim() && !/^[0-9+\-\s()]{7,20}$/.test(form.contact_number.trim())
                        ? "Please enter a valid contact number." : null,
      organization:   isGuest && !form.organization.trim() ? "Organization / affiliation is required for guests." : null,
      student_id:     form.student_id.trim() && !/^[a-zA-Z0-9\-_]+$/.test(form.student_id.trim())
                        ? "Student ID must be alphanumeric (letters, numbers, hyphens, underscores only)." : null,
    });
    if (errs) { setErr(errs); return; }

    setSaving(true); setError("");
    const email = form.email.trim().toLowerCase();

    // Already in the masterlist?
    const { data: existing } = await supabase
      .from("masterlist").select("cvsu_email").eq("cvsu_email", email).maybeSingle();
    if (existing) {
      setSaving(false);
      setErr(e => ({ ...e, email: "This email is already in the masterlist." }));
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const row = {
      cvsu_email:     email,               // any email for outsiders (e.g. Gmail)
      full_name:      form.full_name.trim(),
      role:           form.role,
      sex:            form.sex,
      contact_number: form.contact_number.trim() || null,
      organization:   isGuest ? form.organization.trim() : (form.organization.trim() || "Cavite State University"),
      position:       form.position.trim() || null,
      department:     isGuest ? null : (form.department.trim() || null),
      student_id:     isStudent ? (form.student_id.trim() || null) : null,
      is_active:      true,
      added_by:       user?.id ?? null,
    };
    const { error: insErr } = await supabase.from("masterlist").insert(row);
    setSaving(false);

    if (insErr) {
      setError(insErr.code === "23505"
        ? "This email is already in the masterlist."
        : "Could not add to the masterlist: " + insErr.message);
      return;
    }

    toast(`${row.full_name} added to the masterlist. They can now sign up in the BLOOM app using ${email}.`, "success");
    logActivity("masterlist_entry_added", { email, name: row.full_name, role: form.role });
    onCreated(row);
  };

  return (
    <div style={{ ...s.overlay, zIndex: 1100 }}>
      <div style={{ ...s.modal, maxWidth: 580 }}>
        <div style={s.mHeader}>
          <span style={s.mTitle}><i className="bi bi-person-plus me-2"/>Add User to Masterlist</span>
          <button style={s.iconBtn()} onClick={onClose}><i className="bi bi-x-lg"/></button>
        </div>
        <div style={s.mBody}>
          {error && <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{error}</div>}

          <div style={{ background: G.wash, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: G.dark, marginBottom: 16, lineHeight: 1.5 }}>
            <i className="bi bi-info-circle me-1"/>
            Add non-academic staff and participants from outside CvSU to the <strong>masterlist</strong>.
            After that, they can <strong>sign up in the BLOOM app</strong> (or use Continue with Google) with the email you enter here.
          </div>

          <div style={s.fg}>
            <label style={s.label}>User Type *</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
              {ADD_USER_TYPES.map(t => {
                const active = form.role === t.role;
                const cfg = ROLE_CONFIG[t.role];
                return (
                  <button key={t.role} type="button" onClick={() => setF("role", t.role)} title={t.hint}
                    style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                      border: `2px solid ${active ? cfg.color : "#e5e7eb"}`, background: active ? cfg.bg : "#fff" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? cfg.color : G.dark, display: "flex", alignItems: "center", gap: 6 }}>
                      <i className={`bi ${t.icon}`}/>{cfg.label}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>
              {ADD_USER_TYPES.find(t => t.role === form.role)?.hint}
            </div>
          </div>

          <div style={s.row}>
            <div style={{ ...s.fg, flex: "2 1 240px" }}>
              <label style={s.label}>Full Name *</label>
              <input style={{ ...s.input, borderColor: err.full_name ? "#dc2626" : undefined }} value={form.full_name} onChange={e => setF("full_name", e.target.value)} placeholder="e.g. Juan Dela Cruz" autoFocus />
              <FieldError msg={err.full_name}/>
            </div>
            <div style={{ ...s.fg, flex: "1 1 140px" }}>
              <label style={s.label}>Sex *</label>
              <select style={{ ...s.inputSel, borderColor: err.sex ? "#dc2626" : undefined }} value={form.sex} onChange={e => setF("sex", e.target.value)}>
                <option value="">— Select —</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
              <FieldError msg={err.sex}/>
            </div>
          </div>

          <div style={s.row}>
            <div style={{ ...s.fg, flex: "1 1 220px" }}>
              <label style={s.label}>Email * <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>(they'll sign up with this)</span></label>
              <input style={{ ...s.input, borderColor: err.email ? "#dc2626" : undefined }} value={form.email} onChange={e => setF("email", e.target.value)} placeholder="e.g. juan@email.com" />
              <FieldError msg={err.email}/>
            </div>
            <div style={{ ...s.fg, flex: "1 1 180px" }}>
              <label style={s.label}>Contact Number <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>(optional)</span></label>
              <input style={{ ...s.input, borderColor: err.contact_number ? "#dc2626" : undefined }} value={form.contact_number} onChange={e => setF("contact_number", e.target.value)} placeholder="e.g. 0917 123 4567" />
              <FieldError msg={err.contact_number}/>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: -8, marginBottom: 12 }}>
            <i className="bi bi-info-circle me-1"/>Outsiders can use any email (e.g. Gmail). If they have a Google account with this email, they can also use <strong>Continue with Google</strong>.
          </div>

          {isGuest ? (
            <div style={s.row}>
              <div style={{ ...s.fg, flex: "1 1 220px" }}>
                <label style={s.label}>Organization / Affiliation *</label>
                <input style={{ ...s.input, borderColor: err.organization ? "#dc2626" : undefined }} value={form.organization} onChange={e => setF("organization", e.target.value)} placeholder="e.g. Barangay Indang, DSWD Cavite" />
                <FieldError msg={err.organization}/>
              </div>
              <div style={{ ...s.fg, flex: "1 1 180px" }}>
                <label style={s.label}>Position <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>(optional)</span></label>
                <input style={s.input} value={form.position} onChange={e => setF("position", e.target.value)} placeholder="e.g. Barangay Secretary" />
              </div>
            </div>
          ) : (
            <div style={s.row}>
              <div style={{ ...s.fg, flex: "1 1 220px" }}>
                <label style={s.label}>{isStudent ? "Department / College" : "Office / Department"} <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>(optional)</span></label>
                <input style={s.input} value={form.department} onChange={e => setF("department", e.target.value)} placeholder={isStudent ? "e.g. College of Engineering" : "e.g. Registrar's Office"} />
              </div>
              {isStudent ? (
                <div style={{ ...s.fg, flex: "1 1 180px" }}>
                  <label style={s.label}>Student ID <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>(optional)</span></label>
                  <input style={{ ...s.input, borderColor: err.student_id ? "#dc2626" : undefined }} value={form.student_id} onChange={e => setF("student_id", e.target.value)} placeholder="e.g. 2021-00123" />
                  <FieldError msg={err.student_id}/>
                </div>
              ) : (
                <div style={{ ...s.fg, flex: "1 1 180px" }}>
                  <label style={s.label}>Position <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>(optional)</span></label>
                  <input style={s.input} value={form.position} onChange={e => setF("position", e.target.value)} placeholder={form.role === "staff" ? "e.g. Administrative Aide" : "e.g. Instructor I"} />
                </div>
              )}
            </div>
          )}
        </div>
        <div style={s.mFooter}>
          <button style={s.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>
            {saving ? "Adding…" : "Add to Masterlist"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────
function EditProfileModal({ user, role, onSaved, onClose }) {
  const toast = useToast();
  const isGuest = role === "guest";
  const [form, setForm] = useState({
    full_name:      user.full_name  || "",
    email:          isPlaceholderEmail(user.email) ? "" : (user.email || ""),
    student_id:     user.student_id || "",
    department:     user.department || "",
    year_level:     user.year_level || "",
    sex:            user.sex || "",
    contact_number: user.contact_number || "",
    organization:   user.organization || "",
    position:       user.position || "",
  });
  const [err,    setErr]    = useState({});
  const [saving, setSaving] = useState(false);

  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(e => ({ ...e, [k]: null })); };
  const placeholder = isPlaceholderEmail(user.email);

  const save = async () => {
    const errs = V.all({
      full_name:  V.name(form.full_name, "Full name"),
      email:      !form.email?.trim()
                    ? (placeholder ? null : "Email is required.")
                    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
                      ? "Please enter a valid email address." : null,
      student_id: form.student_id?.trim() && !/^[a-zA-Z0-9\-_]+$/.test(form.student_id.trim())
                  ? "Student ID must be alphanumeric (letters, numbers, hyphens, underscores only)." : null,
      contact_number: form.contact_number.trim() && !/^[0-9+\-\s()]{7,20}$/.test(form.contact_number.trim())
                  ? "Please enter a valid contact number." : null,
      organization: isGuest && !form.organization.trim() ? "Organization / affiliation is required for guests." : null,
    });
    if (errs) { setErr(errs); return; }
    setSaving(true);
    const payload = {
      full_name:      form.full_name.trim(),
      // Keep the placeholder address if the admin didn't enter a real email
      email:          form.email.trim() || user.email,
      student_id:     form.student_id?.trim() || null,
      department:     form.department?.trim() || null,
      year_level:     form.year_level ? parseInt(form.year_level, 10) : null,
      sex:            form.sex || null,
      contact_number: form.contact_number.trim() || null,
      organization:   form.organization.trim() || null,
      position:       form.position.trim() || null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setSaving(false);
    if (error) { toast(error.message, "error"); return; }
    toast("Profile updated.", "success");
    logActivity("user_profile_updated", { user_id: user.id, name: payload.full_name });
    onSaved({ ...user, ...payload });
  };

  return (
    <div style={{ ...s.overlay, zIndex: 1100 }}>
      <div style={{ ...s.modal, maxWidth: 520 }}>
        <div style={s.mHeader}>
          <span style={s.mTitle}><i className="bi bi-pencil me-2"/>Edit Profile</span>
          <button style={s.iconBtn()} onClick={onClose}><i className="bi bi-x-lg"/></button>
        </div>
        <div style={s.mBody}>
          <div style={s.row}>
            <div style={{ ...s.fg, flex: "2 1 240px" }}>
              <label style={s.label}>Full Name * <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>(no numbers)</span></label>
              <input style={{ ...s.input, borderColor: err.full_name ? "#dc2626" : undefined }} value={form.full_name} onChange={e => setF("full_name", e.target.value)} placeholder="e.g. Maria Santos" />
              <FieldError msg={err.full_name}/>
            </div>
            <div style={{ ...s.fg, flex: "1 1 130px" }}>
              <label style={s.label}>Sex</label>
              <select style={s.inputSel} value={form.sex} onChange={e => setF("sex", e.target.value)}>
                <option value="">— Select —</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
          </div>
          <div style={s.fg}>
            <label style={s.label}>Email {placeholder ? <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>(optional — none on file)</span> : "*"}</label>
            <input style={{ ...s.input, borderColor: err.email ? "#dc2626" : undefined }} value={form.email} onChange={e => setF("email", e.target.value)} placeholder="e.g. maria@cvsu.edu.ph" />
            <FieldError msg={err.email}/>
          </div>
          <div style={s.fg}>
            <label style={s.label}>Contact Number</label>
            <input style={{ ...s.input, borderColor: err.contact_number ? "#dc2626" : undefined }} value={form.contact_number} onChange={e => setF("contact_number", e.target.value)} placeholder="e.g. 0917 123 4567" />
            <FieldError msg={err.contact_number}/>
          </div>
          {isGuest || !isCvsuRole(role) ? (
            <div style={s.row}>
              <div style={{ ...s.fg, flex: "1 1 200px" }}>
                <label style={s.label}>Organization / Affiliation {isGuest && "*"}</label>
                <input style={{ ...s.input, borderColor: err.organization ? "#dc2626" : undefined }} value={form.organization} onChange={e => setF("organization", e.target.value)} placeholder="e.g. Barangay Indang" />
                <FieldError msg={err.organization}/>
              </div>
              <div style={{ ...s.fg, flex: "1 1 180px" }}>
                <label style={s.label}>Position</label>
                <input style={s.input} value={form.position} onChange={e => setF("position", e.target.value)} placeholder="e.g. Barangay Secretary" />
              </div>
            </div>
          ) : (
            <>
              <div style={s.row}>
                <div style={{ ...s.fg, flex: "1 1 200px" }}>
                  <label style={s.label}>Department / Office</label>
                  <input style={s.input} value={form.department} onChange={e => setF("department", e.target.value)} placeholder="e.g. College of Engineering" />
                </div>
                {role !== "student" && (
                  <div style={{ ...s.fg, flex: "1 1 180px" }}>
                    <label style={s.label}>Position</label>
                    <input style={s.input} value={form.position} onChange={e => setF("position", e.target.value)} placeholder="e.g. Administrative Aide" />
                  </div>
                )}
              </div>
              {role === "student" && (
                <div style={s.row}>
                  <div style={{ ...s.fg, flex: "1 1 200px" }}>
                    <label style={s.label}>Student ID <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>(alphanumeric)</span></label>
                    <input style={{ ...s.input, borderColor: err.student_id ? "#dc2626" : undefined }} value={form.student_id} onChange={e => setF("student_id", e.target.value)} placeholder="e.g. 2021-00123" />
                    <FieldError msg={err.student_id}/>
                  </div>
                  <div style={{ ...s.fg, flex: "1 1 140px" }}>
                    <label style={s.label}>Year Level</label>
                    <select style={s.inputSel} value={form.year_level} onChange={e => setF("year_level", e.target.value)}>
                      <option value="">— Select —</option>
                      {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div style={s.mFooter}>
          <button style={s.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Role Assignment Panel ─────────────────────────────────────────────────────
function RoleAssignPanel({ user, currentRole, roleIds, onRoleChanged }) {
  const toast = useToast();
  const [selectedRole, setSelectedRole] = useState(currentRole || "student");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => { setSelectedRole(currentRole || "student"); setSaved(false); }, [currentRole, user?.id]);

  const isDirty = selectedRole !== (currentRole || "student");

  const handleSave = async () => {
    const newRoleId = roleIds[selectedRole];
    if (!newRoleId) { toast(`The "${selectedRole}" role doesn't exist in the database yet.`, "error"); return; }
    setSaving(true);
    // Update the existing role row; if the user has none yet, create one
    const { data: updated, error } = await supabase.from("user_roles")
      .update({ role_id: newRoleId }).eq("user_id", user.id).select("user_id");
    let saveErr = error;
    if (!error && (!updated || updated.length === 0)) {
      ({ error: saveErr } = await supabase.from("user_roles").insert({ user_id: user.id, role_id: newRoleId }));
    }
    if (saveErr) { toast("Failed to update role: " + saveErr.message, "error"); setSaving(false); return; }
    await supabase.from("profiles").update({ role: selectedRole }).eq("id", user.id);
    try {
      await supabase.from("notifications").insert({
        user_id: user.id, type: "role_changed", title: "Role Updated",
        body: `Hi ${user.full_name || "there"}, your role in BLOOM has been updated to ${ROLE_CONFIG[selectedRole]?.label || selectedRole}.`,
        reference_type: "account", reference_id: user.id, is_read: false,
      });
    } catch { /* non-critical */ }
    logActivity("user_role_changed", { user_id: user.id, name: user.full_name, from: currentRole, to: selectedRole });
    toast(`Role updated to ${ROLE_CONFIG[selectedRole]?.label}.`, "success");
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onRoleChanged(user.id, selectedRole);
  };

  return (
    <div style={{ background: "#f8faff", border: "1px solid #e0e7ff", borderRadius: 10, padding: "14px 16px", marginBottom: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#4338ca", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <i className="bi bi-person-badge"/> Assign Role
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {ASSIGNABLE_ROLES.map(role => {
            const cfg = ROLE_CONFIG[role];
            const isActive = selectedRole === role;
            return (
              <button key={role} onClick={() => { setSelectedRole(role); setSaved(false); }}
                style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all .15s",
                  border: isActive ? `2px solid ${cfg.color}` : "2px solid #e5e7eb",
                  background: isActive ? cfg.bg : "#fff", color: isActive ? cfg.color : "#9ca3af",
                  boxShadow: isActive ? `0 0 0 3px ${cfg.bg}` : "none" }}>
                {cfg.label}
              </button>
            );
          })}
        </div>
        <button onClick={handleSave} disabled={!isDirty || saving}
          style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: isDirty && !saving ? "pointer" : "not-allowed", border: "none", transition: "all .15s",
            background: saved ? "#dcfce7" : isDirty ? "#4338ca" : "#e5e7eb",
            color: saved ? "#16a34a" : isDirty ? "#fff" : "#9ca3af",
            display: "flex", alignItems: "center", gap: 6, minWidth: 80 }}>
          {saving ? <><i className="bi bi-hourglass-split"/> Saving…</> : saved ? <><i className="bi bi-check-circle-fill"/> Saved!</> : <><i className="bi bi-floppy"/> Save</>}
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
  const toast = useToast();
  const [users,      setUsers]      = useState([]);
  const [userRoles,  setUserRoles]  = useState({});
  const [roleIds,    setRoleIds]    = useState(ROLE_ID_FALLBACK);
  const [admins,     setAdmins]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected,   setSelected]   = useState(null);
  const [detail,     setDetail]     = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mainTab,    setMainTab]    = useState("users");
  const [confirm,    setConfirm]    = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [editUser,   setEditUser]   = useState(null);
  const [showAdd,    setShowAdd]    = useState(false);
  const [masterlist, setMasterlist] = useState([]);
  const [inactivityDays] = useState(30);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const [{ data: allRoleRows, error: roleErr }, { data: roleList }] = await Promise.all([
      supabase.from("user_roles").select("user_id, roles(name)"),
      supabase.from("roles").select("id, name"),
    ]);
    if (roleErr) console.error("[UsersPage] role fetch error:", roleErr);

    if (roleList?.length) {
      const ids = { ...ROLE_ID_FALLBACK };
      roleList.forEach(r => { if (r?.name) ids[r.name] = r.id; });
      setRoleIds(ids);
    }

    const roleMap = {};
    (allRoleRows || []).forEach(r => {
      if (!r.user_id) return;
      const name = r.roles?.name || null;
      if (name) roleMap[r.user_id] = name;
    });

    const excludeIds = (allRoleRows || [])
      .filter(r => r.roles?.name === "admin" || r.roles?.name === "super_admin")
      .map(r => r.user_id).filter(Boolean);

    let query = supabase
      .from("profiles")
      .select("*, student_badges(count), module_progress(count), seminar_registrations(count)")
      .order("full_name");
    if (excludeIds.length > 0)
      query = query.not("id", "in", `(${excludeIds.join(",")})`);

    const { data, error } = await query;
    if (error) console.error("Users load error:", error.message);

    const adminIds = (allRoleRows || [])
      .filter(r => r.roles?.name === "admin").map(r => r.user_id).filter(Boolean);
    let adminProfiles = [];
    if (adminIds.length > 0) {
      const { data: ap } = await supabase.from("profiles").select("*").in("id", adminIds).order("full_name");
      adminProfiles = ap || [];
    }

    const { data: ml, error: mlErr } = await supabase.from("masterlist").select("*").order("full_name");
    if (mlErr) console.error("Masterlist load error:", mlErr.message);

    setUsers(data || []); setUserRoles(roleMap); setAdmins(adminProfiles); setMasterlist(ml || []); setLoading(false);
  }, []);

  const toggleMasterlistActive = async (entry) => {
    const newVal = !(entry.is_active !== false);
    const { error } = await supabase.from("masterlist").update({ is_active: newVal }).eq("cvsu_email", entry.cvsu_email);
    if (error) { toast("Could not update masterlist: " + error.message, "error"); return; }
    setMasterlist(ms => ms.map(m => m.cvsu_email === entry.cvsu_email ? { ...m, is_active: newVal } : m));
    logActivity(newVal ? "masterlist_entry_enabled" : "masterlist_entry_disabled", { email: entry.cvsu_email });
    toast(newVal ? `${entry.full_name} can sign up again.` : `${entry.full_name} can no longer sign up.`, newVal ? "success" : "warning");
  };

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleRoleChanged = (userId, newRole) => {
    setUserRoles(prev => ({ ...prev, [userId]: newRole }));
    if (selected?.id === userId) setSelected(u => ({ ...u, _roleRefresh: Date.now() }));
  };

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
        const { error } = await supabase.from("profiles").update(updateData).eq("id", user.id);
        if (error) { toast("Could not update account: " + error.message, "error"); setConfirm(null); return; }
        if (newVal) { await sendReactivationNotification(user.id, user.full_name); }
        else        { await sendDeactivationNotification(user.id, user.full_name); }
        logActivity(newVal ? "user_reactivated" : "user_deactivated", { user_id: user.id, name: user.full_name });
        toast(newVal ? `${user.full_name} reactivated.` : `${user.full_name} deactivated.`, newVal ? "success" : "warning");
        setUsers(us => us.map(u => u.id === user.id ? { ...u, is_active: newVal } : u));
        if (selected?.id === user.id) setSelected(u => ({ ...u, is_active: newVal }));
        setConfirm(null);
      },
    });
  };

  const checkInactiveUsers = async () => {
    const cutoff = new Date(Date.now() - inactivityDays * 86400000).toISOString();
    // Admin-added users who haven't registered in the app never log in, so they're excluded
    const inactive = users.filter(u => u.is_active && (!u.added_by || u.claimed_at) && u.last_sign_in_at && new Date(u.last_sign_in_at) < new Date(cutoff));
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
        logActivity("bulk_users_deactivated", { count: inactive.length });
        toast(`${inactive.length} account(s) deactivated.`, "warning");
        setUsers(us => us.map(u => inactive.find(i => i.id === u.id) ? { ...u, is_active: false } : u));
        setConfirm(null);
        setAlertModal({ title: "Done", message: `${inactive.length} account(s) deactivated and users notified.` });
      },
    });
  };

  const handleProfileSaved = (updatedUser) => {
    setUsers(us => us.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
    if (selected?.id === updatedUser.id) setSelected(u => ({ ...u, ...updatedUser }));
    setEditUser(null);
  };

  const handleUserCreated = async () => {
    setShowAdd(false);
    setMainTab("masterlist");
    await loadUsers();
  };

  const departments   = [...new Set(users.map(u => u.department).filter(Boolean))].sort();
  const totalActive   = users.filter(u => u.is_active !== false).length;
  const totalInactive = users.length - totalActive;
  const totalStaff    = users.filter(u => userRoles[u.id] === "staff").length;
  const totalGuests   = users.filter(u => userRoles[u.id] === "guest").length;

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = (u.full_name || "").toLowerCase().includes(q)
      || (u.student_id || "").toLowerCase().includes(q)
      || (u.email || "").toLowerCase().includes(q)
      || (u.organization || "").toLowerCase().includes(q);
    const matchFilter = filter === "all" ? true : filter === "active" ? u.is_active !== false : u.is_active === false;
    const matchDept   = deptFilter === "all" ? true : u.department === deptFilter;
    const matchRole   = roleFilter === "all" ? true : (userRoles[u.id] || "unknown") === roleFilter;
    return matchSearch && matchFilter && matchDept && matchRole;
  });

  const selectedRole = selected ? (userRoles[selected.id] || "unknown") : null;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}><i className="bi bi-people me-1"/> User Management</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{users.length} users in the masterlist</div>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ padding: "9px 18px", background: G.dark, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          <i className="bi bi-person-plus"/> Add User
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total Users",        value: users.length,       color: G.base    },
          { label: "Active",             value: totalActive,        color: "#16a34a" },
          { label: "Inactive",           value: totalInactive,      color: "#dc2626" },
          { label: "Non-Academic Staff", value: totalStaff,         color: "#0e7490" },
          { label: "Guests (Non-CvSU)",  value: totalGuests,        color: "#374151" },
          { label: "Departments",        value: departments.length, color: "#2563eb" },
        ].map(stat => (
          <div key={stat.label} style={s.statCard(stat.color)}>
            <div style={{ ...s.statNum, color: stat.color }}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${G.wash}`, marginBottom: 20 }}>
        {[["users", "Users", "bi-people"], ["masterlist", "Masterlist", "bi-card-checklist"], ["admins", "Administrators", "bi-shield-lock"]].map(([v, l, ic]) => (
          <div key={v} onClick={() => { setMainTab(v); setSearch(""); setSelected(null); }}
            style={{ padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              color: mainTab === v ? G.dark : "#999", borderBottom: mainTab === v ? `2px solid ${G.dark}` : "2px solid transparent", marginBottom: -2 }}>
            <i className={`bi ${ic}`}/>{l}
            <span style={{ background: G.wash, color: G.base, borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
              {v === "users" ? users.length : v === "masterlist" ? masterlist.length : admins.length}
            </span>
          </div>
        ))}
      </div>

      <div style={s.toolbar}>
        <input style={s.searchBar} placeholder="Search by name, ID, email, or organization…" value={search} onChange={e => setSearch(e.target.value)} />
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
          {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>)}
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
                  <th style={s.th}>User</th><th style={s.th}>ID</th><th style={s.th}>Role</th>
                  <th style={s.th}>Department / Organization</th><th style={s.th}>Year</th>
                  <th style={s.th}>Modules</th><th style={s.th}>Badges</th><th style={s.th}>Seminars</th>
                  <th style={s.th}>Status</th><th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => {
                  const initials    = (user.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                  const moduleCount = user.module_progress?.[0]?.count       || 0;
                  const badgeCount  = user.student_badges?.[0]?.count        || 0;
                  const semCount    = user.seminar_registrations?.[0]?.count || 0;
                  const isActive    = user.is_active !== false;
                  const role        = userRoles[user.id] || "unknown";
                  const noEmail     = isPlaceholderEmail(user.email);
                  return (
                    <tr key={user.id} style={{ cursor: "pointer", transition: "background .1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = G.cream}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={s.td} onClick={() => openDetail(user)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={s.avatar}>
                            {user.avatar_url ? <img src={user.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: G.dark, display: "flex", alignItems: "center", gap: 6 }}>
                              {user.full_name || "—"}
                              {user.added_by && (user.claimed_at
                                ? <span title="Registered in the mobile app" style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#dcfce7", borderRadius: 8, padding: "1px 6px" }}>App registered</span>
                                : <span title="Added by an administrator — hasn't registered in the app yet" style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", background: "#eef2ff", borderRadius: 8, padding: "1px 6px" }}>Admin-added</span>)}
                            </div>
                            <div style={{ fontSize: 11, color: "#aaa" }}>{noEmail ? (user.contact_number || "No email on file") : user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={s.td} onClick={() => openDetail(user)}>{user.student_id || "—"}</td>
                      <td style={s.td} onClick={() => openDetail(user)}><RoleBadge role={role} /></td>
                      <td style={s.td} onClick={() => openDetail(user)}>
                        {role === "guest"
                          ? <div>{user.organization || "—"}{user.position && <div style={{ fontSize: 11, color: "#aaa" }}>{user.position}</div>}</div>
                          : <div>{user.department || "—"}{user.position && <div style={{ fontSize: 11, color: "#aaa" }}>{user.position}</div>}</div>}
                      </td>
                      <td style={s.td} onClick={() => openDetail(user)}>{user.year_level ? `Year ${user.year_level}` : "—"}</td>
                      <td style={s.td} onClick={() => openDetail(user)}><span style={{ fontWeight: 700, color: G.base }}><i className="bi bi-book me-1"/>{moduleCount}</span></td>
                      <td style={s.td} onClick={() => openDetail(user)}><span style={{ fontWeight: 700, color: "#f59e0b" }}><i className="bi bi-award me-1"/>{badgeCount}</span></td>
                      <td style={s.td} onClick={() => openDetail(user)}><span style={{ fontWeight: 700, color: "#7c3aed" }}><i className="bi bi-mortarboard me-1"/>{semCount}</span></td>
                      <td style={s.td} onClick={() => openDetail(user)}><span style={s.tag(isActive ? "green" : "red")}>{isActive ? "Active" : "Inactive"}</span></td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ padding: "5px 10px", border: "1px solid #DDE8DD", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600, color: G.dark }} onClick={() => openDetail(user)}>View</button>
                          <button style={{ padding: "5px 10px", border: "none", borderRadius: 6, background: isActive ? "#fee2e2" : "#dcfce7", fontSize: 12, cursor: "pointer", fontWeight: 600, color: isActive ? "#dc2626" : "#16a34a" }} onClick={() => toggleActive(user)}>
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

      {/* ── Masterlist Tab ── */}
      {mainTab === "masterlist" && (() => {
        const registeredEmails = new Set(users.map(u => (u.email || "").toLowerCase()));
        const q = search.toLowerCase();
        const rows = masterlist.filter(m => {
          const matchSearch = !q || [m.full_name, m.cvsu_email, m.organization, m.department, m.student_id]
            .some(v => (v || "").toLowerCase().includes(q));
          const matchRole = roleFilter === "all" || (m.role || "") === roleFilter;
          return matchSearch && matchRole;
        });
        return (
          <div>
            <div style={{ background: G.wash, border: `1px solid ${G.pale}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: G.dark, marginBottom: 14 }}>
              <i className="bi bi-info-circle me-1"/>
              Only people in the masterlist can sign up in the BLOOM app. Use <strong>Add User</strong> to add non-academic staff or guests from outside CvSU.
            </div>
            {loading ? <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading masterlist…</div>
              : rows.length === 0 ? (
                <div style={s.emptyBox}>
                  <div style={{ fontSize: 32, marginBottom: 10, color: G.pale }}><i className="bi bi-card-checklist"/></div>
                  <div style={{ fontWeight: 700, color: G.dark }}>No masterlist entries found</div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={s.table}>
                    <thead><tr>
                      <th style={s.th}>Name</th><th style={s.th}>Email</th><th style={s.th}>Role</th>
                      <th style={s.th}>Department / Organization</th><th style={s.th}>App Status</th><th style={s.th}>Can Sign Up</th>
                    </tr></thead>
                    <tbody>
                      {rows.map(m => {
                        const signedUp = registeredEmails.has((m.cvsu_email || "").toLowerCase());
                        const enabled  = m.is_active !== false;
                        return (
                          <tr key={m.cvsu_email}>
                            <td style={s.td}><div style={{ fontWeight: 600 }}>{m.full_name || "—"}</div>{m.contact_number && <div style={{ fontSize: 11, color: "#aaa" }}>{m.contact_number}</div>}</td>
                            <td style={s.td}>{m.cvsu_email}</td>
                            <td style={s.td}><RoleBadge role={m.role || "unknown"} /></td>
                            <td style={s.td}>{m.role === "guest" ? (m.organization || "—") : (m.department || m.organization || "—")}{m.position && <div style={{ fontSize: 11, color: "#aaa" }}>{m.position}</div>}</td>
                            <td style={s.td}>
                              {signedUp
                                ? <span style={s.tag("green")}><i className="bi bi-phone me-1"/>Signed up</span>
                                : <span style={s.tag("yellow")}>Not yet signed up</span>}
                            </td>
                            <td style={s.td}>
                              <button onClick={() => toggleMasterlistActive(m)}
                                style={{ padding: "5px 10px", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 600,
                                  background: enabled ? "#dcfce7" : "#fee2e2", color: enabled ? "#16a34a" : "#dc2626" }}>
                                {enabled ? "Allowed" : "Blocked"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        );
      })()}

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
                  <th style={s.th}>Administrator</th><th style={s.th}>Email</th>
                  <th style={s.th}>Role</th><th style={s.th}>Status</th><th style={s.th}>Last Active</th>
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
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: a.is_active !== false ? "#dcfce7" : "#fee2e2", color: a.is_active !== false ? "#16a34a" : "#dc2626" }}>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={s.mTitle}>{selected.full_name || "User"}</span>
                    <RoleBadge role={selectedRole} />
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                    {selectedRole === "guest"
                      ? <>{selected.organization || "No organization"}{selected.position && <> · {selected.position}</>}</>
                      : <>
                          {selected.student_id && <>{selected.student_id} · </>}
                          {selected.department || "No department"}
                          {selected.position && <> · {selected.position}</>}
                          {selected.year_level && <> · Year {selected.year_level}</>}
                        </>}
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>
                    {isPlaceholderEmail(selected.email) ? "No email on file" : selected.email}
                    {selected.contact_number && <> · {selected.contact_number}</>}
                    {selected.sex && <> · {sexLabel(selected.sex)}</>}
                  </div>
                </div>
              </div>
              <button style={s.iconBtn()} onClick={() => { setSelected(null); setDetail(null); }}>×</button>
            </div>

            <div style={s.mBody}>
              {selected.is_active === false && (
                <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
                  <i className="bi bi-slash-circle-fill"/>
                  <strong>Account Deactivated</strong> — This user cannot log in. They have been notified to contact an administrator.
                </div>
              )}
              {selected.added_by && (
                selected.claimed_at ? (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#15803d", marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
                    <i className="bi bi-phone"/>
                    Added by an administrator and <strong>registered in the mobile app</strong> on {formatDate(selected.claimed_at)}. They can register for seminars and join meetings themselves.
                  </div>
                ) : (
                  <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#4338ca", marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
                    <i className="bi bi-person-plus"/>
                    <div>
                      Added to the masterlist by an administrator — <strong>not yet registered in the app</strong>.{" "}
                      {isPlaceholderEmail(selected.email)
                        ? <>Add their email with <strong>Edit Profile</strong> so they can register.</>
                        : <>They can register in the app under <strong>"Added by GADRC? Register here"</strong> using <strong>{selected.email}</strong> and their full name.</>}
                      {" "}You can also register them for seminars from the seminar's <strong>Registrations</strong> tab.
                    </div>
                  </div>
                )
              )}

              <RoleAssignPanel user={selected} currentRole={userRoles[selected.id] || "student"} roleIds={roleIds} onRoleChanged={handleRoleChanged} />

              {detailLoading ? (
                <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading profile…</div>
              ) : detail && (
                <>
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

                  <div style={s.secTitle}><i className="bi bi-book me-1"/> Module Progress <span style={{ fontSize: 11, color: "#aaa", fontWeight: 400 }}>({detail.progress.length})</span></div>
                  {detail.progress.length === 0 ? <div style={{ fontSize: 13, color: "#aaa", marginBottom: 12 }}>No modules started yet.</div>
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

                  <div style={s.secTitle}><i className="bi bi-award me-1"/> Badges Earned <span style={{ fontSize: 11, color: "#aaa", fontWeight: 400 }}>({detail.badges.length})</span></div>
                  {detail.badges.length === 0 ? <div style={{ fontSize: 13, color: "#aaa", marginBottom: 12 }}>No badges earned yet.</div>
                    : <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        {detail.badges.map(b => (
                          <div key={b.id} style={{ background: "#fef9c3", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#92400e", border: "1px solid #fde047", display: "flex", alignItems: "center", gap: 6 }}>
                            <i className="bi bi-award me-1"/> {b.badges?.name || "Badge"}
                            <span style={{ fontSize: 10, color: "#aaa", fontWeight: 400 }}>· {formatDate(b.awarded_at)}</span>
                          </div>
                        ))}
                      </div>
                  }

                  <div style={s.secTitle}><i className="bi bi-clipboard-check me-1"/> Assessment Results <span style={{ fontSize: 11, color: "#aaa", fontWeight: 400 }}>({detail.attempts.length})</span></div>
                  {detail.attempts.length === 0 ? <div style={{ fontSize: 13, color: "#aaa", marginBottom: 12 }}>No assessments taken yet.</div>
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

                  <div style={s.secTitle}><i className="bi bi-mortarboard me-1"/> Seminar Registrations <span style={{ fontSize: 11, color: "#aaa", fontWeight: 400 }}>({detail.regs.length})</span></div>
                  {detail.regs.length === 0 ? <div style={{ fontSize: 13, color: "#aaa" }}>No seminar registrations yet.</div>
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
                style={{ padding: "9px 20px", background: G.wash, color: G.dark, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => setEditUser(selected)}>
                <i className="bi bi-pencil"/>Edit Profile
              </button>
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

      {showAdd && <AddUserModal onCreated={handleUserCreated} onClose={() => setShowAdd(false)} />}
      {editUser && <EditProfileModal user={editUser} role={userRoles[editUser.id] || "student"} onSaved={handleProfileSaved} onClose={() => setEditUser(null)} />}
      {confirm && <ConfirmModal title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      {alertModal && <AlertModal title={alertModal.title} message={alertModal.message} onClose={() => setAlertModal(null)} />}
    </div>
  );
}