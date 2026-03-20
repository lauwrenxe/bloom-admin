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

const s = {
  page:    { padding: "28px 32px", fontFamily: "'Segoe UI', system-ui, sans-serif", background: G.cream, minHeight: "100vh" },
  header:  { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title:   { fontSize: 22, fontWeight: 800, color: G.dark, margin: 0 },
  addBtn:  { padding: "9px 18px", background: G.dark, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  grid:    { display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" },
  calBox:  { background: "#fff", borderRadius: 16, border: `1px solid ${G.wash}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  calHdr:  { background: G.dark, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  calNav:  { background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: "4px 8px", borderRadius: 6 },
  calMonth:{ fontSize: 16, fontWeight: 700, color: "#fff" },
  dayGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)" },
  dayHdr:  { padding: "10px 0", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase" },
  dayCell: (today, otherMonth, hasEvent) => ({
    minHeight: 72, padding: "6px 4px", border: `1px solid ${G.wash}`, cursor: "pointer",
    background: today ? G.wash : "#fff",
    opacity: otherMonth ? 0.35 : 1,
    transition: "background .1s",
  }),
  dayNum:  (today) => ({ fontSize: 12, fontWeight: today ? 800 : 500, color: today ? G.dark : "#555", marginBottom: 3, display: "block", textAlign: "center" }),
  eventDot:{ fontSize: 10, padding: "1px 5px", borderRadius: 4, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#fff", fontWeight: 600 },
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
  iconBtn: (c) => ({ background: "none", border: "none", cursor: "pointer", color: c || "#999", fontSize: 14, padding: "4px 6px", borderRadius: 6 }),
  tag:    (c) => ({ display: "inline-flex", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: c + "22", color: c }),
};

export default function CalendarPage() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [today]               = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("events").select("*").order("start_date");
      if (active) { setEvents(data || []); setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const reload = async () => {
    const { data } = await supabase.from("events").select("*").order("start_date");
    setEvents(data || []);
  };

  const openAdd = (date) => {
    setEditEvent(null);
    setForm({ event_type: "activity", color_hex: EVENT_COLORS[0], is_all_day: true, start_date: date || "", end_date: date || "" });
    setError(""); setShowModal(true);
  };

  const openEdit = (ev) => {
    setEditEvent(ev);
    const { is_public: _ip, ...evWithoutPublic } = ev; setForm(evWithoutPublic);
    setError(""); setShowModal(true);
  };

  const save = async () => {
    if (!form.title?.trim()) { setError("Title is required."); return; }
    if (!form.start_date)    { setError("Start date is required."); return; }
    setSaving(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      title: form.title.trim(), description: form.description?.trim() || null,
      event_type: form.event_type || "activity",
      start_date: form.start_date, end_date: form.end_date || form.start_date,
      is_all_day: form.is_all_day ?? true,
      color_hex: form.color_hex || EVENT_COLORS[0],
    };
    let err;
    if (editEvent) {
      ({ error: err } = await supabase.from("events").update(payload).eq("id", editEvent.id));
    } else {
      ({ error: err } = await supabase.from("events").insert({ ...payload, created_by: user?.id }));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowModal(false); setForm({}); reload();
  };

  const del = async (ev) => {
    if (!confirm(`Delete "${ev.title}"?`)) return;
    await supabase.from("events").delete().eq("id", ev.id);
    if (selected?.id === ev.id) setSelected(null);
    reload();
  };

  // Calendar helpers
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
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
  for (let i = 0; i < firstDay; i++) cells.push({ day: daysInPrev - firstDay + 1 + i, current: false, date: new Date(year, month - 1, daysInPrev - firstDay + 1 + i) });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, current: true, date: new Date(year, month, i) });
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) cells.push({ day: i, current: false, date: new Date(year, month + 1, i) });

  // Upcoming events
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const upcoming = events.filter(e => (e.start_date?.slice(0, 10) || "") >= todayStr).slice(0, 8);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>📅 Calendar</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{events.length} events total</div>
        </div>
        <button style={s.addBtn} onClick={() => openAdd(todayStr)}>＋ New Event</button>
      </div>

      <div style={s.grid}>
        {/* Calendar */}
        <div style={s.calBox}>
          <div style={s.calHdr}>
            <button style={s.calNav} onClick={() => setViewDate(new Date(year, month - 1, 1))}>‹</button>
            <span style={s.calMonth}>{MONTH_NAMES[month]} {year}</span>
            <button style={s.calNav} onClick={() => setViewDate(new Date(year, month + 1, 1))}>›</button>
          </div>
          <div style={s.dayGrid}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} style={s.dayHdr}>{d}</div>)}
            {cells.map((cell, i) => {
              // Use local date to avoid UTC offset shifting the day back
              const dateStr = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, '0')}-${String(cell.date.getDate()).padStart(2, '0')}`;
              const isToday = cell.current && cell.date.toDateString() === today.toDateString();
              const dayEvents = eventsForDate(dateStr);
              return (
                <div key={i} style={s.dayCell(isToday, !cell.current, dayEvents.length > 0)}
                  onClick={() => cell.current && openAdd(dateStr)}>
                  <span style={s.dayNum(isToday)}>{cell.day}</span>
                  {dayEvents.slice(0, 2).map(ev => (
                    <div key={ev.id} style={{ ...s.eventDot, background: ev.color_hex || G.base }}
                      onClick={e => { e.stopPropagation(); openEdit(ev); }}>
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && <div style={{ fontSize: 9, color: "#888", textAlign: "center" }}>+{dayEvents.length - 2} more</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div style={s.sidebar}>
          <div style={{ fontWeight: 700, color: G.dark, fontSize: 14 }}>📆 Upcoming Events</div>
          {loading ? <div style={{ color: "#aaa", fontSize: 13 }}>Loading…</div>
            : upcoming.length === 0 ? <div style={{ color: "#aaa", fontSize: 13 }}>No upcoming events</div>
            : upcoming.map(ev => (
              <div key={ev.id} style={{ ...s.eventCard, borderLeft: `4px solid ${ev.color_hex || G.base}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: G.dark, fontSize: 14 }}>{ev.title}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>
                      {formatDate(ev.start_date)}{ev.end_date && ev.end_date !== ev.start_date ? ` – ${formatDate(ev.end_date)}` : ""}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <span style={s.tag(ev.color_hex || G.base)}>{ev.event_type}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    <button style={s.iconBtn(G.base)} onClick={() => openEdit(ev)}>✏️</button>
                    <button style={s.iconBtn("#dc2626")} onClick={() => del(ev)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.mHeader}>
              <span style={s.mTitle}>{editEvent ? "Edit Event" : "New Event"}</span>
              <button style={s.iconBtn()} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={s.mBody}>
              {error && <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{error}</div>}
              <div style={s.fg}>
                <label style={s.label}>Title *</label>
                <input style={s.input} value={form.title || ""} onChange={e => setF("title", e.target.value)} autoFocus />
              </div>
              <div style={s.fg}>
                <label style={s.label}>Description</label>
                <textarea style={s.textarea} value={form.description || ""} onChange={e => setF("description", e.target.value)} />
              </div>
              <div style={s.row}>
                <div style={{ ...s.fg, flex: 1 }}>
                  <label style={s.label}>Event Type</label>
                  <select style={s.select} value={form.event_type || "academic"} onChange={e => setF("event_type", e.target.value)}>
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    {/* Valid: holiday, activity, seminar, deadline, announcement */}
                  </select>
                </div>
                <div style={{ ...s.fg, flex: 1 }}>
                  <label style={s.label}>Color</label>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                    {EVENT_COLORS.map(c => (
                      <button key={c} onClick={() => setF("color_hex", c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: form.color_hex === c ? "3px solid #333" : "2px solid transparent", cursor: "pointer" }} />
                    ))}
                  </div>
                </div>
              </div>
              <div style={s.row}>
                <div style={{ ...s.fg, flex: 1 }}>
                  <label style={s.label}>Start Date *</label>
                  <input style={s.input} type="date" value={form.start_date || ""} onChange={e => setF("start_date", e.target.value)} />
                </div>
                <div style={{ ...s.fg, flex: 1 }}>
                  <label style={s.label}>End Date</label>
                  <input style={s.input} type="date" value={form.end_date || ""} onChange={e => setF("end_date", e.target.value)} />
                </div>
              </div>
              <div style={{ background: G.wash, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: G.dark }}>
                📢 Events are visible to all students in the mobile app.
              </div>
            </div>
            <div style={s.mFooter}>
              {editEvent && <button style={s.btnDanger} onClick={() => { del(editEvent); setShowModal(false); }}>Delete</button>}
              <button style={s.btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>{saving ? "Saving…" : editEvent ? "Save Changes" : "Create Event"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}