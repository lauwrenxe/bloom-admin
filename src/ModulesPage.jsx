import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark:"#2d4a18", mid:"#3a5a20", base:"#5a7a3a",
  light:"#8ab060", pale:"#b5cc8e", wash:"#e8f2d8",
  cream:"#f6f9f0", white:"#fafdf6",
};

/* ── tiny UI atoms ── */
const Btn = ({ children, onClick, variant="primary", small=false, disabled=false }) => {
  const styles = {
    primary: { background:`linear-gradient(135deg,${G.base},${G.dark})`, color:"#fff", border:"none" },
    ghost:   { background:"transparent", color:G.base, border:`1.5px solid ${G.wash}` },
    danger:  { background:"transparent", color:"#c0392b", border:"1.5px solid #f5c6cb" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], borderRadius:"8px",
      padding: small ? "5px 12px" : "9px 20px",
      fontSize: small ? "12px" : "13.5px",
      fontWeight:600, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily:"'DM Sans',sans-serif", opacity: disabled ? .6 : 1,
      transition:"all .18s",
    }}>{children}</button>
  );
};

const Tag = ({ children, color, bg }) => (
  <span style={{ background:bg, color, borderRadius:"20px",
    padding:"3px 12px", fontSize:"11.5px", fontWeight:600 }}>{children}</span>
);

const Input = ({ label, value, onChange, placeholder="" }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
    {label && <label style={{ fontSize:"12px", fontWeight:600, color:G.dark,
      letterSpacing:".4px", textTransform:"uppercase" }}>{label}</label>}
    <input value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ border:`1.5px solid ${G.wash}`, borderRadius:"10px", padding:"10px 14px",
        fontSize:"13.5px", fontFamily:"'DM Sans',sans-serif", outline:"none",
        background:"#fff", color:"#222" }}
      onFocus={e => e.target.style.borderColor = G.base}
      onBlur={e  => e.target.style.borderColor = G.wash}
    />
  </div>
);

const Select = ({ label, value, onChange, options=[] }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
    {label && <label style={{ fontSize:"12px", fontWeight:600, color:G.dark,
      letterSpacing:".4px", textTransform:"uppercase" }}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ border:`1.5px solid ${G.wash}`, borderRadius:"10px", padding:"10px 14px",
        fontSize:"13.5px", fontFamily:"'DM Sans',sans-serif", outline:"none",
        background:"#fff", color:"#222" }}>
      {options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)",
    display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
    <div style={{ background:"#fff", borderRadius:"20px", padding:"36px 40px",
      width:"480px", maxWidth:"90vw", boxShadow:"0 24px 80px rgba(0,0,0,.2)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
        <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700,
          fontSize:"20px", color:G.dark }}>{title}</h3>
        <button onClick={onClose} style={{ background:"none", border:"none",
          fontSize:"20px", cursor:"pointer", color:"#aaa" }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

/* ══════════════════════════════════════════════
   MODULES PAGE
══════════════════════════════════════════════ */
export default function ModulesPage() {
  const [items,      setItems]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [modal,      setModal]      = useState(null);
  const [form,       setForm]       = useState({ title:"", category_id:"", status:"draft" });
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  /* ── fetch modules + categories ── */
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: mods }, { data: cats }] = await Promise.all([
      supabase.from("modules").select("*, categories(name)").order("created_at", { ascending:false }),
      supabase.from("categories").select("id, name").order("name"),
    ]);
    setItems(mods || []);
    setCategories((cats || []).map(c => ({ value: c.id, label: c.name })));
    setLoading(false);
  };

  /* ── open modals ── */
  const openAdd = () => {
    setForm({ title:"", category_id: categories[0]?.value ?? "", status:"draft" });
    setError("");
    setModal("add");
  };
  const openEdit = item => {
    setForm({ title: item.title, category_id: item.category_id, status: item.status });
    setError("");
    setModal(item);
  };

  /* ── save (insert or update) ── */
  const save = async () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");

    if (modal === "add") {
      const { error: err } = await supabase.from("modules").insert({
        title:       form.title.trim(),
        category_id: form.category_id || null,
        status:      form.status,
      });
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from("modules").update({
        title:       form.title.trim(),
        category_id: form.category_id || null,
        status:      form.status,
        updated_at:  new Date().toISOString(),
      }).eq("id", modal.id);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    await fetchData();
    setSaving(false);
    setModal(null);
  };

  /* ── delete ── */
  const remove = async (id) => {
    if (!confirm("Delete this module?")) return;
    await supabase.from("modules").delete().eq("id", id);
    await fetchData();
  };

  const statusColor = s => s === "published"
    ? { color: G.base,     bg: G.wash }
    : { color: "#e67e22",  bg: "#fef5e7" };

  /* ── render ── */
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"flex-end", marginBottom:"28px" }}>
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontWeight:700,
            fontSize:"26px", color:G.dark }}>Module Management</h2>
          <p style={{ color:"#777", fontSize:"13px", marginTop:"4px" }}>
            Upload and manage GAD learning modules.
          </p>
        </div>
        <Btn onClick={openAdd}>＋ Add Module</Btn>
      </div>

      {/* Table */}
      <div style={{ background:"#fff", borderRadius:"16px",
        border:`1px solid ${G.wash}`, overflow:"hidden" }}>
        {loading ? (
          <div style={{ padding:"60px", textAlign:"center", color:"#aaa" }}>
            Loading modules…
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding:"60px", textAlign:"center", color:"#aaa" }}>
            No modules yet. Click <strong>＋ Add Module</strong> to get started.
          </div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:G.cream }}>
                {["Title","Category","Status","Last Updated","Actions"].map(h => (
                  <th key={h} style={{ padding:"14px 20px", textAlign:"left",
                    fontSize:"11px", fontWeight:700, color:G.base,
                    letterSpacing:"1px", textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} style={{ borderTop:`1px solid ${G.wash}`,
                  background: i%2===0 ? "#fff" : G.white }}>
                  <td style={{ padding:"14px 20px", fontWeight:600,
                    fontSize:"13.5px", color:"#333" }}>{item.title}</td>
                  <td style={{ padding:"14px 20px", fontSize:"13px", color:"#666" }}>
                    {item.categories?.name ?? "—"}
                  </td>
                  <td style={{ padding:"14px 20px" }}>
                    <Tag {...statusColor(item.status)}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Tag>
                  </td>
                  <td style={{ padding:"14px 20px", fontSize:"13px", color:"#888" }}>
                    {item.updated_at
                      ? new Date(item.updated_at).toLocaleDateString()
                      : new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding:"14px 20px" }}>
                    <div style={{ display:"flex", gap:"8px" }}>
                      <Btn small variant="ghost" onClick={() => openEdit(item)}>Edit</Btn>
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
        <Modal title={modal === "add" ? "Add Module" : "Edit Module"}
          onClose={() => setModal(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <Input label="Module Title" value={form.title}
              onChange={v => setForm(f => ({ ...f, title:v }))}
              placeholder="e.g. Introduction to GAD"/>
            <Select label="Category" value={form.category_id}
              onChange={v => setForm(f => ({ ...f, category_id:v }))}
              options={categories}/>
            <Select label="Status" value={form.status}
              onChange={v => setForm(f => ({ ...f, status:v }))}
              options={[{ value:"draft", label:"Draft" }, { value:"published", label:"Published" }]}/>
            {error && (
              <div style={{ background:"#fdecea", border:"1px solid #f5c6cb",
                borderRadius:"10px", padding:"10px 14px",
                fontSize:"12.5px", color:"#c0392b" }}>{error}</div>
            )}
            <div style={{ display:"flex", gap:"12px", justifyContent:"flex-end", marginTop:"8px" }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save Module"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}