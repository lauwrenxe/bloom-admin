import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark:  "#1A2E1A", mid:   "#2D6A2D", base:  "#3A7A3A",
  light: "#4CAF50", pale:  "#C8E6C9", wash:  "#E8F5E9",
  cream: "#F5F7F5", white: "#FFFFFF",
};

function formatDate(iso) {
  if (!iso) return "—";
  const utcStr = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  return new Date(utcStr).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });
}

const s = {
  page:    { padding: "28px 32px", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", background: "#F5F7F5", minHeight: "100vh" },
  header:  { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  title:   { fontSize: 22, fontWeight: 800, color: G.dark, margin: 0 },
  tabs:    { display: "flex", gap: 0, borderBottom: `2px solid ${G.wash}`, marginBottom: 24 },
  tab:    (a) => ({ padding: "10px 20px", fontSize: 14, fontWeight: 600, color: a ? G.dark : "#999", borderBottom: a ? `2px solid ${G.dark}` : "2px solid transparent", cursor: "pointer", marginBottom: -2 }),
  addBtn:  { padding: "9px 18px", background: G.dark, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  table:   { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" },
  th:      { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `2px solid ${G.wash}`, background: "#F5F7F5" },
  td:      { padding: "12px 16px", borderBottom: `1px solid ${G.wash}`, color: G.dark, verticalAlign: "middle" },
  tag:    (c) => ({ display: "inline-flex", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: c === "green" ? "#dcfce7" : c === "red" ? "#fee2e2" : c === "yellow" ? "#fef9c3" : "#f3f4f6", color: c === "green" ? "#16a34a" : c === "red" ? "#dc2626" : c === "yellow" ? "#92400e" : "#555" }),
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal:  (w) => ({ background: "#fff", borderRadius: 10, width: "100%", maxWidth: w || 520, maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }),
  mHeader: { padding: "20px 24px 16px", borderBottom: `1px solid ${G.wash}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 },
  mTitle:  { fontSize: 17, fontWeight: 700, color: G.dark },
  mBody:   { padding: "20px 24px" },
  mFooter: { padding: "16px 24px", borderTop: `1px solid ${G.wash}`, display: "flex", gap: 8, justifyContent: "flex-end", position: "sticky", bottom: 0, background: "#fff" },
  label:   { fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.6 },
  input:   { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark },
  select:  { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark },
  textarea:{ width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark, resize: "vertical", minHeight: 70 },
  fg:      { marginBottom: 16 },
  row:     { display: "flex", gap: 12 },
  btnPrimary:  { padding: "9px 20px", background: G.dark, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnSecondary:{ padding: "9px 20px", background: G.wash, color: G.dark, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnDanger:   { padding: "7px 14px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 },
  iconBtn:(c) => ({ background: "none", border: "none", cursor: "pointer", color: c || "#999", fontSize: 14, padding: "4px 6px", borderRadius: 6 }),
  emptyBox:{ background: "#fff", borderRadius: 14, border: `2px dashed ${G.pale}`, padding: "50px 20px", textAlign: "center" },
  badgeCard:{ background: "#fff", borderRadius: 10, padding: "16px", border: "1px solid #DDE8DD", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  toolbar: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  searchBar:{ padding: "9px 14px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", width: 260 },
};

// ── Certificates Tab ──────────────────────────────────────────────
function CertificatesTab() {
  const [certs, setCerts]       = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: c, error: certErr }, { data: s }] = await Promise.all([
        supabase.from("certificates").select("*, profiles!certificates_user_id_fkey(full_name, student_id, email)").order("issued_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, roles(name)"),
      ]);
      if (certErr) console.error("Certs load error:", certErr.message);
      console.log("Certs loaded:", c?.length, c);
      // Filter to only student role users
      const studentIds = (s || []).filter(r => r.roles?.name === "student").map(r => r.user_id);
      let studentsData = [];
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, student_id").in("id", studentIds).order("full_name");
        studentsData = profiles || [];
      }
      if (active) { setCerts(c || []); setStudents(studentsData); setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const reload = async () => {
    const { data } = await supabase.from("certificates").select("*, profiles!certificates_user_id_fkey(full_name, student_id, email)").order("issued_at", { ascending: false });
    setCerts(data || []);
  };

  const issueCert = async () => {
    if (!form.user_id) { setError("Select a student."); return; }
    setSaving(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    const certCode = `CERT-${Date.now().toString(36).toUpperCase()}`;
    const { error: err } = await supabase.from("certificates").insert({
      user_id: form.user_id, reference_type: form.reference_type || "manual",
      reference_id: form.reference_id || null,
      certificate_code: certCode, is_revoked: false,
      issued_at: new Date().toISOString(), issued_by: user?.id,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowAdd(false); setForm({}); reload();
  };

  const toggleRevoke = async (cert) => {
    const newVal = !cert.is_revoked;
    if (!confirm(`${newVal ? "Revoke" : "Restore"} this certificate?`)) return;
    await supabase.from("certificates").update({ is_revoked: newVal }).eq("id", cert.id);
    setCerts(cs => cs.map(c => c.id === cert.id ? { ...c, is_revoked: newVal } : c));
  };

  const filtered = certs.filter(c =>
    (c.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.profiles?.student_id || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.certificate_code || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <input style={s.searchBar} placeholder="Search by name, ID, or code…" value={search} onChange={e => setSearch(e.target.value)} />
        <button style={s.addBtn} onClick={() => { setForm({ reference_type: "manual" }); setError(""); setShowAdd(true); }}>＋ Issue Certificate</button>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading…</div>
        : filtered.length === 0 ? (
          <div style={s.emptyBox}>
            <div style={{ fontSize: 40, marginBottom: 10 }}><i className="bi bi-trophy me-1"/></div>
            <div style={{ fontWeight: 700, color: G.dark, marginBottom: 6 }}>No certificates issued yet</div>
            <div style={{ fontSize: 13, color: "#aaa" }}>Issue certificates to students manually or they auto-generate when passing assessments.</div>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Student</th>
                <th style={s.th}>Certificate Code</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Issued</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600, color: G.dark }}>{c.profiles?.full_name || "—"}</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>{c.profiles?.student_id}</div>
                  </td>
                  <td style={s.td}><code style={{ background: G.wash, padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>{c.certificate_code || "—"}</code></td>
                  <td style={s.td}><span style={s.tag("blue")}>{c.reference_type || "manual"}</span></td>
                  <td style={s.td}>{formatDate(c.issued_at)}</td>
                  <td style={s.td}><span style={s.tag(c.is_revoked ? "red" : "green")}>{c.is_revoked ? "Revoked" : "Valid"}</span></td>
                  <td style={s.td}>
                    <button style={{ padding: "5px 10px", border: "none", borderRadius: 6, background: c.is_revoked ? "#dcfce7" : "#fee2e2", fontSize: 12, cursor: "pointer", fontWeight: 600, color: c.is_revoked ? "#16a34a" : "#dc2626" }}
                      onClick={() => toggleRevoke(c)}>{c.is_revoked ? "Restore" : "Revoke"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      {showAdd && (
        <div style={s.overlay}>
          <div style={s.modal(480)}>
            <div style={s.mHeader}>
              <span style={s.mTitle}>Issue Certificate</span>
              <button style={s.iconBtn()} onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div style={s.mBody}>
              {error && <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{error}</div>}
              <div style={s.fg}>
                <label style={s.label}>Student *</label>
                <select style={s.select} value={form.user_id || ""} onChange={e => setF("user_id", e.target.value)}>
                  <option value="">— Select student —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.student_id})</option>)}
                </select>
              </div>
              <div style={s.fg}>
                <label style={s.label}>Reference Type</label>
                <select style={s.select} value={form.reference_type || "manual"} onChange={e => setF("reference_type", e.target.value)}>
                  <option value="manual">Manual</option>
                  <option value="module">Module Completion</option>
                  <option value="seminar">Seminar Attendance</option>
                  <option value="assessment">Assessment</option>
                </select>
              </div>
              <div style={{ background: G.wash, borderRadius: 6, padding: "10px 14px", fontSize: 12, color: G.dark }}>
                <i className="bi bi-lightbulb me-1"/> A unique certificate code will be auto-generated.
              </div>
            </div>
            <div style={s.mFooter}>
              <button style={s.btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
              <button style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={issueCert} disabled={saving}>{saving ? "Issuing…" : "Issue Certificate"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Badges Tab ────────────────────────────────────────────────────
function BadgesTab() {
  const [badges, setBadges]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editB, setEditB]     = useState(null);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("badges").select("*, student_badges(count)").order("name");
      if (active) { setBadges(data || []); setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const reload = async () => {
    const { data } = await supabase.from("badges").select("*, student_badges(count)").order("name");
    setBadges(data || []);
  };

  const openAdd = () => { setEditB(null); setForm({ badge_type: "achievement" }); setError(""); setShowAdd(true); };
  const openEdit = (b) => { setEditB(b); setForm({ ...b }); setError(""); setShowAdd(true); };

  const save = async () => {
    if (!form.name?.trim()) { setError("Name is required."); return; }
    setSaving(true); setError("");
    const payload = { name: form.name.trim(), description: form.description?.trim() || null, badge_type: form.badge_type || "achievement", icon_url: form.icon_url?.trim() || null };
    let err;
    if (editB) {
      ({ error: err } = await supabase.from("badges").update(payload).eq("id", editB.id));
    } else {
      ({ error: err } = await supabase.from("badges").insert(payload));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    setShowAdd(false); setForm({}); reload();
  };

  const del = async (b) => {
    const count = b.student_badges?.[0]?.count || 0;
    if (!confirm(`Delete "${b.name}"?${count > 0 ? ` This will remove it from ${count} student(s).` : ""}`)) return;
    await supabase.from("badges").delete().eq("id", b.id);
    reload();
  };

  const BADGE_TYPES = ["achievement", "completion", "participation", "excellence", "special"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#888" }}>{badges.length} badges created</div>
        <button style={s.addBtn} onClick={openAdd}>＋ Create Badge</button>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading…</div>
        : badges.length === 0 ? (
          <div style={s.emptyBox}>
            <div style={{ fontSize: 40, marginBottom: 10 }}><i className="bi bi-award me-1"/></div>
            <div style={{ fontWeight: 700, color: G.dark, marginBottom: 6 }}>No badges created yet</div>
            <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>Create badges to award students when they pass assessments or complete modules.</div>
            <button style={s.addBtn} onClick={openAdd}>＋ Create First Badge</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {badges.map(b => {
              const awardCount = b.student_badges?.[0]?.count || 0;
              return (
                <div key={b.id} style={s.badgeCard}>
                  <div style={{ width: 52, height: 52, borderRadius: 10, background: "#fef9c3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
                    {b.icon_url ? <img src={b.icon_url} style={{ width: 40, height: 40, objectFit: "contain" }} /> : ""}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: G.dark, fontSize: 14 }}>{b.name}</div>
                    {b.description && <div style={{ fontSize: 12, color: "#888", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.description}</div>}
                    <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={s.tag("yellow")}>{b.badge_type}</span>
                      <span style={{ fontSize: 11, color: "#aaa" }}>Awarded: {awardCount}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    <button style={s.iconBtn(G.base)} onClick={() => openEdit(b)}><i className="bi bi-pencil me-1"/></button>
                    <button style={s.iconBtn("#dc2626")} onClick={() => del(b)}><i className="bi bi-trash me-1"/></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {showAdd && (
        <div style={s.overlay}>
          <div style={s.modal(460)}>
            <div style={s.mHeader}>
              <span style={s.mTitle}>{editB ? "Edit Badge" : "Create Badge"}</span>
              <button style={s.iconBtn()} onClick={() => setShowAdd(false)}>×</button>
            </div>
            <div style={s.mBody}>
              {error && <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{error}</div>}
              <div style={s.fg}>
                <label style={s.label}>Badge Name *</label>
                <input style={s.input} value={form.name || ""} onChange={e => setF("name", e.target.value)} placeholder="e.g. Gender Champion" autoFocus />
              </div>
              <div style={s.fg}>
                <label style={s.label}>Description</label>
                <textarea style={s.textarea} value={form.description || ""} onChange={e => setF("description", e.target.value)} placeholder="What does this badge represent?" />
              </div>
              <div style={s.row}>
                <div style={{ ...s.fg, flex: 1 }}>
                  <label style={s.label}>Badge Type</label>
                  <select style={s.select} value={form.badge_type || "achievement"} onChange={e => setF("badge_type", e.target.value)}>
                    {BADGE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.fg}>
                <label style={s.label}>Icon URL (optional)</label>
                <input style={s.input} value={form.icon_url || ""} onChange={e => setF("icon_url", e.target.value)} placeholder="https://…" />
              </div>
            </div>
            <div style={s.mFooter}>
              <button style={s.btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
              <button style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>{saving ? "Saving…" : editB ? "Save Changes" : "Create Badge"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function CertificatesPage() {
  const [tab, setTab] = useState("certificates");
  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}><i className="bi bi-trophy me-1"/> Certificates & Badges</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>Manage student achievements and recognitions</div>
        </div>
      </div>
      <div style={s.tabs}>
        <div style={s.tab(tab === "certificates")} onClick={() => setTab("certificates")}><i className="bi bi-trophy me-1"/> Certificates</div>
        <div style={s.tab(tab === "badges")}        onClick={() => setTab("badges")}><i className="bi bi-award me-1"/> Badges</div>
      </div>
      {tab === "certificates" && <CertificatesTab />}
      {tab === "badges"       && <BadgesTab />}
    </div>
  );
}