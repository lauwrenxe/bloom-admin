import { useState, useEffect } from "react";
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


// ── Certificate Preview Modal ─────────────────────────────────────
function CertPreviewModal({ cert, onClose }) {
  const refType     = cert.reference_type || "achievement";
  const certTitle   = refType === "manual" ? "Certificate of Achievement"
    : `Certificate of ${refType.charAt(0).toUpperCase() + refType.slice(1)}`;
  const studentName = cert.profiles?.full_name || "Recipient";
  const issuedDate  = cert.issued_at ? new Date(cert.issued_at).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "—";
  const bodyText    = cert.body_text   || "has successfully completed the requirements of the BLOOM GAD e-Learning Program and is hereby awarded this certificate in recognition of outstanding participation and commitment to Gender and Development advocacy.";
  const sig1Name    = cert.sig1_name   || "GAD Coordinator";
  const sig1Title   = cert.sig1_title  || "Cavite State University";
  const sig2Name    = cert.sig2_name   || "GADRC Director";
  const sig2Title   = cert.sig2_title  || "Cavite State University";
  const themeColor  = cert.theme_color || "#2D6A2D";

  const certHTML = () => `<!DOCTYPE html><html><head><title>${certTitle}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
      @page { size: A4 landscape; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { width:297mm; height:210mm; background:#fff; font-family:'Inter',sans-serif; display:flex; align-items:center; justify-content:center; }
      .cert { width:267mm; height:186mm; border:10px double ${themeColor}; padding:28px 36px; background:linear-gradient(135deg,#fafdf6 0%,#f6f9f0 100%); display:flex; flex-direction:column; justify-content:space-between; position:relative; }
      .cert::before { content:''; position:absolute; inset:16px; border:1.5px solid rgba(45,106,45,.15); pointer-events:none; }
      .org-name { font-size:12px; font-weight:700; color:${themeColor}; letter-spacing:3px; text-transform:uppercase; text-align:center; }
      .org-sub  { font-size:10px; color:#888; letter-spacing:1px; text-align:center; margin-top:2px; }
      .divider  { border:none; border-top:1.5px solid ${themeColor}; margin:10px 80px; }
      .title    { font-family:'Playfair Display',serif; font-size:32px; font-weight:700; color:#1A2E1A; text-align:center; margin:6px 0; }
      .presented{ font-size:11px; color:#888; text-align:center; letter-spacing:3px; text-transform:uppercase; margin:6px 0; }
      .name-wrap { text-align:center; margin:6px 0; }
      .name     { font-family:'Playfair Display',serif; font-style:italic; font-size:38px; color:${themeColor}; border-bottom:2px solid #C8E6C9; padding:0 40px 6px; display:inline-block; }
      .desc     { font-size:12px; color:#555; text-align:center; max-width:480px; margin:8px auto; line-height:1.8; }
      .footer   { display:flex; justify-content:space-between; align-items:flex-end; padding-top:12px; border-top:1px solid #C8E6C9; }
      .sig-block{ text-align:center; min-width:150px; }
      .seal     { width:52px; height:52px; border-radius:50%; border:2.5px solid ${themeColor}; display:flex; align-items:center; justify-content:center; margin:0 auto 6px; font-size:22px; color:${themeColor}; }
      .sig-line { border-top:1px solid #1A2E1A; padding-top:5px; font-size:10px; color:#1A2E1A; font-weight:700; letter-spacing:.5px; }
      .sig-sub  { font-size:9px; color:#888; margin-top:2px; }
      .code-block { text-align:center; }
      .code-label { font-size:9px; color:#888; letter-spacing:1px; text-transform:uppercase; }
      .code-value { font-size:13px; font-weight:800; color:${themeColor}; letter-spacing:2px; margin:2px 0; }
      .code-date  { font-size:9px; color:#888; }
    </style></head><body>
    <div class="cert">
      <div>
        <div class="org-name">Cavite State University</div>
        <div class="org-sub">Gender and Development Resource Center (GADRC) · BLOOM e-Learning Platform</div>
        <hr class="divider"/>
        <div class="title">${certTitle}</div>
        <div class="presented">This is to certify that</div>
        <div class="name-wrap"><span class="name">${studentName}</span></div>
        <div class="desc">${bodyText}</div>
      </div>
      <div class="footer">
        <div class="sig-block">
          <div class="seal">★</div>
          <div class="sig-line">${sig1Name}</div>
          <div class="sig-sub">${sig1Title}</div>
        </div>
        <div class="code-block">
          <div class="code-label">Certificate Code</div>
          <div class="code-value">${cert.certificate_code || "—"}</div>
          <div class="code-date">Issued: ${issuedDate}</div>
        </div>
        <div class="sig-block">
          <div class="seal">✦</div>
          <div class="sig-line">${sig2Name}</div>
          <div class="sig-sub">${sig2Title}</div>
        </div>
      </div>
    </div>
    </body></html>`;

  const printCert = () => {
    const w = window.open("", "_blank");
    w.document.write(certHTML());
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 600);
  };

  const downloadPDF = () => {
    const w = window.open("", "_blank");
    w.document.write(certHTML());
    w.document.close();
    // Trigger print-to-PDF dialog after load
    setTimeout(() => {
      w.focus();
      w.print();
      // Instruct user via title
      w.document.title = `Certificate_${studentName.replace(/\s+/g,"_")}_${cert.certificate_code || "CERT"}.pdf`;
    }, 600);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:14, width:"100%", maxWidth:900, maxHeight:"95vh", overflow:"auto", boxShadow:"0 32px 80px rgba(0,0,0,.3)" }}>
        {/* Modal header */}
        <div style={{ padding:"16px 24px", borderBottom:"1px solid #DDE8DD", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:"#fff", zIndex:1 }}>
          <div style={{ fontWeight:700, color:"#1A2E1A", fontSize:15 }}>
            <i className="bi bi-patch-check me-2" style={{ color:"#2D6A2D" }}/>Certificate Preview
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={printCert} style={{ padding:"8px 16px", background:"#1A2E1A", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
              <i className="bi bi-printer"/>Print
            </button>
            <button onClick={downloadPDF} style={{ padding:"8px 16px", background:"#2D6A2D", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
              <i className="bi bi-file-earmark-pdf"/>Download PDF
            </button>
            <button onClick={onClose} style={{ padding:"8px 16px", background:"#F5F7F5", color:"#1A2E1A", border:"1px solid #DDE8DD", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:13 }}>Close</button>
          </div>
        </div>

        {/* Certificate preview */}
        <div style={{ padding:32, background:"#F5F7F5" }}>
          <div style={{
            width:"100%", aspectRatio:"842/595", maxWidth:842, margin:"0 auto", position:"relative",
            border:`10px double ${themeColor}`, background:"linear-gradient(135deg,#fafdf6 0%,#f6f9f0 100%)",
            padding:32, boxSizing:"border-box", fontFamily:"'Inter',sans-serif",
            boxShadow:"0 8px 32px rgba(0,0,0,.12)"
          }}>
            {/* Header */}
            <div style={{ textAlign:"center", marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:themeColor, letterSpacing:3, textTransform:"uppercase" }}>Cavite State University</div>
              <div style={{ fontSize:10, color:"#888", letterSpacing:1 }}>Gender and Development Resource Center (GADRC)</div>
            </div>
            <div style={{ border:"none", borderTop:`2px solid ${themeColor}`, margin:"10px 60px" }}/>

            {/* Title */}
            <div style={{ fontFamily:"Georgia,serif", fontSize:28, color:"#1A2E1A", textAlign:"center", margin:"12px 0 6px", fontWeight:700 }}>{certTitle}</div>
            <div style={{ fontSize:11, color:"#666", textAlign:"center", letterSpacing:2, textTransform:"uppercase", margin:"6px 0" }}>This is to certify that</div>

            {/* Name */}
            <div style={{ textAlign:"center", margin:"10px 0" }}>
              <span style={{ fontFamily:"Georgia,serif", fontStyle:"italic", fontSize:32, color:themeColor, borderBottom:"2px solid #C8E6C9", paddingBottom:6, paddingLeft:32, paddingRight:32 }}>
                {studentName}
              </span>
            </div>

            {/* Body */}
            <div style={{ fontSize:11, color:"#444", textAlign:"center", maxWidth:480, margin:"10px auto", lineHeight:1.8 }}>
              {bodyText}
            </div>

            {/* Footer */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginTop:20, paddingTop:14, borderTop:"1px solid #C8E6C9" }}>
              <div style={{ textAlign:"center", minWidth:140 }}>
                <div style={{ width:44, height:44, borderRadius:"50%", border:"2px solid #2D6A2D", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 6px", fontSize:18, color:themeColor }}>★</div>
                <div style={{ borderTop:"1px solid #1A2E1A", paddingTop:4, fontSize:10, fontWeight:700, color:"#1A2E1A", letterSpacing:.5 }}>{sig1Name}</div>
                <div style={{ fontSize:9, color:"#888" }}>{sig1Title}</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:9, color:"#888", letterSpacing:1, textTransform:"uppercase" }}>Certificate Code</div>
                <div style={{ fontSize:13, fontWeight:800, color:themeColor, letterSpacing:2 }}>{cert.certificate_code || "—"}</div>
                <div style={{ fontSize:9, color:"#888", marginTop:4 }}>Issued: {issuedDate}</div>
              </div>
              <div style={{ textAlign:"center", minWidth:140 }}>
                <div style={{ width:44, height:44, borderRadius:"50%", border:"2px solid #2D6A2D", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 6px", fontSize:18, color:themeColor }}>✦</div>
                <div style={{ borderTop:"1px solid #1A2E1A", paddingTop:4, fontSize:10, fontWeight:700, color:"#1A2E1A", letterSpacing:.5 }}>{sig2Name}</div>
                <div style={{ fontSize:9, color:"#888" }}>{sig2Title}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Certificates Tab ──────────────────────────────────────────────
function CertificatesTab() {
  const [certs, setCerts]       = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [showAdd, setShowAdd]   = useState(false);
  const [editCert, setEditCert] = useState(null);  // cert being edited
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState("");
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [previewCert, setPreviewCert] = useState(null);
  const setF  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setEF = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

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

  const openEdit = (cert) => {
    setEditCert(cert);
    setEditForm({
      user_id:        cert.user_id || "",
      reference_type: cert.reference_type || "manual",
      issued_at:      cert.issued_at ? cert.issued_at.split("T")[0] : "",
      body_text:      cert.body_text  || "has successfully completed the requirements of the BLOOM GAD e-Learning Program and is hereby awarded this certificate in recognition of outstanding participation and commitment to Gender and Development advocacy.",
      sig1_name:      cert.sig1_name  || "GAD Coordinator",
      sig1_title:     cert.sig1_title || "Cavite State University",
      sig2_name:      cert.sig2_name  || "GADRC Director",
      sig2_title:     cert.sig2_title || "Cavite State University",
      theme_color:    cert.theme_color || "#2D6A2D",
    });
    setEditError("");
  };

  const saveEdit = async () => {
    if (!editForm.user_id) { setEditError("Please select a student."); return; }
    if (!editForm.issued_at) { setEditError("Please set an issue date."); return; }
    setEditSaving(true); setEditError("");
    const { error: err } = await supabase.from("certificates").update({
      user_id:        editForm.user_id,
      reference_type: editForm.reference_type || "manual",
      issued_at:      new Date(editForm.issued_at).toISOString(),
      body_text:      editForm.body_text  || null,
      sig1_name:      editForm.sig1_name  || null,
      sig1_title:     editForm.sig1_title || null,
      sig2_name:      editForm.sig2_name  || null,
      sig2_title:     editForm.sig2_title || null,
      theme_color:    editForm.theme_color || "#2D6A2D",
    }).eq("id", editCert.id);
    setEditSaving(false);
    if (err) { setEditError(err.message); return; }
    // Update local state immediately so preview reflects changes right away
    const updatedFields = {
      user_id:        editForm.user_id,
      reference_type: editForm.reference_type || "manual",
      issued_at:      new Date(editForm.issued_at).toISOString(),
      body_text:      editForm.body_text  || null,
      sig1_name:      editForm.sig1_name  || null,
      sig1_title:     editForm.sig1_title || null,
      sig2_name:      editForm.sig2_name  || null,
      sig2_title:     editForm.sig2_title || null,
      theme_color:    editForm.theme_color || "#2D6A2D",
    };
    setCerts(cs => cs.map(c => c.id === editCert.id ? { ...c, ...updatedFields } : c));
    // If preview is open for this cert, update it too
    if (previewCert?.id === editCert.id) setPreviewCert(p => ({ ...p, ...updatedFields }));
    setEditCert(null);
    reload();
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
                    <button style={{ padding:"5px 10px", border:"1px solid #DDE8DD", borderRadius:6, background:"#fff", fontSize:12, cursor:"pointer", fontWeight:600, color:"#1A2E1A", marginRight:4 }}
                      onClick={() => setPreviewCert(c)}><i className="bi bi-eye me-1"/>View</button>
                    <button style={{ padding:"5px 10px", border:"1px solid #DDE8DD", borderRadius:6, background:"#fff", fontSize:12, cursor:"pointer", fontWeight:600, color:"#2D6A2D", marginRight:4 }}
                      onClick={() => openEdit(c)}><i className="bi bi-pencil me-1"/>Edit</button>
                    <button style={{ padding: "5px 10px", border: "none", borderRadius: 6, background: c.is_revoked ? "#dcfce7" : "#fee2e2", fontSize: 12, cursor: "pointer", fontWeight: 600, color: c.is_revoked ? "#16a34a" : "#dc2626" }}
                      onClick={() => toggleRevoke(c)}>{c.is_revoked ? "Restore" : "Revoke"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      {previewCert && <CertPreviewModal cert={previewCert} onClose={() => setPreviewCert(null)}/>}

      {/* ── Edit Certificate Modal ── */}
      {editCert && (
        <div style={s.overlay}>
          <div style={s.modal(480)}>
            <div style={s.mHeader}>
              <span style={s.mTitle}><i className="bi bi-pencil me-2"/>Edit Certificate</span>
              <button style={s.iconBtn()} onClick={() => setEditCert(null)}>×</button>
            </div>
            <div style={s.mBody}>
              {editError && <div style={{ background:"#fee2e2", color:"#dc2626", borderRadius:6, padding:"10px 14px", fontSize:13, marginBottom:14 }}>{editError}</div>}

              {/* Recipient */}
              <div style={s.fg}>
                <label style={s.label}>Recipient (Student) *</label>
                <select style={s.select} value={editForm.user_id || ""} onChange={e => setEF("user_id", e.target.value)}>
                  <option value="">— Select student —</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>{st.full_name} ({st.student_id})</option>
                  ))}
                </select>
              </div>

              {/* Certificate Title / Type */}
              <div style={s.fg}>
                <label style={s.label}>Certificate Title / Type *</label>
                <select style={s.select} value={editForm.reference_type || "manual"} onChange={e => setEF("reference_type", e.target.value)}>
                  <option value="manual">Certificate of Achievement (Manual)</option>
                  <option value="module">Certificate of Module Completion</option>
                  <option value="seminar">Certificate of Seminar Attendance</option>
                  <option value="assessment">Certificate of Assessment</option>
                </select>
                <div style={{ fontSize:11, color:"#888", marginTop:5 }}>
                  Preview: <strong style={{ color:"#1A2E1A" }}>
                    {editForm.reference_type === "manual" ? "Certificate of Achievement"
                      : `Certificate of ${(editForm.reference_type||"manual").charAt(0).toUpperCase() + (editForm.reference_type||"manual").slice(1)}`}
                  </strong>
                </div>
              </div>

              {/* Issue Date */}
              <div style={s.fg}>
                <label style={s.label}>Issue Date *</label>
                <input type="date" style={s.input} value={editForm.issued_at || ""}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={e => setEF("issued_at", e.target.value)} />
              </div>

              {/* Body Text */}
              <div style={s.fg}>
                <label style={s.label}>Body Text</label>
                <textarea style={{...s.textarea, minHeight:80}} value={editForm.body_text || ""} onChange={e => setEF("body_text", e.target.value)}/>
                <div style={{fontSize:11,color:"#888",marginTop:4}}>
                  <i className="bi bi-arrow-counterclockwise me-1"/>
                  <span style={{cursor:"pointer",textDecoration:"underline"}} onClick={()=>setEF("body_text","has successfully completed the requirements of the BLOOM GAD e-Learning Program and is hereby awarded this certificate in recognition of outstanding participation and commitment to Gender and Development advocacy.")}>Reset to default</span>
                </div>
              </div>

              {/* Signatories */}
              <div style={{...s.row, marginBottom:0}}>
                <div style={{flex:1,...s.fg}}>
                  <label style={s.label}>Left Signatory Name</label>
                  <input style={s.input} value={editForm.sig1_name || ""} onChange={e => setEF("sig1_name", e.target.value)} placeholder="GAD Coordinator"/>
                </div>
                <div style={{flex:1,...s.fg}}>
                  <label style={s.label}>Left Signatory Title</label>
                  <input style={s.input} value={editForm.sig1_title || ""} onChange={e => setEF("sig1_title", e.target.value)} placeholder="Cavite State University"/>
                </div>
              </div>
              <div style={{...s.row, marginBottom:16}}>
                <div style={{flex:1,...s.fg}}>
                  <label style={s.label}>Right Signatory Name</label>
                  <input style={s.input} value={editForm.sig2_name || ""} onChange={e => setEF("sig2_name", e.target.value)} placeholder="GADRC Director"/>
                </div>
                <div style={{flex:1,...s.fg}}>
                  <label style={s.label}>Right Signatory Title</label>
                  <input style={s.input} value={editForm.sig2_title || ""} onChange={e => setEF("sig2_title", e.target.value)} placeholder="Cavite State University"/>
                </div>
              </div>

              {/* Theme Color */}
              <div style={s.fg}>
                <label style={s.label}>Theme Color</label>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <input type="color" value={editForm.theme_color || "#2D6A2D"} onChange={e => setEF("theme_color", e.target.value)}
                    style={{width:48,height:36,border:"1px solid #DDE8DD",borderRadius:6,cursor:"pointer",padding:2}}/>
                  <div style={{flex:1}}>
                    {[["#2D6A2D","Forest Green (Default)"],["#1A2E1A","Dark Green"],["#1d4ed8","Blue"],["#7c3aed","Purple"],["#c2410c","Orange"],["#0f766e","Teal"]].map(([c,label])=>(
                      <span key={c} onClick={()=>setEF("theme_color",c)}
                        style={{display:"inline-block",width:22,height:22,borderRadius:"50%",background:c,marginRight:6,cursor:"pointer",border:editForm.theme_color===c?"3px solid #000":"2px solid transparent",verticalAlign:"middle"}}
                        title={label}/>
                    ))}
                  </div>
                  <code style={{fontSize:11,color:"#888"}}>{editForm.theme_color}</code>
                </div>
              </div>

              {/* Read-only info */}
              <div style={{ background:G.wash, borderRadius:6, padding:"10px 14px", fontSize:12, color:G.dark }}>
                <i className="bi bi-info-circle me-1"/>
                Certificate Code <strong>{editCert.certificate_code}</strong> cannot be changed.
              </div>
            </div>
            <div style={s.mFooter}>
              <button style={s.btnSecondary} onClick={() => setEditCert(null)}>Cancel</button>
              <button style={{ ...s.btnPrimary, opacity: editSaving ? 0.7 : 1 }}
                onClick={saveEdit} disabled={editSaving}>
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
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