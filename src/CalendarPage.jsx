import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark: "#2d4a18", mid: "#3a5a20", base: "#5a7a3a",
  light: "#8ab060", pale: "#b5cc8e", wash: "#e8f2d8",
  cream: "#f6f9f0", white: "#fafdf6",
};

const EVENT_COLORS = ["#5a7a3a", "#2563eb", "#dc2626", "#f59e0b", "#7c3aed", "#0891b2"];
const EVENT_TYPES  = ["holiday", "activity", "seminar", "deadline", "announcement"];

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── SVG Icon Components (replaces all emojis) ────────────────────────────────
const Icon = {
  Calendar:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Seminar:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  Announce:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12H3M22 5l-9.5 7L3 5"/><path d="M22 19l-9.5-7L3 19"/></svg>,
  Event:        () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Pin:          () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7h5l-4 4 2 7-6-4-6 4 2-7-4-4h5z"/></svg>,
  MapPin:       () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Edit:         () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash:        () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Close:        () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Plus:         () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Info:         () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  UpcomingCal:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  AlertTriangle:() => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  CheckCircle:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
};

function eventTypeIcon(ev) {
  if (ev._source === "seminar")      return <Icon.Seminar />;
  if (ev._source === "announcement") return <Icon.Announce />;
  return <Icon.Event />;
}

function eventTypeLabel(ev) {
  if (ev._source === "seminar")      return "Seminar";
  if (ev._source === "announcement") return "Announcement";
  return ev.event_type ? ev.event_type.charAt(0).toUpperCase() + ev.event_type.slice(1) : "Event";
}

// ─────────────────────────────────────────────────────────────────
//  NOTIFICATION HELPER
// ─────────────────────────────────────────────────────────────────
async function insertEventNotifications(eventId, eventTitle, startDate) {
  try {
    const { data: users } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_active", true);
    if (!users?.length) return;
    const rows = users.map(u => ({
      user_id:        u.id,
      type:           "new_event",
      title:          "New Event Added",
      body:           `"${eventTitle}" has been added to the calendar${startDate ? ` on ${startDate}` : ""}.`,
      reference_type: "event",
      reference_id:   eventId,
      is_read:        false,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      await supabase.from("notifications").insert(rows.slice(i, i + 500));
    }
  } catch (e) {
    console.error("insertEventNotifications failed:", e);
  }
}

// ─────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────
const s = {
  page:    { padding: "28px 32px", fontFamily: "'Segoe UI', system-ui, sans-serif", background: G.cream, minHeight: "100vh" },
  header:  { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title:   { fontSize: 22, fontWeight: 800, color: G.dark, margin: 0, display: "flex", alignItems: "center", gap: 8 },
  addBtn:  { display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: G.dark, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  grid:    { display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" },
  calBox:  { background: "#fff", borderRadius: 16, border: `1px solid ${G.wash}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  calHdr:  { background: G.dark, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  calNav:  { background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: "4px 8px", borderRadius: 6 },
  calMonth:{ fontSize: 16, fontWeight: 700, color: "#fff" },
  dayGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)" },
  dayHdr:  { padding: "10px 0", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase" },
  // Fixed-height cell — never expands regardless of event count
  dayCell: (today, otherMonth) => ({
    height: 88,          // fixed height
    overflow: "hidden",  // clip overflow
    padding: "6px 4px",
    border: `1px solid ${G.wash}`,
    cursor: "pointer",
    background: today ? G.wash : "#fff",
    opacity: otherMonth ? 0.35 : 1,
    transition: "background .1s",
    boxSizing: "border-box",
  }),
  dayNum:  (today) => ({ fontSize: 12, fontWeight: today ? 800 : 500, color: today ? G.dark : "#555", marginBottom: 3, display: "block", textAlign: "center" }),
  // Event pill inside cell — strictly truncated
  eventPill: (color) => ({
    display: "flex", alignItems: "center", gap: 3,
    fontSize: 10, padding: "2px 5px", borderRadius: 4, marginBottom: 2,
    background: color || G.base, color: "#fff", fontWeight: 600,
    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
    maxWidth: "100%",
  }),
  pillText: { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", flex: 1, minWidth: 0 },
  sidebar: { display: "flex", flexDirection: "column", gap: 16 },
  eventCard:{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: `1px solid ${G.wash}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal:   { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" },
  mHeader: { padding: "20px 24px 16px", borderBottom: `1px solid ${G.wash}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 },
  mTitle:  { fontSize: 17, fontWeight: 700, color: G.dark },
  mBody:   { padding: "20px 24px" },
  mFooter: { padding: "16px 24px", borderTop: `1px solid ${G.wash}`, display: "flex", gap: 8, justifyContent: "flex-end", position: "sticky", bottom: 0, background: "#fff" },
  label:   { fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.6 },
  input:   { width: "100%", padding: "9px 12px", border: `1px solid ${G.pale}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark },
  select:  { width: "100%", padding: "9px 12px", border: `1px solid ${G.pale}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark },
  textarea:{ width: "100%", padding: "9px 12px", border: `1px solid ${G.pale}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark, resize: "vertical", minHeight: 70 },
  fg:      { marginBottom: 16 },
  row:     { display: "flex", gap: 12 },
  btnPrimary:  { padding: "9px 20px", background: G.dark, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnSecondary:{ padding: "9px 20px", background: G.wash, color: G.dark, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnDanger:   { padding: "7px 12px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12 },
  iconBtn: (c) => ({ background: "none", border: "none", cursor: "pointer", color: c || "#999", fontSize: 14, padding: "4px 6px", borderRadius: 6, display: "flex", alignItems: "center" }),
  tag:    (c) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: c + "22", color: c }),
  fe:      { fontSize: 11, color: "#dc2626", marginTop: 4, fontWeight: 500 },
};

// ─────────────────────────────────────────────────────────────────
//  CONFIRM MODAL  (replaces browser confirm())
// ─────────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) {
  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: 400 }}>
        <div style={s.mHeader}>
          <span style={{ ...s.mTitle, color: danger ? "#dc2626" : G.dark, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon.AlertTriangle />
            {title}
          </span>
        </div>
        <div style={{ ...s.mBody, fontSize: 14, color: "#444", lineHeight: 1.6 }}>{message}</div>
        <div style={s.mFooter}>
          <button style={s.btnSecondary} onClick={onCancel}>Cancel</button>
          <button style={{ ...s.btnPrimary, background: danger ? "#dc2626" : G.dark }} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  DATE EVENTS VIEWER MODAL
// ─────────────────────────────────────────────────────────────────
function DateEventsModal({ date, events, onClose, onEdit, onDelete }) {
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div style={s.mHeader}>
          <div>
            <div style={s.mTitle}>{dateLabel}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
              {events.length} event{events.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button style={s.iconBtn()} onClick={onClose}><Icon.Close /></button>
        </div>

        <div style={{ ...s.mBody, padding: "16px 24px" }}>
          {events.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#aaa" }}>
              <div style={{ marginBottom: 8, opacity: 0.4 }}><Icon.Calendar /></div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No events on this date</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Use the "New Event" button to add one.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {events.map(ev => (
                <div key={ev.id} style={{
                  borderLeft: `4px solid ${ev.color_hex || G.base}`,
                  background: (ev.color_hex || G.base) + "10",
                  borderRadius: "0 10px 10px 0",
                  padding: "12px 14px",
                  position: "relative",
                }}>
                  {/* Type badge */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ ...s.tag(ev.color_hex || G.base), fontSize: 10 }}>
                      {eventTypeIcon(ev)}
                      {eventTypeLabel(ev)}
                    </span>
                    {/* Edit / Delete only for custom events */}
                    {!ev._source && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button style={s.iconBtn(G.base)} title="Edit" onClick={() => { onClose(); onEdit(ev); }}>
                          <Icon.Edit />
                        </button>
                        <button style={s.iconBtn("#dc2626")} title="Delete" onClick={() => onDelete(ev)}>
                          <Icon.Trash />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div style={{ fontWeight: 700, color: G.dark, fontSize: 14, marginBottom: 4 }}>{ev.title}</div>

                  {/* Date range */}
                  <div style={{ fontSize: 12, color: "#666", marginBottom: ev.description || ev.location ? 6 : 0 }}>
                    {formatDate(ev.start_date)}
                    {ev.end_date && ev.end_date !== ev.start_date ? ` – ${formatDate(ev.end_date)}` : ""}
                  </div>

                  {/* Location */}
                  {ev.location && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#888", marginBottom: 4 }}>
                      <Icon.MapPin /> {ev.location}
                    </div>
                  )}

                  {/* Description */}
                  {ev.description && (
                    <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5, marginTop: 4 }}>
                      {ev.description}
                    </div>
                  )}

                  {/* Status / pinned badges */}
                  {(ev._status || ev.is_pinned) && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                      {ev._status   && <span style={{ ...s.tag("#888"), fontSize: 10 }}>{ev._status}</span>}
                      {ev.is_pinned && <span style={{ ...s.tag("#f59e0b"), fontSize: 10 }}><Icon.Pin /> Pinned</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={s.mFooter}>
          <button style={s.btnSecondary} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [events, setEvents]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [today]                     = useState(new Date());
  const [viewDate, setViewDate]     = useState(new Date());

  // Modal states
  const [showModal, setShowModal]   = useState(false);   // create/edit event
  const [editEvent, setEditEvent]   = useState(null);
  const [form, setForm]             = useState({});
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [dateModal, setDateModal]   = useState(null);    // date viewer { date, events }
  const [confirm, setConfirm]       = useState(null);    // { title, message, onConfirm }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Data fetching ──────────────────────────────────────────────
  const mergeAllEvents = async () => {
    const { data: evData }  = await supabase.from("events").select("*").order("start_date");
    const { data: semData } = await supabase.from("seminars")
      .select("id, title, scheduled_start, scheduled_end, status, venue, description")
      .order("scheduled_start", { ascending: true });
    const { data: annData } = await supabase.from("announcements")
      .select("id, title, body, content, published_at, is_pinned")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false });

    const semEvents = (semData || []).map(s => ({
      id: `sem_${s.id}`,
      title: s.title,
      start_date: s.scheduled_start?.slice(0, 10) || "",
      end_date:   s.scheduled_end?.slice(0, 10)   || s.scheduled_start?.slice(0, 10) || "",
      description: s.description || "",
      location: s.venue || "",
      color_hex: "#2D6A2D",
      event_type: "seminar",
      _source: "seminar",
      _status: s.status,
    }));

    const annEvents = (annData || []).map(a => ({
      id: `ann_${a.id}`,
      title: a.title,
      start_date: a.published_at?.slice(0, 10) || "",
      end_date:   a.published_at?.slice(0, 10) || "",
      description: a.body || a.content || "",
      color_hex: "#f59e0b",
      event_type: "announcement",
      _source: "announcement",
      is_pinned: a.is_pinned,
    }));

    return [...(evData || []), ...semEvents, ...annEvents]
      .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const all = await mergeAllEvents();
      if (active) { setEvents(all); setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const reload = async () => { setEvents(await mergeAllEvents()); };

  // ── Modal openers ──────────────────────────────────────────────
  // Date click → viewer only
  const openDateViewer = (dateStr, dayEvents) => {
    setDateModal({ date: dateStr, events: dayEvents });
  };

  // "New Event" button → create form
  const openAdd = (date) => {
    setEditEvent(null);
    setForm({ event_type: "activity", color_hex: EVENT_COLORS[0], is_all_day: true, start_date: date || "", end_date: date || "" });
    setFormError(""); setFieldErrors({}); setShowModal(true);
  };

  const openEdit = (ev) => {
    setEditEvent(ev);
    const { is_public: _ip, ...rest } = ev;
    setForm(rest);
    setFormError(""); setFieldErrors({}); setShowModal(true);
  };

  // ── Save ───────────────────────────────────────────────────────
  const save = async () => {
    // Field-level validation
    const errs = {};
    if (!form.title?.trim()) errs.title = "Title is required.";

    const today00 = new Date(); today00.setHours(0, 0, 0, 0);

    if (!form.start_date) {
      errs.start_date = "Start date is required.";
    } else {
      const start = new Date(form.start_date);
      if (isNaN(start)) errs.start_date = "Start date is invalid.";
      else if (!editEvent && start < today00) errs.start_date = "Start date cannot be in the past.";
    }

    if (form.end_date) {
      const end = new Date(form.end_date);
      if (isNaN(end)) {
        errs.end_date = "End date is invalid.";
      } else if (form.start_date && !errs.start_date) {
        const start = new Date(form.start_date);
        if (end < start) errs.end_date = "End date cannot be before the start date.";
      }
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setFormError("Please fix the errors below before saving.");
      return;
    }

    setFieldErrors({}); setFormError("");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      title:       form.title.trim(),
      description: form.description?.trim() || null,
      event_type:  form.event_type || "activity",
      start_date:  form.start_date,
      end_date:    form.end_date || form.start_date,
      is_all_day:  form.is_all_day ?? true,
      color_hex:   form.color_hex || EVENT_COLORS[0],
    };

    let err, insertedId;
    if (editEvent) {
      ({ error: err } = await supabase.from("events").update(payload).eq("id", editEvent.id));
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("events")
        .insert({ ...payload, created_by: user?.id })
        .select("id")
        .single();
      err = insertErr; insertedId = inserted?.id;
    }

    setSaving(false);
    if (err) { setFormError(err.message); return; }

    if (!editEvent && insertedId) {
      await insertEventNotifications(insertedId, payload.title, payload.start_date);
    }

    setShowModal(false); setForm({}); reload();
  };

  // ── Delete (uses ConfirmModal, not browser confirm()) ──────────
  const del = (ev) => {
    setConfirm({
      title: "Delete Event",
      message: `Are you sure you want to delete "${ev.title}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        await supabase.from("events").delete().eq("id", ev.id);
        // Also close date viewer if it was showing this event's date
        setDateModal(null);
        reload();
      },
    });
  };

  // ── Calendar helpers ───────────────────────────────────────────
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const eventsForDate = (dateStr) => events.filter(e => {
    const start = (e.start_date || "").slice(0, 10);
    const end   = (e.end_date   || e.start_date || "").slice(0, 10);
    if (!start) return false;
    return dateStr >= start && dateStr <= end;
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++)
    cells.push({ day: daysInPrev - firstDay + 1 + i, current: false, date: new Date(year, month - 1, daysInPrev - firstDay + 1 + i) });
  for (let i = 1; i <= daysInMonth; i++)
    cells.push({ day: i, current: true, date: new Date(year, month, i) });
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++)
    cells.push({ day: i, current: false, date: new Date(year, month + 1, i) });

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const upcoming = events.filter(e => (e.start_date?.slice(0, 10) || "") >= todayStr).slice(0, 8);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>
            <Icon.Calendar />
            Calendar
          </div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
            {events.filter(e => !e._source).length} custom · {events.filter(e => e._source === "seminar").length} seminars · {events.filter(e => e._source === "announcement").length} announcements
          </div>
        </div>
        <button style={s.addBtn} onClick={() => openAdd(todayStr)}>
          <Icon.Plus /> New Event
        </button>
      </div>

      <div style={s.grid}>

        {/* ── Calendar Grid ── */}
        <div style={s.calBox}>
          <div style={s.calHdr}>
            <button style={s.calNav} onClick={() => setViewDate(new Date(year, month - 1, 1))}>‹</button>
            <span style={s.calMonth}>{MONTH_NAMES[month]} {year}</span>
            <button style={s.calNav} onClick={() => setViewDate(new Date(year, month + 1, 1))}>›</button>
          </div>
          <div style={s.dayGrid}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div key={d} style={s.dayHdr}>{d}</div>
            ))}
            {cells.map((cell, i) => {
              const dateStr = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, "0")}-${String(cell.date.getDate()).padStart(2, "0")}`;
              const isToday = cell.current && cell.date.toDateString() === today.toDateString();
              const dayEvents = eventsForDate(dateStr);

              return (
                <div
                  key={i}
                  style={s.dayCell(isToday, !cell.current)}
                  onClick={() => cell.current && openDateViewer(dateStr, dayEvents)}
                  title={dayEvents.length > 0 ? `${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}` : ""}
                >
                  <span style={s.dayNum(isToday)}>{cell.day}</span>

                  {/* Show up to 2 event pills, fixed truncated */}
                  {dayEvents.slice(0, 2).map(ev => (
                    <div key={ev.id} style={s.eventPill(ev.color_hex || G.base)}>
                      <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                        {eventTypeIcon(ev)}
                      </span>
                      <span style={s.pillText}>{ev.title}</span>
                    </div>
                  ))}

                  {/* Overflow count */}
                  {dayEvents.length > 2 && (
                    <div style={{ fontSize: 9, color: "#888", textAlign: "center", marginTop: 1 }}>
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div style={s.sidebar}>
          <div style={{ fontWeight: 700, color: G.dark, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon.UpcomingCal /> Upcoming Events
          </div>

          {loading
            ? <div style={{ color: "#aaa", fontSize: 13 }}>Loading…</div>
            : upcoming.length === 0
              ? <div style={{ color: "#aaa", fontSize: 13 }}>No upcoming events</div>
              : upcoming.map(ev => (
                <div key={ev.id} style={{ ...s.eventCard, borderLeft: `4px solid ${ev.color_hex || G.base}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: G.dark, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>
                        {formatDate(ev.start_date)}{ev.end_date && ev.end_date !== ev.start_date ? ` – ${formatDate(ev.end_date)}` : ""}
                      </div>
                      {ev.location && (
                        <div style={{ fontSize: 11, color: "#aaa", marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                          <Icon.MapPin /> {ev.location}
                        </div>
                      )}
                      <div style={{ marginTop: 5, display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <span style={{ ...s.tag(ev.color_hex || G.base), fontSize: 10 }}>
                          {eventTypeIcon(ev)} {eventTypeLabel(ev)}
                        </span>
                        {ev._status   && <span style={{ ...s.tag("#888"),    fontSize: 10 }}>{ev._status}</span>}
                        {ev.is_pinned && <span style={{ ...s.tag("#f59e0b"), fontSize: 10 }}><Icon.Pin /> Pinned</span>}
                      </div>
                    </div>
                    {!ev._source && (
                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        <button style={s.iconBtn(G.base)}    title="Edit"   onClick={() => openEdit(ev)}><Icon.Edit /></button>
                        <button style={s.iconBtn("#dc2626")} title="Delete" onClick={() => del(ev)}><Icon.Trash /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      {/* ── Date Viewer Modal ── */}
      {dateModal && (
        <DateEventsModal
          date={dateModal.date}
          events={dateModal.events}
          onClose={() => setDateModal(null)}
          onEdit={openEdit}
          onDelete={del}
        />
      )}

      {/* ── Create / Edit Event Modal ── */}
      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.mHeader}>
              <span style={s.mTitle}>{editEvent ? "Edit Event" : "New Event"}</span>
              <button style={s.iconBtn()} onClick={() => setShowModal(false)}><Icon.Close /></button>
            </div>
            <div style={s.mBody}>
              {formError && (
                <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>
                  {formError}
                </div>
              )}
              <div style={s.fg}>
                <label style={s.label}>Title *</label>
                <input
                  style={{ ...s.input, borderColor: fieldErrors.title ? "#dc2626" : G.pale }}
                  value={form.title || ""}
                  onChange={e => { setF("title", e.target.value); if (fieldErrors.title) setFieldErrors(fe => ({ ...fe, title: "" })); }}
                  autoFocus
                />
                {fieldErrors.title && <div style={s.fe}>{fieldErrors.title}</div>}
              </div>
              <div style={s.fg}>
                <label style={s.label}>Description</label>
                <textarea style={s.textarea} value={form.description || ""} onChange={e => setF("description", e.target.value)} />
              </div>
              <div style={s.row}>
                <div style={{ ...s.fg, flex: 1 }}>
                  <label style={s.label}>Event Type</label>
                  <select style={s.select} value={form.event_type || "activity"} onChange={e => setF("event_type", e.target.value)}>
                    {EVENT_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ ...s.fg, flex: 1 }}>
                  <label style={s.label}>Color</label>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                    {EVENT_COLORS.map(c => (
                      <button key={c} onClick={() => setF("color_hex", c)}
                        style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: form.color_hex === c ? "3px solid #333" : "2px solid transparent", cursor: "pointer" }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div style={s.row}>
                <div style={{ ...s.fg, flex: 1 }}>
                  <label style={s.label}>Start Date *</label>
                  <input
                    style={{ ...s.input, borderColor: fieldErrors.start_date ? "#dc2626" : G.pale }}
                    type="date"
                    value={form.start_date || ""}
                    onChange={e => { setF("start_date", e.target.value); if (fieldErrors.start_date) setFieldErrors(fe => ({ ...fe, start_date: "" })); }}
                  />
                  {fieldErrors.start_date && <div style={s.fe}>{fieldErrors.start_date}</div>}
                </div>
                <div style={{ ...s.fg, flex: 1 }}>
                  <label style={s.label}>End Date</label>
                  <input
                    style={{ ...s.input, borderColor: fieldErrors.end_date ? "#dc2626" : G.pale }}
                    type="date"
                    value={form.end_date || ""}
                    onChange={e => { setF("end_date", e.target.value); if (fieldErrors.end_date) setFieldErrors(fe => ({ ...fe, end_date: "" })); }}
                  />
                  {fieldErrors.end_date && <div style={s.fe}>{fieldErrors.end_date}</div>}
                </div>
              </div>
              <div style={{ background: G.wash, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: G.dark, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon.Info /> Events are visible to all students in the mobile app.
              </div>
            </div>
            <div style={s.mFooter}>
              {editEvent && (
                <button style={s.btnDanger} onClick={() => { setShowModal(false); del(editEvent); }}>Delete</button>
              )}
              <button style={s.btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>
                {saving ? "Saving…" : editEvent ? "Save Changes" : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Modal (replaces browser confirm()) ── */}
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
    </div>
  );
}