import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark:  "#2d4a18", mid:   "#3a5a20", base:  "#5a7a3a",
  light: "#8ab060", pale:  "#b5cc8e", wash:  "#e8f2d8",
  cream: "#f6f9f0", white: "#fafdf6",
};

// ── UI Atoms ──────────────────────────────────────────────────────

function Btn({ children, onClick, variant = "primary", small, disabled, style = {} }) {
  const base = {
    border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
    padding: small ? "6px 14px" : "9px 20px",
    fontSize: small ? 12 : 13,
    opacity: disabled ? 0.5 : 1,
    transition: "all .15s",
    ...style,
  };
  const variants = {
    primary:   { background: G.dark,        color: "#fff" },
    secondary: { background: G.wash,        color: G.dark },
    danger:    { background: "#fef2f2",     color: "#c0392b" },
    ghost:     { background: "transparent", color: G.base, border: `1px solid ${G.pale}` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>;
}

function Input({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>{label}{required && " *"}</label>}
      <input
        type={type} value={value ?? ""} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 12px",
          fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white,
          color: G.dark, outline: "none",
        }}
      />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>{label}</label>}
      <textarea
        value={value ?? ""} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        style={{
          border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 12px",
          fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white,
          color: G.dark, outline: "none", resize: "vertical",
        }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>{label}</label>}
      <select
        value={value ?? ""} onChange={e => onChange(e.target.value)}
        style={{
          border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 12px",
          fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white,
          color: G.dark, outline: "none",
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Tag({ children, color }) {
  const map = {
    green:  { bg: G.wash,    text: G.dark },
    yellow: { bg: "#fff8e1", text: "#7a5c00" },
    gray:   { bg: "#f0f0f0", text: "#555" },
    red:    { bg: "#fef2f2", text: "#c0392b" },
    blue:   { bg: "#e8f0fe", text: "#1a56a8" },
    purple: { bg: "#f3e8ff", text: "#6b21a8" },
    teal:   { bg: "#e0f7f4", text: "#0f766e" },
  };
  const c = map[color] || map.gray;
  return (
    <span style={{
      background: c.bg, color: c.text, borderRadius: 20, padding: "2px 10px",
      fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase",
    }}>{children}</span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 20,
    }}>
      <div style={{
        background: G.white, borderRadius: 16, width: "100%",
        maxWidth: 520, maxHeight: "90vh",
        overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: `1px solid ${G.wash}`,
          position: "sticky", top: 0, background: G.white, zIndex: 1,
        }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.dark, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>✕</button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const EVENT_TYPES = [
  { value: "seminar",    label: "Seminar",    color: "blue"   },
  { value: "training",   label: "Training",   color: "purple" },
  { value: "meeting",    label: "Meeting",    color: "teal"   },
  { value: "holiday",    label: "Holiday",    color: "yellow" },
  { value: "deadline",   label: "Deadline",   color: "red"    },
  { value: "other",      label: "Other",      color: "gray"   },
];

function typeColor(t) {
  return EVENT_TYPES.find(e => e.value === t)?.color ?? "gray";
}

function typeDot(t) {
  const map = {
    seminar:  G.base,
    training: "#9333ea",
    meeting:  "#0d9488",
    holiday:  "#ca8a04",
    deadline: "#dc2626",
    other:    "#888",
  };
  return map[t] ?? "#888";
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}

function toLocalDatetime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Get event date key "YYYY-MM-DD" ──────────────────────────────
function eventDateKey(ev) {
  const raw = ev.start_date ?? ev.start_time ?? ev.scheduled_at ?? ev.date ?? ev.created_at;
  if (!raw) return null;
  return raw.slice(0, 10);
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function CalendarPage() {
  const today = new Date();
  const [year,   setYear]   = useState(today.getFullYear());
  const [month,  setMonth]  = useState(today.getMonth()); // 0-indexed
  const [events, setEvents] = useState([]);
  const [loading,setLoading]= useState(true);
  const [view,   setView]   = useState("calendar"); // "calendar" | "list"
  const [modal,  setModal]  = useState(null); // "add"|"edit"|"detail"
  const [form,   setForm]   = useState({});
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);
  const [selected, setSelected] = useState(null); // event for detail view
  const [dayEvents, setDayEvents] = useState(null); // { date, events[] }

  useEffect(() => { fetchEvents(); }, []);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchEvents = async () => {
    setLoading(true);
    const { data, error: err } = await supabase.from("events").select("*");
    if (err) console.error("Events fetch error:", err.message);
    setEvents(data ?? []);
    setLoading(false);
  };

  // ── Save ─────────────────────────────────────────────────────
  const save = async () => {
    if (!form.title?.trim()) { setError("Title is required."); return; }
    setSaving(true); setError(null);

    // Build payload — try common column names
    const startVal = form.start_date || null;
    const payload = {
      title:       form.title.trim(),
      description: form.description?.trim() ?? null,
      event_type:  form.event_type || "other",
      location:    form.location?.trim() ?? null,
      // Write to multiple possible column names so it lands in whichever exists
      ...(startVal ? { start_date: startVal, start_time: startVal, scheduled_at: startVal, date: startVal } : {}),
      ...(form.end_date ? { end_date: form.end_date, end_time: form.end_date } : {}),
      is_all_day:  !!form.is_all_day,
    };

    let err;
    if (form.id) {
      ({ error: err } = await supabase.from("events").update(payload).eq("id", form.id));
    } else {
      ({ error: err } = await supabase.from("events").insert(payload));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    setModal(null); setDayEvents(null); setForm({});
    fetchEvents();
  };

  // ── Delete ───────────────────────────────────────────────────
  const remove = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    await supabase.from("events").delete().eq("id", id);
    setModal(null); setDayEvents(null);
    fetchEvents();
  };

  // ── Calendar grid helpers ────────────────────────────────────
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey  = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  // Map events by date key
  const eventsByDate = {};
  events.forEach(ev => {
    const key = eventDateKey(ev);
    if (!key) return;
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(ev);
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  const openAddOnDate = (dateStr) => {
    setForm({ start_date: dateStr + "T08:00", event_type: "other" });
    setError(null); setModal("add");
  };

  // ── Upcoming events for list view ────────────────────────────
  const sortedEvents = [...events].sort((a, b) => {
    const da = eventDateKey(a) ?? "";
    const db = eventDateKey(b) ?? "";
    return da < db ? -1 : 1;
  });

  const upcomingEvents = sortedEvents.filter(ev => {
    const key = eventDateKey(ev);
    return key && key >= todayKey;
  });

  const pastEvents = sortedEvents.filter(ev => {
    const key = eventDateKey(ev);
    return key && key < todayKey;
  }).reverse();

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: G.dark, margin: 0 }}>
            Calendar
          </h1>
          <p style={{ color: G.base, margin: "4px 0 0", fontSize: 14 }}>
            Schedule and manage GADRC events.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* View toggle */}
          <div style={{ display: "flex", border: `1px solid ${G.pale}`, borderRadius: 8, overflow: "hidden" }}>
            {[["calendar","📅 Calendar"],["list","📋 List"]].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "7px 16px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                background: view === v ? G.dark : "transparent",
                color:      view === v ? "#fff"  : G.base,
              }}>{l}</button>
            ))}
          </div>
          <Btn onClick={() => { setForm({ event_type: "other" }); setError(null); setModal("add"); }}>
            + New Event
          </Btn>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: G.base }}>🌸 Loading…</div>
      ) : (
        <>
          {/* ── CALENDAR VIEW ── */}
          {view === "calendar" && (
            <div style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 16, overflow: "hidden" }}>

              {/* Month nav */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 24px", borderBottom: `1px solid ${G.wash}`,
                background: G.cream,
              }}>
                <button onClick={prevMonth} style={{ background: "none", border: `1px solid ${G.pale}`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 16, color: G.base }}>‹</button>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: G.dark }}>
                  {MONTHS[month]} {year}
                </div>
                <button onClick={nextMonth} style={{ background: "none", border: `1px solid ${G.pale}`, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 16, color: G.base }}>›</button>
              </div>

              {/* Day headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${G.wash}` }}>
                {DAYS.map(d => (
                  <div key={d} style={{
                    textAlign: "center", padding: "10px 0", fontSize: 11,
                    fontWeight: 700, color: G.base, letterSpacing: ".08em", textTransform: "uppercase",
                  }}>{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {/* Empty cells before first day */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ minHeight: 90, borderRight: `1px solid ${G.wash}`, borderBottom: `1px solid ${G.wash}`, background: G.cream }} />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateKey = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                  const dayEvs  = eventsByDate[dateKey] ?? [];
                  const isToday = dateKey === todayKey;
                  const col     = (firstDay + i) % 7;
                  const isLastCol = col === 6;

                  return (
                    <div
                      key={day}
                      onClick={() => {
                        if (dayEvs.length > 0) setDayEvents({ date: dateKey, events: dayEvs });
                        else openAddOnDate(dateKey);
                      }}
                      style={{
                        minHeight: 90, padding: "8px 6px",
                        borderRight: isLastCol ? "none" : `1px solid ${G.wash}`,
                        borderBottom: `1px solid ${G.wash}`,
                        cursor: "pointer",
                        background: isToday ? G.wash : "transparent",
                        transition: "background .15s",
                        position: "relative",
                      }}
                      onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = G.cream; }}
                      onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = "transparent"; }}
                    >
                      {/* Day number */}
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: isToday ? G.dark : "transparent",
                        color: isToday ? "#fff" : G.dark,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: isToday ? 700 : 500,
                        marginBottom: 4,
                      }}>{day}</div>

                      {/* Event dots */}
                      {dayEvs.slice(0, 3).map((ev, ei) => (
                        <div key={ev.id ?? ei} style={{
                          fontSize: 10, fontWeight: 600,
                          color: typeDot(ev.event_type),
                          background: typeDot(ev.event_type) + "22",
                          borderRadius: 4, padding: "1px 5px",
                          marginBottom: 2,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          maxWidth: "100%",
                        }}>
                          ● {ev.title}
                        </div>
                      ))}
                      {dayEvs.length > 3 && (
                        <div style={{ fontSize: 10, color: G.light, marginTop: 1 }}>+{dayEvs.length - 3} more</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ padding: "12px 24px", borderTop: `1px solid ${G.wash}`, display: "flex", gap: 16, flexWrap: "wrap" }}>
                {EVENT_TYPES.map(t => (
                  <div key={t.value} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: G.base }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: typeDot(t.value) }} />
                    {t.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {view === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Upcoming */}
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: G.dark, marginBottom: 12 }}>
                  📅 Upcoming Events ({upcomingEvents.length})
                </h2>
                {upcomingEvents.length === 0 ? (
                  <div style={{ color: G.light, fontSize: 13, padding: "20px 0" }}>No upcoming events.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {upcomingEvents.map(ev => <EventRow key={ev.id} ev={ev} onSelect={ev => { setSelected(ev); setModal("detail"); }} />)}
                  </div>
                )}
              </div>
              {/* Past */}
              {pastEvents.length > 0 && (
                <div>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: G.dark, marginBottom: 12 }}>
                    🕐 Past Events ({pastEvents.length})
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: 0.7 }}>
                    {pastEvents.map(ev => <EventRow key={ev.id} ev={ev} onSelect={ev => { setSelected(ev); setModal("detail"); }} />)}
                  </div>
                </div>
              )}
              {events.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 40px", color: "#aaa" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: G.dark, marginBottom: 8 }}>No events yet.</div>
                  <Btn onClick={() => { setForm({ event_type: "other" }); setError(null); setModal("add"); }}>+ New Event</Btn>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Day Events Popover ── */}
      {dayEvents && (
        <Modal title={`Events — ${fmtDate(dayEvents.date + "T00:00")}`} onClose={() => setDayEvents(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {dayEvents.events.map(ev => (
              <div key={ev.id} style={{
                background: G.cream, borderRadius: 10, padding: "12px 14px",
                border: `1px solid ${G.wash}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: G.dark, fontSize: 14, marginBottom: 4 }}>{ev.title}</div>
                    <div style={{ fontSize: 12, color: G.light, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {eventDateKey(ev) && <span>📅 {fmtDate(eventDateKey(ev) + "T00:00")}</span>}
                      {ev.location && <span>📍 {ev.location}</span>}
                    </div>
                  </div>
                  <Tag color={typeColor(ev.event_type)}>{ev.event_type || "other"}</Tag>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Btn small variant="ghost" onClick={() => {
                    setForm({
                      id: ev.id, title: ev.title, description: ev.description,
                      event_type: ev.event_type, location: ev.location,
                      is_all_day: ev.is_all_day,
                      start_date: toLocalDatetime(ev.start_date ?? ev.start_time ?? ev.scheduled_at ?? ev.date),
                      end_date:   toLocalDatetime(ev.end_date   ?? ev.end_time),
                    });
                    setError(null); setDayEvents(null); setModal("edit");
                  }}>Edit</Btn>
                  <Btn small variant="danger" onClick={() => remove(ev.id)}>Delete</Btn>
                </div>
              </div>
            ))}
          </div>
          <Btn variant="secondary" style={{ width: "100%" }}
            onClick={() => { openAddOnDate(dayEvents.date); setDayEvents(null); }}>
            + Add Event on This Day
          </Btn>
        </Modal>
      )}

      {/* ── Event Detail Modal (list view) ── */}
      {modal === "detail" && selected && (
        <Modal title="Event Details" onClose={() => { setModal(null); setSelected(null); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: G.dark }}>
                {selected.title}
              </div>
              <Tag color={typeColor(selected.event_type)}>{selected.event_type || "other"}</Tag>
            </div>
            <div style={{ fontSize: 13, color: G.base, display: "flex", flexDirection: "column", gap: 6 }}>
              {eventDateKey(selected) && <span>📅 {fmtDate(eventDateKey(selected) + "T00:00")}</span>}
              {selected.location     && <span>📍 {selected.location}</span>}
              {selected.is_all_day   && <span>🌅 All-day event</span>}
            </div>
            {selected.description && (
              <div style={{ fontSize: 13, color: G.dark, background: G.cream, borderRadius: 8, padding: "10px 14px" }}>
                {selected.description}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="danger" small onClick={() => remove(selected.id)}>Delete</Btn>
              <Btn variant="ghost" onClick={() => {
                setForm({
                  id: selected.id, title: selected.title, description: selected.description,
                  event_type: selected.event_type, location: selected.location,
                  is_all_day: selected.is_all_day,
                  start_date: toLocalDatetime(selected.start_date ?? selected.start_time ?? selected.scheduled_at ?? selected.date),
                  end_date:   toLocalDatetime(selected.end_date ?? selected.end_time),
                });
                setError(null); setModal("edit");
              }}>Edit</Btn>
              <Btn variant="ghost" onClick={() => { setModal(null); setSelected(null); }}>Close</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add / Edit Event Modal ── */}
      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? "New Event" : "Edit Event"} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} required />
            <Textarea label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} rows={2} />
            <Select label="Event Type" value={form.event_type || "other"}
              onChange={v => setForm(f => ({ ...f, event_type: v }))}
              options={EVENT_TYPES.map(t => ({ value: t.value, label: t.label }))} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Start" type="datetime-local" value={form.start_date}
                onChange={v => setForm(f => ({ ...f, start_date: v }))} />
              <Input label="End" type="datetime-local" value={form.end_date}
                onChange={v => setForm(f => ({ ...f, end_date: v }))} />
            </div>
            <Input label="Location" value={form.location}
              onChange={v => setForm(f => ({ ...f, location: v }))} placeholder="e.g. CvSU AVR" />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: G.dark, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form.is_all_day}
                onChange={e => setForm(f => ({ ...f, is_all_day: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: G.base }} />
              All-day event
            </label>
            {error && <div style={{ color: "#c0392b", fontSize: 13 }}>⚠️ {error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : modal === "add" ? "Create" : "Save Changes"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Event Row (list view) ─────────────────────────────────────────
function EventRow({ ev, onSelect }) {
  return (
    <div
      onClick={() => onSelect(ev)}
      style={{
        background: G.white, border: `1px solid ${G.pale}`, borderRadius: 12,
        padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
        cursor: "pointer", transition: "background .15s", flexWrap: "wrap",
      }}
      onMouseEnter={e => e.currentTarget.style.background = G.cream}
      onMouseLeave={e => e.currentTarget.style.background = G.white}
    >
      <div style={{
        width: 10, height: 10, borderRadius: "50%",
        background: typeDot(ev.event_type), flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontWeight: 700, color: G.dark, fontSize: 14 }}>{ev.title}</div>
        {ev.location && <div style={{ fontSize: 12, color: G.light }}>📍 {ev.location}</div>}
      </div>
      <div style={{ fontSize: 12, color: G.light }}>
        {fmtDate((eventDateKey(ev) ?? "") + "T00:00")}
      </div>
      <Tag color={typeColor(ev.event_type)}>{ev.event_type || "other"}</Tag>
    </div>
  );
}