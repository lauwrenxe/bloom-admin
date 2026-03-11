import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark:"#2d4a18", mid:"#3a5a20", base:"#5a7a3a",
  light:"#8ab060", pale:"#b5cc8e", wash:"#e8f2d8",
  cream:"#f6f9f0", white:"#fafdf6",
};

const SUPABASE_URL = "https://vfpgzuehfebhawlidhsz.supabase.co";

// ── UI Atoms ──────────────────────────────────────────────────────

function Btn({ children, onClick, variant = "primary", small, disabled, style: s = {} }) {
  const base = {
    border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
    padding: small ? "6px 14px" : "9px 20px",
    fontSize: small ? 12 : 13.5, opacity: disabled ? 0.5 : 1,
    transition: "all .15s", ...s,
  };
  const variants = {
    primary:   { background: `linear-gradient(135deg,${G.base},${G.dark})`, color: "#fff" },
    secondary: { background: G.wash,        color: G.dark },
    danger:    { background: "#fef2f2",     color: "#c0392b", border: "1px solid #f5c6cb" },
    ghost:     { background: "transparent", color: G.base,   border: `1px solid ${G.pale}` },
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

function Tag({ children, color, bg }) {
  return (
    <span style={{ background: bg, color, borderRadius: 20, padding: "3px 12px",
      fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>
      {children}
    </span>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%",
        maxWidth: wide ? 680 : 520, maxHeight: "92vh", overflow: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 28px", borderBottom: `1px solid ${G.wash}`,
          position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: G.dark, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#aaa" }}>×</button>
        </div>
        <div style={{ padding: "24px 28px" }}>{children}</div>
      </div>
    </div>
  );
}

// ── Thumbnail Uploader ────────────────────────────────────────────
function ThumbnailUploader({ value, onChange }) {
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
      .from("module-thumbnails")
      .upload(path, file, { upsert: true });

    if (error) { setUploadErr(error.message); setUploading(false); return; }

    const url = `${SUPABASE_URL}/storage/v1/object/public/module-thumbnails/${path}`;
    onChange(url);
    setUploading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: G.mid, textTransform: "uppercase", letterSpacing: ".4px" }}>
        Thumbnail Image
      </label>
      {value ? (
        <div style={{ position: "relative", width: "100%", height: 160, borderRadius: 10,
          overflow: "hidden", border: `1.5px solid ${G.pale}` }}>
          <img src={value} alt="thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <button onClick={() => onChange("")}
            style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.55)",
              color: "#fff", border: "none", borderRadius: "50%", width: 28, height: 28,
              cursor: "pointer", fontSize: 14 }}>×</button>
        </div>
      ) : (
        <div onClick={() => !uploading && inputRef.current?.click()}
          style={{ border: `2px dashed ${G.pale}`, borderRadius: 10, padding: "28px 20px",
            textAlign: "center", cursor: uploading ? "wait" : "pointer",
            background: G.cream, transition: "all .15s" }}
          onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = G.base; }}
          onMouseLeave={e => e.currentTarget.style.borderColor = G.pale}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{uploading ? "⏳" : "🖼️"}</div>
          <div style={{ fontSize: 13, color: G.base, fontWeight: 600 }}>
            {uploading ? "Uploading…" : "Click to upload thumbnail"}
          </div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>PNG, JPG, WebP · max 5MB</div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      {uploadErr && <div style={{ fontSize: 12, color: "#c0392b" }}>⚠️ {uploadErr}</div>}
    </div>
  );
}

// ── Status helpers ────────────────────────────────────────────────
function statusTag(s) {
  if (s === "published") return { color: G.base,    bg: G.wash };
  if (s === "archived")  return { color: "#888",    bg: "#f0f0f0" };
  return                        { color: "#e67e22", bg: "#fef5e7" };
}

// ══════════════════════════════════════════════════════════════════
// MODULES PAGE
// ══════════════════════════════════════════════════════════════════
export default function ModulesPage() {
  const [items,        setItems]        = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [modal,        setModal]        = useState(null);
  const [form,         setForm]         = useState({});
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [userId,       setUserId]       = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data?.user?.id ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [{ data: mods }, { data: cats }] = await Promise.all([
        supabase.from("modules").select("*, categories(name)").order("created_at", { ascending: false }),
        supabase.from("categories").select("id, name").order("name"),
      ]);
      if (!cancelled) {
        setItems(mods ?? []);
        setCategories((cats ?? []).map(c => ({ value: c.id, label: c.name })));
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const fetchData = async () => {
    const [{ data: mods }, { data: cats }] = await Promise.all([
      supabase.from("modules").select("*, categories(name)").order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name").order("name"),
    ]);
    setItems(mods ?? []);
    setCategories((cats ?? []).map(c => ({ value: c.id, label: c.name })));
  };

  const openAdd = () => {
    setForm({ status: "draft", is_ai_generated: false, category_id: categories[0]?.value ?? "" });
    setError(""); setModal("add");
  };

  const openEdit = (item) => {
    setForm({
      id: item.id, title: item.title, description: item.description ?? "",
      content: item.content ?? "", category_id: item.category_id,
      status: item.status, thumbnail_url: item.thumbnail_url ?? "",
      estimated_minutes: item.estimated_minutes ?? "", is_ai_generated: item.is_ai_generated ?? false,
    });
    setError(""); setModal(item);
  };

  const save = async () => {
    if (!form.title?.trim()) { setError("Title is required."); return; }
    if (!form.category_id)   { setError("Category is required."); return; }
    setSaving(true); setError("");

    const payload = {
      title:             form.title.trim(),
      description:       form.description?.trim() || null,
      content:           form.content?.trim()     || null,
      category_id:       form.category_id,
      status:            form.status || "draft",
      thumbnail_url:     form.thumbnail_url       || null,
      estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
      is_ai_generated:   !!form.is_ai_generated,
    };

    let err;
    if (modal === "add") {
      ({ error: err } = await supabase.from("modules").insert({ ...payload, created_by: userId }));
    } else {
      ({ error: err } = await supabase.from("modules").update({ ...payload, updated_by: userId }).eq("id", form.id));
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    await fetchData();
    setModal(null);
  };

  const remove = async (id) => {
    if (!confirm("Delete this module?")) return;
    await supabase.from("modules").delete().eq("id", id);
    await fetchData();
  };

  const filtered = items.filter(item => {
    const matchSearch = !search ||
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 26, color: G.dark, margin: 0 }}>
            Module Management
          </h2>
          <p style={{ color: "#777", fontSize: 13, marginTop: 4 }}>Upload and manage GAD learning modules.</p>
        </div>
        <Btn onClick={openAdd}>＋ Add Module</Btn>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search modules…"
          style={{ border: `1px solid ${G.pale}`, borderRadius: 10, padding: "9px 14px",
            fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white,
            color: G.dark, outline: "none", width: 260 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ border: `1px solid ${G.pale}`, borderRadius: 10, padding: "9px 14px",
            fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, color: G.dark, outline: "none" }}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${G.wash}`, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "#aaa" }}>Loading modules…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 40px", textAlign: "center", color: "#aaa" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: G.dark, marginBottom: 8 }}>
              {search || filterStatus ? "No modules match your filters." : "No modules yet."}
            </div>
            {!search && !filterStatus && <Btn onClick={openAdd}>＋ Add Module</Btn>}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: G.cream }}>
                {["", "Title", "Category", "Status", "Est. Time", "Updated", "Actions"].map(h => (
                  <th key={h} style={{ padding: "13px 16px", textAlign: "left",
                    fontSize: 11, fontWeight: 700, color: G.base, letterSpacing: "1px", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id} style={{ borderTop: `1px solid ${G.wash}`, background: i % 2 === 0 ? "#fff" : G.white }}>
                  <td style={{ padding: "10px 16px", width: 56 }}>
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: G.wash,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📂</div>
                    )}
                  </td>
                  <td style={{ padding: "10px 16px", fontWeight: 600, fontSize: 13.5, color: "#333", maxWidth: 240 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                    {item.description && (
                      <div style={{ fontSize: 11.5, color: "#aaa", marginTop: 2,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>
                    )}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: "#666" }}>{item.categories?.name ?? "—"}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <Tag {...statusTag(item.status)}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Tag>
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: "#888" }}>
                    {item.estimated_minutes ? `${item.estimated_minutes} min` : "—"}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: "#888" }}>
                    {new Date(item.updated_at ?? item.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn small variant="ghost"  onClick={() => openEdit(item)}>Edit</Btn>
                      <Btn small variant="danger" onClick={() => remove(item.id)}>Delete</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <Modal title={modal === "add" ? "Add Module" : "Edit Module"} onClose={() => setModal(null)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ThumbnailUploader value={form.thumbnail_url} onChange={v => setForm(f => ({ ...f, thumbnail_url: v }))} />
            <Input label="Module Title" value={form.title}
              onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. Introduction to GAD" required />
            <Textarea label="Description" value={form.description}
              onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Brief overview…" rows={2} />
            <Textarea label="Content" value={form.content}
              onChange={v => setForm(f => ({ ...f, content: v }))} placeholder="Module content, notes, or learning objectives…" rows={4} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Select label="Category" value={form.category_id}
                onChange={v => setForm(f => ({ ...f, category_id: v }))} options={categories} required />
              <Select label="Status" value={form.status}
                onChange={v => setForm(f => ({ ...f, status: v }))}
                options={[
                  { value: "draft",     label: "Draft" },
                  { value: "published", label: "Published" },
                  { value: "archived",  label: "Archived" },
                ]} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Estimated Time (minutes)" type="number" value={form.estimated_minutes}
                onChange={v => setForm(f => ({ ...f, estimated_minutes: v }))} placeholder="e.g. 30" />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: G.mid, textTransform: "uppercase", letterSpacing: ".4px" }}>
                  AI Generated?
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: G.dark, cursor: "pointer", paddingTop: 9 }}>
                  <input type="checkbox" checked={!!form.is_ai_generated}
                    onChange={e => setForm(f => ({ ...f, is_ai_generated: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: G.base }} />
                  Mark as AI-generated
                </label>
              </div>
            </div>
            {error && (
              <div style={{ background: "#fdecea", border: "1px solid #f5c6cb", borderRadius: 10,
                padding: "10px 14px", fontSize: 12.5, color: "#c0392b" }}>⚠️ {error}</div>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Module"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}