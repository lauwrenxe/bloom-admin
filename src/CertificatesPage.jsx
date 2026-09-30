// src/CertificatesPage.jsx
// BLOOM GAD Admin — Certificates & Badges

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase.js";
import { useToast } from "./App.jsx";
import { V, FieldError } from "./lib/Validate.jsx";
import { logActivity } from "./lib/activityLog.js";
import { TemplatesTab, TemplateCanvas, loadTemplates, buildTemplateHTML } from "./CertificateTemplateEditor.jsx";

const G = {
  dark:  "#1A2E1A", mid:   "#2D6A2D", base:  "#3A7A3A",
  light: "#4CAF50", pale:  "#C8E6C9", wash:  "#E8F5E9",
  cream: "#F5F7F5", white: "#FFFFFF",
};

function formatDate(iso) {
  if (!iso) return "—";
  const utcStr = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  return new Date(utcStr).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateLong(iso) {
  if (!iso) return "—";
  const utcStr = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  return new Date(utcStr).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric",
  });
}

// Escape user-provided text before putting it into a printable HTML string,
// so names like "Ana <3" or "Cruz & Sons" don't break the certificate layout.
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Format a registration role like "guest_speaker" → "Guest Speaker"
function prettyRole(role) {
  if (!role) return "";
  return role.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ── Shared helper: build the data object a design template's fields read from ─
function templateDataFromCert({ recipientName, seminarTitle, dateStr, certCode, sig1Name, sig1Title, sig2Name, sig2Title, bodyText }) {
  return {
    recipient_name: recipientName || "[Participant Name]",
    seminar_title:  seminarTitle  || "",
    date:           dateStr       || "",
    cert_code:      certCode      || "CERT-XXXXXX",
    sig1_name:      sig1Name  || DEFAULT_SIGS.sig1_name,
    sig1_title:     sig1Title || DEFAULT_SIGS.sig1_title,
    sig2_name:      sig2Name  || DEFAULT_SIGS.sig2_name,
    sig2_title:     sig2Title || DEFAULT_SIGS.sig2_title,
    body_text:      bodyText  || "",
  };
}

// Templates usable for a certificate type (and optionally a specific seminar).
// Designs linked to THIS seminar come first, then the default ★ design.
// Designs linked to a different seminar are hidden.
function templatesForType(templates, refType, seminarId = null) {
  const typeOk = (t) => !t.reference_type || t.reference_type === "any" || t.reference_type === refType;
  const seminarOk = (t) => !t.seminar_id || !seminarId || t.seminar_id === seminarId;
  let list = templates.filter(t => (seminarId && t.seminar_id === seminarId) || (typeOk(t) && seminarOk(t)));
  if (list.length === 0) list = templates.filter(seminarOk);
  const rank = (t) => (seminarId && t.seminar_id === seminarId ? 2 : 0) + (t.is_default ? 1 : 0);
  return [...list].sort((a, b) => rank(b) - rank(a));
}

// The design to pre-select: one linked to this seminar, else the default for the type.
function pickTemplateFor(templates, refType, seminarId = null) {
  const list = templatesForType(templates, refType, seminarId);
  return list.find(t => seminarId && t.seminar_id === seminarId)
      || list.find(t => t.is_default && (!t.reference_type || t.reference_type === "any" || t.reference_type === refType))
      || null;
}

function templateOptionLabel(t, seminarId) {
  return `${t.name}${t.is_default ? " ★" : ""}${seminarId && t.seminar_id === seminarId ? " (this seminar)" : ""}`;
}

const s = {
  page:        { padding: "28px 32px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: "#F5F7F5", minHeight: "100vh" },
  header:      { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  title:       { fontSize: 22, fontWeight: 800, color: G.dark, margin: 0 },
  tabs:        { display: "flex", gap: 0, borderBottom: `2px solid ${G.wash}`, marginBottom: 24 },
  tab:        (a) => ({ padding: "10px 20px", fontSize: 14, fontWeight: 600, color: a ? G.dark : "#999", borderBottom: a ? `2px solid ${G.dark}` : "2px solid transparent", cursor: "pointer", marginBottom: -2, display: "flex", alignItems: "center", gap: 6 }),
  addBtn:      { padding: "9px 18px", background: G.dark, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" },
  th:          { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `2px solid ${G.wash}`, background: "#F5F7F5" },
  td:          { padding: "12px 16px", borderBottom: `1px solid ${G.wash}`, color: G.dark, verticalAlign: "middle" },
  tag:        (c) => ({ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: c === "green" ? "#dcfce7" : c === "red" ? "#fee2e2" : c === "yellow" ? "#fef9c3" : c === "blue" ? "#dbeafe" : c === "orange" ? "#ffedd5" : "#f3f4f6", color: c === "green" ? "#16a34a" : c === "red" ? "#dc2626" : c === "yellow" ? "#92400e" : c === "blue" ? "#1d4ed8" : c === "orange" ? "#c2410c" : "#555" }),
  overlay:     { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal:      (w) => ({ background: "#fff", borderRadius: 10, width: "100%", maxWidth: w || 520, maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }),
  mHeader:     { padding: "20px 24px 16px", borderBottom: `1px solid ${G.wash}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 },
  mTitle:      { fontSize: 17, fontWeight: 700, color: G.dark },
  mBody:       { padding: "20px 24px" },
  mFooter:     { padding: "16px 24px", borderTop: `1px solid ${G.wash}`, display: "flex", gap: 8, justifyContent: "flex-end", position: "sticky", bottom: 0, background: "#fff" },
  label:       { fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.6 },
  input:       { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark },
  select:      { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark, appearance: "auto", colorScheme: "light" },
  textarea:    { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark, resize: "vertical", minHeight: 70 },
  fg:          { marginBottom: 16 },
  row:         { display: "flex", gap: 12 },
  btnPrimary:  { padding: "9px 20px", background: G.dark, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnSecondary:{ padding: "9px 20px", background: G.wash, color: G.dark, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnSuccess:  { padding: "9px 20px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 },
  btnDanger:   { padding: "7px 14px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 },
  iconBtn:    (c) => ({ background: "none", border: "none", cursor: "pointer", color: c || "#999", fontSize: 14, padding: "4px 6px", borderRadius: 6 }),
  emptyBox:    { background: "#fff", borderRadius: 14, border: `2px dashed ${G.pale}`, padding: "50px 20px", textAlign: "center" },
  badgeCard:   { background: "#fff", borderRadius: 10, padding: "16px", border: "1px solid #DDE8DD", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  toolbar:     { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
  searchBar:   { padding: "9px 14px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", color: G.dark, width: 260 },
  filterSelect:{ padding: "9px 14px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", color: G.dark, appearance: "auto", cursor: "pointer", minWidth: 140, colorScheme: "light" },
  infoBox:    (c) => ({ background: c === "green" ? "#f0fdf4" : c === "red" ? "#fef2f2" : c === "yellow" ? "#fffbeb" : "#eff6ff", border: `1px solid ${c === "green" ? "#bbf7d0" : c === "red" ? "#fecaca" : c === "yellow" ? "#fed7aa" : "#bfdbfe"}`, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: c === "green" ? "#15803d" : c === "red" ? "#b91c1c" : c === "yellow" ? "#92400e" : "#1d4ed8", display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 14 }),
};

// ─────────────────────────────────────────────────────────────────────────────
//  SIGNATORY SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_SIGS = {
  sig1_name:  "GAD Coordinator",
  sig1_title: "Cavite State University",
  sig2_name:  "GADRC Director",
  sig2_title: "Cavite State University",
};

async function loadSignatorySettings() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["sig1_name", "sig1_title", "sig2_name", "sig2_title"]);
  if (error || !data?.length) return { ...DEFAULT_SIGS };
  const result = { ...DEFAULT_SIGS };
  data.forEach(row => { result[row.key] = row.value; });
  return result;
}

async function saveSignatorySettings(sigs) {
  const rows = Object.entries(sigs).map(([key, value]) => ({ key, value }));
  const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
  return error;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIGNATORY SETTINGS PANEL
// ─────────────────────────────────────────────────────────────────────────────
function SignatorySettingsPanel({ sigs, onChange }) {
  const toast = useToast();
  const [open,   setOpen]   = useState(false);
  const [form,   setForm]   = useState({ ...sigs });
  const [saving, setSaving] = useState(false);
  const [sigErr, setSigErr] = useState({});

  useEffect(() => { setForm({ ...sigs }); }, [sigs]);

  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSigErr(e => ({ ...e, [k]: null })); };

  const save = async () => {
    const errs = V.all({
      sig1_name:  V.name(form.sig1_name,  "Left signatory name"),
      sig1_title: !form.sig1_title?.trim() ? "Left signatory title is required."
                  : form.sig1_title.trim().length > 80 ? "Title must not exceed 80 characters." : null,
      sig2_name:  V.name(form.sig2_name,  "Right signatory name"),
      sig2_title: !form.sig2_title?.trim() ? "Right signatory title is required."
                  : form.sig2_title.trim().length > 80 ? "Title must not exceed 80 characters." : null,
    });
    if (errs) { setSigErr(errs); return; }
    setSaving(true);
    const saveErr = await saveSignatorySettings(form);
    setSaving(false);
    if (saveErr) { toast("Failed to save settings.", "error"); return; }
    onChange(form); setOpen(false); setSigErr({});
    toast("Signatory settings saved.", "success");
    logActivity("certificate_signatories_updated", { sig1: form.sig1_name, sig2: form.sig2_name });
  };

  const reset = () => { setForm({ ...sigs }); setSigErr({}); };

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        onClick={() => { setOpen(v => !v); setForm({ ...sigs }); setSigErr({}); }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #DDE8DD", borderRadius: open ? "8px 8px 0 0" : 8, padding: "10px 16px", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="bi bi-pen" style={{ color: G.base, fontSize: 14 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: G.dark }}>Signatory Settings</span>
          {!open && <span style={{ fontSize: 12, color: "#888", marginLeft: 4 }}>{sigs.sig1_name} &amp; {sigs.sig2_name}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!open && <span style={{ fontSize: 11, fontWeight: 600, color: G.base, background: G.wash, padding: "2px 8px", borderRadius: 10 }}><i className="bi bi-pencil me-1" style={{ fontSize: 10 }} />Edit</span>}
          <i className={`bi bi-chevron-${open ? "up" : "down"}`} style={{ color: "#aaa", fontSize: 12 }} />
        </div>
      </div>

      {open && (
        <div style={{ background: "#fff", border: "1px solid #DDE8DD", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "16px 20px" }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>
            <i className="bi bi-info-circle me-1" />
            These names appear on every certificate by default. Admins can still override them per certificate if needed.
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: G.dark, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <i className="bi bi-person-badge me-1" style={{ color: G.base }} />Left Signatory
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={s.label}>Name *</label>
                <input style={{ ...s.input, borderColor: sigErr.sig1_name ? "#dc2626" : undefined }} value={form.sig1_name || ""} onChange={e => setF("sig1_name", e.target.value)} placeholder="e.g. Dr. Maria Santos" />
                <FieldError msg={sigErr.sig1_name}/>
              </div>
              <div>
                <label style={s.label}>Title / Position *</label>
                <input style={{ ...s.input, borderColor: sigErr.sig1_title ? "#dc2626" : undefined }} value={form.sig1_title || ""} onChange={e => setF("sig1_title", e.target.value)} placeholder="e.g. GAD Coordinator" />
                <FieldError msg={sigErr.sig1_title}/>
              </div>
            </div>
            <div style={{ width: 1, background: "#DDE8DD", margin: "0 4px", alignSelf: "stretch" }} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: G.dark, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <i className="bi bi-person-badge me-1" style={{ color: G.base }} />Right Signatory
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={s.label}>Name *</label>
                <input style={{ ...s.input, borderColor: sigErr.sig2_name ? "#dc2626" : undefined }} value={form.sig2_name || ""} onChange={e => setF("sig2_name", e.target.value)} placeholder="e.g. Dr. Jose Reyes" />
                <FieldError msg={sigErr.sig2_name}/>
              </div>
              <div>
                <label style={s.label}>Title / Position *</label>
                <input style={{ ...s.input, borderColor: sigErr.sig2_title ? "#dc2626" : undefined }} value={form.sig2_title || ""} onChange={e => setF("sig2_title", e.target.value)} placeholder="e.g. GADRC Director" />
                <FieldError msg={sigErr.sig2_title}/>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14, background: G.wash, borderRadius: 6, padding: "10px 14px", fontSize: 12, color: G.dark, display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700 }}>{form.sig1_name || "—"}</div><div style={{ color: "#888", fontSize: 11 }}>{form.sig1_title || "—"}</div></div>
            <div style={{ color: "#ccc", alignSelf: "center" }}>|</div>
            <div style={{ textAlign: "center" }}><div style={{ fontWeight: 700 }}>{form.sig2_name || "—"}</div><div style={{ color: "#888", fontSize: 11 }}>{form.sig2_title || "—"}</div></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
            <button onClick={reset} style={{ padding: "8px 16px", background: G.wash, color: G.dark, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Reset</button>
            <button onClick={() => { setOpen(false); reset(); }} style={{ padding: "8px 16px", background: G.wash, color: G.dark, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ padding: "8px 18px", background: G.dark, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6, opacity: saving ? 0.7 : 1 }}>
              <i className="bi bi-check-lg" />{saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CERTIFICATE TITLE MAP
// ─────────────────────────────────────────────────────────────────────────────
const CERT_TITLES = {
  seminar:    "Certificate of Participation",
  module:     "Certificate of Completion",
  assessment: "Certificate of Achievement",
  manual:     "Certificate of Recognition",
};
function certTitle(refType) { return CERT_TITLES[refType] || "Certificate of Achievement"; }

// ─────────────────────────────────────────────────────────────────────────────
//  DEFAULT TEMPLATE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
function buildDefaultTemplate({ seminar, refType = "seminar", sigs = DEFAULT_SIGS }) {
  const semTitle   = seminar?.title || "the seminar";
  const semDate    = seminar?.scheduled_start ? formatDateLong(seminar.scheduled_start) : "";
  const semVenue   = seminar?.venue || "";
  const dateClause = semDate ? ` held on ${semDate}${semVenue ? ` at ${semVenue}` : ""}` : "";
  const bodyMap = {
    seminar:    `has successfully participated in "${semTitle}"${dateClause}, organized by the Gender and Development Resource Center (GADRC) of Cavite State University. This certificate is awarded in recognition of active participation and commitment to advancing Gender and Development advocacy.`,
    module:     `has successfully completed the module "${semTitle}"${dateClause} as part of the BLOOM GAD e-Learning Program. This certificate is awarded in recognition of dedication to learning and Gender and Development advocacy.`,
    assessment: `has successfully passed the assessment for "${semTitle}"${dateClause} under the BLOOM GAD e-Learning Program. This certificate is awarded in recognition of outstanding performance and commitment to Gender and Development principles.`,
    manual:     `is hereby recognized for outstanding contribution and participation in Gender and Development activities organized by the GADRC of Cavite State University.`,
  };
  return {
    body_text:   bodyMap[refType] || bodyMap.manual,
    sig1_name:   sigs.sig1_name  || DEFAULT_SIGS.sig1_name,
    sig1_title:  sigs.sig1_title || DEFAULT_SIGS.sig1_title,
    sig2_name:   sigs.sig2_name  || DEFAULT_SIGS.sig2_name,
    sig2_title:  sigs.sig2_title || DEFAULT_SIGS.sig2_title,
    theme_color: "#2D6A2D",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  NOTIFICATION & CODE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
async function insertCertificateNotification(userId, certCode, seminarTitle) {
  try {
    await supabase.from("notifications").insert({
      user_id: userId, type: "new_certificate", title: "Certificate Issued",
      body: seminarTitle ? `Your certificate for "${seminarTitle}" has been issued (${certCode}). View it in Achievements.` : `Your certificate (${certCode}) has been issued. View it in Achievements.`,
      reference_type: "certificate", reference_id: null, is_read: false,
    });
  } catch (e) { console.error("insertCertificateNotification failed:", e); }
}

function genCertCode() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CERT-${ts}-${rand}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MINI CERTIFICATE PREVIEW
// ─────────────────────────────────────────────────────────────────────────────
function MiniCertPreview({ recipientName, refType, template }) {
  const title = certTitle(refType);
  const themeColor = template.theme_color || "#2D6A2D";
  const bodyText   = template.body_text   || "";
  const sig1Name   = template.sig1_name   || "GAD Coordinator";
  const sig1Title  = template.sig1_title  || "Cavite State University";
  const sig2Name   = template.sig2_name   || "GADRC Director";
  const sig2Title  = template.sig2_title  || "Cavite State University";
  const today      = new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
  return (
    <div style={{ width: "100%", aspectRatio: "842/595", border: `6px double ${themeColor}`, background: "linear-gradient(135deg,#fafdf6 0%,#f6f9f0 100%)", padding: "16px 20px", boxSizing: "border-box", fontFamily: "'Georgia', serif", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", borderRadius: 6, position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ position: "absolute", inset: 10, border: `1px solid ${themeColor}22`, borderRadius: 2, pointerEvents: "none" }} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: themeColor, letterSpacing: 3, textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>Cavite State University</div>
        <div style={{ fontSize: 7, color: "#888", letterSpacing: 1, fontFamily: "'Inter',sans-serif" }}>Gender and Development Resource Center (GADRC) · BLOOM e-Learning Platform</div>
        <div style={{ borderTop: `1.5px solid ${themeColor}`, margin: "6px 32px" }} />
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1A2E1A", margin: "4px 0" }}>{title}</div>
        <div style={{ fontSize: 7, color: "#888", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", margin: "4px 0" }}>This is to certify that</div>
        <div style={{ margin: "6px 0" }}><span style={{ fontStyle: "italic", fontSize: 22, color: themeColor, borderBottom: `2px solid ${themeColor}44`, paddingBottom: 4, paddingLeft: 24, paddingRight: 24 }}>{recipientName || "[Participant Name]"}</span></div>
        <div style={{ fontSize: 7, color: "#444", maxWidth: 340, margin: "6px auto", lineHeight: 1.7, fontFamily: "'Inter',sans-serif", textAlign: "center" }}>{bodyText.length > 220 ? bodyText.slice(0, 220) + "…" : bodyText}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: `1px solid ${themeColor}33`, paddingTop: 8 }}>
        <div style={{ textAlign: "center", minWidth: 100 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${themeColor}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px", fontSize: 12, color: themeColor }}>★</div>
          <div style={{ borderTop: "1px solid #1A2E1A", paddingTop: 3, fontSize: 7, fontWeight: 700, color: "#1A2E1A", fontFamily: "'Inter',sans-serif", letterSpacing: 0.3 }}>{sig1Name}</div>
          <div style={{ fontSize: 6, color: "#888", fontFamily: "'Inter',sans-serif" }}>{sig1Title}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 6, color: "#888", letterSpacing: 1, textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>Certificate Code</div>
          <div style={{ fontSize: 9, fontWeight: 800, color: themeColor, letterSpacing: 2, fontFamily: "'Inter',sans-serif" }}>CERT-XXXXXX</div>
          <div style={{ fontSize: 6, color: "#888", marginTop: 2, fontFamily: "'Inter',sans-serif" }}>Issued: {today}</div>
        </div>
        <div style={{ textAlign: "center", minWidth: 100 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${themeColor}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px", fontSize: 12, color: themeColor }}>✦</div>
          <div style={{ borderTop: "1px solid #1A2E1A", paddingTop: 3, fontSize: 7, fontWeight: 700, color: "#1A2E1A", fontFamily: "'Inter',sans-serif", letterSpacing: 0.3 }}>{sig2Name}</div>
          <div style={{ fontSize: 6, color: "#888", fontFamily: "'Inter',sans-serif" }}>{sig2Title}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  FULL CERTIFICATE PREVIEW MODAL
// ─────────────────────────────────────────────────────────────────────────────
function CertPreviewModal({ cert, seminarTitle = "", onClose }) {
  const refType     = cert.reference_type || "achievement";
  const title       = certTitle(refType);
  const studentName = cert.profiles?.full_name || "Recipient";
  const issuedDate  = cert.issued_at ? new Date(cert.issued_at).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "—";
  const bodyText    = cert.body_text   || "has successfully completed the requirements of the BLOOM GAD e-Learning Program and is hereby awarded this certificate in recognition of outstanding participation and commitment to Gender and Development advocacy.";
  const sig1Name    = cert.sig1_name   || "GAD Coordinator";
  const sig1Title   = cert.sig1_title  || "Cavite State University";
  const sig2Name    = cert.sig2_name   || "GADRC Director";
  const sig2Title   = cert.sig2_title  || "Cavite State University";
  const themeColor  = cert.theme_color || "#2D6A2D";

  const tmpl = cert.certificate_templates || null;
  const templateData = templateDataFromCert({
    recipientName: studentName, seminarTitle, dateStr: issuedDate, certCode: cert.certificate_code,
    sig1Name, sig1Title, sig2Name, sig2Title, bodyText,
  });

  // All user-provided text is escaped before going into the printable HTML
  const certHTML = () => `<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title>
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
        <div class="title">${escapeHtml(title)}</div>
        <div class="presented">This is to certify that</div>
        <div class="name-wrap"><span class="name">${escapeHtml(studentName)}</span></div>
        <div class="desc">${escapeHtml(bodyText)}</div>
      </div>
      <div class="footer">
        <div class="sig-block"><div class="seal">★</div><div class="sig-line">${escapeHtml(sig1Name)}</div><div class="sig-sub">${escapeHtml(sig1Title)}</div></div>
        <div class="code-block"><div class="code-label">Certificate Code</div><div class="code-value">${escapeHtml(cert.certificate_code || "—")}</div><div class="code-date">Issued: ${escapeHtml(issuedDate)}</div></div>
        <div class="sig-block"><div class="seal">✦</div><div class="sig-line">${escapeHtml(sig2Name)}</div><div class="sig-sub">${escapeHtml(sig2Title)}</div></div>
      </div>
    </div></body></html>`;

  const printCert = () => {
    const w = window.open("", "_blank");
    if (!w) {
      alert("Please allow popups to view or print certificates.");
      return;
    }
    if (tmpl) {
      // The template page waits for its image and fonts, then prints itself
      w.document.write(buildTemplateHTML(tmpl, templateData, { autoPrint: true }));
      w.document.close();
    } else {
      w.document.write(certHTML());
      w.document.close();
      w.onload = () => { w.focus(); w.print(); };
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 900, maxHeight: "95vh", overflow: "auto", boxShadow: "0 32px 80px rgba(0,0,0,.3)" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #DDE8DD", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <div style={{ fontWeight: 700, color: "#1A2E1A", fontSize: 15 }}><i className="bi bi-patch-check me-2" style={{ color: "#2D6A2D" }} />Certificate Preview</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={printCert} style={{ padding: "8px 16px", background: "#1A2E1A", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><i className="bi bi-printer" />Print / Save PDF</button>
            <button onClick={onClose} style={{ padding: "8px 16px", background: "#F5F7F5", color: "#1A2E1A", border: "1px solid #DDE8DD", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Close</button>
          </div>
        </div>
        <div style={{ padding: 32, background: "#F5F7F5" }}>
          {tmpl ? (
            <TemplateCanvas imageUrl={tmpl.image_url} fields={tmpl.fields} data={templateData} editable={false} width={780} />
          ) : (
            <div style={{ width: "100%", aspectRatio: "842/595", maxWidth: 842, margin: "0 auto", position: "relative", border: `10px double ${themeColor}`, background: "linear-gradient(135deg,#fafdf6 0%,#f6f9f0 100%)", padding: 32, boxSizing: "border-box", fontFamily: "'Inter',sans-serif", boxShadow: "0 8px 32px rgba(0,0,0,.12)" }}>
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: themeColor, letterSpacing: 3, textTransform: "uppercase" }}>Cavite State University</div>
                <div style={{ fontSize: 10, color: "#888", letterSpacing: 1 }}>Gender and Development Resource Center (GADRC)</div>
              </div>
              <div style={{ border: "none", borderTop: `2px solid ${themeColor}`, margin: "10px 60px" }} />
              <div style={{ fontFamily: "Georgia,serif", fontSize: 28, color: "#1A2E1A", textAlign: "center", margin: "12px 0 6px", fontWeight: 700 }}>{title}</div>
              <div style={{ fontSize: 11, color: "#666", textAlign: "center", letterSpacing: 2, textTransform: "uppercase", margin: "6px 0" }}>This is to certify that</div>
              <div style={{ textAlign: "center", margin: "10px 0" }}>
                <span style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: 32, color: themeColor, borderBottom: "2px solid #C8E6C9", paddingBottom: 6, paddingLeft: 32, paddingRight: 32 }}>{studentName}</span>
              </div>
              <div style={{ fontSize: 11, color: "#444", textAlign: "center", maxWidth: 480, margin: "10px auto", lineHeight: 1.8 }}>{bodyText}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 20, paddingTop: 14, borderTop: "1px solid #C8E6C9" }}>
                <div style={{ textAlign: "center", minWidth: 140 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${themeColor}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 18, color: themeColor }}>★</div>
                  <div style={{ borderTop: "1px solid #1A2E1A", paddingTop: 4, fontSize: 10, fontWeight: 700, color: "#1A2E1A", letterSpacing: .5 }}>{sig1Name}</div>
                  <div style={{ fontSize: 9, color: "#888" }}>{sig1Title}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "#888", letterSpacing: 1, textTransform: "uppercase" }}>Certificate Code</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: themeColor, letterSpacing: 2 }}>{cert.certificate_code || "—"}</div>
                  <div style={{ fontSize: 9, color: "#888", marginTop: 4 }}>Issued: {issuedDate}</div>
                </div>
                <div style={{ textAlign: "center", minWidth: 140 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${themeColor}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 18, color: themeColor }}>✦</div>
                  <div style={{ borderTop: "1px solid #1A2E1A", paddingTop: 4, fontSize: 10, fontWeight: 700, color: "#1A2E1A", letterSpacing: .5 }}>{sig2Name}</div>
                  <div style={{ fontSize: 9, color: "#888" }}>{sig2Title}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ATTENDANCE GATE CHECK — checks ALL selected recipients at once
// ─────────────────────────────────────────────────────────────────────────────
async function checkAttendanceForMany(userIds, seminarId) {
  const [att, certs] = await Promise.all([
    supabase.from("seminar_attendance")
      .select("user_id, checked_in_at")
      .eq("seminar_id", seminarId)
      .in("user_id", userIds),
    supabase.from("certificates")
      .select("user_id")
      .eq("reference_type", "seminar")
      .eq("reference_id", seminarId)
      .eq("is_revoked", false)
      .in("user_id", userIds),
  ]);
  const attendedMap = {};
  (att.data || []).forEach(a => { if (a.checked_in_at) attendedMap[a.user_id] = a.checked_in_at; });
  const certSet = new Set((certs.data || []).map(c => c.user_id));
  return { attendedMap, certSet, error: att.error || certs.error || null };
}

// ─────────────────────────────────────────────────────────────────────────────
//  CERTIFICATES TAB
// ─────────────────────────────────────────────────────────────────────────────
function CertificatesTab({ sigs, onSigsChange }) {
  const toast = useToast();

  const [certs,     setCerts]     = useState([]);
  const [students,  setStudents]  = useState([]);
  const [seminars,  setSeminars]  = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filterType, setFilterType] = useState("all");

  const [showAdd,   setShowAdd]   = useState(false);
  const [form,      setForm]      = useState({ reference_type: "seminar" });
  const [template,  setTemplate]  = useState({});
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [recipientSearch,    setRecipientSearch]    = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  // gate: null | "checking" | { attendedMap, certSet, error }
  const [gate, setGate] = useState(null);
  const [editCert,   setEditCert]   = useState(null);
  const [editForm,   setEditForm]   = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError,  setEditError]  = useState("");
  const [editErr,    setEditErr]    = useState({});
  const [previewCert, setPreviewCert] = useState(null);

  const COLORS = [["#2D6A2D","Forest Green"],["#1A2E1A","Dark Green"],["#1d4ed8","Blue"],["#7c3aed","Purple"],["#c2410c","Orange"],["#0f766e","Teal"]];

  const setF  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setEF = (k, v) => { setEditForm(f => ({ ...f, [k]: v })); setEditErr(e => ({ ...e, [k]: null })); };

  const load = useCallback(async () => {
    setLoading(true);

    const [{ data: c, error: cErr }, { data: profiles, error: pErr }, { data: sems, error: sErr }] = await Promise.all([
      supabase
        .from("certificates")
        .select("*, profiles!certificates_user_id_fkey(full_name, student_id, email), certificate_templates(*)")
        .order("issued_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name, student_id, role").order("full_name"),
      supabase.from("seminars").select("id, title, scheduled_start, scheduled_end, venue, seminar_type, status").order("scheduled_start", { ascending: false }),
    ]);

    if (cErr) {
      console.error("Certificates fetch error:", cErr);
      const { data: fallbackData } = await supabase
        .from("certificates")
        .select("*, profiles!certificates_user_id_fkey(full_name, student_id, email)")
        .order("issued_at", { ascending: false });
      setCerts(fallbackData || []);
    } else {
      setCerts(c || []);
    }

    if (pErr) console.error("Profiles fetch error:", pErr);
    if (sErr) console.error("Seminars fetch error:", sErr);

    setStudents(profiles || []);
    setSeminars(sems || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    loadTemplates().then(setTemplates);
  }, [load]);

  // Rebuild the default body/signatories when seminar, type, or signatories change
  useEffect(() => {
    const seminar = seminars.find(s => s.id === form.seminar_id) || null;
    const refType = form.reference_type || "seminar";
    setTemplate(buildDefaultTemplate({ seminar, refType, sigs }));
  }, [form.seminar_id, form.reference_type, seminars, sigs]);

  // Check attendance + existing certificates for EVERY selected recipient
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (form.reference_type !== "seminar" || !form.seminar_id || selectedRecipients.length === 0) {
        if (!cancelled) setGate(null);
        return;
      }
      setGate("checking");
      const result = await checkAttendanceForMany(selectedRecipients, form.seminar_id);
      if (!cancelled) setGate(result);
    })();
    return () => { cancelled = true; };
  }, [selectedRecipients, form.seminar_id, form.reference_type]);

  const nameOf = (id) => students.find(st => st.id === id)?.full_name || "Unknown";

  // Split selected recipients into who can / can't receive a seminar certificate
  const isSeminarType   = form.reference_type === "seminar";
  const gateReady       = gate && gate !== "checking" && !gate.error;
  const okIds           = gateReady ? selectedRecipients.filter(id => gate.attendedMap[id] && !gate.certSet.has(id)) : [];
  const hasCertIds      = gateReady ? selectedRecipients.filter(id => gate.certSet.has(id)) : [];
  const notAttendedIds  = gateReady ? selectedRecipients.filter(id => !gate.attendedMap[id] && !gate.certSet.has(id)) : [];
  const issueTargets    = isSeminarType ? okIds : selectedRecipients;
  const skippedCount    = isSeminarType ? selectedRecipients.length - okIds.length : 0;

  const resetIssueForm = () => {
    setForm({ reference_type: "seminar" }); setTemplate({}); setError("");
    setSelectedRecipients([]); setRecipientSearch(""); setGate(null);
  };

  const issueCert = async () => {
    setError("");
    if (selectedRecipients.length === 0) { setError("Please select at least one recipient."); return; }
    if (isSeminarType) {
      if (!form.seminar_id) { setError("Please select a seminar."); return; }
      if (!gate || gate === "checking") { setError("Checking attendance, please wait…"); return; }
      if (gate.error) { setError(`Could not check attendance: ${gate.error.message}`); return; }
      if (okIds.length === 0) { setError("None of the selected participants can receive a certificate. They either have no verified attendance or already have one."); return; }
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const seminar = seminars.find(s => s.id === form.seminar_id);

    const rowsToInsert = issueTargets.map(uid => ({
      user_id: uid,
      reference_type: form.reference_type || "seminar",
      reference_id: isSeminarType ? form.seminar_id : (form.reference_id || null),
      certificate_code: genCertCode(),
      is_revoked: false,
      issued_at: new Date().toISOString(),
      issued_by: user?.id,
      body_text: template.body_text || null,
      sig1_name: template.sig1_name || null,
      sig1_title: template.sig1_title || null,
      sig2_name: template.sig2_name || null,
      sig2_title: template.sig2_title || null,
      theme_color: template.theme_color || "#2D6A2D",
      template_id: form.template_id || null,
    }));

    const { data: insertedData, error: err } = await supabase
      .from("certificates")
      .insert(rowsToInsert)
      .select();

    if (err) {
      setSaving(false);
      setError(`Failed to issue certificates: ${err.message}`);
      return;
    }

    await Promise.all(
      (insertedData || []).map(c => insertCertificateNotification(c.user_id, c.certificate_code, seminar?.title))
    );

    setSaving(false);
    const n = rowsToInsert.length;
    toast(
      `${n} certificate${n !== 1 ? "s" : ""} issued successfully.${skippedCount > 0 ? ` ${skippedCount} skipped.` : ""}`,
      "success"
    );
    logActivity("certificate_issued", { count: n, skipped: skippedCount, type: form.reference_type });
    setShowAdd(false);
    resetIssueForm();
    load();
  };

  const toggleRevoke = async (cert) => {
    const newVal = !cert.is_revoked;
    const { error: err } = await supabase.from("certificates").update({ is_revoked: newVal }).eq("id", cert.id);
    if (err) { toast(`Failed to update certificate: ${err.message}`, "error"); return; }
    setCerts(cs => cs.map(c => c.id === cert.id ? { ...c, is_revoked: newVal } : c));
    toast(newVal ? "Certificate revoked." : "Certificate restored.", "success");
    logActivity(newVal ? "certificate_revoked" : "certificate_restored", { certificate_code: cert.certificate_code });
  };

  const openEdit = (cert) => {
    setEditCert(cert);
    setEditForm({
      user_id: cert.user_id || "", reference_type: cert.reference_type || "manual",
      issued_at: cert.issued_at ? cert.issued_at.split("T")[0] : "",
      body_text: cert.body_text || "", sig1_name: cert.sig1_name || "GAD Coordinator",
      sig1_title: cert.sig1_title || "Cavite State University", sig2_name: cert.sig2_name || "GADRC Director",
      sig2_title: cert.sig2_title || "Cavite State University", theme_color: cert.theme_color || "#2D6A2D",
      template_id: cert.template_id || "",
    });
    setEditError(""); setEditErr({});
    loadTemplates().then(setTemplates);
  };

  const saveEdit = async () => {
    const errs = V.all({
      user_id:   !editForm.user_id ? "Please select a student." : null,
      issued_at: !editForm.issued_at ? "Please set an issue date."
                 : new Date(editForm.issued_at) > new Date() ? "Issue date cannot be in the future." : null,
      body_text: editForm.body_text?.trim().length > 0 && editForm.body_text.trim().length < 10
                 ? "Body text must be at least 10 characters."
                 : editForm.body_text?.trim().length > 500 ? "Body text must not exceed 500 characters." : null,
      sig1_name: V.name(editForm.sig1_name, "Left signatory name"),
      sig2_name: V.name(editForm.sig2_name, "Right signatory name"),
    });
    if (errs) { setEditErr(errs); return; }
    setEditSaving(true); setEditError(""); setEditErr({});
    const { error: err } = await supabase.from("certificates").update({
      user_id: editForm.user_id, reference_type: editForm.reference_type || "manual",
      issued_at: new Date(editForm.issued_at).toISOString(),
      body_text: editForm.body_text || null, sig1_name: editForm.sig1_name || null, sig1_title: editForm.sig1_title || null,
      sig2_name: editForm.sig2_name || null, sig2_title: editForm.sig2_title || null, theme_color: editForm.theme_color || "#2D6A2D",
      template_id: editForm.template_id || null,
    }).eq("id", editCert.id);
    setEditSaving(false);
    if (err) { setEditError(err.message); return; }
    toast("Certificate updated.", "success");
    logActivity("certificate_updated", { certificate_code: editCert.certificate_code });
    setEditCert(null);
    if (previewCert?.id === editCert.id) setPreviewCert(p => ({ ...p, ...editForm }));
    load();
  };

  // "Reset to default" in the edit modal uses the certificate's actual seminar if it has one
  const resetEditBody = () => {
    const seminar = editForm.reference_type === "seminar"
      ? seminars.find(sm => sm.id === editCert?.reference_id) || null
      : null;
    const d = buildDefaultTemplate({ seminar, refType: editForm.reference_type, sigs });
    setEF("body_text", d.body_text);
  };

  const filtered = certs.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = (c.profiles?.full_name || "").toLowerCase().includes(q) || (c.profiles?.student_id || "").toLowerCase().includes(q) || (c.certificate_code || "").toLowerCase().includes(q);
    const matchType   = filterType === "all" || c.reference_type === filterType;
    return matchSearch && matchType;
  });

  const renderAttendanceGate = () => {
    if (!isSeminarType || !form.seminar_id || selectedRecipients.length === 0) return null;
    if (!gate || gate === "checking") {
      return <div style={s.infoBox("blue")}><span className="spinner-border spinner-border-sm me-2" />Checking attendance records…</div>;
    }
    if (gate.error) {
      return <div style={s.infoBox("red")}><i className="bi bi-x-circle-fill" /><div><strong>Could not check attendance.</strong> {gate.error.message}</div></div>;
    }
    const single = selectedRecipients.length === 1;
    return (
      <>
        {okIds.length > 0 && (
          <div style={s.infoBox("green")}>
            <i className="bi bi-check-circle-fill" />
            <div>
              <strong>Attendance verified.</strong>{" "}
              {single
                ? <>Checked in on {formatDate(gate.attendedMap[okIds[0]])}. Certificate can be issued.</>
                : <>{okIds.length} participant{okIds.length !== 1 ? "s" : ""} will receive a certificate.</>}
            </div>
          </div>
        )}
        {hasCertIds.length > 0 && (
          <div style={s.infoBox("yellow")}>
            <i className="bi bi-exclamation-triangle-fill" />
            <div>
              <strong>Already has a certificate{single ? "" : " (will be skipped)"}:</strong>{" "}
              {hasCertIds.map(nameOf).join(", ")}
            </div>
          </div>
        )}
        {notAttendedIds.length > 0 && (
          <div style={s.infoBox("red")}>
            <i className="bi bi-x-circle-fill" />
            <div>
              <strong>No verified attendance{single ? "" : " (will be skipped)"}:</strong>{" "}
              {notAttendedIds.map(nameOf).join(", ")}
            </div>
          </div>
        )}
      </>
    );
  };

  const canIssue = () => {
    if (selectedRecipients.length === 0) return false;
    if (isSeminarType) return !!form.seminar_id && gateReady && okIds.length > 0;
    return true;
  };

  const issueButtonLabel = () => {
    if (saving) return "Issuing…";
    const n = issueTargets.length;
    const base = n > 1 ? `Issue ${n} Certificates` : "Issue Certificate";
    return skippedCount > 0 && n > 0 ? `${base} (${skippedCount} skipped)` : base;
  };

  const typeLabel = (t) => ({ manual: "Manual", module: "Module Completion", seminar: "Seminar Attendance", assessment: "Assessment" }[t] || t);
  const filteredStudents = students.filter(st => { const q = recipientSearch.toLowerCase(); return (st.full_name || "").toLowerCase().includes(q) || (st.student_id || "").toLowerCase().includes(q) || (st.role || "").toLowerCase().includes(q); });
  const previewRecipientName = selectedRecipients.length === 1 ? nameOf(selectedRecipients[0]) : selectedRecipients.length > 1 ? `${selectedRecipients.length} Recipients` : "";
  const selectedSeminar = seminars.find(s => s.id === form.seminar_id);

  const issueSeminarId       = isSeminarType ? (form.seminar_id || null) : null;
  const displayTemplates     = templatesForType(templates, form.reference_type || "seminar", issueSeminarId);
  const selectedTemplateObj  = displayTemplates.find(t => t.id === form.template_id) || null;
  const editSeminarId        = editForm.reference_type === "seminar" ? (editCert?.reference_id || null) : null;
  const editDisplayTemplates = templatesForType(templates, editForm.reference_type || "manual", editSeminarId);

  const issuePreviewData = templateDataFromCert({
    recipientName: previewRecipientName,
    seminarTitle:  selectedSeminar?.title,
    dateStr:       selectedSeminar?.scheduled_start ? formatDateLong(selectedSeminar.scheduled_start) : new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }),
    certCode:      "CERT-XXXXXX",
    sig1Name: template.sig1_name, sig1Title: template.sig1_title, sig2Name: template.sig2_name, sig2Title: template.sig2_title,
    bodyText: template.body_text,
  });

  return (
    <div>
      <SignatorySettingsPanel sigs={sigs} onChange={onSigsChange} />

      <div style={s.toolbar}>
        <input style={s.searchBar} placeholder="Search by name, ID, or code…" value={search} onChange={e => setSearch(e.target.value)} />
        <select style={s.filterSelect} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="manual">Manual</option>
          <option value="seminar">Seminar</option>
          <option value="module">Module</option>
          <option value="assessment">Assessment</option>
        </select>
        <div style={{ marginLeft: "auto" }}>
          <button style={s.addBtn} onClick={() => {
            resetIssueForm(); setShowAdd(true);
            loadTemplates().then(list => {
              setTemplates(list);
              setForm(f => f.template_id ? f : { ...f, template_id: pickTemplateFor(list, f.reference_type || "seminar", f.seminar_id || null)?.id || "" });
            });
          }}>
            <i className="bi bi-plus-lg" />Issue Certificate
          </button>
        </div>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading…</div>
        : filtered.length === 0 ? (
          <div style={s.emptyBox}>
            <div style={{ fontSize: 40, marginBottom: 10 }}><i className="bi bi-trophy" /></div>
            <div style={{ fontWeight: 700, color: G.dark, marginBottom: 6 }}>No certificates found</div>
            <div style={{ fontSize: 13, color: "#aaa" }}>Issue a certificate using the button above.</div>
          </div>
        ) : (
          <table style={s.table}>
            <thead><tr>
              <th style={s.th}>Recipient</th><th style={s.th}>Certificate Code</th>
              <th style={s.th}>Type</th><th style={s.th}>Issued</th>
              <th style={s.th}>Status</th><th style={s.th}>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={s.td}><div style={{ fontWeight: 600 }}>{c.profiles?.full_name || "—"}</div><div style={{ fontSize: 11, color: "#aaa" }}>{c.profiles?.student_id || c.profiles?.email}</div></td>
                  <td style={s.td}><code style={{ background: G.wash, padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>{c.certificate_code || "—"}</code></td>
                  <td style={s.td}><span style={s.tag(c.reference_type === "seminar" ? "blue" : c.reference_type === "module" ? "green" : c.reference_type === "assessment" ? "orange" : "")}>{typeLabel(c.reference_type)}</span></td>
                  <td style={s.td}>{formatDate(c.issued_at)}</td>
                  <td style={s.td}><span style={s.tag(c.is_revoked ? "red" : "green")}>{c.is_revoked ? "Revoked" : "Valid"}</span></td>
                  <td style={s.td}>
                    <button style={{ padding: "5px 10px", border: "1px solid #DDE8DD", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600, color: "#1A2E1A", marginRight: 4 }} onClick={() => setPreviewCert(c)}><i className="bi bi-eye me-1" />View</button>
                    <button style={{ padding: "5px 10px", border: "1px solid #DDE8DD", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600, color: "#2D6A2D", marginRight: 4 }} onClick={() => openEdit(c)}><i className="bi bi-pencil me-1" />Edit</button>
                    <button style={{ padding: "5px 10px", border: "none", borderRadius: 6, background: c.is_revoked ? "#dcfce7" : "#fee2e2", fontSize: 12, cursor: "pointer", fontWeight: 600, color: c.is_revoked ? "#16a34a" : "#dc2626" }} onClick={() => toggleRevoke(c)}>{c.is_revoked ? "Restore" : "Revoke"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }

      {previewCert && (
        <CertPreviewModal
          cert={previewCert}
          seminarTitle={previewCert.reference_type === "seminar" ? (seminars.find(sm => sm.id === previewCert.reference_id)?.title || "") : ""}
          onClose={() => setPreviewCert(null)}
        />
      )}

      {/* ── Issue Certificate Modal ── */}
      {showAdd && (
        <div style={s.overlay}>
          <div style={{ ...s.modal(860), display: "flex", flexDirection: "column" }}>
            <div style={s.mHeader}>
              <span style={s.mTitle}><i className="bi bi-patch-check me-2" />Issue Certificate</span>
              <button style={s.iconBtn()} onClick={() => setShowAdd(false)}><i className="bi bi-x-lg" /></button>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
              {/* Left Column: Form Controls */}
              <div style={{ flex: "0 0 380px", borderRight: `1px solid ${G.wash}`, overflow: "auto", padding: "20px 24px" }}>
                {error && (
                  <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ flexShrink: 0, marginTop: 1 }} />{error}
                  </div>
                )}

                <div style={s.fg}>
                  <label style={s.label}>Certificate Type *</label>
                  <select style={s.select} value={form.reference_type || "seminar"} onChange={e => {
                    const type = e.target.value;
                    setForm(f => ({ ...f, reference_type: type, seminar_id: "", template_id: pickTemplateFor(templates, type, null)?.id || "" }));
                    setSelectedRecipients([]); setRecipientSearch(""); setGate(null);
                  }}>
                    <option value="seminar">Certificate of Participation (Seminar)</option>
                    <option value="module">Certificate of Completion (Module)</option>
                    <option value="assessment">Certificate of Achievement (Assessment)</option>
                    <option value="manual">Certificate of Recognition (Manual)</option>
                  </select>
                </div>

                {isSeminarType && (
                  <div style={s.fg}>
                    <label style={s.label}>Seminar *</label>
                    <select style={s.select} value={form.seminar_id || ""} onChange={e => {
                      const sid = e.target.value;
                      setForm(f => ({ ...f, seminar_id: sid, template_id: pickTemplateFor(templates, "seminar", sid || null)?.id || "" }));
                    }}>
                      <option value="">— Select seminar —</option>
                      {seminars.map(sem => <option key={sem.id} value={sem.id}>{sem.title}{sem.scheduled_start ? ` (${formatDate(sem.scheduled_start)})` : ""}</option>)}
                    </select>
                    {selectedSeminar && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#888", background: G.wash, borderRadius: 6, padding: "6px 10px" }}>
                        <i className="bi bi-info-circle me-1" />
                        {[selectedSeminar.venue && `Venue: ${selectedSeminar.venue}`, selectedSeminar.scheduled_start && `Date: ${formatDateLong(selectedSeminar.scheduled_start)}`].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                )}

                <div style={s.fg}>
                  <label style={s.label}>Design Template <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>(optional)</span></label>
                  <select style={s.select} value={form.template_id || ""} onChange={e => setF("template_id", e.target.value)}>
                    <option value="">— Use Default Layout —</option>
                    {displayTemplates.map(t => <option key={t.id} value={t.id}>{templateOptionLabel(t, issueSeminarId)}</option>)}
                  </select>
                  {displayTemplates.length === 0 && <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>No uploaded designs available. Upload one in the <strong>Templates</strong> tab.</div>}
                </div>

                <div style={s.fg}>
                  <label style={s.label}>Recipient * {selectedRecipients.length > 0 && <span style={{ color: G.base, fontWeight: 700 }}>({selectedRecipients.length} selected)</span>}</label>
                  <input style={{ ...s.input, marginBottom: 8 }} placeholder="Search by name, ID, or role…" value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)} />
                  <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #DDE8DD", borderRadius: 6, background: "#fff" }}>
                    {filteredStudents.length === 0 ? <div style={{ padding: "20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>No results</div>
                      : filteredStudents.map(st => {
                          const checked = selectedRecipients.includes(st.id);
                          return (
                            <label key={st.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${G.wash}`, background: checked ? G.wash : "transparent" }}>
                              <input type="checkbox" checked={checked} onChange={() => setSelectedRecipients(prev => checked ? prev.filter(id => id !== st.id) : [...prev, st.id])} style={{ width: 15, height: 15, accentColor: G.base, flexShrink: 0 }} />
                              <div><div style={{ fontWeight: 600, fontSize: 13, color: G.dark }}>{st.full_name}</div><div style={{ fontSize: 11, color: "#aaa" }}>{[st.student_id, st.role].filter(Boolean).join(" · ")}</div></div>
                            </label>
                          );
                        })
                    }
                  </div>
                  {selectedRecipients.length > 0 && <div style={{ marginTop: 6, fontSize: 12, color: "#888", display: "flex", justifyContent: "space-between" }}><span>{selectedRecipients.length} recipient(s) selected</span><span style={{ cursor: "pointer", color: G.base, textDecoration: "underline" }} onClick={() => setSelectedRecipients([])}>Clear all</span></div>}
                </div>

                {renderAttendanceGate()}
              </div>

              {/* Right Column: Live Preview */}
              <div style={{ flex: 1, background: "#F5F7F5", padding: "20px 24px", display: "flex", flexDirection: "column", overflow: "auto" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.6, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bi bi-eye" />Live Preview
                </div>
                {selectedTemplateObj
                  ? <TemplateCanvas imageUrl={selectedTemplateObj.image_url} fields={selectedTemplateObj.fields} data={issuePreviewData} editable={false} width={440} />
                  : <MiniCertPreview recipientName={previewRecipientName} refType={form.reference_type} template={template} />
                }
                <div style={{ marginTop: 12, fontSize: 11, color: "#aaa", textAlign: "center" }}>
                  Selected recipient details map directly onto the template background design.
                </div>
              </div>
            </div>

            <div style={s.mFooter}>
              <button style={s.btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
              <button style={{ ...s.btnPrimary, opacity: (saving || !canIssue()) ? 0.5 : 1, cursor: canIssue() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6 }} onClick={issueCert} disabled={saving || !canIssue()}>
                <i className="bi bi-send-check" />{issueButtonLabel()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Certificate Modal ── */}
      {editCert && (
        <div style={s.overlay}>
          <div style={s.modal(480)}>
            <div style={s.mHeader}>
              <span style={s.mTitle}><i className="bi bi-pencil me-2" />Edit Certificate</span>
              <button style={s.iconBtn()} onClick={() => setEditCert(null)}><i className="bi bi-x-lg" /></button>
            </div>
            <div style={s.mBody}>
              {editError && <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{editError}</div>}
              <div style={s.fg}>
                <label style={s.label}>Recipient *</label>
                <select style={{ ...s.select, borderColor: editErr.user_id ? "#dc2626" : undefined }} value={editForm.user_id || ""} onChange={e => setEF("user_id", e.target.value)}>
                  <option value="">— Select student —</option>
                  {students.map(st => <option key={st.id} value={st.id}>{st.full_name}{st.student_id ? ` (${st.student_id})` : ""}</option>)}
                </select>
                <FieldError msg={editErr.user_id}/>
              </div>
              <div style={s.fg}>
                <label style={s.label}>Certificate Type</label>
                <select style={s.select} value={editForm.reference_type || "manual"} onChange={e => setEF("reference_type", e.target.value)}>
                  <option value="seminar">Certificate of Participation (Seminar)</option>
                  <option value="module">Certificate of Completion (Module)</option>
                  <option value="assessment">Certificate of Achievement (Assessment)</option>
                  <option value="manual">Certificate of Recognition (Manual)</option>
                </select>
              </div>
              <div style={s.fg}>
                <label style={s.label}>Design Template <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>(optional)</span></label>
                <select style={s.select} value={editForm.template_id || ""} onChange={e => setEF("template_id", e.target.value)}>
                  <option value="">— Use Default Layout —</option>
                  {editDisplayTemplates.map(t => <option key={t.id} value={t.id}>{templateOptionLabel(t, editSeminarId)}</option>)}
                </select>
              </div>
              <div style={s.fg}>
                <label style={s.label}>Issue Date *</label>
                <input type="date" style={{ ...s.input, borderColor: editErr.issued_at ? "#dc2626" : undefined }} value={editForm.issued_at || ""} max={new Date().toISOString().split("T")[0]} onChange={e => setEF("issued_at", e.target.value)} />
                <FieldError msg={editErr.issued_at}/>
              </div>
              <div style={s.fg}>
                <label style={s.label}>Body Text <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>({(editForm.body_text||"").length}/500)</span></label>
                <textarea style={{ ...s.textarea, minHeight: 80, borderColor: editErr.body_text ? "#dc2626" : undefined }} value={editForm.body_text || ""} onChange={e => setEF("body_text", e.target.value)} />
                <FieldError msg={editErr.body_text}/>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4, cursor: "pointer", textDecoration: "underline" }} onClick={resetEditBody}>↺ Reset to default</div>
              </div>
              <div style={s.row}>
                <div style={{ flex: 1, ...s.fg }}>
                  <label style={s.label}>Left Signatory Name *</label>
                  <input style={{ ...s.input, borderColor: editErr.sig1_name ? "#dc2626" : undefined }} value={editForm.sig1_name || ""} onChange={e => setEF("sig1_name", e.target.value)} placeholder="GAD Coordinator" />
                  <FieldError msg={editErr.sig1_name}/>
                </div>
                <div style={{ flex: 1, ...s.fg }}>
                  <label style={s.label}>Left Signatory Title</label>
                  <input style={s.input} value={editForm.sig1_title || ""} onChange={e => setEF("sig1_title", e.target.value)} placeholder="Cavite State University" />
                </div>
              </div>
              <div style={s.row}>
                <div style={{ flex: 1, ...s.fg }}>
                  <label style={s.label}>Right Signatory Name *</label>
                  <input style={{ ...s.input, borderColor: editErr.sig2_name ? "#dc2626" : undefined }} value={editForm.sig2_name || ""} onChange={e => setEF("sig2_name", e.target.value)} placeholder="GADRC Director" />
                  <FieldError msg={editErr.sig2_name}/>
                </div>
                <div style={{ flex: 1, ...s.fg }}>
                  <label style={s.label}>Right Signatory Title</label>
                  <input style={s.input} value={editForm.sig2_title || ""} onChange={e => setEF("sig2_title", e.target.value)} placeholder="Cavite State University" />
                </div>
              </div>
              {!editForm.template_id && (
                <div style={s.fg}>
                  <label style={s.label}>Theme Color <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>(default layout only)</span></label>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input type="color" value={editForm.theme_color || "#2D6A2D"} onChange={e => setEF("theme_color", e.target.value)} style={{ width: 48, height: 36, border: "1px solid #DDE8DD", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                    <div style={{ flex: 1 }}>{COLORS.map(([c, label]) => <span key={c} onClick={() => setEF("theme_color", c)} title={label} style={{ display: "inline-block", width: 22, height: 22, borderRadius: "50%", background: c, marginRight: 6, cursor: "pointer", border: editForm.theme_color === c ? "3px solid #000" : "2px solid transparent", verticalAlign: "middle" }} />)}</div>
                    <code style={{ fontSize: 11, color: "#888" }}>{editForm.theme_color}</code>
                  </div>
                </div>
              )}
              <div style={{ background: G.wash, borderRadius: 6, padding: "10px 14px", fontSize: 12, color: G.dark }}>
                <i className="bi bi-info-circle me-1" />Certificate Code <strong>{editCert.certificate_code}</strong> cannot be changed.
              </div>
            </div>
            <div style={s.mFooter}>
              <button style={s.btnSecondary} onClick={() => setEditCert(null)}>Cancel</button>
              <button style={{ ...s.btnPrimary, opacity: editSaving ? 0.7 : 1 }} onClick={saveEdit} disabled={editSaving}>{editSaving ? "Saving…" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUTO-ISSUE TAB — gated on: registered (not cancelled) + attended + evaluated
// ─────────────────────────────────────────────────────────────────────────────
function AutoIssueTab({ sigs, onSigsChange }) {
  const toast = useToast();
  const [seminars,   setSeminars]   = useState([]);
  const [templates,  setTemplates]  = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [selected,   setSelected]   = useState(null);
  const [eligible,   setEligible]   = useState([]);
  const [counts,     setCounts]     = useState(null); // { registered, attended, evaluated }
  const [loading,    setLoading]    = useState(false);
  const [issuing,    setIssuing]    = useState(false);
  const [issuedIds,  setIssuedIds]  = useState(new Set());
  const [error,      setError]      = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: sems }, tmpls] = await Promise.all([
        supabase.from("seminars").select("id, title, scheduled_start, scheduled_end, venue, seminar_type, status").order("scheduled_start", { ascending: false }),
        loadTemplates(),
      ]);
      if (!active) return;
      setSeminars(sems || []);
      const list = tmpls || [];
      setTemplates(list);
      // Pre-select the default (★) seminar design, if there is one
      const def = pickTemplateFor(list, "seminar", null);
      if (def) setTemplateId(def.id);
    })();
    return () => { active = false; };
  }, []);

  const seminarTemplates = templatesForType(templates, "seminar", selected?.id || null);
  const selectedTemplate = seminarTemplates.find(t => t.id === templateId) || null;

  const loadEligible = async (seminarId) => {
    setLoading(true); setEligible([]); setIssuedIds(new Set()); setError(""); setCounts(null);
    const [regRes, attRes, evalRes, certRes] = await Promise.all([
      supabase.from("seminar_registrations")
        .select("user_id, role, status, profiles(full_name, email, department)")
        .eq("seminar_id", seminarId)
        .neq("status", "cancelled"),
      supabase.from("seminar_attendance")
        .select("user_id")
        .eq("seminar_id", seminarId),
      supabase.from("seminar_evaluations")
        .select("user_id")
        .eq("seminar_id", seminarId)
        .not("submitted_at", "is", null),
      supabase.from("certificates")
        .select("user_id")
        .eq("reference_type", "seminar")
        .eq("reference_id", seminarId)
        .eq("is_revoked", false),
    ]);

    const firstErr = regRes.error || attRes.error || evalRes.error || certRes.error;
    if (firstErr) { setError(firstErr.message); setLoading(false); return; }

    const registered = regRes.data || [];
    const attended   = new Set((attRes.data  || []).map(a => a.user_id));
    const evaluated  = new Set((evalRes.data || []).map(e => e.user_id));
    const hasCert    = new Set((certRes.data || []).map(c => c.user_id));

    setCounts({
      registered: registered.length,
      attended:   registered.filter(r => attended.has(r.user_id)).length,
      evaluated:  registered.filter(r => attended.has(r.user_id) && evaluated.has(r.user_id)).length,
    });

    setEligible(
      registered
        .filter(r => attended.has(r.user_id) && evaluated.has(r.user_id) && !hasCert.has(r.user_id))
        .map(r => ({
          user_id:    r.user_id,
          role:       r.role,
          full_name:  r.profiles?.full_name,
          email:      r.profiles?.email,
          department: r.profiles?.department,
        }))
    );
    setIssuedIds(hasCert);
    setLoading(false);
  };

  const onSeminarChange = (seminarId) => {
    const sem = seminars.find(s => s.id === seminarId);
    setSelected(sem || null);
    // Use the design linked to this seminar, else the default seminar design
    setTemplateId(pickTemplateFor(templates, "seminar", seminarId || null)?.id || "");
    if (seminarId) loadEligible(seminarId);
    else { setEligible([]); setCounts(null); }
  };

  const getTemplate = () => buildDefaultTemplate({ seminar: selected, refType: "seminar", sigs });

  const issueOne = async (userId, seminarId, issuerId) => {
    const code = genCertCode(), tmpl = getTemplate();
    const { error: err } = await supabase.from("certificates").insert({
      user_id: userId, reference_type: "seminar", reference_id: seminarId,
      certificate_code: code, is_revoked: false, issued_at: new Date().toISOString(), issued_by: issuerId,
      body_text: tmpl.body_text, sig1_name: tmpl.sig1_name, sig1_title: tmpl.sig1_title,
      sig2_name: tmpl.sig2_name, sig2_title: tmpl.sig2_title, theme_color: tmpl.theme_color,
      template_id: templateId || null,
    });
    if (!err) await insertCertificateNotification(userId, code, selected?.title);
    return err;
  };

  const issueAll = async () => {
    if (!selected || eligible.length === 0) return;
    setIssuing(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    let failed = 0, succeeded = 0;
    const newIssued = new Set(issuedIds);
    for (const reg of eligible) {
      const err = await issueOne(reg.user_id, selected.id, user?.id);
      if (err) { failed++; } else { succeeded++; newIssued.add(reg.user_id); }
    }
    setIssuedIds(newIssued);
    setEligible(prev => prev.filter(r => !newIssued.has(r.user_id)));
    setIssuing(false);
    logActivity("certificate_auto_issued", { seminar_id: selected.id, count: succeeded, failed });
    if (failed > 0) {
      setError(`${failed} certificate(s) failed to issue.${succeeded > 0 ? ` ${succeeded} issued successfully.` : ""}`);
    } else {
      toast(`${succeeded} certificate(s) issued for "${selected.title}".`, "success");
    }
  };

  const issueSingle = async (reg) => {
    setIssuing(true);
    const { data: { user } } = await supabase.auth.getUser();
    const err = await issueOne(reg.user_id, selected.id, user?.id);
    setIssuing(false);
    if (err) { setError(err.message); return; }
    toast(`Certificate issued to ${reg.full_name || "participant"}.`, "success");
    logActivity("certificate_auto_issued", { seminar_id: selected.id, count: 1 });
    setIssuedIds(prev => new Set([...prev, reg.user_id]));
    setEligible(prev => prev.filter(r => r.user_id !== reg.user_id));
  };

  const selectedSeminarInfo = selected && [
    selected.scheduled_start && `Date: ${formatDateLong(selected.scheduled_start)}`,
    selected.venue && `Venue: ${selected.venue}`,
    selected.seminar_type && `Type: ${selected.seminar_type}`,
  ].filter(Boolean).join(" · ");

  return (
    <div>
      <SignatorySettingsPanel sigs={sigs} onChange={onSigsChange} />
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #DDE8DD", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: G.dark, marginBottom: 10 }}>
          <i className="bi bi-lightning-charge me-2" style={{ color: G.base }} />
          Select a seminar to see participants who <strong>registered</strong>, <strong>attended</strong>, and <strong>submitted an evaluation</strong> but have not yet received a certificate.
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px", maxWidth: 480 }}>
            <label style={s.label}>Seminar</label>
            <select style={s.select} value={selected?.id || ""} onChange={e => onSeminarChange(e.target.value)}>
              <option value="">— Choose seminar —</option>
              {seminars.map(sem => <option key={sem.id} value={sem.id}>{sem.title}{sem.scheduled_start ? ` · ${formatDate(sem.scheduled_start)}` : ""}</option>)}
            </select>
          </div>
          <div style={{ flex: "1 1 220px", maxWidth: 320 }}>
            <label style={s.label}>Design Template</label>
            <select style={s.select} value={templateId} onChange={e => setTemplateId(e.target.value)}>
              <option value="">— Use Default Layout —</option>
              {seminarTemplates.map(t => <option key={t.id} value={t.id}>{templateOptionLabel(t, selected?.id || null)}</option>)}
            </select>
          </div>
        </div>
        {selected && selectedSeminarInfo && <div style={{ marginTop: 8, fontSize: 11, color: "#888", background: G.wash, borderRadius: 6, padding: "6px 10px", maxWidth: 480 }}><i className="bi bi-info-circle me-1" />{selectedSeminarInfo}</div>}
        {selected && (
          <div style={{ marginTop: 10, background: G.wash, borderRadius: 8, padding: "10px 14px", maxWidth: 480 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.dark, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><i className="bi bi-magic" style={{ color: G.base }} />Certificate Preview</div>
            <div style={{ fontSize: 11, color: "#555", lineHeight: 1.6 }}>
              <div><strong>Title:</strong> {certTitle("seminar")}</div>
              <div><strong>Design:</strong> {selectedTemplate ? selectedTemplate.name : "Default layout"}</div>
              <div><strong>Body:</strong> {(getTemplate().body_text || "").slice(0, 120)}…</div>
              <div><strong>Signatories:</strong> {getTemplate().sig1_name} &amp; {getTemplate().sig2_name}</div>
            </div>
          </div>
        )}
      </div>
      {selected && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #DDE8DD", overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #DDE8DD", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, color: G.dark }}>{selected.title}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                {loading
                  ? "Checking records…"
                  : counts
                    ? `${counts.registered} registered · ${counts.attended} attended · ${counts.evaluated} attended + evaluated · ${eligible.length} awaiting certificate`
                    : ""}
              </div>
            </div>
            {eligible.length > 0 && !loading && (
              <button style={{ ...s.btnSuccess, opacity: issuing ? 0.7 : 1 }} onClick={issueAll} disabled={issuing}>
                {issuing ? <><span className="spinner-border spinner-border-sm" />Issuing…</> : <><i className="bi bi-send-check" />Issue All ({eligible.length})</>}
              </button>
            )}
          </div>
          {error && <div style={{ margin: "12px 24px 0", ...s.infoBox("red"), marginBottom: 0 }}><i className="bi bi-exclamation-triangle-fill" />{error}</div>}
          {loading ? <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Checking registration, attendance, and evaluation records…</div>
            : eligible.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <i className="bi bi-check-circle" style={{ fontSize: 36, color: "#16a34a" }} />
                <div style={{ fontWeight: 700, color: G.dark, marginTop: 12, marginBottom: 6 }}>No one is waiting for a certificate</div>
                <div style={{ fontSize: 13, color: "#888" }}>
                  Everyone who attended and evaluated this seminar already has a certificate, or no one has met both requirements yet.
                </div>
              </div>
            ) : (
              <table style={{ ...s.table, borderRadius: 0, boxShadow: "none" }}>
                <thead><tr><th style={s.th}>Participant</th><th style={s.th}>Role</th><th style={s.th}>Eligibility</th><th style={s.th}>Action</th></tr></thead>
                <tbody>
                  {eligible.map(reg => (
                    <tr key={reg.user_id}>
                      <td style={s.td}><div style={{ fontWeight: 600 }}>{reg.full_name || "—"}</div><div style={{ fontSize: 11, color: "#aaa" }}>{reg.email}{reg.department ? ` · ${reg.department}` : ""}</div></td>
                      <td style={s.td}>{reg.role && <span style={s.tag("blue")}>{prettyRole(reg.role)}</span>}</td>
                      <td style={s.td}><span style={s.tag("green")}>Attended + Evaluated</span></td>
                      <td style={s.td}><button style={{ ...s.btnSuccess, padding: "6px 14px", fontSize: 12, opacity: issuing ? 0.6 : 1 }} onClick={() => issueSingle(reg)} disabled={issuing}><i className="bi bi-send-check" />Issue</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}
      {!selected && (
        <div style={s.emptyBox}>
          <i className="bi bi-lightning-charge" style={{ fontSize: 36, color: G.pale }} />
          <div style={{ fontWeight: 700, color: G.dark, marginTop: 12, marginBottom: 6 }}>Select a seminar above</div>
          <div style={{ fontSize: 13, color: "#aaa" }}>Participants who attended and evaluated the seminar but have no certificate will appear here.</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  BADGES TAB
// ─────────────────────────────────────────────────────────────────────────────
function BadgesTab() {
  const toast = useToast();
  const [badges,  setBadges]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editB,   setEditB]   = useState(null);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [err,     setErr]     = useState({});
  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(e => ({ ...e, [k]: null })); };

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

  const openAdd  = () => { setEditB(null); setForm({ badge_type: "completion" }); setError(""); setErr({}); setShowAdd(true); };
  const openEdit = (b) => { setEditB(b); setForm({ ...b }); setError(""); setErr({}); setShowAdd(true); };

  const save = async () => {
    const errs = V.all({
      name: !form.name?.trim() ? "Badge name is required."
            : form.name.trim().length < 2 ? "Must be at least 2 characters."
            : form.name.trim().length > 80 ? "Must not exceed 80 characters." : null,
      description: form.description?.trim().length > 300 ? "Must not exceed 300 characters." : null,
    });
    if (errs) { setErr(errs); return; }
    setSaving(true); setError(""); setErr({});
    const payload = {
      name: form.name.trim(), description: form.description?.trim() || null,
      badge_type: form.badge_type || "completion", icon_url: form.icon_url?.trim() || null,
    };
    let dbErr;
    if (editB) { ({ error: dbErr } = await supabase.from("badges").update(payload).eq("id", editB.id)); }
    else       { ({ error: dbErr } = await supabase.from("badges").insert(payload)); }
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    toast(editB ? "Badge updated." : "Badge created.", "success");
    logActivity(editB ? "badge_updated" : "badge_created", { name: payload.name });
    setShowAdd(false); setForm({}); reload();
  };

  const del = async (b) => {
    const count = b.student_badges?.[0]?.count || 0;
    if (!window.confirm(`Delete "${b.name}"?${count > 0 ? ` This will remove it from ${count} student(s).` : ""}`)) return;
    await supabase.from("badges").delete().eq("id", b.id);
    logActivity("badge_deleted", { name: b.name });
    toast("Badge deleted.", "success");
    reload();
  };

  const BADGE_TYPES = ["completion", "score", "attendance", "streak", "special"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#888" }}>{badges.length} badge{badges.length !== 1 ? "s" : ""} created</div>
        <button style={s.addBtn} onClick={openAdd}><i className="bi bi-plus-lg" />Create Badge</button>
      </div>
      {loading ? <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading…</div>
        : badges.length === 0 ? (
          <div style={s.emptyBox}>
            <i className="bi bi-award" style={{ fontSize: 40, color: G.pale }} />
            <div style={{ fontWeight: 700, color: G.dark, margin: "10px 0 6px" }}>No badges created yet</div>
            <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>Create badges to award students for completing modules or passing assessments.</div>
            <button style={s.addBtn} onClick={openAdd}>+ Create First Badge</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {badges.map(b => {
              const awardCount = b.student_badges?.[0]?.count || 0;
              return (
                <div key={b.id} style={s.badgeCard}>
                  <div style={{ width: 52, height: 52, borderRadius: 10, background: "#fef9c3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
                    {b.icon_url ? <img src={b.icon_url} alt="" style={{ width: 40, height: 40, objectFit: "contain" }} /> : "🏅"}
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
                    <button style={s.iconBtn(G.base)} onClick={() => openEdit(b)}><i className="bi bi-pencil" /></button>
                    <button style={s.iconBtn("#dc2626")} onClick={() => del(b)}><i className="bi bi-trash" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
      {showAdd && (
        <div style={s.overlay}>
          <div style={s.modal(460)}>
            <div style={s.mHeader}>
              <span style={s.mTitle}>{editB ? "Edit Badge" : "Create Badge"}</span>
              <button style={s.iconBtn()} onClick={() => setShowAdd(false)}><i className="bi bi-x-lg" /></button>
            </div>
            <div style={s.mBody}>
              {error && <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{error}</div>}
              <div style={s.fg}>
                <label style={s.label}>Badge Name * <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>({(form.name||"").length}/80)</span></label>
                <input style={{ ...s.input, borderColor: err.name ? "#dc2626" : undefined }} value={form.name || ""} onChange={e => setF("name", e.target.value)} placeholder="e.g. Gender Champion" autoFocus />
                <FieldError msg={err.name}/>
              </div>
              <div style={s.fg}>
                <label style={s.label}>Description <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>({(form.description||"").length}/300)</span></label>
                <textarea style={{ ...s.textarea, borderColor: err.description ? "#dc2626" : undefined }} value={form.description || ""} onChange={e => setF("description", e.target.value)} placeholder="What does this badge represent?" />
                <FieldError msg={err.description}/>
              </div>
              <div style={s.fg}>
                <label style={s.label}>Badge Type</label>
                <select style={s.select} value={form.badge_type || "completion"} onChange={e => setF("badge_type", e.target.value)}>
                  {BADGE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
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

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN PAGE — signatory settings live here so both tabs stay in sync
// ─────────────────────────────────────────────────────────────────────────────
export default function CertificatesPage() {
  const [tab,  setTab]  = useState("certificates");
  const [sigs, setSigs] = useState({ ...DEFAULT_SIGS });

  useEffect(() => {
    let isMounted = true;
    loadSignatorySettings().then(data => { if (isMounted) setSigs(data); });
    return () => { isMounted = false; };
  }, []);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}><i className="bi bi-trophy me-2" />Certificates & Badges</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>Manage student achievements and recognitions</div>
        </div>
      </div>
      <div style={s.tabs}>
        <div style={s.tab(tab === "certificates")} onClick={() => setTab("certificates")}><i className="bi bi-patch-check" />Certificates</div>
        <div style={s.tab(tab === "templates")} onClick={() => setTab("templates")}><i className="bi bi-image" />Templates</div>
        <div style={s.tab(tab === "auto-issue")} onClick={() => setTab("auto-issue")}><i className="bi bi-lightning-charge" />Auto-Issue<span style={{ ...s.tag("blue"), marginLeft: 4, fontSize: 10 }}>Attendance + Eval</span></div>
        <div style={s.tab(tab === "badges")} onClick={() => setTab("badges")}><i className="bi bi-award" />Badges</div>
      </div>
      {tab === "certificates" && <CertificatesTab sigs={sigs} onSigsChange={setSigs} />}
      {tab === "templates"    && <TemplatesTab />}
      {tab === "auto-issue"   && <AutoIssueTab sigs={sigs} onSigsChange={setSigs} />}
      {tab === "badges"       && <BadgesTab />}
    </div>
  );
}