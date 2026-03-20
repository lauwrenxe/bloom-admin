import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark:  "#2d4a18", mid:   "#3a5a20", base:  "#5a7a3a",
  light: "#8ab060", pale:  "#b5cc8e", wash:  "#e8f2d8",
  cream: "#f6f9f0", white: "#fafdf6",
};

const SHIMMER_CSS = `
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.shimmer {
  background: linear-gradient(90deg, ${G.wash} 25%, ${G.cream} 50%, ${G.wash} 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 8px;
}`;

function Shimmer({ w = "100%", h = 16, r = 8, style = {} }) {
  return <div className="shimmer" style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />;
}

function SkeletonAnnouncementRow() {
  return (
    <div style={{ background: G.white, border: `1px solid ${G.pale}`, borderLeft: `4px solid ${G.pale}`, borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <Shimmer w={28} h={28} r={14} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <Shimmer w={120} h={15} />
            <Shimmer w={60} h={20} r={20} />
            <Shimmer w={70} h={20} r={20} />
          </div>
          <Shimmer w="80%" h={13} style={{ marginBottom: 6 }} />
          <Shimmer w="50%" h={11} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Shimmer w={80} h={30} r={8} />
          <Shimmer w={50} h={30} r={8} />
          <Shimmer w={50} h={30} r={8} />
          <Shimmer w={60} h={30} r={8} />
        </div>
      </div>
    </div>
  );
}

// ── UI Atoms ──────────────────────────────────────────────────────
function Btn({ children, onClick, variant = "primary", small, disabled, style = {} }) {
  const base = { border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, padding: small ? "6px 14px" : "9px 20px", fontSize: small ? 12 : 13, opacity: disabled ? 0.5 : 1, transition: "all .15s", ...style };
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
      <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, color: G.dark, outline: "none" }} />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>{label}</label>}
      <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, color: G.dark, outline: "none", resize: "vertical" }} />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>{label}</label>}
      <select value={value ?? ""} onChange={e => onChange(e.target.value)}
        style={{ border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, color: G.dark, outline: "none" }}>
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
    orange: { bg: "#fff3e0", text: "#c0560a" },
  };
  const c = map[color] || map.gray;
  return <span style={{ background: c.bg, color: c.text, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>{children}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: G.white, borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${G.wash}`, position: "sticky", top: 0, background: G.white, zIndex: 1 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.dark, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>✕</button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
}

const PRIORITY_OPTIONS = [{ value: "low", label: "Low" }, { value: "normal", label: "Normal" }, { value: "high", label: "High" }, { value: "urgent", label: "Urgent" }];
const TYPE_OPTIONS = [{ value: "general", label: "General" }, { value: "academic", label: "Academic" }, { value: "event", label: "Event" }, { value: "alert", label: "Alert" }];

function priorityColor(p) {
  if (p === "urgent") return "red";
  if (p === "high")   return "orange";
  if (p === "normal") return "blue";
  return "gray";
}

function typeColor(t) {
  if (t === "academic") return "green";
  if (t === "event")    return "purple";
  if (t === "alert")    return "red";
  return "blue";
}

function priorityEmoji(p) {
  if (p === "urgent") return "🚨";
  if (p === "high")   return "⚠️";
  if (p === "normal") return "📢";
  return "📌";
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function isExpired(iso) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

function isActive(a) {
  if (a.is_published === false) return false;
  if (isExpired(a.expires_at))  return false;
  return true;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [modal,         setModal]         = useState(null);
  const [form,          setForm]          = useState({});
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState(null);
  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data, error: err } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    if (err) console.error("Announcements error:", err.message);
    setAnnouncements(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      setLoading(true);
      const { data, error: err } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (err) console.error("Announcements error:", err.message);
      if (!cancelled) { setAnnouncements(data ?? []); setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    if (!form.title?.trim()) { setError("Title is required."); return; }
    setSaving(true); setError(null);
    const payload = { title: form.title.trim(), content: form.content?.trim() ?? null, priority: form.priority || "normal", type: form.type || "general", is_published: !!form.is_published, expires_at: form.expires_at || null, target_roles: form.target_roles?.trim() ?? null };
    let err;
    if (form.id) {
      ({ error: err } = await supabase.from("announcements").update(payload).eq("id", form.id));
    } else {
      const result = await supabase.from("announcements").insert({ ...payload, created_by: user?.id ?? null });
err = result.error;
      ({ error: err } = await supabase.from("announcements").insert({ ...payload, created_by: user?.id ?? null }));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    setModal(null); setForm({}); fetchData();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    await supabase.from("announcements").delete().eq("id", id); fetchData();
  };

  const togglePublish = async (a) => {
    await supabase.from("announcements").update({ is_published: !a.is_published }).eq("id", a.id); fetchData();
  };

  const openEdit = (a) => {
    setForm({ id: a.id, title: a.title, content: a.content, priority: a.priority, type: a.type, is_published: a.is_published, expires_at: a.expires_at ? a.expires_at.slice(0, 10) : "", target_roles: a.target_roles });
    setError(null); setModal("edit");
  };

  const openNew = () => { setForm({ priority: "normal", type: "general", is_published: false }); setError(null); setModal("add"); };

  const filtered = announcements.filter(a => {
    const matchSearch = !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.content?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || (filterStatus === "active" && isActive(a)) || (filterStatus === "draft" && !a.is_published && !isExpired(a.expires_at)) || (filterStatus === "expired" && isExpired(a.expires_at));
    return matchSearch && matchStatus;
  });

  const activeCount  = announcements.filter(a =>  isActive(a)).length;
  const draftCount   = announcements.filter(a => !a.is_published).length;
  const expiredCount = announcements.filter(a =>  isExpired(a.expires_at)).length;

  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: G.dark, margin: 0 }}>Announcements</h1>
            <p style={{ color: G.base, margin: "4px 0 0", fontSize: 14 }}>Manage announcements visible to GADRC students.</p>
          </div>
          <Btn onClick={openNew}>+ New Announcement</Btn>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {[{ label: "Total", value: announcements.length, emoji: "📢" }, { label: "Active", value: activeCount, emoji: "✅" }, { label: "Draft", value: draftCount, emoji: "📝" }, { label: "Expired", value: expiredCount, emoji: "⏳" }].map(({ label, value, emoji }) => (
            <div key={label} style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 12, padding: "12px 18px", minWidth: 100, display: "flex", flexDirection: "column", gap: 3, boxShadow: "0 1px 4px rgba(45,74,24,.05)" }}>
              <div style={{ fontSize: 20 }}>{emoji}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: G.dark }}>{value}</div>
              <div style={{ fontSize: 11, color: G.base, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search announcements…"
            style={{ border: `1px solid ${G.pale}`, borderRadius: 10, padding: "9px 14px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, color: G.dark, outline: "none", width: 280 }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ border: `1px solid ${G.pale}`, borderRadius: 10, padding: "9px 14px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, color: G.dark, outline: "none" }}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(4)].map((_, i) => <SkeletonAnnouncementRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 14, boxShadow: "0 2px 8px rgba(45,74,24,.06)" }}>
            <div style={{ textAlign: "center", padding: "64px 40px" }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>📢</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: G.dark, marginBottom: 6 }}>
                {search || filterStatus ? "No announcements match your filters." : "No announcements yet."}
              </div>
              <div style={{ fontSize: 13, color: G.light, marginBottom: search || filterStatus ? 0 : 20 }}>
                {search || filterStatus ? "Try adjusting your search or filter." : "Create your first announcement to notify students."}
              </div>
              {!search && !filterStatus && <Btn onClick={openNew}>+ New Announcement</Btn>}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(a => (
              <div key={a.id} style={{
                background: G.white,
                border: `1px solid ${isActive(a) ? G.pale : "#e0e0e0"}`,
                borderLeft: `4px solid ${a.priority === "urgent" ? "#c0392b" : a.priority === "high" ? "#e67e22" : a.is_published ? G.base : G.pale}`,
                borderRadius: 12, padding: "16px 20px",
                opacity: isExpired(a.expires_at) ? 0.65 : 1,
                boxShadow: "0 1px 4px rgba(45,74,24,.05)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 22, marginTop: 2 }}>{priorityEmoji(a.priority)}</div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: G.dark, fontSize: 15 }}>{a.title}</span>
                      <Tag color={priorityColor(a.priority)}>{a.priority || "normal"}</Tag>
                      <Tag color={typeColor(a.type)}>{a.type || "general"}</Tag>
                      {!a.is_published ? <Tag color="gray">Draft</Tag> : isExpired(a.expires_at) ? <Tag color="yellow">Expired</Tag> : <Tag color="green">Active</Tag>}
                    </div>
                    {a.content && (
                      <div style={{ fontSize: 13, color: "#666", marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {a.content}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: G.light, display: "flex", gap: 14, flexWrap: "wrap" }}>
                      <span>📅 Created {fmtDate(a.created_at)}</span>
                      {a.expires_at    && <span>⏳ Expires {fmtDate(a.expires_at)}</span>}
                      {a.target_roles  && <span>🎯 {a.target_roles}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                    <Btn small variant={a.is_published ? "danger" : "secondary"} onClick={() => togglePublish(a)}>{a.is_published ? "Unpublish" : "Publish"}</Btn>
                    <Btn small variant="ghost" onClick={() => { setForm(a); setModal("view"); }}>View</Btn>
                    <Btn small variant="ghost" onClick={() => openEdit(a)}>Edit</Btn>
                    <Btn small variant="danger" onClick={() => remove(a.id)}>Delete</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {modal === "view" && form && (
          <Modal title="Announcement" onClose={() => setModal(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Tag color={priorityColor(form.priority)}>{form.priority || "normal"}</Tag>
                <Tag color={typeColor(form.type)}>{form.type || "general"}</Tag>
                {!form.is_published ? <Tag color="gray">Draft</Tag> : isExpired(form.expires_at) ? <Tag color="yellow">Expired</Tag> : <Tag color="green">Active</Tag>}
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: G.dark, margin: 0 }}>{form.title}</h2>
              {form.content && <div style={{ fontSize: 14, color: G.dark, lineHeight: 1.6, background: G.cream, borderRadius: 10, padding: "14px 16px", whiteSpace: "pre-wrap" }}>{form.content}</div>}
              <div style={{ fontSize: 12, color: G.light, display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span>📅 {fmtDate(form.created_at)}</span>
                {form.expires_at   && <span>⏳ Expires {fmtDate(form.expires_at)}</span>}
                {form.target_roles && <span>🎯 {form.target_roles}</span>}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Btn variant="ghost" onClick={() => setModal(null)}>Close</Btn>
                <Btn variant="secondary" onClick={() => openEdit(form)}>Edit</Btn>
              </div>
            </div>
          </Modal>
        )}

        {(modal === "add" || modal === "edit") && (
          <Modal title={modal === "add" ? "New Announcement" : "Edit Announcement"} onClose={() => setModal(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Input label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} required />
              <Textarea label="Content" value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} placeholder="Write your announcement here…" rows={5} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Select label="Priority" value={form.priority || "normal"} onChange={v => setForm(f => ({ ...f, priority: v }))} options={PRIORITY_OPTIONS} />
                <Select label="Type" value={form.type || "general"} onChange={v => setForm(f => ({ ...f, type: v }))} options={TYPE_OPTIONS} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="Expiry Date" type="date" value={form.expires_at} onChange={v => setForm(f => ({ ...f, expires_at: v }))} />
                <Input label="Target Roles" value={form.target_roles} onChange={v => setForm(f => ({ ...f, target_roles: v }))} placeholder="e.g. students, all" />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: G.dark, cursor: "pointer" }}>
                <input type="checkbox" checked={!!form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} style={{ width: 16, height: 16, accentColor: G.base }} />
                Publish immediately
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
    </>
  );
}
