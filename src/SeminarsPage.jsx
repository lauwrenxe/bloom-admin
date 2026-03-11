import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark:  "#2d4a18", mid:   "#3a5a20", base:  "#5a7a3a",
  light: "#8ab060", pale:  "#b5cc8e", wash:  "#e8f2d8",
  cream: "#f6f9f0", white: "#fafdf6",
};

const SUPABASE_URL = "https://vfpgzuehfebhawlidhsz.supabase.co";

// ── UI Atoms ──────────────────────────────────────────────────────

function Btn({ children, onClick, variant = "primary", small, disabled, style: s = {} }) {
  const base = {
    border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
    padding: small ? "6px 14px" : "9px 20px",
    fontSize: small ? 12 : 13, opacity: disabled ? 0.5 : 1,
    transition: "all .15s", ...s,
  };
  const variants = {
    primary:   { background: `linear-gradient(135deg,${G.base},${G.dark})`, color: "#fff" },
    secondary: { background: G.wash,          color: G.dark },
    danger:    { background: "#fef2f2",       color: "#c0392b", border: "1px solid #f5c6cb" },
    ghost:     { background: "transparent",   color: G.base,   border: `1px solid ${G.pale}` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>;
}

function Input({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid, textTransform: "uppercase", letterSpacing: ".4px" }}>
        {label}{required && " *"}
      </label>}
      <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ border: `1.5px solid ${G.wash}`, borderRadius: 10, padding: "9px 13px",
          fontSize: 13.5, fontFamily: "'DM Sans', sans-serif", background: "#fff", color: "#222", outline: "none" }}
        onFocus={e => e.target.style.borderColor = G.base}
        onBlur={e  => e.target.style.borderColor = G.wash}
      />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid, textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</label>}
      <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ border: `1.5px solid ${G.wash}`, borderRadius: 10, padding: "9px 13px",
          fontSize: 13.5, fontFamily: "'DM Sans', sans-serif", background: "#fff", color: "#222",
          outline: "none", resize: "vertical" }}
        onFocus={e => e.target.style.borderColor = G.base}
        onBlur={e  => e.target.style.borderColor = G.wash}
      />
    </div>
  );
}

function Select({ label, value, onChange, options = [], required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid, textTransform: "uppercase", letterSpacing: ".4px" }}>
        {label}{required && " *"}
      </label>}
      <select value={value ?? ""} onChange={e => onChange(e.target.value)}
        style={{ border: `1.5px solid ${G.wash}`, borderRadius: 10, padding: "9px 13px",
          fontSize: 13.5, fontFamily: "'DM Sans', sans-serif", background: "#fff", color: "#222", outline: "none" }}>
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
    <span style={{ background: c.bg, color: c.text, borderRadius: 20, padding: "2px 10px",
      fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>
      {children}
    </span>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: G.white, borderRadius: 20, width: "100%",
        maxWidth: wide ? 760 : 560, maxHeight: "92vh", overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 28px", borderBottom: `1px solid ${G.wash}`,
          position: "sticky", top: 0, background: G.white, zIndex: 1 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: G.dark, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#aaa" }}>×</button>
        </div>
        <div style={{ padding: "24px 28px" }}>{children}</div>
      </div>
    </div>
  );
}

// ── Cover Image Uploader ──────────────────────────────────────────
function CoverUploader({ value, onChange }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setUploadErr("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024)    { setUploadErr("Image must be under 5MB."); return; }
    setUploadErr(""); setUploading(true);

    const ext  = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("seminar-covers")
      .upload(path, file, { upsert: true });

    if (error) { setUploadErr(error.message); setUploading(false); return; }

    const url = `${SUPABASE_URL}/storage/v1/object/public/seminar-covers/${path}`;
    onChange(url);
    setUploading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: G.mid, textTransform: "uppercase", letterSpacing: ".4px" }}>
        Cover Image
      </label>
      {value ? (
        <div style={{ position: "relative", width: "100%", height: 160, borderRadius: 10,
          overflow: "hidden", border: `1.5px solid ${G.pale}` }}>
          <img src={value} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <button onClick={() => onChange("")}
            style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.55)",
              color: "#fff", border: "none", borderRadius: "50%", width: 28, height: 28,
              cursor: "pointer", fontSize: 14 }}>×</button>
        </div>
      ) : (
        <div onClick={() => !uploading && inputRef.current?.click()}
          style={{ border: `2px dashed ${G.pale}`, borderRadius: 10, padding: "28px 20px",
            textAlign: "center", cursor: uploading ? "wait" : "pointer", background: G.cream }}
          onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = G.base; }}
          onMouseLeave={e => e.currentTarget.style.borderColor = G.pale}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{uploading ? "⏳" : "🖼️"}</div>
          <div style={{ fontSize: 13, color: G.base, fontWeight: 600 }}>
            {uploading ? "Uploading…" : "Click to upload cover image"}
          </div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>PNG, JPG, WebP · max 5MB</div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      {uploadErr && <div style={{ fontSize: 12, color: "#c0392b" }}>⚠️ {uploadErr}</div>}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────
function statusColor(s) {
  if (s === "upcoming")  return "blue";
  if (s === "ongoing")   return "green";
  if (s === "completed") return "gray";
  if (s === "cancelled") return "red";
  return "gray";
}

function typeColor(t) {
  if (t === "webinar")   return "purple";
  if (t === "hybrid")    return "teal";
  return "blue"; // in_person
}

function typeLabel(t) {
  if (t === "webinar")   return "Webinar";
  if (t === "hybrid")    return "Hybrid";
  return "In-Person";
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
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

// datetime-local input needs "YYYY-MM-DDTHH:MM" format
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_OPTIONS = [
  { value: "upcoming",  label: "Upcoming" },
  { value: "ongoing",   label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const TYPE_OPTIONS = [
  { value: "in_person", label: "In-Person" },
  { value: "webinar",   label: "Webinar" },
  { value: "hybrid",    label: "Hybrid" },
];

const PLATFORM_OPTIONS = [
  { value: "",       label: "— None —" },
  { value: "zoom",   label: "Zoom" },
  { value: "gmeet",  label: "Google Meet" },
  { value: "teams",  label: "Microsoft Teams" },
  { value: "other",  label: "Other" },
];

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function SeminarsPage() {
  const [seminars,      setSeminars]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [modal,         setModal]         = useState(null);
  const [form,          setForm]          = useState({});
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState(null);
  const [selected,      setSelected]      = useState(null);
  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [userId,        setUserId]        = useState(null);

  const [registrations, setRegistrations] = useState([]);
  const [regLoading,    setRegLoading]    = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("seminars").select("*");
      if (!cancelled) {
        const sorted = (data ?? []).sort((a, b) =>
          (b.scheduled_start ?? b.created_at) > (a.scheduled_start ?? a.created_at) ? 1 : -1
        );
        setSeminars(sorted);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("seminars").select("*");
    const sorted = (data ?? []).sort((a, b) =>
      (b.scheduled_start ?? b.created_at) > (a.scheduled_start ?? a.created_at) ? 1 : -1
    );
    setSeminars(sorted);
  };

  // ── Save ─────────────────────────────────────────────────────
  const save = async () => {
    if (!form.title?.trim())      { setError("Title is required."); return; }
    if (!form.scheduled_start)    { setError("Start date & time is required."); return; }
    if (!form.scheduled_end)      { setError("End date & time is required."); return; }
    setSaving(true); setError(null);

    const payload = {
      title:              form.title.trim(),
      description:        form.description?.trim()   || null,
      seminar_type:       form.seminar_type           || "in_person",
      status:             form.status                 || "upcoming",
      cover_image_url:    form.cover_image_url        || null,
      venue:              form.venue?.trim()          || null,
      webinar_link:       form.webinar_link?.trim()   || null,
      webinar_platform:   form.webinar_platform       || null,
      scheduled_start:    new Date(form.scheduled_start).toISOString(),
      scheduled_end:      new Date(form.scheduled_end).toISOString(),
      max_participants:   form.max_participants ? Number(form.max_participants) : null,
      is_public:          form.is_public !== false,
    };

    // Clear platform if not webinar/hybrid
    if (payload.seminar_type === "in_person") {
      payload.webinar_link     = null;
      payload.webinar_platform = null;
    }

    let err;
    if (form.id) {
      ({ error: err } = await supabase.from("seminars").update(payload).eq("id", form.id));
    } else {
      ({ error: err } = await supabase.from("seminars").insert({ ...payload, created_by: userId }));
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    setModal(null); setForm({});
    fetchData();
  };

  // ── Delete ────────────────────────────────────────────────────
  const remove = async (id) => {
    if (!window.confirm("Delete this seminar? All registrations will also be removed.")) return;
    await supabase.from("seminars").delete().eq("id", id);
    fetchData();
  };

  // ── Open edit ─────────────────────────────────────────────────
  const openEdit = (s) => {
    setForm({
      id:               s.id,
      title:            s.title,
      description:      s.description     ?? "",
      seminar_type:     s.seminar_type,
      status:           s.status,
      cover_image_url:  s.cover_image_url ?? "",
      venue:            s.venue           ?? "",
      webinar_link:     s.webinar_link    ?? "",
      webinar_platform: s.webinar_platform ?? "",
      scheduled_start:  toLocalInput(s.scheduled_start),
      scheduled_end:    toLocalInput(s.scheduled_end),
      max_participants: s.max_participants ?? "",
      is_public:        s.is_public !== false,
    });
    setError(null); setModal("edit");
  };

  // ── Attendees ─────────────────────────────────────────────────
  const openAttendees = async (s) => {
    setSelected(s); setModal("attendees"); setRegLoading(true);
    const { data } = await supabase
      .from("seminar_registrations")
      .select("*, profiles(full_name, email)")
      .eq("seminar_id", s.id);
    // Sort by registered_at in JS to avoid unknown column issues
    const sorted = (data ?? []).sort((a, b) =>
      (b.registered_at ?? b.created_at ?? "") > (a.registered_at ?? a.created_at ?? "") ? 1 : -1
    );
    setRegistrations(sorted);
    setRegLoading(false);
  };

  const toggleAttendance = async (reg) => {
    const newStatus = reg.status === "attended" ? "registered" : "attended";
    await supabase.from("seminar_registrations").update({ status: newStatus }).eq("id", reg.id);
    setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, status: newStatus } : r));
  };

  // ── Filter ────────────────────────────────────────────────────
  const filtered = seminars.filter(s => {
    const matchSearch = !search ||
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.venue?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const isWebinarType = form.seminar_type === "webinar" || form.seminar_type === "hybrid";
  const isVenueType   = form.seminar_type === "in_person" || form.seminar_type === "hybrid";

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: G.dark, margin: 0 }}>
            Seminars
          </h1>
          <p style={{ color: G.base, margin: "4px 0 0", fontSize: 14 }}>
            Manage GAD seminars, attendance, and registrations.
          </p>
        </div>
        <Btn onClick={() => {
          setForm({ seminar_type: "in_person", status: "upcoming", is_public: true });
          setError(null); setModal("add");
        }}>+ New Seminar</Btn>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search seminars…"
          style={{ border: `1px solid ${G.pale}`, borderRadius: 10, padding: "9px 14px",
            fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white,
            color: G.dark, outline: "none", width: 280 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ border: `1px solid ${G.pale}`, borderRadius: 10, padding: "9px 14px",
            fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, color: G.dark, outline: "none" }}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: G.base }}>🌸 Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 40px", color: "#aaa" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎙️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: G.dark, marginBottom: 8 }}>
            {search || filterStatus ? "No seminars match your filters." : "No seminars yet."}
          </div>
          {!search && !filterStatus && (
            <Btn onClick={() => { setForm({ seminar_type: "in_person", status: "upcoming", is_public: true }); setError(null); setModal("add"); }}>
              + New Seminar
            </Btn>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map(s => (
            <div key={s.id} style={{ background: G.white, border: `1px solid ${G.pale}`,
              borderRadius: 14, overflow: "hidden",
              display: "flex", alignItems: "stretch", gap: 0 }}>

              {/* Cover image strip */}
              {s.cover_image_url ? (
                <div style={{ width: 90, flexShrink: 0 }}>
                  <img src={s.cover_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              ) : (
                <div style={{ width: 90, flexShrink: 0, background: G.wash,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🎙️</div>
              )}

              {/* Content */}
              <div style={{ flex: 1, padding: "16px 20px", display: "flex", alignItems: "flex-start",
                justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, color: G.dark, fontSize: 15 }}>{s.title}</span>
                    <Tag color={statusColor(s.status)}>{s.status || "upcoming"}</Tag>
                    <Tag color={typeColor(s.seminar_type)}>{typeLabel(s.seminar_type)}</Tag>
                    {!s.is_public && <Tag color="gray">Private</Tag>}
                  </div>
                  <div style={{ fontSize: 12, color: G.light, display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 4 }}>
                    {s.scheduled_start && <span>📅 {fmtDate(s.scheduled_start)}</span>}
                    {s.venue           && <span>📍 {s.venue}</span>}
                    {s.webinar_link    && <span>🔗 <a href={s.webinar_link} target="_blank" rel="noreferrer" style={{ color: G.base }}>Join Link</a></span>}
                    {s.webinar_platform && <span>💻 {s.webinar_platform}</span>}
                    {s.max_participants && <span>🪑 {s.max_participants} slots</span>}
                  </div>
                  {s.description && (
                    <div style={{ fontSize: 12, color: "#aaa", maxWidth: 500,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.description}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                  <Btn small variant="secondary" onClick={() => openAttendees(s)}>👥 Attendees</Btn>
                  <Btn small variant="ghost"     onClick={() => openEdit(s)}>Edit</Btn>
                  <Btn small variant="danger"    onClick={() => remove(s.id)}>Delete</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? "New Seminar" : "Edit Seminar"} onClose={() => setModal(null)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <CoverUploader value={form.cover_image_url} onChange={v => setForm(f => ({ ...f, cover_image_url: v }))} />

            <Input label="Title" value={form.title}
              onChange={v => setForm(f => ({ ...f, title: v }))} required />
            <Textarea label="Description" value={form.description}
              onChange={v => setForm(f => ({ ...f, description: v }))} rows={2} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Select label="Type" value={form.seminar_type || "in_person"}
                onChange={v => setForm(f => ({ ...f, seminar_type: v }))} options={TYPE_OPTIONS} />
              <Select label="Status" value={form.status || "upcoming"}
                onChange={v => setForm(f => ({ ...f, status: v }))} options={STATUS_OPTIONS} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Start Date & Time" type="datetime-local" value={form.scheduled_start}
                onChange={v => setForm(f => ({ ...f, scheduled_start: v }))} required />
              <Input label="End Date & Time" type="datetime-local" value={form.scheduled_end}
                onChange={v => setForm(f => ({ ...f, scheduled_end: v }))} required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Max Participants" type="number" value={form.max_participants}
                onChange={v => setForm(f => ({ ...f, max_participants: v }))} placeholder="e.g. 50" />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: G.mid, textTransform: "uppercase", letterSpacing: ".4px" }}>
                  Visibility
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: G.dark, cursor: "pointer", paddingTop: 9 }}>
                  <input type="checkbox" checked={form.is_public !== false}
                    onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: G.base }} />
                  Public seminar (visible to students)
                </label>
              </div>
            </div>

            {/* Venue — shown for in_person and hybrid */}
            {isVenueType && (
              <Input label="Venue / Location" value={form.venue}
                onChange={v => setForm(f => ({ ...f, venue: v }))} placeholder="e.g. CvSU AVR, Building A" />
            )}

            {/* Webinar fields — shown for webinar and hybrid */}
            {isWebinarType && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="Webinar Link" value={form.webinar_link}
                  onChange={v => setForm(f => ({ ...f, webinar_link: v }))} placeholder="https://meet.google.com/…" />
                <Select label="Platform" value={form.webinar_platform || ""}
                  onChange={v => setForm(f => ({ ...f, webinar_platform: v }))} options={PLATFORM_OPTIONS} />
              </div>
            )}

            {error && <div style={{ color: "#c0392b", fontSize: 13, background: "#fdecea",
              padding: "10px 14px", borderRadius: 10, border: "1px solid #f5c6cb" }}>⚠️ {error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : modal === "add" ? "Create Seminar" : "Save Changes"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Attendees Modal ── */}
      {modal === "attendees" && selected && (
        <Modal title={`Attendees — ${selected.title}`} onClose={() => { setModal(null); setSelected(null); }} wide>
          <div>
            <div style={{ background: G.cream, borderRadius: 10, padding: "12px 16px",
              marginBottom: 16, fontSize: 13, color: G.base, display: "flex", gap: 20, flexWrap: "wrap" }}>
              {selected.scheduled_start && <span>📅 {fmtDate(selected.scheduled_start)}</span>}
              {selected.venue           && <span>📍 {selected.venue}</span>}
              {selected.webinar_link    && <span>🔗 <a href={selected.webinar_link} target="_blank" rel="noreferrer" style={{ color: G.base }}>Join Link</a></span>}
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
                      <th key={h} style={{ textAlign: "left", padding: "8px 10px",
                        fontSize: 11, fontWeight: 700, color: G.base,
                        letterSpacing: ".05em", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registrations.map(reg => (
                    <tr key={reg.id} style={{ borderBottom: `1px solid ${G.wash}`,
                      background: reg.status === "attended" ? G.cream : "transparent" }}>
                      <td style={{ padding: "10px", fontSize: 13, color: G.dark, fontWeight: 500 }}>
                        {reg.profiles?.full_name ?? "—"}
                      </td>
                      <td style={{ padding: "10px", fontSize: 12, color: G.light }}>
                        {reg.profiles?.email ?? "—"}
                      </td>
                      <td style={{ padding: "10px", fontSize: 12, color: G.light }}>
                        {fmtDateOnly(reg.registered_at ?? reg.created_at)}
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