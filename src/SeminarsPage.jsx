import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase.js";
import { ConfirmModal } from "./App.jsx";

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
  const [form, setForm]       = useState({ ...seminar });
  const [saving, setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState("");
  const coverRef              = useRef();
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const uploadCover = async (file) => {
    setUploading(true);
    const path = `${seminar.id}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("seminar-covers").upload(path, file, { upsert: true });
    if (upErr) { alert("Upload failed: " + upErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("seminar-covers").getPublicUrl(path);
    setF("cover_image_url", publicUrl);
    setUploading(false);
  };

  const save = async () => {
    if (!form.title?.trim()) { setError("Title is required."); return; }
    setSaving(true); setError("");

    // Fix dates — convert local datetime-local input to UTC ISO string
    let scheduledStart = null;
    let scheduledEnd   = null;
    if (form.scheduled_start) {
      scheduledStart = new Date(form.scheduled_start).toISOString();
    }
    if (form.scheduled_end) {
      scheduledEnd = new Date(form.scheduled_end).toISOString();
    }
    if (scheduledStart && scheduledEnd && new Date(scheduledEnd) <= new Date(scheduledStart)) {
      setError("End date/time must be after start date/time."); setSaving(false); return;
    }
    if (scheduledStart && !scheduledEnd) {
      const d = new Date(scheduledStart); d.setHours(d.getHours() + 1);
      scheduledEnd = d.toISOString();
    }

    // Fix webinar_platform — strip to null if empty
    const platform = form.webinar_platform?.trim() || null;

    const payload = {
      title: form.title.trim(), description: form.description?.trim() || null,
      seminar_type: form.seminar_type || "webinar", status: form.status || "upcoming",
      cover_image_url: form.cover_image_url || null,
      webinar_link: form.webinar_link?.trim() || null,
      webinar_platform: platform,
      venue: form.venue?.trim() || null,
      scheduled_start: scheduledStart,
      scheduled_end:   scheduledEnd,
      max_participants: form.max_participants ? Number(form.max_participants) : null,
      is_public: form.is_public ?? true,
    };
    const { error: err } = await supabase.from("seminars").update(payload).eq("id", seminar.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    alert("Seminar saved!");
    onUpdate();
  };

  return (
    <div>
      {error && <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {/* Cover image */}
      <div style={s.coverBox} onClick={() => !uploading && coverRef.current?.click()}>
        {form.cover_image_url
          ? <img src={form.cover_image_url} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : uploading ? <><div style={{ fontSize: 28 }}>⏳</div><div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>Uploading…</div></>
          : <><div style={{ fontSize: 36 }}><i className="bi bi-image me-1"/>️</div><div style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>Click to upload cover image</div></>
        }
        <input ref={coverRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) uploadCover(e.target.files[0]); e.target.value = ""; }} />
      </div>

      <div style={s.card}>
        <div style={s.fg}>
          <label style={s.label}>Title *</label>
          <input style={s.input} value={form.title || ""} onChange={e => setF("title", e.target.value)} />
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
          <div style={{ ...s.fg, flex: 1, minWidth: 130 }}>
            <label style={s.label}>Max Participants</label>
            <input style={s.input} type="number" min={1} value={form.max_participants || ""} onChange={e => setF("max_participants", e.target.value)} placeholder="Unlimited" />
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
        {(form.seminar_type === "webinar" || form.seminar_type === "hybrid") && (
          <div style={s.row}>
            <div style={{ ...s.fg, flex: 2 }}>
              <label style={s.label}>Webinar Link</label>
              <input style={s.input} value={form.webinar_link || ""} onChange={e => setF("webinar_link", e.target.value)} placeholder="https://zoom.us/j/..." />
            </div>
            <div style={{ ...s.fg, flex: 1 }}>
              <label style={s.label}>Platform</label>
              <select style={s.select} value={form.webinar_platform || ""} onChange={e => setF("webinar_platform", e.target.value)}>
                <option value="">— Select —</option>
                <option value="zoom">Zoom</option>
                <option value="gmeet">Google Meet</option>
                <option value="teams">MS Teams</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}
        {(form.seminar_type === "in_person" || form.seminar_type === "hybrid") && (
          <div style={s.fg}>
            <label style={s.label}>Venue</label>
            <input style={s.input} value={form.venue || ""} onChange={e => setF("venue", e.target.value)} placeholder="e.g. CvSU Main Campus, Room 101" />
          </div>
        )}
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

// ── Registrations Tab ─────────────────────────────────────────────
const SEMINAR_ROLES = [
  { value: "student",       label: "Student",       color: "blue"   },
  { value: "guest",         label: "Guest",         color: "yellow" },
  { value: "guest_speaker", label: "Guest Speaker", color: "green"  },
  { value: "host",          label: "Host",          color: "green"  },
  { value: "staff",         label: "Staff",         color: "blue"   },
];

function roleColor(role) {
  return SEMINAR_ROLES.find(r => r.value === role)?.color || "blue";
}
function roleLabel(role) {
  return SEMINAR_ROLES.find(r => r.value === role)?.label || role || "Student";
}

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
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading…</div>;

  const active = regs.filter(r => r.status !== "cancelled");
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
          { label: "Total", value: regs.length, color: G.base },
          { label: "Active", value: active.length, color: "#16a34a" },
          { label: "Cancelled", value: regs.filter(r => r.status === "cancelled").length, color: "#dc2626" },
          { label: "Capacity", value: seminar.max_participants ? `${active.length}/${seminar.max_participants}` : "Unlimited", color: "#2563eb" },
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
                    <td style={{...s.td, fontSize:12}}>{formatDate(r.registered_at)}</td>
                    <td style={s.td}>
                      <span style={s.tag(roleColor(currentRole))}>{roleLabel(currentRole)}</span>
                    </td>
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
  { key: "q_content",      label: "Content Quality",          desc: "Relevance and accuracy of the seminar content" },
  { key: "q_speaker",      label: "Speaker Effectiveness",    desc: "Clarity, knowledge, and delivery of the speaker(s)" },
  { key: "q_organization", label: "Event Organization",       desc: "Logistics, time management, and flow of the event" },
  { key: "q_relevance",    label: "Relevance to GAD",         desc: "How relevant was this activity to gender and development?" },
  { key: "q_materials",    label: "Materials & Resources",    desc: "Quality of presentation materials and handouts" },
  { key: "q_overall",      label: "Overall Satisfaction",     desc: "Your overall experience with this seminar" },
];

function StarRating({ value }) {
  const stars = Math.round(value || 0);
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <i key={i} className={`bi bi-star${i<=stars?"-fill":""}`}
          style={{ color: i<=stars?"#f59e0b":"#e5e7eb", fontSize:14, marginRight:2 }} />
      ))}
      <span style={{ fontSize:12, color:"#888", marginLeft:4 }}>({value?.toFixed(1)||"—"})</span>
    </span>
  );
}

function EvaluationsTab({ seminar }) {
  const [evals, setEvals]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);

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
    return vals.length ? (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1) : "—";
  };
  const overallAvg = evals.length > 0
    ? (EVAL_FIELDS.map(f => parseFloat(avg(f.key))||0).reduce((a,b)=>a+b,0)/EVAL_FIELDS.length).toFixed(1)
    : "—";

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading…</div>;

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={s.statCard(G.base)}>
          <div style={{ ...s.statNum, color: G.base }}>{evals.length}</div>
          <div style={s.statLabel}>Responses</div>
        </div>
        <div style={s.statCard("#f59e0b")}>
          <div style={{ ...s.statNum, color: "#f59e0b", fontSize:22 }}>
            <i className="bi bi-star-fill me-1" style={{ fontSize:18 }}/>{overallAvg}
          </div>
          <div style={s.statLabel}>Overall Average</div>
        </div>
      </div>

      {evals.length === 0 ? (
        <div style={s.emptyBox}>
          <i className="bi bi-clipboard-data d-block mb-2" style={{ fontSize:40, color:G.pale }}/>
          <div style={{ fontWeight: 700, color: G.dark, marginBottom: 6 }}>No evaluations submitted yet</div>
          <div style={{ fontSize: 13, color: "#aaa" }}>Evaluation forms submitted by participants will appear here.</div>
        </div>
      ) : (
        <>
          {/* Per-question averages card */}
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

          {/* Individual responses */}
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
                  <div style={{ padding: "16px" }}>
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

// ── Main Page ─────────────────────────────────────────────────────
export default function SeminarsPage() {
  const [seminars, setSeminars] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab]           = useState("details");
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({});
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError]   = useState("");
  const [confirm, setConfirm] = useState(null);

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
    if (!addForm.title?.trim()) { setAddError("Title is required."); return; }
    setAddSaving(true); setAddError("");
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: err } = await supabase.from("seminars").insert({
      title: addForm.title.trim(),
      seminar_type: addForm.seminar_type || "webinar",
      status: "upcoming", is_public: true, created_by: user?.id,
    }).select("*, seminar_registrations(count)").single();
    setAddSaving(false);
    if (err) { setAddError(err.message); return; }
    setSeminars(s => [data, ...s]);
    setSelected(data); setTab("details");
    setShowAdd(false); setAddForm({});
  };

  const deleteSeminar = async () => {
    setConfirm({ title:"Delete Seminar", message:`Delete "${selected?.title}"? All registrations and evaluations will be removed.`, confirmLabel:"Delete", danger:true,
      onConfirm: async () => {
        await supabase.from("seminars").delete().eq("id", selected.id);
    const rest = seminars.filter(s => s.id !== selected.id);
    setSeminars(rest); setSelected(rest[0] || null);
      setConfirm(null); }});
  };

  const statusColor = (s) => s === "ongoing" ? "green" : s === "completed" ? "blue" : s === "cancelled" ? "red" : "yellow";
  const regCount = (s) => s?.seminar_registrations?.[0]?.count || 0;
  const filtered = seminars.filter(s => (s.title || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={s.page}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={s.sidebarHdr}>
          <div style={s.sidebarTitle}><i className="bi bi-mortarboard me-1"/> Seminars</div>
          <div style={s.sidebarSub}>{seminars.length} total</div>
        </div>
        <button style={s.addBtn} onClick={() => { setAddForm({ seminar_type: "webinar" }); setAddError(""); setShowAdd(true); }}>＋ New Seminar</button>
        <input style={s.searchInput} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        <div style={s.list}>
          {loading ? <div style={{ padding: "20px 16px", color: G.pale, fontSize: 13 }}>Loading…</div>
            : filtered.length === 0 ? <div style={{ padding: "20px 16px", color: G.pale, fontSize: 13 }}>No seminars found</div>
            : filtered.map(sem => (
              <div key={sem.id} style={s.item(selected?.id === sem.id)} onClick={() => { setSelected(sem); setTab("details"); }}>
                <div style={s.itemIcon}>
                  {sem.cover_image_url ? <img src={sem.cover_image_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ""}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.itemTitle}>{sem.title}</div>
                  <div style={s.itemMeta}>{formatDateShort(sem.scheduled_start)} · {regCount(sem)} registered</div>
                </div>
                <div style={s.pubBadge(sem.is_public)}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:sem.is_public?"#16a34a":"#a16207",display:"inline-block"}}/>
                  {sem.is_public?"Public":"Private"}
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
            <span style={{ fontSize: 52 }}><i className="bi bi-mortarboard me-1"/></span>
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
              <button style={s.btnDanger} onClick={deleteSeminar}><i className="bi bi-trash me-1"/> Delete</button>
            </div>
            <div style={s.tabBar}>
              {[["details", "Details"], ["registrations", "Registrations"], ["evaluations", "Evaluations"]].map(([v, l]) => (
                <div key={v} style={s.tab(tab === v)} onClick={() => setTab(v)}>{l}</div>
              ))}
            </div>
            <div style={s.content}>
              {tab === "details"       && <DetailsTab       key={selected.id + "_d"} seminar={selected} onUpdate={reload} />}
              {tab === "registrations" && <RegistrationsTab key={selected.id + "_r"} seminar={selected} />}
              {tab === "evaluations"   && <EvaluationsTab   key={selected.id + "_e"} seminar={selected} />}
            </div>
          </>
        )}
      </div>

      {confirm&&<ConfirmModal title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
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
                <label style={s.label}>Title *</label>
                <input style={s.input} value={addForm.title || ""} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Gender Sensitivity Seminar" autoFocus />
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
                <i className="bi bi-lightbulb me-1"/> Fill in the full details (date, link, venue) after creating.
              </div>
            </div>
            <div style={s.mFooter}>
              <button style={s.btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
              <button style={{ ...s.btnPrimary, opacity: addSaving ? 0.7 : 1 }} onClick={createSeminar} disabled={addSaving}>{addSaving ? "Creating…" : "Create Seminar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}