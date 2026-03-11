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

function SkeletonCertRow() {
  return (
    <div style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16 }}>
      <Shimmer w={48} h={48} r={12} />
      <div style={{ flex: 1 }}>
        <Shimmer w="40%" h={14} style={{ marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <Shimmer w={100} h={11} />
          <Shimmer w={80} h={11} />
        </div>
      </div>
      <Shimmer w={70} h={22} r={20} />
      <Shimmer w={55} h={22} r={20} />
      <div style={{ display: "flex", gap: 8 }}>
        <Shimmer w={70} h={30} r={8} />
        <Shimmer w={50} h={30} r={8} />
        <Shimmer w={60} h={30} r={8} />
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
    gold:      { background: "#fef9e7",     color: "#7a5c00", border: "1px solid #f0d080" },
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

function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>{label}</label>}
      <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ border: `1px solid ${G.pale}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, color: G.dark, outline: "none", resize: "vertical" }} />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>{label}{required && " *"}</label>}
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
    gold:   { bg: "#fef9e7", text: "#7a5c00" },
  };
  const c = map[color] || map.gray;
  return <span style={{ background: c.bg, color: c.text, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>{children}</span>;
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: G.white, borderRadius: 16, width: "100%", maxWidth: wide ? 760 : 540, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${G.wash}`, position: "sticky", top: 0, background: G.white, zIndex: 1 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.dark, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#aaa" }}>✕</button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ emoji, title, message, action, onAction }) {
  return (
    <div style={{ textAlign: "center", padding: "64px 40px" }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>{emoji}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: G.dark, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: G.light, marginBottom: action ? 20 : 0 }}>{message}</div>
      {action && <Btn onClick={onAction}>{action}</Btn>}
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function typeColor(t) {
  if (t === "module")  return "green";
  if (t === "seminar") return "blue";
  if (t === "course")  return "gold";
  return "gray";
}

const CERT_TYPE_OPTIONS = [
  { value: "module",  label: "Module Completion" },
  { value: "seminar", label: "Seminar Attendance" },
  { value: "course",  label: "Course Completion" },
  { value: "other",   label: "Other" },
];

function CertCard({ cert, onEdit, onDelete, onView }) {
  return (
    <div style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", boxShadow: "0 1px 4px rgba(45,74,24,.05)" }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${G.pale}, ${G.wash})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>🏅</div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, color: G.dark, fontSize: 14, marginBottom: 4 }}>{cert.title ?? cert.certificate_number ?? "Certificate"}</div>
        <div style={{ fontSize: 12, color: G.light, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {cert.recipient_name  && <span>👤 {cert.recipient_name}</span>}
          {cert.issued_at       && <span>📅 Issued {fmtDate(cert.issued_at)}</span>}
          {cert.expiry_date     && <span>⏳ Expires {fmtDate(cert.expiry_date)}</span>}
          {cert.certificate_number && <span>🔢 {cert.certificate_number}</span>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {cert.certificate_type && <Tag color={typeColor(cert.certificate_type)}>{cert.certificate_type}</Tag>}
        {cert.is_revoked ? <Tag color="red">Revoked</Tag> : <Tag color="green">Valid</Tag>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn small variant="gold"   onClick={() => onView(cert)}>👁 View</Btn>
        <Btn small variant="ghost"  onClick={() => onEdit(cert)}>Edit</Btn>
        <Btn small variant="danger" onClick={() => onDelete(cert.id)}>Delete</Btn>
      </div>
    </div>
  );
}

function TemplateCard({ tmpl, onEdit, onDelete }) {
  return (
    <div style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", boxShadow: "0 1px 4px rgba(45,74,24,.05)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${G.wash}, ${G.cream})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📄</div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontWeight: 700, color: G.dark, fontSize: 14, marginBottom: 2 }}>{tmpl.name}</div>
        {tmpl.description && <div style={{ fontSize: 12, color: G.light }}>{tmpl.description}</div>}
      </div>
      {tmpl.is_default && <Tag color="gold">Default</Tag>}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn small variant="ghost"  onClick={() => onEdit(tmpl)}>Edit</Btn>
        <Btn small variant="danger" onClick={() => onDelete(tmpl.id)}>Delete</Btn>
      </div>
    </div>
  );
}

export default function CertificatesPage() {
  const [tab,        setTab]        = useState("certificates");
  const [certs,      setCerts]      = useState([]);
  const [templates,  setTemplates]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);
  const [form,       setForm]       = useState({});
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState(null);
  const [search,     setSearch]     = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: cData }, { data: tData }] = await Promise.all([
      supabase.from("certificates").select("*").order("issued_at", { ascending: false }),
      supabase.from("certificate_templates").select("*").order("created_at", { ascending: false }),
    ]);
    setCerts(cData ?? []); setTemplates(tData ?? []); setLoading(false);
  };

  const fetchCerts = async () => {
    const { data } = await supabase.from("certificates").select("*").order("issued_at", { ascending: false });
    setCerts(data ?? []);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from("certificate_templates").select("*").order("created_at", { ascending: false });
    setTemplates(data ?? []);
  };

  const saveCert = async () => {
    if (!form.recipient_name?.trim()) { setError("Recipient name is required."); return; }
    setSaving(true); setError(null);
    const payload = {
      recipient_name: form.recipient_name.trim(), title: form.title?.trim() ?? null,
      certificate_number: form.certificate_number?.trim() ?? null, certificate_type: form.certificate_type || null,
      issued_at: form.issued_at || null, expiry_date: form.expiry_date || null,
      is_revoked: !!form.is_revoked, notes: form.notes?.trim() ?? null, template_id: form.template_id || null,
    };
    let err;
    if (form.id) {
      ({ error: err } = await supabase.from("certificates").update(payload).eq("id", form.id));
    } else {
      ({ error: err } = await supabase.from("certificates").insert(payload));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    setModal(null); setForm({}); fetchCerts();
  };

  const deleteCert = async (id) => {
    if (!window.confirm("Delete this certificate?")) return;
    await supabase.from("certificates").delete().eq("id", id); fetchCerts();
  };

  const toggleRevoke = async (cert) => {
    if (!window.confirm(cert.is_revoked ? "Restore this certificate?" : "Revoke this certificate?")) return;
    await supabase.from("certificates").update({ is_revoked: !cert.is_revoked }).eq("id", cert.id); fetchCerts();
  };

  const saveTemplate = async () => {
    if (!form.name?.trim()) { setError("Template name is required."); return; }
    setSaving(true); setError(null);
    const payload = { name: form.name.trim(), description: form.description?.trim() ?? null, is_default: !!form.is_default };
    let err;
    if (form.id) {
      ({ error: err } = await supabase.from("certificate_templates").update(payload).eq("id", form.id));
    } else {
      ({ error: err } = await supabase.from("certificate_templates").insert(payload));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    setModal(null); setForm({}); fetchTemplates();
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    await supabase.from("certificate_templates").delete().eq("id", id); fetchTemplates();
  };

  const openAddCert = () => { setForm({ issued_at: new Date().toISOString().slice(0, 10) }); setError(null); setModal("add-cert"); };

  const openEditCert = (c) => {
    setForm({ id: c.id, recipient_name: c.recipient_name, title: c.title, certificate_number: c.certificate_number, certificate_type: c.certificate_type, issued_at: c.issued_at ? c.issued_at.slice(0, 10) : "", expiry_date: c.expiry_date ? c.expiry_date.slice(0, 10) : "", is_revoked: c.is_revoked, notes: c.notes, template_id: c.template_id });
    setError(null); setModal("edit-cert");
  };

  const filteredCerts = certs.filter(c => {
    const matchSearch = !search || c.recipient_name?.toLowerCase().includes(search.toLowerCase()) || c.title?.toLowerCase().includes(search.toLowerCase()) || c.certificate_number?.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || c.certificate_type === filterType;
    return matchSearch && matchType;
  });

  const totalValid   = certs.filter(c => !c.is_revoked).length;
  const totalRevoked = certs.filter(c =>  c.is_revoked).length;

  return (
    <>
      <style>{SHIMMER_CSS}</style>
      <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: G.dark, margin: 0 }}>Certificates</h1>
            <p style={{ color: G.base, margin: "4px 0 0", fontSize: 14 }}>Issue and manage GAD certificates and templates.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {tab === "certificates" && <Btn onClick={openAddCert}>+ Issue Certificate</Btn>}
            {tab === "templates"    && <Btn onClick={() => { setForm({}); setError(null); setModal("add-tmpl"); }}>+ New Template</Btn>}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { emoji: "🏅", label: "Total Issued", value: certs.length },
            { emoji: "✅", label: "Valid",         value: totalValid },
            { emoji: "❌", label: "Revoked",       value: totalRevoked },
            { emoji: "📄", label: "Templates",     value: templates.length },
          ].map(({ emoji, label, value }) => (
            <div key={label} style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 12, padding: "14px 20px", minWidth: 120, display: "flex", flexDirection: "column", gap: 4, boxShadow: "0 1px 4px rgba(45,74,24,.05)" }}>
              <div style={{ fontSize: 22 }}>{emoji}</div>
              <div style={{ fontSize: 11, color: G.base, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: G.dark, lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `2px solid ${G.wash}`, paddingBottom: 0 }}>
          {[["certificates", "🏅 Certificates"], ["templates", "📄 Templates"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 20px", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", color: tab === id ? G.dark : G.light, borderBottom: tab === id ? `2px solid ${G.dark}` : "2px solid transparent", marginBottom: -2 }}>{label}</button>
          ))}
        </div>

        {/* ── CERTIFICATES TAB ── */}
        {tab === "certificates" && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search by name, title, or number…"
                style={{ border: `1px solid ${G.pale}`, borderRadius: 10, padding: "9px 14px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, color: G.dark, outline: "none", width: 300 }} />
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                style={{ border: `1px solid ${G.pale}`, borderRadius: 10, padding: "9px 14px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white, color: G.dark, outline: "none" }}>
                <option value="">All Types</option>
                {CERT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[...Array(3)].map((_, i) => <SkeletonCertRow key={i} />)}
              </div>
            ) : filteredCerts.length === 0 ? (
              <div style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 14, boxShadow: "0 2px 8px rgba(45,74,24,.06)" }}>
                <EmptyState emoji="🏅"
                  title={search || filterType ? "No certificates match your filters." : "No certificates issued yet."}
                  message={search || filterType ? "Try adjusting your search or filter." : "Issue your first certificate to get started."}
                  action={!search && !filterType ? "+ Issue Certificate" : undefined}
                  onAction={openAddCert} />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredCerts.map(c => (
                  <CertCard key={c.id} cert={c} onEdit={openEditCert} onDelete={deleteCert} onView={cert => { setForm(cert); setModal("view-cert"); }} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TEMPLATES TAB ── */}
        {tab === "templates" && (
          <>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[...Array(2)].map((_, i) => (
                  <div key={i} style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                    <Shimmer w={44} h={44} r={10} />
                    <div style={{ flex: 1 }}>
                      <Shimmer w="35%" h={14} style={{ marginBottom: 8 }} />
                      <Shimmer w="55%" h={11} />
                    </div>
                    <Shimmer w={60} h={30} r={8} />
                    <Shimmer w={60} h={30} r={8} />
                  </div>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div style={{ background: G.white, border: `1px solid ${G.pale}`, borderRadius: 14, boxShadow: "0 2px 8px rgba(45,74,24,.06)" }}>
                <EmptyState emoji="📄" title="No templates yet." message="Create a template to reuse for certificate designs." action="+ New Template" onAction={() => { setForm({}); setError(null); setModal("add-tmpl"); }} />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {templates.map(t => (
                  <TemplateCard key={t.id} tmpl={t} onEdit={tmpl => { setForm({ ...tmpl }); setError(null); setModal("edit-tmpl"); }} onDelete={deleteTemplate} />
                ))}
              </div>
            )}
          </>
        )}

        {/* View Certificate Modal */}
        {modal === "view-cert" && form && (
          <Modal title="Certificate Details" onClose={() => setModal(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: `linear-gradient(135deg, ${G.cream}, ${G.wash})`, border: `2px solid ${G.pale}`, borderRadius: 14, padding: "28px 32px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🏅</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: G.dark, marginBottom: 4 }}>{form.title ?? "Certificate of Completion"}</div>
                <div style={{ fontSize: 13, color: G.base, marginBottom: 16 }}>This is to certify that</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: G.mid, marginBottom: 16 }}>{form.recipient_name}</div>
                <div style={{ fontSize: 12, color: G.light, display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
                  {form.certificate_number && <span>🔢 {form.certificate_number}</span>}
                  {form.issued_at   && <span>📅 Issued: {fmtDate(form.issued_at)}</span>}
                  {form.expiry_date && <span>⏳ Expires: {fmtDate(form.expiry_date)}</span>}
                </div>
              </div>
              {form.notes && <div style={{ fontSize: 13, color: G.base, background: G.cream, borderRadius: 8, padding: "10px 14px" }}>📝 {form.notes}</div>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Btn variant="danger" small onClick={() => { toggleRevoke(form); setModal(null); }}>{form.is_revoked ? "Restore" : "Revoke"}</Btn>
                <Btn variant="ghost" onClick={() => setModal(null)}>Close</Btn>
              </div>
            </div>
          </Modal>
        )}

        {(modal === "add-cert" || modal === "edit-cert") && (
          <Modal title={modal === "add-cert" ? "Issue Certificate" : "Edit Certificate"} onClose={() => setModal(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Input label="Recipient Name" value={form.recipient_name} onChange={v => setForm(f => ({ ...f, recipient_name: v }))} required />
              <Input label="Certificate Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. Certificate of Completion" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="Certificate Number" value={form.certificate_number} onChange={v => setForm(f => ({ ...f, certificate_number: v }))} placeholder="e.g. GADRC-2024-001" />
                <Select label="Type" value={form.certificate_type || ""} onChange={v => setForm(f => ({ ...f, certificate_type: v }))} options={[{ value: "", label: "— select type —" }, ...CERT_TYPE_OPTIONS]} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="Issue Date" type="date" value={form.issued_at} onChange={v => setForm(f => ({ ...f, issued_at: v }))} />
                <Input label="Expiry Date" type="date" value={form.expiry_date} onChange={v => setForm(f => ({ ...f, expiry_date: v }))} />
              </div>
              <Select label="Template" value={form.template_id || ""} onChange={v => setForm(f => ({ ...f, template_id: v || null }))} options={[{ value: "", label: "— No template —" }, ...templates.map(t => ({ value: t.id, label: t.name }))]} />
              <Textarea label="Notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} rows={2} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: G.dark, cursor: "pointer" }}>
                <input type="checkbox" checked={!!form.is_revoked} onChange={e => setForm(f => ({ ...f, is_revoked: e.target.checked }))} style={{ width: 16, height: 16, accentColor: G.base }} />
                Mark as Revoked
              </label>
              {error && <div style={{ color: "#c0392b", fontSize: 13 }}>⚠️ {error}</div>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                <Btn onClick={saveCert} disabled={saving}>{saving ? "Saving…" : modal === "add-cert" ? "Issue" : "Save Changes"}</Btn>
              </div>
            </div>
          </Modal>
        )}

        {(modal === "add-tmpl" || modal === "edit-tmpl") && (
          <Modal title={modal === "add-tmpl" ? "New Template" : "Edit Template"} onClose={() => setModal(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Input label="Template Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
              <Textarea label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} rows={2} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: G.dark, cursor: "pointer" }}>
                <input type="checkbox" checked={!!form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} style={{ width: 16, height: 16, accentColor: G.base }} />
                Set as Default Template
              </label>
              {error && <div style={{ color: "#c0392b", fontSize: 13 }}>⚠️ {error}</div>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                <Btn onClick={saveTemplate} disabled={saving}>{saving ? "Saving…" : modal === "add-tmpl" ? "Create" : "Save Changes"}</Btn>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}