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
    primary:   { background: G.dark,      color: "#fff" },
    secondary: { background: G.wash,      color: G.dark },
    danger:    { background: "#fef2f2",   color: "#c0392b" },
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

function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>{label}{required && " *"}</label>}
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
  };
  const c = map[color] || map.gray;
  return (
    <span style={{
      background: c.bg, color: c.text, borderRadius: 20, padding: "2px 10px",
      fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase",
    }}>{children}</span>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 20,
    }}>
      <div style={{
        background: G.white, borderRadius: 16, width: "100%",
        maxWidth: wide ? 760 : 560, maxHeight: "90vh",
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

function statusColor(s) {
  if (s === "upcoming")   return "blue";
  if (s === "ongoing")    return "green";
  if (s === "completed")  return "gray";
  if (s === "cancelled")  return "red";
  return "gray";
}

function typeColor(t) {
  return t === "online" ? "purple" : "blue";
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDateOnly(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STATUS_OPTIONS = [
  { value: "upcoming",  label: "Upcoming" },
  { value: "ongoing",   label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const TYPE_OPTIONS = [
  { value: "online",    label: "Online" },
  { value: "in_person", label: "In-Person" },
];

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function SeminarsPage() {
  const [seminars,      setSeminars]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [modal,         setModal]         = useState(null); // "add"|"edit"|"attendees"
  const [form,          setForm]          = useState({});
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState(null);
  const [selected,      setSelected]      = useState(null);
  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");

  // ── Attendees sub-state ──────────────────────────────────────
  const [registrations, setRegistrations] = useState([]);
  const [regLoading,    setRegLoading]    = useState(false);

  useEffect(() => { fetchData(); }, []);

  // ── Fetch seminars ───────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("seminars")
      .select("*");
    if (error) console.error("Seminars fetch error:", error.message);
    // Sort by any date-like column found, fallback to created_at
    const sorted = (data ?? []).sort((a, b) => {
      const da = a.scheduled_at ?? a.date ?? a.start_date ?? a.created_at ?? "";
      const db = b.scheduled_at ?? b.date ?? b.start_date ?? b.created_at ?? "";
      return da < db ? 1 : -1;
    });
    setSeminars(sorted);
    setLoading(false);
  };

  // ── Save seminar ─────────────────────────────────────────────
  const save = async () => {
    if (!form.title?.trim()) { setError("Title is required."); return; }
    setSaving(true); setError(null);

    const payload = {
      title:         form.title.trim(),
      description:   form.description?.trim()  ?? null,
      seminar_type:  form.seminar_type          || "online",
      status:        form.status                || "upcoming",
      location:      form.location?.trim()      ?? null,
      meeting_link:  form.meeting_link?.trim()  ?? null,
      scheduled_at:  form.scheduled_at          || null,
      end_time:      form.end_time              || null,
      max_slots:     form.max_slots ? Number(form.max_slots) : null,
      speaker_name:  form.speaker_name?.trim()  ?? null,
    };

    let err;
    if (form.id) {
      ({ error: err } = await supabase.from("seminars").update(payload).eq("id", form.id));
    } else {
      ({ error: err } = await supabase.from("seminars").insert(payload));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    setModal(null); setForm({});
    fetchData();
  };

  // ── Delete seminar ───────────────────────────────────────────
  const remove = async (id) => {
    if (!window.confirm("Delete this seminar? Registrations will also be removed.")) return;
    await supabase.from("seminars").delete().eq("id", id);
    fetchData();
  };

  // ── Open edit ────────────────────────────────────────────────
  const openEdit = (s) => {
    // Format datetime-local values
    const toLocal = (iso) => {
      if (!iso) return "";
      const d = new Date(iso);
      const pad = n => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setForm({
      id:           s.id,
      title:        s.title,
      description:  s.description,
      seminar_type: s.seminar_type,
      status:       s.status,
      location:     s.location,
      meeting_link: s.meeting_link,
      scheduled_at: toLocal(s.scheduled_at),
      end_time:     toLocal(s.end_time),
      max_slots:    s.max_slots,
      speaker_name: s.speaker_name,
    });
    setError(null);
    setModal("edit");
  };

  // ── Open attendees ────────────────────────────────────────────
  const openAttendees = async (s) => {
    setSelected(s);
    setModal("attendees");
    setRegLoading(true);
    const { data } = await supabase
      .from("seminar_registrations")
      .select("*, profiles(full_name, email)")
      .eq("seminar_id", s.id)
      .order("registered_at", { ascending: false });
    setRegistrations(data ?? []);
    setRegLoading(false);
  };

  // ── Mark attendance ───────────────────────────────────────────
  const toggleAttendance = async (reg) => {
    const newStatus = reg.status === "attended" ? "registered" : "attended";
    await supabase.from("seminar_registrations").update({ status: newStatus }).eq("id", reg.id);
    setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, status: newStatus } : r));
  };

  // ── Filtered list ─────────────────────────────────────────────
  const filtered = seminars.filter(s => {
    const matchSearch = !search ||
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.speaker_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.location?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: G.dark, margin: 0 }}>
            Seminars
          </h1>
          <p style={{ color: G.base, margin: "4px 0 0", fontSize: 14 }}>
            Manage GAD seminars, attendance, and registrations.
          </p>
        </div>
        <Btn onClick={() => { setForm({ seminar_type: "online", status: "upcoming" }); setError(null); setModal("add"); }}>
          + New Seminar
        </Btn>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search seminars…"
          style={{
            border: `1px solid ${G.pale}`, borderRadius: 10, padding: "9px 14px",
            fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white,
            color: G.dark, outline: "none", width: 280,
          }}
        />
        <select
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{
            border: `1px solid ${G.pale}`, borderRadius: 10, padding: "9px 14px",
            fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white,
            color: G.dark, outline: "none",
          }}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: G.base }}>🌸 Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 40px", color: "#aaa" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: G.dark, marginBottom: 8 }}>
            {search || filterStatus ? "No seminars match your filters." : "No seminars yet."}
          </div>
          {!search && !filterStatus && (
            <Btn onClick={() => { setForm({ seminar_type: "online", status: "upcoming" }); setError(null); setModal("add"); }}>
              + New Seminar
            </Btn>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map(s => (
            <div key={s.id} style={{
              background: G.white, border: `1px solid ${G.pale}`,
              borderRadius: 14, padding: "18px 22px",
              display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap",
            }}>
              {/* Left: info */}
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: G.dark, fontSize: 15 }}>{s.title}</span>
                  <Tag color={statusColor(s.status)}>{s.status || "upcoming"}</Tag>
                  <Tag color={typeColor(s.seminar_type)}>{s.seminar_type === "in_person" ? "In-Person" : "Online"}</Tag>
                </div>
                <div style={{ fontSize: 12, color: G.light, display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 4 }}>
                  {s.scheduled_at && <span>📅 {fmtDate(s.scheduled_at)}</span>}
                  {s.speaker_name && <span>🎤 {s.speaker_name}</span>}
                  {s.location     && <span>📍 {s.location}</span>}
                  {s.meeting_link && <span>🔗 <a href={s.meeting_link} target="_blank" rel="noreferrer" style={{ color: G.base }}>Join Link</a></span>}
                  {s.max_slots    && <span>🪑 {s.max_slots} slots</span>}
                </div>
                {s.description && (
                  <div style={{ fontSize: 12, color: "#aaa", maxWidth: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.description}
                  </div>
                )}
              </div>
              {/* Right: actions */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                <Btn small variant="secondary" onClick={() => openAttendees(s)}>👥 Attendees</Btn>
                <Btn small variant="ghost"     onClick={() => openEdit(s)}>Edit</Btn>
                <Btn small variant="danger"    onClick={() => remove(s.id)}>Delete</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? "New Seminar" : "Edit Seminar"} onClose={() => setModal(null)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} required />
            <Textarea label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Select
                label="Type" value={form.seminar_type || "online"}
                onChange={v => setForm(f => ({ ...f, seminar_type: v }))}
                options={TYPE_OPTIONS}
              />
              <Select
                label="Status" value={form.status || "upcoming"}
                onChange={v => setForm(f => ({ ...f, status: v }))}
                options={STATUS_OPTIONS}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Start Date & Time" type="datetime-local" value={form.scheduled_at}
                onChange={v => setForm(f => ({ ...f, scheduled_at: v }))} />
              <Input label="End Date & Time" type="datetime-local" value={form.end_time}
                onChange={v => setForm(f => ({ ...f, end_time: v }))} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Speaker Name" value={form.speaker_name}
                onChange={v => setForm(f => ({ ...f, speaker_name: v }))} placeholder="e.g. Dr. Maria Santos" />
              <Input label="Max Slots" type="number" value={form.max_slots}
                onChange={v => setForm(f => ({ ...f, max_slots: v }))} placeholder="e.g. 50" />
            </div>

            {/* Conditional fields */}
            {form.seminar_type === "in_person" || !form.seminar_type ? (
              <Input label="Location / Venue" value={form.location}
                onChange={v => setForm(f => ({ ...f, location: v }))} placeholder="e.g. CvSU AVR, Building A" />
            ) : null}
            {form.seminar_type === "online" || !form.seminar_type ? (
              <Input label="Meeting Link" value={form.meeting_link}
                onChange={v => setForm(f => ({ ...f, meeting_link: v }))} placeholder="https://meet.google.com/…" />
            ) : null}

            {error && <div style={{ color: "#c0392b", fontSize: 13 }}>⚠️ {error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : modal === "add" ? "Create" : "Save Changes"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Attendees Modal ── */}
      {modal === "attendees" && selected && (
        <Modal title={`Attendees — ${selected.title}`} onClose={() => { setModal(null); setSelected(null); }} wide>
          <div>
            {/* Seminar quick-info */}
            <div style={{
              background: G.cream, borderRadius: 10, padding: "12px 16px",
              marginBottom: 16, fontSize: 13, color: G.base,
              display: "flex", gap: 20, flexWrap: "wrap",
            }}>
              {selected.scheduled_at && <span>📅 {fmtDate(selected.scheduled_at)}</span>}
              {selected.location     && <span>📍 {selected.location}</span>}
              {selected.meeting_link && <span>🔗 <a href={selected.meeting_link} target="_blank" rel="noreferrer" style={{ color: G.base }}>Join Link</a></span>}
              <span>🪑 {registrations.length} registered</span>
              <span>✅ {registrations.filter(r => r.status === "attended").length} attended</span>
            </div>

            {regLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: G.base }}>🌸 Loading…</div>
            ) : registrations.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                No registrations yet.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${G.wash}` }}>
                    {["Name", "Email", "Registered", "Status", "Mark"].map(h => (
                      <th key={h} style={{
                        textAlign: "left", padding: "8px 10px",
                        fontSize: 11, fontWeight: 700, color: G.base,
                        letterSpacing: ".05em", textTransform: "uppercase",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg, i) => (
                    <tr key={reg.id} style={{
                      borderBottom: `1px solid ${G.wash}`,
                      background: reg.status === "attended" ? G.cream : "transparent",
                    }}>
                      <td style={{ padding: "10px", fontSize: 13, color: G.dark, fontWeight: 500 }}>
                        {reg.profiles?.full_name ?? "—"}
                      </td>
                      <td style={{ padding: "10px", fontSize: 12, color: G.light }}>
                        {reg.profiles?.email ?? "—"}
                      </td>
                      <td style={{ padding: "10px", fontSize: 12, color: G.light }}>
                        {fmtDateOnly(reg.registered_at)}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <Tag color={reg.status === "attended" ? "green" : reg.status === "cancelled" ? "red" : "yellow"}>
                          {reg.status || "registered"}
                        </Tag>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <Btn small variant={reg.status === "attended" ? "danger" : "secondary"}
                          onClick={() => toggleAttendance(reg)}>
                          {reg.status === "attended" ? "Unmark" : "✓ Attended"}
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}