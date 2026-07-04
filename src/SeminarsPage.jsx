import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase.js";
import { logActivity } from "./lib/activityLog.js";
import { useToast } from "./App.jsx";
import { ConfirmModal } from "./App.jsx";
import { V, FieldError } from "./lib/Validate.jsx";

const G = {
  dark:  "#1A2E1A", mid:   "#2D6A2D", base:  "#3A7A3A",
  light: "#4CAF50", pale:  "#C8E6C9", wash:  "#E8F5E9",
  cream: "#F5F7F5", white: "#FFFFFF",
};

function formatDate(iso) {
  if (!iso) return "—";
  const utcStr = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  return new Date(utcStr).toLocaleString("en-PH", {
    timeZone: "Asia/Manila", month: "short", day: "numeric",
    year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatDateShort(iso) {
  if (!iso) return "—";
  const utcStr = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  return new Date(utcStr).toLocaleString("en-PH", {
    timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric",
  });
}

// Roles eligible to be targeted for a seminar's audience
const TARGET_ROLE_OPTIONS = [
  { value: "student", label: "Students",  icon: "bi-mortarboard"   },
  { value: "teacher",  label: "Teachers",  icon: "bi-person-video3" },
  { value: "faculty",  label: "Faculty",   icon: "bi-person-badge"  },
  { value: "guest",    label: "Guests",    icon: "bi-person"        },
  { value: "speaker",  label: "Speakers",  icon: "bi-mic"           },
];

async function insertSeminarNotification(userId, seminarTitle, seminarId) {
  try {
    await supabase.from("notifications").insert({
      user_id: userId, type: "new_seminar", title: "New Seminar Available",
      body: `"${seminarTitle}" has been published. Check it out and register!`,
      reference_type: "seminar", reference_id: seminarId, is_read: false,
    });
  } catch (e) { console.error("insertSeminarNotification failed:", e); }
}

async function sendRegistrationRemovedNotification(userId, seminarTitle) {
  try {
    await supabase.from("notifications").insert({
      user_id: userId, type: "registration_removed", title: "Registration Removed",
      body: `Your registration for "${seminarTitle}" was removed because the seminar's eligibility criteria changed.`,
      reference_type: "seminar", reference_id: null, is_read: false,
    });
  } catch (e) { console.error("sendRegistrationRemovedNotification failed:", e); }
}

const s = {
  page:         { display: "flex", height: "100vh", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", background: "#F5F7F5", overflow: "hidden" },
  sidebar:      { width: 290, minWidth: 290, background: G.dark, display: "flex", flexDirection: "column", overflow: "hidden" },
  sidebarHdr:   { padding: "20px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  sidebarTitle: { fontSize: 17, fontWeight: 800, color: "#fff", margin: 0 },
  sidebarSub:   { fontSize: 12, color: G.pale, marginTop: 2 },
  list:         { flex: 1, overflowY: "auto", padding: "4px 0" },
  item:        (a) => ({ padding: "11px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderLeft: a ? `3px solid ${G.light}` : "3px solid transparent", background: a ? "rgba(255,255,255,0.1)" : "transparent", transition: "background .15s" }),
  itemIcon:     { width: 36, height: 36, borderRadius: 6, background: G.mid, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, overflow: "hidden" },
  itemTitle:    { fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  itemMeta:     { fontSize: 11, color: G.pale, marginTop: 1 },
  pubBadge:    (p) => ({ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, flexShrink:0, marginLeft:"auto",
    background: p ? "#dcfce7" : "#fef9c3", color: p ? "#16a34a" : "#a16207" }),
  addBtn:       { margin: "12px 16px", padding: "9px 14px", background: G.base, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 },
  searchInput:  { margin: "0 12px 8px", padding: "8px 12px", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, outline: "none", width: "calc(100% - 24px)", boxSizing: "border-box" },
  main:         { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topBar:       { background: "#fff", borderBottom: `1px solid ${G.wash}`, padding: "0 24px", height: 58, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  topTitle:     { fontSize: 17, fontWeight: 700, color: G.dark, flex: 1 },
  tabBar:       { display: "flex", borderBottom: `1px solid ${G.wash}`, background: "#fff", padding: "0 24px", flexShrink: 0 },
  tab:         (a) => ({ padding: "11px 18px", fontSize: 13, fontWeight: 600, color: a ? G.dark : "#999", borderBottom: a ? `2px solid ${G.dark}` : "2px solid transparent", cursor: "pointer", marginBottom: -1 }),
  content:      { flex: 1, overflowY: "auto", padding: 24 },
  card:         { background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #DDE8DD", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", marginBottom: 16 },
  label:        { fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.6 },
  input:        { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark },
  select:       { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark },
  textarea:     { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark, resize: "vertical", minHeight: 80 },
  fg:           { marginBottom: 16 },
  row:          { display: "flex", gap: 12 },
  btnPrimary:   { padding: "9px 20px", background: G.dark, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnSecondary: { padding: "9px 20px", background: G.wash, color: G.dark, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnGreen:     { padding: "8px 16px", background: G.base, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 },
  btnDanger:    { padding: "7px 14px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 },
  iconBtn:     (c) => ({ background: "none", border: "none", cursor: "pointer", color: c || "#999", fontSize: 14, padding: "4px 6px", borderRadius: 6 }),
  tag:         (c) => ({ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: c === "green" ? "#dcfce7" : c === "red" ? "#fee2e2" : c === "yellow" ? "#fef9c3" : c === "blue" ? "#dbeafe" : "#f3f4f6", color: c === "green" ? "#16a34a" : c === "red" ? "#dc2626" : c === "yellow" ? "#92400e" : c === "blue" ? "#1d4ed8" : "#555" }),
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal:       (w) => ({ background: "#fff", borderRadius: 10, width: "100%", maxWidth: w || 560, maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }),
  mHeader:      { padding: "20px 24px 16px", borderBottom: `1px solid ${G.wash}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 },
  mTitle:       { fontSize: 17, fontWeight: 700, color: G.dark },
  mBody:        { padding: "20px 24px" },
  mFooter:      { padding: "16px 24px", borderTop: `1px solid ${G.wash}`, display: "flex", gap: 8, justifyContent: "flex-end", position: "sticky", bottom: 0, background: "#fff" },
  table:        { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:           { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `2px solid ${G.wash}`, background: "#F5F7F5" },
  td:           { padding: "11px 14px", borderBottom: `1px solid ${G.wash}`, color: G.dark, verticalAlign: "middle" },
  statCard:    (c) => ({ flex: 1, minWidth: 100, background: "#fff", borderRadius: 10, padding: "16px 18px", border: "1px solid #DDE8DD", borderTop: `3px solid ${c || G.base}` }),
  statNum:      { fontSize: 28, fontWeight: 900, color: G.dark },
  statLabel:    { fontSize: 12, color: "#888", marginTop: 2 },
  emptyBox:     { background: "#fff", borderRadius: 14, border: `2px dashed ${G.pale}`, padding: "50px 20px", textAlign: "center" },
  coverBox:     { width: "100%", height: 160, borderRadius: 10, background: G.wash, border: `2px dashed ${G.pale}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", marginBottom: 16 },
};

// ── Details Tab ───────────────────────────────────────────────────
function DetailsTab({ seminar, onUpdate }) {
  const toast = useToast();
  const [form, setForm]       = useState({
    ...seminar,
    target_audience:    seminar.target_audience    || "all",
    target_departments: seminar.target_departments  || [],
    target_roles:       seminar.target_roles?.length ? seminar.target_roles : ["student"],
  });
  const [saving, setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState("");
  const [err,   setErr]       = useState({});
  const [departments, setDepartments] = useState([]);
  const coverRef              = useRef();
  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(e => ({ ...e, [k]: null })); };

  // Load distinct departments from profiles for the targeting dropdown
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from("profiles").select("department").not("department", "is", null);
      if (!active) return;
      const unique = [...new Set((data || []).map(p => p.department).filter(Boolean))].sort();
      setDepartments(unique);
    })();
    return () => { active = false; };
  }, []);

  const toggleDept = (dept) => {
    setForm(f => {
      const has = f.target_departments.includes(dept);
      return { ...f, target_departments: has ? f.target_departments.filter(d => d !== dept) : [...f.target_departments, dept] };
    });
  };

  const toggleRole = (role) => {
    setForm(f => {
      const has = f.target_roles.includes(role);
      // Prevent removing the last role — at least one must stay selected
      if (has && f.target_roles.length === 1) return f;
      return { ...f, target_roles: has ? f.target_roles.filter(r => r !== role) : [...f.target_roles, role] };
    });
  };

  const uploadCover = async (file) => {
    setUploading(true);
    const path = `${seminar.id}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("seminar-covers").upload(path, file, { upsert: true });
    if (upErr) { toast("Upload failed: " + upErr.message, "error"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("seminar-covers").getPublicUrl(path);
    setF("cover_image_url", publicUrl);
    setUploading(false);
  };

  const save = async () => {
    const errors = V.all({
      title: V.title(form.title, "Title"),
      venue: form.venue && form.venue.trim().length > 200
        ? "Venue must not exceed 200 characters."
        : null,
    });
    if (errors) { setErr(errors); return; }

    setSaving(true); setError(""); setErr({});

    let scheduledStart = null;
    let scheduledEnd   = null;
    if (form.scheduled_start) scheduledStart = new Date(form.scheduled_start).toISOString();
    if (form.scheduled_end)   scheduledEnd   = new Date(form.scheduled_end).toISOString();
    if (scheduledStart && scheduledEnd && new Date(scheduledEnd) <= new Date(scheduledStart)) {
      setError("End date/time must be after start date/time."); setSaving(false); return;
    }
    if (scheduledStart && !scheduledEnd) {
      const d = new Date(scheduledStart); d.setHours(d.getHours() + 1);
      scheduledEnd = d.toISOString();
    }

    const payload = {
      title:               form.title.trim(),
      description:         form.description?.trim() || null,
      seminar_type:        form.seminar_type || "webinar",
      status:               form.status || "upcoming",
      cover_image_url:      form.cover_image_url || null,
      venue:                form.venue?.trim() || null,
      scheduled_start:      scheduledStart,
      scheduled_end:        scheduledEnd,
      is_public:            form.is_public ?? true,
      target_audience:      form.target_audience || "all",
      target_departments:   form.target_audience === "specific" ? form.target_departments : [],
      target_roles:         form.target_audience === "specific" ? form.target_roles : [],
    };

    const wasPublic = !!seminar.is_public;
    const nowPublic = !!payload.is_public;

    const { error: saveErr } = await supabase.from("seminars").update(payload).eq("id", seminar.id);
    if (saveErr) { setSaving(false); setError(saveErr.message); return; }

    // ── Eligibility recalculation ──────────────────────────────────────
    // If targeting became more restrictive, remove registrations that no
    // longer qualify and notify those students.
    const targetingChanged =
      seminar.target_audience !== payload.target_audience ||
      JSON.stringify((seminar.target_departments||[]).slice().sort()) !== JSON.stringify(payload.target_departments.slice().sort()) ||
      JSON.stringify((seminar.target_roles||[]).slice().sort())       !== JSON.stringify(payload.target_roles.slice().sort());

    if (targetingChanged && payload.target_audience === "specific") {
      const { data: activeRegs } = await supabase
        .from("seminar_registrations")
        .select("id, user_id, profiles(full_name, department, email)")
        .eq("seminar_id", seminar.id)
        .neq("status", "cancelled");

      // Determine each registrant's role from user_roles table
      const userIds = (activeRegs || []).map(r => r.user_id);
      let roleMap = {};
      if (userIds.length > 0) {
        const { data: roleRows } = await supabase
          .from("user_roles").select("user_id, roles(name)").in("user_id", userIds);
        (roleRows || []).forEach(rr => { roleMap[rr.user_id] = rr.roles?.name; });
      }

      const ineligible = (activeRegs || []).filter(r => {
        const role = roleMap[r.user_id] || "student";
        const dept = r.profiles?.department;
        const roleOk = payload.target_roles.includes(role);
        const deptOk = role === "guest" || role === "speaker"
          ? true // guests/speakers aren't department-gated
          : payload.target_departments.length === 0 || payload.target_departments.includes(dept);
        return !(roleOk && deptOk);
      });

      if (ineligible.length > 0) {
        await supabase.from("seminar_registrations")
          .update({ status: "cancelled", removed_reason: "eligibility_changed" })
          .in("id", ineligible.map(r => r.id));
        for (const reg of ineligible) {
          await sendRegistrationRemovedNotification(reg.user_id, payload.title);
        }
        toast(`${ineligible.length} registration(s) removed — no longer eligible under new targeting.`, "warning");
      }
    }

    // ── Notify newly eligible students when seminar becomes public ──────
    if (!wasPublic && nowPublic) {
      let recipientsQuery = supabase.from("profiles").select("id, department").eq("is_active", true);
      const { data: allProfiles } = await recipientsQuery;
      let recipientIds = (allProfiles || []).map(p => p.id);

      if (payload.target_audience === "specific") {
        const { data: roleRows } = await supabase.from("user_roles").select("user_id, roles(name)");
        const roleByUser = {};
        (roleRows || []).forEach(rr => { roleByUser[rr.user_id] = rr.roles?.name; });
        recipientIds = (allProfiles || [])
          .filter(p => {
            const role = roleByUser[p.id] || "student";
            const roleOk = payload.target_roles.includes(role);
            const deptOk = role === "guest" || role === "speaker"
              ? true
              : payload.target_departments.length === 0 || payload.target_departments.includes(p.department);
            return roleOk && deptOk;
          })
          .map(p => p.id);
      }
      for (const uid of recipientIds) {
        await insertSeminarNotification(uid, payload.title, seminar.id);
      }
    }

    setSaving(false);
    toast("Seminar saved successfully!", "success");

    if (wasPublic !== nowPublic) {
      logActivity(nowPublic ? "seminar_published" : "seminar_unpublished", { seminar_id: seminar.id, title: payload.title });
    } else {
      logActivity("seminar_updated", { seminar_id: seminar.id, title: payload.title });
    }

    onUpdate();
  };

  return (
    <div>
      {error && <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {/* Cover image */}
      <div style={s.coverBox} onClick={() => !uploading && coverRef.current?.click()}>
        {form.cover_image_url
          ? <img src={form.cover_image_url} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : uploading
            ? <><div style={{ fontSize: 28 }}>⏳</div><div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>Uploading…</div></>
            : <><i className="bi bi-image" style={{ fontSize: 36, color: G.pale }}/><div style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>Click to upload cover image</div></>
        }
        <input ref={coverRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { if (e.target.files[0]) uploadCover(e.target.files[0]); e.target.value = ""; }} />
      </div>

      <div style={s.card}>
        <div style={s.fg}>
          <label style={s.label}>Title *</label>
          <input style={{ ...s.input, borderColor: err.title ? "#dc2626" : undefined }} value={form.title || ""} onChange={e => setF("title", e.target.value)} />
          <FieldError msg={err.title}/>
        </div>
        <div style={s.fg}>
          <label style={s.label}>Description</label>
          <textarea style={s.textarea} value={form.description || ""} onChange={e => setF("description", e.target.value)} />
        </div>
        <div style={{ ...s.row, flexWrap: "wrap" }}>
          <div style={{ ...s.fg, flex: 1, minWidth: 130 }}>
            <label style={s.label}>Type</label>
            <select style={s.select} value={form.seminar_type || "webinar"} onChange={e => setF("seminar_type", e.target.value)}>
              <option value="webinar">Webinar (Online)</option>
              <option value="in_person">In Person</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div style={{ ...s.fg, flex: 1, minWidth: 130 }}>
            <label style={s.label}>Status</label>
            <select style={s.select} value={form.status || "upcoming"} onChange={e => setF("status", e.target.value)}>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div style={s.row}>
          <div style={{ ...s.fg, flex: 1 }}>
            <label style={s.label}>Start Date & Time</label>
            <input style={s.input} type="datetime-local"
              value={form.scheduled_start ? (() => { try { const d = new Date(form.scheduled_start); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); } catch { return form.scheduled_start.slice(0, 16); } })() : ""}
              onChange={e => setF("scheduled_start", e.target.value)} />
          </div>
          <div style={{ ...s.fg, flex: 1 }}>
            <label style={s.label}>End Date & Time</label>
            <input style={s.input} type="datetime-local"
              value={form.scheduled_end ? (() => { try { const d = new Date(form.scheduled_end); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); } catch { return form.scheduled_end.slice(0, 16); } })() : ""}
              onChange={e => setF("scheduled_end", e.target.value)} />
          </div>
        </div>
        {(form.seminar_type === "in_person" || form.seminar_type === "hybrid") && (
          <div style={s.fg}>
            <label style={s.label}>Venue</label>
            <input style={{ ...s.input, borderColor: err.venue ? "#dc2626" : undefined }} value={form.venue || ""} onChange={e => setF("venue", e.target.value)} placeholder="e.g. CvSU Main Campus, Room 101" />
            <FieldError msg={err.venue}/>
          </div>
        )}

        {/* ── Target Audience ── */}
        <div style={{ ...s.fg, background: G.wash, borderRadius: 10, padding: "16px 18px", border: `1px solid ${G.pale}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: G.dark, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <i className="bi bi-people-fill" style={{ color: G.base }}/>Target Audience
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: form.target_audience === "specific" ? 14 : 0 }}>
            <button onClick={() => setF("target_audience", "all")}
              style={{ flex: 1, padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12,
                border: `2px solid ${form.target_audience === "all" ? G.base : "#DDE8DD"}`,
                background: form.target_audience === "all" ? "#fff" : "transparent",
                color: form.target_audience === "all" ? G.dark : "#888",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <i className="bi bi-globe2"/>All Users
            </button>
            <button onClick={() => setF("target_audience", "specific")}
              style={{ flex: 1, padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12,
                border: `2px solid ${form.target_audience === "specific" ? G.base : "#DDE8DD"}`,
                background: form.target_audience === "specific" ? "#fff" : "transparent",
                color: form.target_audience === "specific" ? G.dark : "#888",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <i className="bi bi-funnel-fill"/>Specific Audience
            </button>
          </div>

          {form.target_audience === "specific" && (
            <>
              {/* Role selection */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Eligible Roles
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {TARGET_ROLE_OPTIONS.map(r => {
                    const active = form.target_roles.includes(r.value);
                    return (
                      <button key={r.value} onClick={() => toggleRole(r.value)}
                        style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                          border: `1.5px solid ${active ? G.base : "#DDE8DD"}`,
                          background: active ? G.base : "#fff", color: active ? "#fff" : "#888",
                          display: "flex", alignItems: "center", gap: 5 }}>
                        <i className={`bi ${r.icon}`}/>{r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Department selection — only relevant for student/teacher/faculty */}
              {form.target_roles.some(r => ["student","teacher","faculty"].includes(r)) && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Eligible Departments <span style={{ fontWeight: 400, textTransform: "none" }}>(leave empty = all departments)</span>
                  </div>
                  {departments.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#aaa", fontStyle: "italic" }}>No departments found in student records yet.</div>
                  ) : (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxHeight: 140, overflowY: "auto" }}>
                      {departments.map(dept => {
                        const active = form.target_departments.includes(dept);
                        return (
                          <button key={dept} onClick={() => toggleDept(dept)}
                            style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                              border: `1.5px solid ${active ? G.base : "#DDE8DD"}`,
                              background: active ? G.wash : "#fff", color: active ? G.dark : "#888" }}>
                            {active && <i className="bi bi-check-lg me-1"/>}{dept}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {form.target_departments.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 11, color: G.base, fontWeight: 600 }}>
                      <i className="bi bi-info-circle me-1"/>
                      Only students from {form.target_departments.length} selected department{form.target_departments.length !== 1 ? "s" : ""} will see this seminar.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {form.target_audience === "all" && (
            <div style={{ fontSize: 12, color: "#888" }}>
              <i className="bi bi-info-circle me-1"/>This seminar is visible to all active users regardless of role or department.
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, color: G.dark }}>
            <input type="checkbox" checked={!!form.is_public} onChange={e => setF("is_public", e.target.checked)} style={{ width: 16, height: 16, accentColor: G.base }} />
            Visible to students in app
          </label>
          <button style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Seminar"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Attendees Tab — eligible audience + registration status ────────
function AttendeesTab({ seminar }) {
  const [eligible, setEligible] = useState([]);
  const [regMap,   setRegMap]   = useState({}); // userId -> registration row
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all"); // all | registered | not_registered

  const load = async () => {
    setLoading(true);

    // Determine eligible profiles based on seminar targeting
    let profilesQuery = supabase.from("profiles").select("id, full_name, email, department, year_level, student_id").eq("is_active", true);
    const { data: allProfiles } = await profilesQuery;

    let eligibleProfiles = allProfiles || [];

    if (seminar.target_audience === "specific") {
      const { data: roleRows } = await supabase.from("user_roles").select("user_id, roles(name)");
      const roleByUser = {};
      (roleRows || []).forEach(rr => { roleByUser[rr.user_id] = rr.roles?.name; });

      const targetRoles = seminar.target_roles?.length ? seminar.target_roles : ["student"];
      const targetDepts = seminar.target_departments || [];

      eligibleProfiles = (allProfiles || []).filter(p => {
        const role = roleByUser[p.id] || "student";
        const roleOk = targetRoles.includes(role);
        const deptOk = role === "guest" || role === "speaker"
          ? true
          : targetDepts.length === 0 || targetDepts.includes(p.department);
        return roleOk && deptOk;
      });
    }

    // Load registrations for this seminar to cross-reference
    const { data: regs } = await supabase
      .from("seminar_registrations")
      .select("*")
      .eq("seminar_id", seminar.id);

    const map = {};
    (regs || []).forEach(r => { map[r.user_id] = r; });

    setEligible(eligibleProfiles);
    setRegMap(map);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [seminar.id, seminar.target_audience, JSON.stringify(seminar.target_departments), JSON.stringify(seminar.target_roles)]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading eligible attendees…</div>;

  const registeredCount = eligible.filter(p => regMap[p.id] && regMap[p.id].status !== "cancelled").length;
  const notRegisteredCount = eligible.length - registeredCount;

  const filtered = eligible.filter(p => {
    const reg = regMap[p.id];
    const isRegistered = reg && reg.status !== "cancelled";
    const matchSearch = !search ||
      (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" ? true : filter === "registered" ? isRegistered : !isRegistered;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      {/* Targeting summary banner */}
      <div style={{ background: G.wash, border: `1px solid ${G.pale}`, borderRadius: 10, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "flex-start", gap: 10 }}>
        <i className="bi bi-people-fill" style={{ color: G.base, fontSize: 16, marginTop: 1 }}/>
        <div style={{ fontSize: 13, color: G.dark }}>
          {seminar.target_audience === "specific" ? (
            <>
              <strong>Targeted audience:</strong>{" "}
              {(seminar.target_roles?.length ? seminar.target_roles : ["student"]).map(r => TARGET_ROLE_OPTIONS.find(o=>o.value===r)?.label || r).join(", ")}
              {seminar.target_departments?.length > 0 && (
                <> from <strong>{seminar.target_departments.join(", ")}</strong></>
              )}
              {(!seminar.target_departments || seminar.target_departments.length === 0) && (
                <> from <strong>all departments</strong></>
              )}
            </>
          ) : (
            <><strong>Open to all users</strong> — no role or department restrictions.</>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={s.statCard(G.base)}>
          <div style={{ ...s.statNum, color: G.base, fontSize: 22 }}>{eligible.length}</div>
          <div style={s.statLabel}>Eligible</div>
        </div>
        <div style={s.statCard("#16a34a")}>
          <div style={{ ...s.statNum, color: "#16a34a", fontSize: 22 }}>{registeredCount}</div>
          <div style={s.statLabel}>Registered</div>
        </div>
        <div style={s.statCard("#a16207")}>
          <div style={{ ...s.statNum, color: "#a16207", fontSize: 22 }}>{notRegisteredCount}</div>
          <div style={s.statLabel}>Not Yet Registered</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
          style={{ ...s.input, maxWidth: 280 }} />
        {[["all","All"],["registered","Registered"],["not_registered","Not Registered"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${filter===v?G.base:"#DDE8DD"}`, background: filter===v?G.wash:"#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: filter===v?G.dark:"#888" }}>
            {l}
          </button>
        ))}
      </div>

      {eligible.length === 0 ? (
        <div style={s.emptyBox}>
          <i className="bi bi-person-x d-block mb-2" style={{ fontSize: 40, color: G.pale }}/>
          <div style={{ fontWeight: 700, color: G.dark, marginBottom: 6 }}>No eligible users found</div>
          <div style={{ fontSize: 13, color: "#aaa" }}>
            {seminar.target_audience === "specific"
              ? "No active users match the current targeting criteria. Adjust the target audience in the Details tab."
              : "No active users exist in the system yet."}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>No results match your search/filter.</div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #DDE8DD", overflow: "hidden" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Name</th>
                <th style={s.th}>Department</th>
                <th style={s.th}>Email</th>
                <th style={s.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const reg = regMap[p.id];
                const isRegistered = reg && reg.status !== "cancelled";
                const wasRemoved = reg && reg.status === "cancelled" && reg.removed_reason === "eligibility_changed";
                return (
                  <tr key={p.id}>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600, color: G.dark }}>{p.full_name || "—"}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>{p.student_id || "—"}</div>
                    </td>
                    <td style={s.td}>{p.department || "—"}{p.year_level ? ` · Yr ${p.year_level}` : ""}</td>
                    <td style={s.td}>{p.email}</td>
                    <td style={s.td}>
                      {isRegistered ? (
                        <span style={s.tag("green")}><i className="bi bi-check-circle-fill me-1"/>Registered</span>
                      ) : wasRemoved ? (
                        <span style={s.tag("red")}><i className="bi bi-x-circle-fill me-1"/>Removed (ineligible)</span>
                      ) : (
                        <span style={s.tag("yellow")}>Not Registered</span>
                      )}
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
}

// ── Registrations Tab ─────────────────────────────────────────────
const SEMINAR_ROLES = [
  { value: "student",       label: "Student",       color: "blue"   },
  { value: "guest",         label: "Guest",         color: "yellow" },
  { value: "guest_speaker", label: "Guest Speaker", color: "green"  },
  { value: "host",          label: "Host",          color: "green"  },
  { value: "staff",         label: "Staff",         color: "blue"   },
];

function roleColor(role) { return SEMINAR_ROLES.find(r => r.value === role)?.color || "blue"; }
function roleLabel(role) { return SEMINAR_ROLES.find(r => r.value === role)?.label || role || "Student"; }

function RegistrationsTab({ seminar }) {
  const [regs, setRegs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("seminar_registrations")
      .select("*, profiles(full_name, student_id, email, department, year_level)")
      .eq("seminar_id", seminar.id)
      .order("registered_at", { ascending: false });
    setRegs(data || []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [seminar.id]);

  const updateRole = async (id, role) => {
    await supabase.from("seminar_registrations").update({ role, status: "registered" }).eq("id", id);
    setRegs(r => r.map(x => x.id === id ? { ...x, role, status: "registered" } : x));
    logActivity("seminar_registration_role_changed", { seminar_id: seminar.id, registration_id: id, new_role: role });
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading…</div>;

  const active   = regs.filter(r => r.status !== "cancelled");
  const filtered = regs.filter(r => {
    const matchSearch = !search || (r.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase()) || (r.profiles?.email || "").toLowerCase().includes(search.toLowerCase());
    const matchRole   = roleFilter === "all" || (r.role || "student") === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCounts = SEMINAR_ROLES.reduce((acc, r) => {
    acc[r.value] = regs.filter(x => (x.role || "student") === r.value).length;
    return acc;
  }, {});

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total",     value: regs.length,                                    color: G.base    },
          { label: "Active",    value: active.length,                                  color: "#16a34a" },
          { label: "Cancelled", value: regs.filter(r => r.status === "cancelled").length, color: "#dc2626" },
        ].map(stat => (
          <div key={stat.label} style={s.statCard(stat.color)}>
            <div style={{ ...s.statNum, color: stat.color, fontSize: 22 }}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Role breakdown pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setRoleFilter("all")}
          style={{ padding: "4px 12px", borderRadius: 20, border: `1.5px solid ${roleFilter==="all"?"#2D6A2D":"#DDE8DD"}`, background: roleFilter==="all"?"#E8F5E9":"#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: roleFilter==="all"?"#2D6A2D":"#555" }}>
          All ({regs.length})
        </button>
        {SEMINAR_ROLES.map(r => (
          <button key={r.value} onClick={() => setRoleFilter(r.value)}
            style={{ padding: "4px 12px", borderRadius: 20, border: `1.5px solid ${roleFilter===r.value?"#2D6A2D":"#DDE8DD"}`, background: roleFilter===r.value?"#E8F5E9":"#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: roleFilter===r.value?"#2D6A2D":"#555" }}>
            {r.label} ({roleCounts[r.value] || 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
          style={{ ...s.input, maxWidth: 300 }} />
      </div>

      {regs.length === 0 ? (
        <div style={s.emptyBox}>
          <i className="bi bi-people d-block mb-2" style={{ fontSize: 40, color: G.pale }} />
          <div style={{ fontWeight: 700, color: G.dark, marginBottom: 6 }}>No registrations yet</div>
          <div style={{ fontSize: 13, color: "#aaa" }}>Participants who register from the app will appear here.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>No results match your filter.</div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #DDE8DD", overflow: "hidden" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Participant</th>
                <th style={s.th}>Department</th>
                <th style={s.th}>Registered</th>
                <th style={s.th}>Role</th>
                <th style={s.th}>Change Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const currentRole = r.role || "student";
                return (
                  <tr key={r.id}>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600, color: G.dark }}>{r.profiles?.full_name || "—"}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>{r.profiles?.student_id} · {r.profiles?.email}</div>
                    </td>
                    <td style={s.td}>{r.profiles?.department || "—"} · Yr {r.profiles?.year_level || "—"}</td>
                    <td style={{ ...s.td, fontSize: 12 }}>{formatDate(r.registered_at)}</td>
                    <td style={s.td}><span style={s.tag(roleColor(currentRole))}>{roleLabel(currentRole)}</span></td>
                    <td style={s.td}>
                      <select value={currentRole} onChange={e => updateRole(r.id, e.target.value)}
                        style={{ padding: "6px 10px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 12, outline: "none", cursor: "pointer", background: "#fff" }}>
                        {SEMINAR_ROLES.map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
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
}

// ── Evaluation Fields ─────────────────────────────────────────────
const EVAL_FIELDS = [
  { key: "q_content",      label: "Content Quality",       desc: "Relevance and accuracy of the seminar content" },
  { key: "q_speaker",      label: "Speaker Effectiveness", desc: "Clarity, knowledge, and delivery of the speaker(s)" },
  { key: "q_organization", label: "Event Organization",    desc: "Logistics, time management, and flow of the event" },
  { key: "q_relevance",    label: "Relevance to GAD",      desc: "How relevant was this activity to gender and development?" },
  { key: "q_materials",    label: "Materials & Resources", desc: "Quality of presentation materials and handouts" },
  { key: "q_overall",      label: "Overall Satisfaction",  desc: "Your overall experience with this seminar" },
];

function StarRating({ value }) {
  const stars = Math.round(value || 0);
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <i key={i} className={`bi bi-star${i<=stars?"-fill":""}`}
          style={{ color: i<=stars?"#f59e0b":"#e5e7eb", fontSize: 14, marginRight: 2 }} />
      ))}
      <span style={{ fontSize: 12, color: "#888", marginLeft: 4 }}>({value?.toFixed(1)||"—"})</span>
    </span>
  );
}

function EvaluationsTab({ seminar }) {
  const [evals, setEvals]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("seminar_evaluations")
      .select("*, profiles(full_name, student_id, email)")
      .eq("seminar_id", seminar.id)
      .order("submitted_at", { ascending: false });
    setEvals(data || []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [seminar.id]);

  const avg = (key) => {
    const vals = evals.map(e => e[key]).filter(v => v != null);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
  };
  const overallAvg = evals.length > 0
    ? (EVAL_FIELDS.map(f => parseFloat(avg(f.key))||0).reduce((a,b)=>a+b,0)/EVAL_FIELDS.length).toFixed(1)
    : "—";

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading…</div>;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={s.statCard(G.base)}>
          <div style={{ ...s.statNum, color: G.base }}>{evals.length}</div>
          <div style={s.statLabel}>Responses</div>
        </div>
        <div style={s.statCard("#f59e0b")}>
          <div style={{ ...s.statNum, color: "#f59e0b", fontSize: 22 }}>
            <i className="bi bi-star-fill me-1" style={{ fontSize: 18 }}/>{overallAvg}
          </div>
          <div style={s.statLabel}>Overall Average</div>
        </div>
      </div>

      {evals.length === 0 ? (
        <div style={s.emptyBox}>
          <i className="bi bi-clipboard-data d-block mb-2" style={{ fontSize: 40, color: G.pale }}/>
          <div style={{ fontWeight: 700, color: G.dark, marginBottom: 6 }}>No evaluations submitted yet</div>
          <div style={{ fontSize: 13, color: "#aaa" }}>Evaluation forms submitted by participants will appear here.</div>
        </div>
      ) : (
        <>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #DDE8DD", padding: "20px 24px", marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: G.dark, fontSize: 14, marginBottom: 14 }}>
              <i className="bi bi-bar-chart-line me-2" style={{ color: G.base }}/>Evaluation Summary
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {EVAL_FIELDS.map(f => {
                const val = parseFloat(avg(f.key)) || 0;
                const pct = (val / 5) * 100;
                return (
                  <div key={f.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: G.dark }}>{f.label}</span>
                      <StarRating value={val}/>
                    </div>
                    <div style={{ background: "#E8F5E9", borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${pct}%`, height: 6, borderRadius: 4, background: G.base, transition: "width .5s" }}/>
                    </div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{f.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ fontWeight: 700, color: G.dark, fontSize: 14, marginBottom: 12 }}>
            <i className="bi bi-person-lines-fill me-2" style={{ color: G.base }}/>Individual Responses
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {evals.map(e => (
              <div key={e.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #DDE8DD", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#F9FBF9", borderBottom: "1px solid #DDE8DD", cursor: "pointer" }}
                  onClick={() => setSelected(selected?.id === e.id ? null : e)}>
                  <div>
                    <div style={{ fontWeight: 600, color: G.dark }}>{e.profiles?.full_name || "Anonymous"}</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>{e.profiles?.student_id} · {formatDate(e.submitted_at)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <StarRating value={parseFloat(avg("q_overall")) || e.q_overall || 0}/>
                    <i className={`bi bi-chevron-${selected?.id===e.id?"up":"down"}`} style={{ color: "#aaa" }}/>
                  </div>
                </div>
                {selected?.id === e.id && (
                  <div style={{ padding: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 12 }}>
                      {EVAL_FIELDS.map(f => (
                        <div key={f.key} style={{ background: "#F5F7F5", borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{f.label}</div>
                          <StarRating value={e[f.key]}/>
                        </div>
                      ))}
                    </div>
                    {e.comments && (
                      <div style={{ background: G.wash, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: G.dark, lineHeight: 1.6 }}>
                        <i className="bi bi-chat-quote me-2" style={{ color: G.base }}/>
                        {e.comments}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Jitsi Meeting Modal ───────────────────────────────────────────
const JitsiMeetingModal = React.memo(function JitsiMeetingModal({ seminar, onClose }) {
  const roomName = `bloom-gad-${seminar.id}`;
  const jitsiUrl = `https://meet.jit.si/${roomName}`;
  const [copied, setCopied] = useState(false);

  const iframeSrc = useRef(
    `${jitsiUrl}#userInfo.displayName="GADRC Admin (Moderator)"&config.startWithVideoMuted=false&config.startWithAudioMuted=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","closedcaptions","desktop","fullscreen","fodeviceselection","hangup","chat","recording","livestreaming","raisehand","videoquality","filmstrip","tileview","participants-pane","shortcuts","mute-everyone","security"]`
  ).current;

  const copyLink = () => {
    navigator.clipboard.writeText(jitsiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#1A2E1A", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-camera-video-fill" style={{ color: "#4CAF50", fontSize: 16 }}/>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {seminar.title}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              Live on meet.jit.si · Room: {roomName}
            </div>
          </div>
        </div>
        <button onClick={copyLink}
          style={{ padding: "7px 14px", background: copied ? "#16a34a" : "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, transition: "background .2s" }}>
          <i className={`bi bi-${copied ? "check-circle-fill" : "link-45deg"}`}/>
          {copied ? "Copied!" : "Copy Join Link"}
        </button>
        <a href={jitsiUrl} target="_blank" rel="noreferrer"
          style={{ padding: "7px 14px", background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
          <i className="bi bi-box-arrow-up-right"/> Open in Tab
        </a>
        <button onClick={onClose}
          style={{ padding: "7px 14px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <i className="bi bi-x-circle"/> End & Close
        </button>
      </div>
      <div style={{ background: "#0f1f0f", padding: "8px 20px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
          <i className="bi bi-info-circle"/>
          Share this link with students so they can join:
        </div>
        <code style={{ fontSize: 12, color: "#4CAF50", background: "rgba(255,255,255,0.06)", padding: "3px 10px", borderRadius: 4 }}>
          {jitsiUrl}
        </code>
      </div>
      <iframe
        key={roomName}
        src={iframeSrc}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        style={{ flex: 1, border: "none", width: "100%" }}
        title="Jitsi Meeting"
      />
    </div>
  );
}, (prevProps, nextProps) => prevProps.seminar.id === nextProps.seminar.id);

// ── Main Page ─────────────────────────────────────────────────────
export default function SeminarsPage() {
  const [seminars, setSeminars]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [tab, setTab]             = useState("details");
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [addForm, setAddForm]     = useState({});
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError]   = useState("");
  const [confirm, setConfirm]     = useState(null);
  const [jitsiRoom, setJitsiRoom] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("seminars")
        .select("*, seminar_registrations(count)")
        .order("created_at", { ascending: false });
      if (error) console.error("Seminars load error:", error.message);
      if (active) { setSeminars(data || []); if (data?.length) setSelected(data[0]); setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const reload = async () => {
    const { data } = await supabase.from("seminars").select("*, seminar_registrations(count)").order("created_at", { ascending: false });
    setSeminars(data || []);
    if (selected) setSelected(data?.find(s => s.id === selected.id) || data?.[0] || null);
  };

  const createSeminar = async () => {
    if (!addForm.title?.trim()) { setAddError("Title is required — must be at least 3 characters."); return; }
    if (addForm.title.trim().length < 3)   { setAddError("Title must be at least 3 characters."); return; }
    if (addForm.title.trim().length > 150) { setAddError("Title must not exceed 150 characters."); return; }
    setAddSaving(true); setAddError("");
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: err } = await supabase.from("seminars").insert({
      title: addForm.title.trim(),
      seminar_type: addForm.seminar_type || "webinar",
      status: "upcoming", is_public: true, created_by: user?.id,
      target_audience: "all", target_departments: [], target_roles: [],
    }).select("*, seminar_registrations(count)").single();
    setAddSaving(false);
    if (err) { setAddError(err.message); return; }
    setSeminars(s => [data, ...s]);
    setSelected(data); setTab("details");
    setShowAdd(false); setAddForm({});
    logActivity("seminar_created", { seminar_id: data.id, title: data.title });
  };

  const deleteSeminar = async () => {
    setConfirm({
      title: "Delete Seminar",
      message: `Delete "${selected?.title}"? All registrations and evaluations will be removed.`,
      confirmLabel: "Delete", danger: true,
      onConfirm: async () => {
        await supabase.from("seminars").delete().eq("id", selected.id);
        logActivity("seminar_deleted", { seminar_id: selected.id, title: selected.title });
        const rest = seminars.filter(s => s.id !== selected.id);
        setSeminars(rest); setSelected(rest[0] || null);
        setConfirm(null);
      }
    });
  };

  const statusColor = (s) => s === "ongoing" ? "green" : s === "completed" ? "blue" : s === "cancelled" ? "red" : "yellow";
  const regCount    = (s) => s?.seminar_registrations?.[0]?.count || 0;
  const filtered    = seminars.filter(s => (s.title || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={s.page}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={s.sidebarHdr}>
          <div style={s.sidebarTitle}><i className="bi bi-mortarboard me-1"/> Seminars</div>
          <div style={s.sidebarSub}>{seminars.length} total</div>
        </div>
        <button style={s.addBtn} onClick={() => { setAddForm({ seminar_type: "webinar" }); setAddError(""); setShowAdd(true); }}>
          ＋ New Seminar
        </button>
        <input style={s.searchInput} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        <div style={s.list}>
          {loading
            ? <div style={{ padding: "20px 16px", color: G.pale, fontSize: 13 }}>Loading…</div>
            : filtered.length === 0
              ? <div style={{ padding: "20px 16px", color: G.pale, fontSize: 13 }}>No seminars found</div>
              : filtered.map(sem => (
                <div key={sem.id} style={s.item(selected?.id === sem.id)} onClick={() => { setSelected(sem); setTab("details"); }}>
                  <div style={s.itemIcon}>
                    {sem.cover_image_url && <img src={sem.cover_image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.itemTitle}>{sem.title}</div>
                    <div style={s.itemMeta}>{formatDateShort(sem.scheduled_start)} · {regCount(sem)} registered</div>
                  </div>
                  <div style={s.pubBadge(sem.is_public)}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: sem.is_public ? "#16a34a" : "#a16207", display: "inline-block" }}/>
                    {sem.is_public ? "Public" : "Private"}
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      {/* Main */}
      <div style={s.main}>
        {!selected ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12, color: "#aaa" }}>
            <i className="bi bi-mortarboard" style={{ fontSize: 52, color: G.pale }}/>
            <span style={{ fontWeight: 700, color: G.dark, fontSize: 16 }}>Select a seminar or create a new one</span>
          </div>
        ) : (
          <>
            <div style={s.topBar}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.topTitle}>{selected.title}</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>
                  {selected.seminar_type} · {formatDate(selected.scheduled_start)} · {regCount(selected)} registered
                </div>
              </div>
              <span style={s.tag(statusColor(selected.status))}>{selected.status || "upcoming"}</span>
              <span style={s.tag(selected.is_public ? "green" : "yellow")}>{selected.is_public ? "Public" : "Private"}</span>
              {(selected.seminar_type === "webinar" || selected.seminar_type === "hybrid") && selected.status !== "cancelled" && selected.status !== "completed" && (
                <button onClick={() => setJitsiRoom(selected)}
                  style={{ padding: "7px 14px", background: "linear-gradient(135deg,#1A2E1A,#2D6A2D)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <i className="bi bi-camera-video-fill"/> Start Meeting
                </button>
              )}
              <button style={s.btnDanger} onClick={deleteSeminar}><i className="bi bi-trash me-1"/> Delete</button>
            </div>
            <div style={s.tabBar}>
              {[["details", "Details"], ["attendees", "Attendees"], ["registrations", "Registrations"], ["evaluations", "Evaluations"]].map(([v, l]) => (
                <div key={v} style={s.tab(tab === v)} onClick={() => setTab(v)}>{l}</div>
              ))}
            </div>
            <div style={s.content}>
              {tab === "details"       && <DetailsTab       key={selected.id + "_d"} seminar={selected} onUpdate={reload} />}
              {tab === "attendees"     && <AttendeesTab     key={selected.id + "_a"} seminar={selected} />}
              {tab === "registrations" && <RegistrationsTab key={selected.id + "_r"} seminar={selected} />}
              {tab === "evaluations"   && <EvaluationsTab   key={selected.id + "_e"} seminar={selected} />}
            </div>
          </>
        )}
      </div>

      {confirm && <ConfirmModal title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}/>}

      {jitsiRoom && <JitsiMeetingModal seminar={jitsiRoom} onClose={() => setJitsiRoom(null)}/>}

      {/* Create Modal */}
      {showAdd && (
        <div style={s.overlay}>
          <div style={s.modal(480)}>
            <div style={s.mHeader}>
              <span style={s.mTitle}>Create New Seminar</span>
              <button style={s.iconBtn()} onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div style={s.mBody}>
              {addError && <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{addError}</div>}
              <div style={s.fg}>
                <label style={s.label}>Title * <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>({(addForm.title||"").length}/150)</span></label>
                <input style={{ ...s.input, borderColor: addError && !addForm.title?.trim() ? "#dc2626" : undefined }}
                  value={addForm.title || ""} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Gender Sensitivity Seminar" autoFocus />
              </div>
              <div style={s.fg}>
                <label style={s.label}>Type</label>
                <select style={s.select} value={addForm.seminar_type || "webinar"} onChange={e => setAddForm(f => ({ ...f, seminar_type: e.target.value }))}>
                  <option value="webinar">Webinar (Online)</option>
                  <option value="in_person">In Person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div style={{ background: G.wash, borderRadius: 6, padding: "10px 14px", fontSize: 12, color: G.dark }}>
                <i className="bi bi-lightbulb me-1"/> Fill in the full details (date, venue) after creating.
              </div>
            </div>
            <div style={s.mFooter}>
              <button style={s.btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
              <button style={{ ...s.btnPrimary, opacity: addSaving ? 0.7 : 1 }} onClick={createSeminar} disabled={addSaving}>
                {addSaving ? "Creating…" : "Create Seminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}