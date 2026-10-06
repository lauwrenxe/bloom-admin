import React, { useState, useEffect, useRef, useCallback, startTransition } from "react";
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
  { value: "student", label: "Students", icon: "bi-mortarboard"   },
  { value: "teacher", label: "Teachers", icon: "bi-person-video3" },
  { value: "faculty", label: "Faculty",  icon: "bi-person-badge"  },
  { value: "staff",   label: "Non-Academic Staff", icon: "bi-person-workspace" },
  { value: "guest",   label: "Guests (Non-CvSU)",  icon: "bi-globe2"  },
  { value: "speaker", label: "Speakers", icon: "bi-mic"           },
];

// ── Certificate eligibility rule ──────────────────────────────────
// A participant must attend at least 80% of the ACTUAL meeting time
// (measured from when the admin started the meeting, not the scheduled time).
const ELIGIBILITY_RATIO = 0.8;
const requiredMinutes = (meetingMins) => Math.max(1, Math.floor((meetingMins || 0) * ELIGIBILITY_RATIO));

// Remembers when the admin started a meeting, so re-opening the page
// (e.g. after an accidental refresh) keeps the original start time.
const meetingStartKey = (id) => `bloom_meeting_started_${id}`;
function readMeetingStart(id) {
  try { return localStorage.getItem(meetingStartKey(id)); } catch { return null; }
}
function writeMeetingStart(id, iso) {
  try { localStorage.setItem(meetingStartKey(id), iso); } catch { /* storage unavailable */ }
}
function clearMeetingStart(id) {
  try { localStorage.removeItem(meetingStartKey(id)); } catch { /* storage unavailable */ }
}

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
  select:       { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark, colorScheme: "light" },
  smallSelect:  { padding: "6px 10px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 12, outline: "none", cursor: "pointer", background: "#fff", color: G.dark, colorScheme: "light" },
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
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState("");
  const [err,   setErr]       = useState({});
  const [departments, setDepartments] = useState([]);
  const coverRef              = useRef();
  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(e => ({ ...e, [k]: null })); };

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
      title:                form.title.trim(),
      description:          form.description?.trim() || null,
      seminar_type:         form.seminar_type || "webinar",
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

    // Manually closing a seminar here also clears any remembered meeting start time
    if (payload.status === "completed" || payload.status === "cancelled") clearMeetingStart(seminar.id);

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
        const deptOk = payload.target_departments.length === 0 || payload.target_departments.includes(dept);
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

    if (!wasPublic && nowPublic) {
      const { data: allProfiles } = await supabase.from("profiles").select("id, department").eq("is_active", true);
      let recipientIds = (allProfiles || []).map(p => p.id);

      if (payload.target_audience === "specific") {
        const { data: roleRows } = await supabase.from("user_roles").select("user_id, roles(name)");
        const roleByUser = {};
        (roleRows || []).forEach(rr => { roleByUser[rr.user_id] = rr.roles?.name; });
        recipientIds = (allProfiles || [])
          .filter(p => {
            const role = roleByUser[p.id] || "student";
            const roleOk = payload.target_roles.includes(role);
            const deptOk = payload.target_departments.length === 0 || payload.target_departments.includes(p.department);
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
            {form.status === "ongoing" && seminar.status !== "ongoing" && (
              <div style={{ fontSize: 11, color: "#a16207", marginTop: 4 }}>
                <i className="bi bi-info-circle me-1"/>Tip: use <strong>Start Meeting</strong> at the top instead, so attendance is tracked.
              </div>
            )}
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
                    Only users from {form.target_departments.length} selected department{form.target_departments.length !== 1 ? "s" : ""} will see this seminar.
                  </div>
                )}
              </div>
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

// ── Attendees Tab ────────────────────────────────────────────────
function AttendeesTab({ seminar }) {
  const [eligible, setEligible] = useState([]);
  const [regMap,   setRegMap]   = useState({});
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");

  const load = async () => {
    setLoading(true);

    const { data: allProfiles } = await supabase.from("profiles").select("id, full_name, email, department, year_level, student_id").eq("is_active", true);

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
        const deptOk = targetDepts.length === 0 || targetDepts.includes(p.department);
        return roleOk && deptOk;
      });
    }

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

// Seminar role to give someone, based on their account role
const SEMINAR_ROLE_FOR_ACCOUNT = { guest: "guest", staff: "staff", speaker: "guest_speaker" };
const ACCOUNT_ROLE_LABEL = {
  student: "Student", teacher: "Teacher", faculty: "Faculty", staff: "Non-Academic Staff",
  guest: "Guest (Non-CvSU)", speaker: "Speaker",
};

// ── Add Participants Modal (for people who can't register through the app) ──
function AddParticipantsModal({ seminar, existingRegs, onAdded, onClose }) {
  const toast = useToast();
  const [people,   setPeople]   = useState([]);
  const [roles,    setRoles]    = useState({});
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [picked,   setPicked]   = useState([]);
  const [saving,   setSaving]   = useState(false);

  const activeIds = new Set(existingRegs.filter(r => r.status !== "cancelled").map(r => r.user_id));

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: profs }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, student_id, department, organization, position").eq("is_active", true).order("full_name"),
        supabase.from("user_roles").select("user_id, roles(name)"),
      ]);
      if (!active) return;
      const map = {};
      (roleRows || []).forEach(r => { if (r.user_id && r.roles?.name) map[r.user_id] = r.roles.name; });
      setRoles(map);
      setPeople((profs || []).filter(p => map[p.id] !== "admin" && map[p.id] !== "super_admin"));
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const q = search.toLowerCase();
  const list = people.filter(p => !activeIds.has(p.id)).filter(p => {
    const role = roles[p.id] || "student";
    const matchType = typeFilter === "all" || role === typeFilter;
    const matchSearch = !q || [p.full_name, p.email, p.student_id, p.organization, p.department]
      .some(v => (v || "").toLowerCase().includes(q));
    return matchType && matchSearch;
  });

  const toggle = (id) => setPicked(ps => ps.includes(id) ? ps.filter(x => x !== id) : [...ps, id]);

  const save = async () => {
    if (picked.length === 0) return;
    setSaving(true);
    const now = new Date().toISOString();
    const cancelledByUser = {};
    existingRegs.filter(r => r.status === "cancelled").forEach(r => { cancelledByUser[r.user_id] = r; });

    let added = 0, failed = 0;
    for (const uid of picked) {
      const seminarRole = SEMINAR_ROLE_FOR_ACCOUNT[roles[uid]] || "student";
      const prev = cancelledByUser[uid];
      const { error } = prev
        ? await supabase.from("seminar_registrations")
            .update({ status: "registered", role: seminarRole, removed_reason: null, registered_at: now })
            .eq("id", prev.id)
        : await supabase.from("seminar_registrations")
            .insert({ seminar_id: seminar.id, user_id: uid, status: "registered", role: seminarRole, registered_at: now });
      if (error) { failed++; console.error("Add participant failed:", error.message); } else { added++; }
    }
    setSaving(false);
    if (added > 0) {
      toast(`${added} participant(s) registered${failed ? `, ${failed} failed` : ""}.`, failed ? "warning" : "success");
      logActivity("seminar_participants_added_by_admin", { seminar_id: seminar.id, count: added });
      onAdded();
    } else {
      toast("Could not register the selected participants.", "error");
    }
  };

  return (
    <div style={{ ...s.overlay, zIndex: 1100 }}>
      <div style={s.modal(560)}>
        <div style={s.mHeader}>
          <span style={s.mTitle}><i className="bi bi-person-plus me-2"/>Add Participants</span>
          <button style={s.iconBtn()} onClick={onClose}><i className="bi bi-x-lg"/></button>
        </div>
        <div style={s.mBody}>
          <div style={{ background: G.wash, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: G.dark, marginBottom: 14, lineHeight: 1.5 }}>
            <i className="bi bi-info-circle me-1"/>
            Register people who can't use the app, such as non-academic staff and guests from outside CvSU.
            Not in the list? Add them first in <strong>Users → Add User</strong>.
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <input style={{ ...s.input, flex: "1 1 220px" }} placeholder="Search name, email, organization…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
            <select style={{ ...s.select, width: "auto", flex: "0 0 auto" }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              {Object.entries(ACCOUNT_ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid #DDE8DD", borderRadius: 6 }}>
            {loading ? <div style={{ padding: 20, textAlign: "center", color: "#aaa", fontSize: 13 }}>Loading masterlist…</div>
              : list.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: "#aaa", fontSize: 13 }}>No one to add. Everyone matching is already registered.</div>
              : list.map(p => {
                  const role = roles[p.id] || "student";
                  const checked = picked.includes(p.id);
                  const sub = role === "guest"
                    ? [p.organization, p.position].filter(Boolean).join(" · ")
                    : [p.student_id, p.department, p.position].filter(Boolean).join(" · ");
                  return (
                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${G.wash}`, background: checked ? G.wash : "transparent" }}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} style={{ width: 15, height: 15, accentColor: G.base, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: G.dark }}>{p.full_name}</div>
                        <div style={{ fontSize: 11, color: "#aaa" }}>{sub || "—"}</div>
                      </div>
                      <span style={s.tag(role === "guest" ? "" : role === "staff" ? "blue" : "green")}>{ACCOUNT_ROLE_LABEL[role] || role}</span>
                    </label>
                  );
                })
            }
          </div>
          {picked.length > 0 && <div style={{ marginTop: 8, fontSize: 12, color: G.base, fontWeight: 600 }}>{picked.length} selected</div>}
        </div>
        <div style={s.mFooter}>
          <button style={s.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={{ ...s.btnPrimary, opacity: saving || picked.length === 0 ? 0.6 : 1 }} onClick={save} disabled={saving || picked.length === 0}>
            {saving ? "Registering…" : `Register ${picked.length || ""} Participant${picked.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function roleColor(role) { return SEMINAR_ROLES.find(r => r.value === role)?.color || "blue"; }
function roleLabel(role) { return SEMINAR_ROLES.find(r => r.value === role)?.label || role || "Student"; }

function RegistrationsTab({ seminar }) {
  const toast = useToast();
  const [showAddPeople, setShowAddPeople] = useState(false);
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
    const { error } = await supabase.from("seminar_registrations").update({ role, status: "registered" }).eq("id", id);
    if (error) { toast("Could not change role: " + error.message, "error"); return; }
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

      <div style={{ marginBottom: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
          style={{ ...s.input, maxWidth: 300 }} />
        {seminar.status !== "completed" && seminar.status !== "cancelled" && (
          <button onClick={() => setShowAddPeople(true)}
            style={{ ...s.btnGreen, marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i className="bi bi-person-plus"/> Add Participants
          </button>
        )}
      </div>
      {showAddPeople && (
        <AddParticipantsModal seminar={seminar} existingRegs={regs}
          onAdded={() => { setShowAddPeople(false); load(); }}
          onClose={() => setShowAddPeople(false)} />
      )}

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
                      <select value={currentRole} onChange={e => updateRole(r.id, e.target.value)} style={s.smallSelect}>
                        {SEMINAR_ROLES.map(role => (
                          <option key={role.value} value={role.value} style={{ color: G.dark, background: "#fff" }}>{role.label}</option>
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
      <span style={{ fontSize: 12, color: "#888", marginLeft: 4 }}>({value ? Number(value).toFixed(1) : "—"})</span>
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

  // Each person's own average across the six criteria
  const personAvg = (e) => {
    const vals = EVAL_FIELDS.map(f => e[f.key]).filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

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
                    <StarRating value={personAvg(e)}/>
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
const JITSI_DOMAIN = "meet.bloomgad.xyz";

// Load Jitsi's official embed script once
function loadJitsiScript() {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (window.__bloomJitsiScript) return window.__bloomJitsiScript;
  window.__bloomJitsiScript = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      window.__bloomJitsiScript = null;
      reject(new Error("Could not load the meeting. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  return window.__bloomJitsiScript;
}

const JitsiMeetingModal = React.memo(function JitsiMeetingModal({ seminar, onClose }) {
  const cleanId  = seminar.id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const roomName = `bloomgad${cleanId}`;
  const jitsiUrl = `https://${JITSI_DOMAIN}/${roomName}`;

  const containerRef = useRef(null);
  const apiRef       = useRef(null);
  const endedRef     = useRef(false);
  const onCloseRef   = useRef(onClose);
  onCloseRef.current = onClose;

  const [copied,    setCopied]    = useState(false);
  const [ending,    setEnding]    = useState(false);
  const [loadError, setLoadError] = useState("");

  // Ends the meeting exactly once: optionally removes everyone from the call,
  // then runs the parent's onClose (status → completed, attendance, eligibility).
  const finishMeeting = useCallback(async (endForEveryone) => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnding(true);

    const api = apiRef.current;
    if (api && endForEveryone) {
      try { api.executeCommand("endConference"); } catch { /* not moderator / already left */ }
      await new Promise(r => setTimeout(r, 1000));
    }
    try { api?.dispose(); } catch { /* already disposed */ }
    apiRef.current = null;

    await onCloseRef.current();
  }, []);

  const finishRef = useRef(finishMeeting);
  finishRef.current = finishMeeting;

  useEffect(() => {
    let cancelled = false;

    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName: "GADRC Admin (Moderator)" },
          configOverwrite: {
            disableDeepLinking: true,
            prejoinConfig: { enabled: false },
          },
        });
        apiRef.current = api;
        // Admin pressed Jitsi's own red "Leave / End meeting" button
        api.addListener("readyToClose", () => finishRef.current(false));
      })
      .catch(err => { if (!cancelled) setLoadError(err.message); });

    return () => {
      cancelled = true;
      try { apiRef.current?.dispose(); } catch { /* ignore */ }
      apiRef.current = null;
    };
  }, [roomName]);

  // Warn before closing/refreshing the tab while the meeting is still running
  useEffect(() => {
    const warn = (e) => {
      if (endedRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(`${jitsiUrl}#config.disableDeepLinking=true`);
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
              Live on {JITSI_DOMAIN} · Room: {roomName}
              {seminar._startedAt && <> · Started {new Date(seminar._startedAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</>}
            </div>
          </div>
        </div>
        <button onClick={copyLink} disabled={ending}
          style={{ padding: "7px 14px", background: copied ? "#16a34a" : "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, transition: "background .2s" }}>
          <i className={`bi bi-${copied ? "check-circle-fill" : "link-45deg"}`}/>
          {copied ? "Copied!" : "Copy Join Link"}
        </button>
        <button onClick={() => finishMeeting(true)} disabled={ending}
          style={{ padding: "7px 14px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: ending ? "wait" : "pointer", fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, opacity: ending ? 0.7 : 1 }}>
          <i className="bi bi-x-circle"/> {ending ? "Ending…" : "End Meeting for All"}
        </button>
      </div>
      <div style={{ background: "#0f1f0f", padding: "8px 20px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
          <i className="bi bi-info-circle"/>
          Share this link with students so they can join:
        </div>
        <code style={{ fontSize: 12, color: "#4CAF50", background: "rgba(255,255,255,0.06)", padding: "3px 10px", borderRadius: 4 }}>
          {jitsiUrl}
        </code>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginLeft: "auto" }}>
          Ending the call marks the seminar as completed and opens evaluations for attendees.
        </div>
      </div>

      {loadError ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", gap: 12, padding: 24, textAlign: "center" }}>
          <i className="bi bi-exclamation-triangle" style={{ fontSize: 32, color: "#fbbf24" }}/>
          <div style={{ fontSize: 14 }}>{loadError}</div>
          <a href={`${jitsiUrl}#config.disableDeepLinking=true`} target="_blank" rel="noreferrer" style={{ color: "#4CAF50", fontSize: 13 }}>
            Open the meeting in a new tab instead
          </a>
        </div>
      ) : (
        <div ref={containerRef} style={{ flex: 1, width: "100%", minHeight: 0, background: "#000" }} />
      )}

      {ending && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 600, gap: 10 }}>
          <span className="spinner-border spinner-border-sm" /> Ending meeting and saving attendance…
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => prevProps.seminar.id === nextProps.seminar.id);

// ── Attendance Report Tab ─────────────────────────────────────────────────────
function AttendanceReportTab({ seminar }) {
  const toast = useToast();
  const [logs,         setLogs]        = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [search,       setSearch]      = useState("");
  const [filter,       setFilter]      = useState("all");
  const [marking,      setMarking]     = useState(false);
  const [exporting,    setExporting]   = useState(false);
  const [editingId,    setEditingId]   = useState(null);
  const [editStatus,   setEditStatus]  = useState("");
  const [untracked,    setUntracked]   = useState([]);  // registered, but no attendance record (no app)
  const [markingId,    setMarkingId]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: regs }] = await Promise.all([
      supabase
        .from("seminar_attendance_logs")
        .select("*, profiles(full_name, student_id, department, email, year_level, organization)")
        .eq("seminar_id", seminar.id)
        .order("join_time", { ascending: true }),
      supabase
        .from("seminar_registrations")
        .select("user_id, role, profiles(full_name, student_id, department, organization, email)")
        .eq("seminar_id", seminar.id)
        .neq("status", "cancelled"),
    ]);
    const logged = new Set((data || []).map(l => l.user_id));
    startTransition(() => {
      if (!error) setLogs(data || []);
      setUntracked((regs || []).filter(r => !logged.has(r.user_id)));
      setLoading(false);
    });
  }, [seminar.id]);

  // For participants who joined through the link or attended in person (no app):
  // record them as present for the whole meeting.
  const markPresentManually = async (reg) => {
    const totalMinutes = seminar.meeting_duration_minutes || 0;
    if (!totalMinutes) { toast("End the meeting first, so the meeting length is known.", "warning"); return; }
    setMarkingId(reg.user_id);
    const start = seminar.scheduled_start ? new Date(seminar.scheduled_start) : new Date();
    const end   = new Date(start.getTime() + totalMinutes * 60000);
    const { error } = await supabase.from("seminar_attendance_logs").insert({
      seminar_id: seminar.id, user_id: reg.user_id,
      join_time: start.toISOString(), leave_time: end.toISOString(),
      duration_minutes: totalMinutes, attendance_status: "present", is_eligible: true,
    });
    if (error) { toast("Could not mark attendance: " + error.message, "error"); setMarkingId(null); return; }
    await supabase.from("seminar_attendance").upsert({
      seminar_id: seminar.id, user_id: reg.user_id, checked_in_at: start.toISOString(),
    }, { onConflict: "seminar_id,user_id" });
    logActivity("seminar_attendance_marked_manually", { seminar_id: seminar.id, user_id: reg.user_id });
    toast(`${reg.profiles?.full_name || "Participant"} marked present.`, "success");
    setMarkingId(null);
    load();
  };

  useEffect(() => { load(); }, [load]);

  const totalMins = seminar.meeting_duration_minutes || 0;
  const neededMins = totalMins ? requiredMinutes(totalMins) : 1;

  // Same rule as when the meeting ends: at least 80% of the actual meeting time
  const isEligible = (log) => (log.duration_minutes || 0) >= neededMins;

  const fmtTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-PH", {
      timeZone: "Asia/Manila", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  const fmtDuration = (mins) => {
    if (mins == null) return "—";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const statusColor = (st) => ({
    present: "green", partial: "yellow", joined: "blue", absent: "red",
  }[st] || "");

  const autoMarkEligible = async () => {
    setMarking(true);
    let marked = 0;
    for (const log of logs) {
      const eligible = isEligible(log);
      if (eligible !== log.is_eligible) {
        await supabase.from("seminar_attendance_logs")
          .update({ is_eligible: eligible, attendance_status: eligible ? "present" : "partial" })
          .eq("id", log.id);

        if (eligible) {
          await supabase.from("seminar_attendance").upsert({
            seminar_id: seminar.id, user_id: log.user_id,
            checked_in_at: log.join_time,
          }, { onConflict: "seminar_id,user_id" });
          marked++;
        }
      }
    }
    toast(`${marked} participant(s) marked as eligible for certificates.`, "success");
    logActivity("seminar_attendance_marked", { seminar_id: seminar.id, count: marked });
    load();
    setMarking(false);
  };

  const saveOverride = async (log) => {
    const { error: e1 } = await supabase.from("seminar_attendance_logs")
      .update({ attendance_status: editStatus, is_eligible: editStatus === "present" })
      .eq("id", log.id);
    if (e1) { toast("Could not update attendance: " + e1.message, "error"); return; }
    if (editStatus === "present") {
      await supabase.from("seminar_attendance").upsert({
        seminar_id: seminar.id, user_id: log.user_id,
        checked_in_at: log.join_time || new Date().toISOString(),
      }, { onConflict: "seminar_id,user_id" });
    } else {
      await supabase.from("seminar_attendance").delete()
        .eq("seminar_id", seminar.id).eq("user_id", log.user_id);
    }
    toast("Attendance updated.", "success");
    logActivity("seminar_attendance_override", { seminar_id: seminar.id, user_id: log.user_id, status: editStatus });
    setEditingId(null);
    load();
  };

  const filteredLogs = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || (l.profiles?.full_name || "").toLowerCase().includes(q)
      || (l.profiles?.student_id || "").toLowerCase().includes(q)
      || (l.profiles?.department || "").toLowerCase().includes(q);
    const matchFilter = filter === "all" ? true
      : filter === "eligible" ? l.is_eligible
      : l.attendance_status === filter;
    return matchSearch && matchFilter;
  });

  const exportPDF = async () => {
    setExporting(true);
    try {
      if (!window.jspdf) {
        await new Promise((res, rej) => {
          const s1 = document.createElement("script");
          s1.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
          s1.onload = res; s1.onerror = rej; document.head.appendChild(s1);
        });
        await new Promise((res, rej) => {
          const s2 = document.createElement("script");
          s2.src = "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js";
          s2.onload = res; s2.onerror = rej; document.head.appendChild(s2);
        });
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFontSize(16); doc.setFont(undefined, "bold"); doc.setTextColor(26,46,26);
      doc.text("Seminar Attendance Report", 14, 16);
      doc.setFontSize(11); doc.setFont(undefined, "normal"); doc.setTextColor(80);
      doc.text(seminar.title, 14, 23);
      doc.setFontSize(9); doc.setTextColor(130);
      doc.text(`Generated: ${new Date().toLocaleString("en-PH")} · ${filteredLogs.length} participants${totalMins ? ` · Meeting: ${totalMins} min · Required: ${neededMins} min` : ""}`, 14, 29);
      doc.autoTable({
        startY: 34,
        head: [["Name", "Student ID", "Department", "Join Time", "Leave Time", "Duration", "Status", "Eligible"]],
        body: filteredLogs.map(l => [
          l.profiles?.full_name || "—",
          l.profiles?.student_id || "—",
          l.profiles?.department || "—",
          fmtTime(l.join_time),
          fmtTime(l.leave_time),
          fmtDuration(l.duration_minutes),
          l.attendance_status || "—",
          l.is_eligible ? "Yes" : "No",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [26, 46, 26] },
        columnStyles: { 7: { halign: "center" } },
      });
      doc.save(`attendance-report-${seminar.title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast("PDF exported.", "success");
    } catch (e) { toast("Export failed: " + e.message, "error"); }
    setExporting(false);
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      if (!window.XLSX) {
        await new Promise((res, rej) => {
          const sc = document.createElement("script");
          sc.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
          sc.onload = res; sc.onerror = rej; document.head.appendChild(sc);
        });
      }
      const rows = filteredLogs.map(l => ({
        "Name":                 l.profiles?.full_name   || "—",
        "Student ID":           l.profiles?.student_id  || "—",
        "Department":           l.profiles?.department  || "—",
        "Year Level":           l.profiles?.year_level  ? `Year ${l.profiles.year_level}` : "—",
        "Email":                l.profiles?.email       || "—",
        "Join Time":            fmtTime(l.join_time),
        "Leave Time":           fmtTime(l.leave_time),
        "Duration":             fmtDuration(l.duration_minutes),
        "Status":               l.attendance_status     || "—",
        "Certificate Eligible": l.is_eligible ? "Yes" : "No",
      }));
      const ws = window.XLSX.utils.json_to_sheet(rows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Attendance");
      window.XLSX.writeFile(wb, `attendance-report-${seminar.title.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
      toast("Excel exported.", "success");
    } catch (e) { toast("Export failed: " + e.message, "error"); }
    setExporting(false);
  };

  const stats = {
    total:   logs.length,
    present: logs.filter(l => l.attendance_status === "present").length,
    partial: logs.filter(l => l.attendance_status === "partial").length,
    absent:  logs.filter(l => l.attendance_status === "absent").length,
    eligible:logs.filter(l => l.is_eligible).length,
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total",    value: stats.total,   color: G.base    },
          { label: "Present",  value: stats.present, color: "#16a34a" },
          { label: "Partial",  value: stats.partial, color: "#a16207" },
          { label: "Absent",   value: stats.absent,  color: "#dc2626" },
          { label: "Eligible", value: stats.eligible,color: "#7c3aed" },
        ].map(st => (
          <div key={st.label} style={s.statCard(st.color)}>
            <div style={{ fontSize: 22, fontWeight: 900, color: st.color }}>{st.value}</div>
            <div style={s.statLabel}>{st.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...s.input, width: 240 }} placeholder="Search by name, ID, department…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...s.select, width: 180 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All ({logs.length})</option>
          <option value="present">Present ({stats.present})</option>
          <option value="partial">Partial ({stats.partial})</option>
          <option value="absent">Absent ({stats.absent})</option>
          <option value="eligible">Eligible ({stats.eligible})</option>
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={autoMarkEligible} disabled={marking || logs.length === 0}
            style={{ padding: "8px 14px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6, opacity: marking ? 0.7 : 1 }}>
            <i className="bi bi-patch-check"/>{marking ? "Marking…" : "Auto-Mark Eligible"}
          </button>
          <button onClick={exportPDF} disabled={exporting || filteredLogs.length === 0}
            style={{ padding: "8px 14px", background: G.wash, color: G.dark, border: "1px solid #DDE8DD", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <i className="bi bi-file-earmark-pdf" style={{ color: "#dc2626" }}/>PDF
          </button>
          <button onClick={exportExcel} disabled={exporting || filteredLogs.length === 0}
            style={{ padding: "8px 14px", background: G.wash, color: G.dark, border: "1px solid #DDE8DD", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <i className="bi bi-file-earmark-excel" style={{ color: "#16a34a" }}/>Excel
          </button>
        </div>
      </div>

      {!loading && untracked.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #fde68a", marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", background: "#fffbeb", borderBottom: "1px solid #fde68a", fontSize: 13, color: "#92400e" }}>
            <i className="bi bi-person-exclamation me-2"/>
            <strong>{untracked.length} registered participant(s) have no attendance record.</strong>{" "}
            These are usually people added by an admin who joined through the link or attended in person.
            {!totalMins && <> End the meeting first to mark them present.</>}
          </div>
          <table style={s.table}>
            <tbody>
              {untracked.map(r => (
                <tr key={r.user_id}>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600 }}>{r.profiles?.full_name || "—"}</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>{r.profiles?.organization || r.profiles?.department || r.profiles?.student_id || "—"}</div>
                  </td>
                  <td style={s.td}><span style={s.tag("")}>{(r.role || "student").replace("_", " ")}</span></td>
                  <td style={{ ...s.td, textAlign: "right" }}>
                    <button onClick={() => markPresentManually(r)} disabled={!totalMins || markingId === r.user_id}
                      style={{ padding: "5px 12px", border: "none", borderRadius: 6, background: totalMins ? G.base : "#e5e7eb", color: totalMins ? "#fff" : "#9ca3af", fontSize: 12, cursor: totalMins ? "pointer" : "not-allowed", fontWeight: 700 }}>
                      {markingId === r.user_id ? "Saving…" : <><i className="bi bi-check2-circle me-1"/>Mark Present</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading ? <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading attendance records…</div>
        : logs.length === 0 ? (
          <div style={s.emptyBox}>
            <i className="bi bi-person-check d-block mb-2" style={{ fontSize: 40, color: G.pale }}/>
            <div style={{ fontWeight: 700, color: G.dark, marginBottom: 6 }}>No attendance records yet</div>
            <div style={{ fontSize: 13, color: "#aaa" }}>Records appear automatically when participants join the meeting.</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>No records match your search/filter.</div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #DDE8DD", overflow: "hidden" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Participant</th>
                  <th style={s.th}>Department</th>
                  <th style={s.th}>Join Time</th>
                  <th style={s.th}>Leave Time</th>
                  <th style={s.th}>Duration</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Eligible</th>
                  <th style={s.th}>Override</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(l => (
                  <tr key={l.id}>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600 }}>{l.profiles?.full_name || "—"}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>{l.profiles?.student_id || l.profiles?.email}</div>
                    </td>
                    <td style={s.td}>{l.profiles?.department || "—"}{l.profiles?.year_level ? ` · Yr ${l.profiles.year_level}` : ""}</td>
                    <td style={{ ...s.td, fontSize: 12 }}>{fmtTime(l.join_time)}</td>
                    <td style={{ ...s.td, fontSize: 12 }}>{fmtTime(l.leave_time)}</td>
                    <td style={s.td}>
                      <span style={{ fontWeight: 700, color: G.base }}>{fmtDuration(l.duration_minutes)}</span>
                    </td>
                    <td style={s.td}>
                      <span style={s.tag(statusColor(l.attendance_status))}>
                        {l.attendance_status || "joined"}
                      </span>
                    </td>
                    <td style={s.td}>
                      {l.is_eligible
                        ? <span style={s.tag("green")}><i className="bi bi-patch-check-fill me-1"/>Yes</span>
                        : <span style={s.tag("red")}>No</span>}
                    </td>
                    <td style={s.td}>
                      {editingId === l.id ? (
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={s.smallSelect}>
                            <option value="present">Present</option>
                            <option value="partial">Partial</option>
                            <option value="absent">Absent</option>
                          </select>
                          <button onClick={() => saveOverride(l)}
                            style={{ padding: "4px 8px", background: G.dark, color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Save</button>
                          <button onClick={() => setEditingId(null)}
                            style={{ padding: "4px 8px", background: G.wash, color: G.dark, border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingId(l.id); setEditStatus(l.attendance_status === "joined" ? "present" : (l.attendance_status || "present")); }}
                          style={{ padding: "5px 10px", border: "1px solid #DDE8DD", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600, color: G.dark, display: "flex", alignItems: "center", gap: 4 }}>
                          <i className="bi bi-pencil" style={{ fontSize: 11 }}/>Override
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function SeminarsPage() {
  const toast = useToast();
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
  const [starting, setStarting]   = useState(false);

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

  const patchSeminar = (id, patch) => {
    setSeminars(ss => ss.map(sm => sm.id === id ? { ...sm, ...patch } : sm));
    setSelected(sm => sm?.id === id ? { ...sm, ...patch } : sm);
  };

  // ── Start (or rejoin) the live meeting ──────────────────────────
  const startMeeting = async () => {
    const sem = selected;
    if (!sem || starting) return;
    setStarting(true);

    const alreadyOngoing = sem.status === "ongoing";
    if (!alreadyOngoing) {
      const { error } = await supabase.from("seminars").update({ status: "ongoing" }).eq("id", sem.id);
      if (error) {
        setStarting(false);
        toast("Could not start the meeting: " + error.message, "error");
        return;
      }
      logActivity("seminar_meeting_started", { seminar_id: sem.id, title: sem.title });
    }

    // Keep the original start time when re-joining a meeting that is already running
    let startedAt = alreadyOngoing ? readMeetingStart(sem.id) : null;
    if (!startedAt) {
      startedAt = new Date().toISOString();
      writeMeetingStart(sem.id, startedAt);
    }

    patchSeminar(sem.id, { status: "ongoing" });
    setJitsiRoom({ ...sem, status: "ongoing", _startedAt: startedAt });
    setStarting(false);
  };

  // ── End the meeting: complete the seminar + finalize attendance ──
  const finalizeMeeting = async (room) => {
    const endTime   = new Date();
    const startTime = new Date(room._startedAt || room.scheduled_start || room.created_at || Date.now());
    const durationMins = Math.max(1, Math.round((endTime - startTime) / 60000));
    const needed       = requiredMinutes(durationMins);

    const { error: semErr } = await supabase.from("seminars").update({
      status: "completed",
      meeting_duration_minutes: durationMins,
    }).eq("id", room.id);
    if (semErr) {
      toast("Could not mark the seminar as completed: " + semErr.message, "error");
    } else {
      patchSeminar(room.id, { status: "completed", meeting_duration_minutes: durationMins });
    }
    clearMeetingStart(room.id);

    const { data: attendanceLogs, error: logErr } = await supabase
      .from("seminar_attendance_logs")
      .select("id, user_id, duration_minutes, join_time, leave_time, session_started_at")
      .eq("seminar_id", room.id);

    if (logErr) {
      toast("Meeting ended, but attendance could not be loaded: " + logErr.message, "error");
      setJitsiRoom(null);
      return;
    }

    const meetingEndTime = endTime.toISOString();
    let eligibleCount = 0, partialCount = 0, failed = 0;

    const minutesBetween = (from, to) => Math.max(0, Math.round((to - from) / 60000));

    for (const log of (attendanceLogs || [])) {
      // duration_minutes = total from sessions the student already finished
      // (rejoining after a disconnect adds to this total instead of resetting it)
      let duration  = log.duration_minutes ?? 0;
      let leaveTime = log.leave_time;

      if (log.session_started_at) {
        // Still in the call when the meeting ended → add the current session.
        // Time before the admin started the meeting doesn't count.
        const sessionStart = new Date(Math.max(new Date(log.session_started_at).getTime(), startTime.getTime()));
        duration += minutesBetween(sessionStart, endTime);
        leaveTime = meetingEndTime;
      } else if (!leaveTime && log.join_time) {
        // Older records (before session tracking): count from the join time
        const joined = new Date(Math.max(new Date(log.join_time).getTime(), startTime.getTime()));
        duration  = minutesBetween(joined, endTime);
        leaveTime = meetingEndTime;
      }

      // Nobody can attend longer than the meeting itself
      duration = Math.min(duration, durationMins);

      const eligible = duration >= needed;
      const { error: upErr } = await supabase.from("seminar_attendance_logs")
        .update({
          leave_time:         leaveTime,
          duration_minutes:   duration,
          session_started_at: null,
          is_eligible:        eligible,
          attendance_status:  eligible ? "present" : "partial",
        })
        .eq("id", log.id);
      if (upErr) { failed++; continue; }

      if (eligible) {
        await supabase.from("seminar_attendance").upsert({
          seminar_id: room.id, user_id: log.user_id,
          checked_in_at: log.join_time,
        }, { onConflict: "seminar_id,user_id" });
        eligibleCount++;
      } else {
        partialCount++;
      }
    }

    const total = (attendanceLogs || []).length;
    toast(
      total === 0
        ? `Meeting ended after ${durationMins} min. No participants joined.`
        : `Meeting ended after ${durationMins} min. ${eligibleCount} of ${total} participant(s) attended at least ${needed} min and are eligible for certificates.` +
          (failed ? ` ${failed} record(s) could not be saved.` : ""),
      failed ? "warning" : "success"
    );
    logActivity("seminar_meeting_ended", { seminar_id: room.id, duration_mins: durationMins, required_mins: needed, eligible: eligibleCount, partial: partialCount });
    setJitsiRoom(null);
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
        const { error } = await supabase.from("seminars").delete().eq("id", selected.id);
        if (error) { toast("Could not delete seminar: " + error.message, "error"); setConfirm(null); return; }
        clearMeetingStart(selected.id);
        logActivity("seminar_deleted", { seminar_id: selected.id, title: selected.title });
        const rest = seminars.filter(s => s.id !== selected.id);
        setSeminars(rest); setSelected(rest[0] || null);
        setConfirm(null);
      }
    });
  };

  const statusColor = (st) => st === "ongoing" ? "green" : st === "completed" ? "blue" : st === "cancelled" ? "red" : "yellow";
  const regCount    = (sm) => sm?.seminar_registrations?.[0]?.count || 0;
  const filtered    = seminars.filter(sm => (sm.title || "").toLowerCase().includes(search.toLowerCase()));
  const canMeet     = selected && (selected.seminar_type === "webinar" || selected.seminar_type === "hybrid")
                      && selected.status !== "cancelled" && selected.status !== "completed";

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
                    <div style={s.itemTitle}>
                      {sem.status === "ongoing" && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#4ade80", marginRight: 6, verticalAlign: "middle" }}/>}
                      {sem.title}
                    </div>
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
              {canMeet && (
                <button onClick={startMeeting} disabled={starting}
                  style={{ padding: "7px 14px", background: "linear-gradient(135deg,#1A2E1A,#2D6A2D)", color: "#fff", border: "none", borderRadius: 6, cursor: starting ? "wait" : "pointer", fontWeight: 700, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, opacity: starting ? 0.7 : 1 }}>
                  <i className="bi bi-camera-video-fill"/> {selected.status === "ongoing" ? "Rejoin Meeting" : "Start Meeting"}
                </button>
              )}
              <button style={s.btnDanger} onClick={deleteSeminar}><i className="bi bi-trash me-1"/> Delete</button>
            </div>
            <div style={s.tabBar}>
              {[["details", "Details"], ["attendees", "Attendees"], ["registrations", "Registrations"], ["attendance", "Attendance Report"], ["evaluations", "Evaluations"]].map(([v, l]) => (
                <div key={v} style={s.tab(tab === v)} onClick={() => setTab(v)}>{l}</div>
              ))}
            </div>
            <div style={s.content}>
              {/* Keys include status so tabs reload after a meeting starts/ends
                  (prevents saving an old "ongoing" status from the Details form) */}
              {tab === "details"       && <DetailsTab           key={`${selected.id}_d_${selected.status}`} seminar={selected} onUpdate={reload} />}
              {tab === "attendees"     && <AttendeesTab         key={selected.id + "_a"} seminar={selected} />}
              {tab === "registrations" && <RegistrationsTab     key={selected.id + "_r"} seminar={selected} />}
              {tab === "attendance"    && <AttendanceReportTab  key={`${selected.id}_ar_${selected.status}_${selected.meeting_duration_minutes || 0}`} seminar={selected} />}
              {tab === "evaluations"   && <EvaluationsTab       key={selected.id + "_e"} seminar={selected} />}
            </div>
          </>
        )}
      </div>

      {confirm && <ConfirmModal title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}/>}

      {jitsiRoom && <JitsiMeetingModal seminar={jitsiRoom} onClose={() => finalizeMeeting(jitsiRoom)} />}

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