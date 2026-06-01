// src/CertificatesPage.jsx
// BLOOM GAD Admin — Certificates & Badges

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase.js";
import { ConfirmModal, useToast } from "./App.jsx";

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
  select:      { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark, appearance: "auto" },
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
  // Fixed: added color, appearance, and consistent sizing
  searchBar:   { padding: "9px 14px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", color: G.dark, width: 260 },
  filterSelect:{ padding: "9px 14px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", color: G.dark, appearance: "auto", cursor: "pointer", minWidth: 140 },
  infoBox:    (c) => ({ background: c === "green" ? "#f0fdf4" : c === "red" ? "#fef2f2" : c === "yellow" ? "#fffbeb" : "#eff6ff", border: `1px solid ${c === "green" ? "#bbf7d0" : c === "red" ? "#fecaca" : c === "yellow" ? "#fed7aa" : "#bfdbfe"}`, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: c === "green" ? "#15803d" : c === "red" ? "#b91c1c" : c === "yellow" ? "#92400e" : "#1d4ed8", display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 14 }),
};

// ─────────────────────────────────────────────────────────────────────────────
//  SIGNATORY SETTINGS  (persisted in app_settings table)
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
  const { error } = await supabase
    .from("app_settings")
    .upsert(rows, { onConflict: "key" });
  return error;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SIGNATORY SETTINGS PANEL (rendered at top of Certificates page)
// ─────────────────────────────────────────────────────────────────────────────
function SignatorySettingsPanel({ sigs, onChange }) {
  const toast = useToast();
  const [open,   setOpen]   = useState(false);
  const [form,   setForm]   = useState({ ...sigs });
  const [saving, setSaving] = useState(false);

  // Sync form when sigs prop changes (on first load)
  useEffect(() => { setForm({ ...sigs }); }, [sigs]);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const err = await saveSignatorySettings(form);
    setSaving(false);
    if (err) { toast("Failed to save settings.", "error"); return; }
    onChange(form);
    setOpen(false);
    toast("Signatory settings saved.", "success");
  };

  const reset = () => setForm({ ...sigs });

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Collapsed bar */}
      <div
        onClick={() => { setOpen(v => !v); setForm({ ...sigs }); }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#fff", border: "1px solid #DDE8DD", borderRadius: open ? "8px 8px 0 0" : 8,
          padding: "10px 16px", cursor: "pointer", userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="bi bi-pen" style={{ color: G.base, fontSize: 14 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: G.dark }}>Signatory Settings</span>
          {!open && (
            <span style={{ fontSize: 12, color: "#888", marginLeft: 4 }}>
              {sigs.sig1_name} &amp; {sigs.sig2_name}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!open && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: G.base,
              background: G.wash, padding: "2px 8px", borderRadius: 10,
            }}>
              <i className="bi bi-pencil me-1" style={{ fontSize: 10 }} />Edit
            </span>
          )}
          <i className={`bi bi-chevron-${open ? "up" : "down"}`} style={{ color: "#aaa", fontSize: 12 }} />
        </div>
      </div>

      {/* Expanded form */}
      {open && (
        <div style={{
          background: "#fff", border: "1px solid #DDE8DD", borderTop: "none",
          borderRadius: "0 0 8px 8px", padding: "16px 20px",
        }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>
            <i className="bi bi-info-circle me-1" />
            These names appear on every certificate by default. Admins can still override them per certificate if needed.
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {/* Left signatory */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: G.dark, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <i className="bi bi-person-badge me-1" style={{ color: G.base }} />Left Signatory
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={s.label}>Name</label>
                <input style={s.input} value={form.sig1_name || ""} onChange={e => setF("sig1_name", e.target.value)} placeholder="e.g. Dr. Maria Santos" />
              </div>
              <div>
                <label style={s.label}>Title / Position</label>
                <input style={s.input} value={form.sig1_title || ""} onChange={e => setF("sig1_title", e.target.value)} placeholder="e.g. GAD Coordinator" />
              </div>
            </div>
            {/* Divider */}
            <div style={{ width: 1, background: "#DDE8DD", margin: "0 4px", alignSelf: "stretch" }} />
            {/* Right signatory */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: G.dark, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <i className="bi bi-person-badge me-1" style={{ color: G.base }} />Right Signatory
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={s.label}>Name</label>
                <input style={s.input} value={form.sig2_name || ""} onChange={e => setF("sig2_name", e.target.value)} placeholder="e.g. Dr. Jose Reyes" />
              </div>
              <div>
                <label style={s.label}>Title / Position</label>
                <input style={s.input} value={form.sig2_title || ""} onChange={e => setF("sig2_title", e.target.value)} placeholder="e.g. GADRC Director" />
              </div>
            </div>
          </div>
          {/* Preview strip */}
          <div style={{ marginTop: 14, background: G.wash, borderRadius: 6, padding: "10px 14px", fontSize: 12, color: G.dark, display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700 }}>{form.sig1_name || "—"}</div>
              <div style={{ color: "#888", fontSize: 11 }}>{form.sig1_title || "—"}</div>
            </div>
            <div style={{ color: "#ccc", alignSelf: "center" }}>|</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700 }}>{form.sig2_name || "—"}</div>
              <div style={{ color: "#888", fontSize: 11 }}>{form.sig2_title || "—"}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
            <button onClick={reset} style={{ padding: "8px 16px", background: G.wash, color: G.dark, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              Reset
            </button>
            <button onClick={() => { setOpen(false); reset(); }} style={{ padding: "8px 16px", background: G.wash, color: G.dark, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              Cancel
            </button>
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

function certTitle(refType) {
  return CERT_TITLES[refType] || "Certificate of Achievement";
}

// ─────────────────────────────────────────────────────────────────────────────
//  DEFAULT TEMPLATE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
function buildDefaultTemplate({ seminar, recipientName = "[Participant Name]", refType = "seminar", sigs = DEFAULT_SIGS }) {
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
//  NOTIFICATION HELPER
// ─────────────────────────────────────────────────────────────────────────────
async function insertCertificateNotification(userId, certCode, seminarTitle) {
  try {
    await supabase.from("notifications").insert({
      user_id:        userId,
      type:           "new_certificate",
      title:          "Certificate Issued",
      body:           seminarTitle
        ? `Your certificate for "${seminarTitle}" has been issued (${certCode}). View it in Achievements.`
        : `Your certificate (${certCode}) has been issued. View it in Achievements.`,
      reference_type: "certificate",
      reference_id:   null,
      is_read:        false,
    });
  } catch (e) {
    console.error("insertCertificateNotification failed:", e);
  }
}

function genCertCode() {
  return `CERT-${Date.now().toString(36).toUpperCase()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MINI CERTIFICATE PREVIEW
// ─────────────────────────────────────────────────────────────────────────────
function MiniCertPreview({ recipientName, refType, seminarTitle, template }) {
  const title      = certTitle(refType);
  const themeColor = template.theme_color || "#2D6A2D";
  const bodyText   = template.body_text   || "";
  const sig1Name   = template.sig1_name   || "GAD Coordinator";
  const sig1Title  = template.sig1_title  || "Cavite State University";
  const sig2Name   = template.sig2_name   || "GADRC Director";
  const sig2Title  = template.sig2_title  || "Cavite State University";
  const today      = new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div style={{
      width: "100%", aspectRatio: "842/595",
      border: `6px double ${themeColor}`,
      background: "linear-gradient(135deg,#fafdf6 0%,#f6f9f0 100%)",
      padding: "16px 20px", boxSizing: "border-box",
      fontFamily: "'Georgia', serif",
      boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
      borderRadius: 6, position: "relative",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
    }}>
      <div style={{ position: "absolute", inset: 10, border: `1px solid ${themeColor}22`, borderRadius: 2, pointerEvents: "none" }} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: themeColor, letterSpacing: 3, textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>
          Cavite State University
        </div>
        <div style={{ fontSize: 7, color: "#888", letterSpacing: 1, fontFamily: "'Inter',sans-serif" }}>
          Gender and Development Resource Center (GADRC) · BLOOM e-Learning Platform
        </div>
        <div style={{ borderTop: `1.5px solid ${themeColor}`, margin: "6px 32px" }} />
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1A2E1A", margin: "4px 0" }}>{title}</div>
        <div style={{ fontSize: 7, color: "#888", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Inter',sans-serif", margin: "4px 0" }}>
          This is to certify that
        </div>
        <div style={{ margin: "6px 0" }}>
          <span style={{
            fontStyle: "italic", fontSize: 22, color: themeColor,
            borderBottom: `2px solid ${themeColor}44`,
            paddingBottom: 4, paddingLeft: 24, paddingRight: 24,
          }}>
            {recipientName || "[Participant Name]"}
          </span>
        </div>
        <div style={{ fontSize: 7, color: "#444", maxWidth: 340, margin: "6px auto", lineHeight: 1.7, fontFamily: "'Inter',sans-serif", textAlign: "center" }}>
          {bodyText.length > 220 ? bodyText.slice(0, 220) + "…" : bodyText}
        </div>
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
function CertPreviewModal({ cert, onClose }) {
  const refType     = cert.reference_type || "achievement";
  const title       = certTitle(refType);
  const studentName = cert.profiles?.full_name || "Recipient";
  const issuedDate  = cert.issued_at
    ? new Date(cert.issued_at).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })
    : "—";
  const bodyText   = cert.body_text   || "has successfully completed the requirements of the BLOOM GAD e-Learning Program and is hereby awarded this certificate in recognition of outstanding participation and commitment to Gender and Development advocacy.";
  const sig1Name   = cert.sig1_name   || "GAD Coordinator";
  const sig1Title  = cert.sig1_title  || "Cavite State University";
  const sig2Name   = cert.sig2_name   || "GADRC Director";
  const sig2Title  = cert.sig2_title  || "Cavite State University";
  const themeColor = cert.theme_color || "#2D6A2D";

  const certHTML = () => `<!DOCTYPE html><html><head><title>${title}</title>
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
        <div class="title">${title}</div>
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

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 900, maxHeight: "95vh", overflow: "auto", boxShadow: "0 32px 80px rgba(0,0,0,.3)" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #DDE8DD", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <div style={{ fontWeight: 700, color: "#1A2E1A", fontSize: 15 }}>
            <i className="bi bi-patch-check me-2" style={{ color: "#2D6A2D" }} />Certificate Preview
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={printCert} style={{ padding: "8px 16px", background: "#1A2E1A", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="bi bi-printer" />Print / Save PDF
            </button>
            <button onClick={onClose} style={{ padding: "8px 16px", background: "#F5F7F5", color: "#1A2E1A", border: "1px solid #DDE8DD", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Close</button>
          </div>
        </div>
        <div style={{ padding: 32, background: "#F5F7F5" }}>
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
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ATTENDANCE GATE CHECK
// ─────────────────────────────────────────────────────────────────────────────
async function checkAttendance(userId, seminarId) {
  if (!userId || !seminarId) return { attended: false, checkedInAt: null };
  const { data, error } = await supabase
    .from("seminar_attendance")
    .select("checked_in_at")
    .eq("user_id", userId)
    .eq("seminar_id", seminarId)
    .maybeSingle();
  if (error || !data) return { attended: false, checkedInAt: null };
  return { attended: !!data.checked_in_at, checkedInAt: data.checked_in_at };
}

// ─────────────────────────────────────────────────────────────────────────────
//  CERTIFICATES TAB
// ─────────────────────────────────────────────────────────────────────────────
function CertificatesTab() {
  const toast = useToast();

  const [certs,    setCerts]    = useState([]);
  const [students, setStudents] = useState([]);
  const [seminars, setSeminars] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filterType, setFilterType] = useState("all");

  // Signatory settings
  const [sigs, setSigs] = useState({ ...DEFAULT_SIGS });

  useEffect(() => {
    loadSignatorySettings().then(setSigs);
  }, []);

  const [showAdd,  setShowAdd]  = useState(false);
  const [form,     setForm]     = useState({ reference_type: "seminar" });
  const [template, setTemplate] = useState({});
  const [showTemplateEdit, setShowTemplateEdit] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const [recipientSearch,    setRecipientSearch]    = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState([]);

  const [attendanceCheck, setAttendanceCheck] = useState(null);
  const [alreadyHasCert,  setAlreadyHasCert]  = useState(false);

  const [editCert,   setEditCert]   = useState(null);
  const [editForm,   setEditForm]   = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError,  setEditError]  = useState("");

  const [previewCert, setPreviewCert] = useState(null);

  const setF  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setT  = (k, v) => setTemplate(t => ({ ...t, [k]: v }));
  const setEF = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: profiles }, { data: sems }] = await Promise.all([
      supabase
        .from("certificates")
        .select("*, profiles!certificates_user_id_fkey(full_name, student_id, email)")
        .order("issued_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, student_id, role")
        .order("full_name"),
      supabase
        .from("seminars")
        .select("id, title, scheduled_start, scheduled_end, venue, seminar_type, status")
        .order("scheduled_start", { ascending: false }),
    ]);
    setCerts(c || []);
    setStudents(profiles || []);
    setSeminars(sems || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const seminar   = seminars.find(s => s.id === form.seminar_id) || null;
    const refType   = form.reference_type || "seminar";
    const recipient = selectedRecipients.length === 1
      ? (students.find(s => s.id === selectedRecipients[0])?.full_name || "")
      : "";
    const defaults = buildDefaultTemplate({ seminar, recipientName: recipient, refType, sigs });
    setTemplate(defaults);
  }, [form.seminar_id, form.reference_type, seminars, sigs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (form.reference_type !== "seminar") {
        if (!cancelled) { setAttendanceCheck(null); setAlreadyHasCert(false); }
        return;
      }
      const userId    = selectedRecipients[0];
      const seminarId = form.seminar_id;
      if (!userId || !seminarId) {
        if (!cancelled) { setAttendanceCheck(null); setAlreadyHasCert(false); }
        return;
      }
      if (!cancelled) setAttendanceCheck("checking");
      const [attendance, existingCert] = await Promise.all([
        checkAttendance(userId, seminarId),
        supabase
          .from("certificates")
          .select("id")
          .eq("user_id", userId)
          .eq("reference_type", "seminar")
          .eq("reference_id", seminarId)
          .eq("is_revoked", false)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setAttendanceCheck(attendance);
      setAlreadyHasCert(!!existingCert.data);
    })();
    return () => { cancelled = true; };
  }, [selectedRecipients, form.seminar_id, form.reference_type]);

  const issueCert = async () => {
    setError("");
    if (selectedRecipients.length === 0) { setError("Please select at least one recipient."); return; }
    if (form.reference_type === "seminar") {
      if (!form.seminar_id) { setError("Please select a seminar."); return; }
      if (attendanceCheck === "checking") { setError("Checking attendance, please wait…"); return; }
      if (!attendanceCheck?.attended) {
        setError("This participant has no verified attendance for the selected seminar.");
        return;
      }
      if (alreadyHasCert) {
        setError("A valid certificate for this seminar has already been issued to this participant.");
        return;
      }
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const seminar = seminars.find(s => s.id === form.seminar_id);
    let failed = 0;
    for (const uid of selectedRecipients) {
      const code = genCertCode();
      const { error: err } = await supabase.from("certificates").insert({
        user_id:          uid,
        reference_type:   form.reference_type || "seminar",
        reference_id:     form.reference_type === "seminar" ? form.seminar_id : (form.reference_id || null),
        certificate_code: code,
        is_revoked:       false,
        issued_at:        new Date().toISOString(),
        issued_by:        user?.id,
        body_text:        template.body_text   || null,
        sig1_name:        template.sig1_name   || null,
        sig1_title:       template.sig1_title  || null,
        sig2_name:        template.sig2_name   || null,
        sig2_title:       template.sig2_title  || null,
        theme_color:      template.theme_color || "#2D6A2D",
      });
      if (err) { failed++; continue; }
      await insertCertificateNotification(uid, code, seminar?.title);
    }
    setSaving(false);
    if (failed > 0) { setError(`${failed} certificate(s) failed to issue.`); return; }
    toast(
      selectedRecipients.length > 1
        ? `${selectedRecipients.length} certificates issued successfully.`
        : "Certificate issued successfully.",
      "success"
    );
    setShowAdd(false);
    setForm({ reference_type: "seminar" });
    setTemplate({});
    setSelectedRecipients([]);
    setRecipientSearch("");
    setAttendanceCheck(null);
    setAlreadyHasCert(false);
    setShowTemplateEdit(false);
    load();
  };

  const toggleRevoke = async (cert) => {
    const newVal = !cert.is_revoked;
    await supabase.from("certificates").update({ is_revoked: newVal }).eq("id", cert.id);
    setCerts(cs => cs.map(c => c.id === cert.id ? { ...c, is_revoked: newVal } : c));
    toast(newVal ? "Certificate revoked." : "Certificate restored.", "success");
  };

  const openEdit = (cert) => {
    setEditCert(cert);
    setEditForm({
      user_id:        cert.user_id || "",
      reference_type: cert.reference_type || "manual",
      issued_at:      cert.issued_at ? cert.issued_at.split("T")[0] : "",
      body_text:      cert.body_text  || "",
      sig1_name:      cert.sig1_name  || "GAD Coordinator",
      sig1_title:     cert.sig1_title || "Cavite State University",
      sig2_name:      cert.sig2_name  || "GADRC Director",
      sig2_title:     cert.sig2_title || "Cavite State University",
      theme_color:    cert.theme_color || "#2D6A2D",
    });
    setEditError("");
  };

  const saveEdit = async () => {
    if (!editForm.user_id)   { setEditError("Please select a student."); return; }
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
    toast("Certificate updated.", "success");
    setEditCert(null);
    if (previewCert?.id === editCert.id) setPreviewCert(p => ({ ...p, ...editForm }));
    load();
  };

  const filtered = certs.filter(c => {
    const matchSearch =
      (c.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.profiles?.student_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.certificate_code || "").toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || c.reference_type === filterType;
    return matchSearch && matchType;
  });

  const renderAttendanceGate = () => {
    if (form.reference_type !== "seminar") return null;
    const userId = selectedRecipients[0];
    if (!userId || !form.seminar_id) return null;
    if (attendanceCheck === "checking") return (
      <div style={s.infoBox("blue")}>
        <span className="spinner-border spinner-border-sm me-2" />Checking attendance record…
      </div>
    );
    if (alreadyHasCert) return (
      <div style={s.infoBox("yellow")}>
        <i className="bi bi-exclamation-triangle-fill" />
        <div><strong>Certificate already issued.</strong> A valid certificate for this seminar already exists for this participant.</div>
      </div>
    );
    if (attendanceCheck?.attended) return (
      <div style={s.infoBox("green")}>
        <i className="bi bi-check-circle-fill" />
        <div><strong>Attendance verified.</strong> Checked in on {formatDate(attendanceCheck.checkedInAt)}. Certificate can be issued.</div>
      </div>
    );
    return (
      <div style={s.infoBox("red")}>
        <i className="bi bi-x-circle-fill" />
        <div><strong>No attendance record found.</strong> This participant has no verified check-in for the selected seminar.</div>
      </div>
    );
  };

  const canIssue = () => {
    if (selectedRecipients.length === 0) return false;
    if (form.reference_type === "seminar") {
      return !!form.seminar_id && attendanceCheck !== "checking" && attendanceCheck?.attended === true && !alreadyHasCert;
    }
    return true;
  };

  const typeLabel = (t) => {
    const map = { manual: "Manual", module: "Module Completion", seminar: "Seminar Attendance", assessment: "Assessment" };
    return map[t] || t;
  };

  const filteredStudents = students.filter(st => {
    const q = recipientSearch.toLowerCase();
    return (
      (st.full_name  || "").toLowerCase().includes(q) ||
      (st.student_id || "").toLowerCase().includes(q) ||
      (st.role       || "").toLowerCase().includes(q)
    );
  });

  const previewRecipientName = selectedRecipients.length === 1
    ? (students.find(s => s.id === selectedRecipients[0])?.full_name || "")
    : selectedRecipients.length > 1
      ? `${selectedRecipients.length} Recipients`
      : "";

  const selectedSeminar = seminars.find(s => s.id === form.seminar_id);

  return (
    <div>
      {/* Signatory Settings Panel */}
      <SignatorySettingsPanel sigs={sigs} onChange={setSigs} />

      {/* Toolbar */}
      <div style={s.toolbar}>
        <input
          style={s.searchBar}
          placeholder="Search by name, ID, or code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {/* Fixed filter select — always visible, never requires hover */}
        <select
          style={s.filterSelect}
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="manual">Manual</option>
          <option value="seminar">Seminar</option>
          <option value="module">Module</option>
          <option value="assessment">Assessment</option>
        </select>
        <div style={{ marginLeft: "auto" }}>
          <button style={s.addBtn} onClick={() => {
            setForm({ reference_type: "seminar" });
            setTemplate({});
            setError("");
            setSelectedRecipients([]);
            setRecipientSearch("");
            setAttendanceCheck(null);
            setAlreadyHasCert(false);
            setShowTemplateEdit(false);
            setShowAdd(true);
          }}>
            <i className="bi bi-plus-lg" />Issue Certificate
          </button>
        </div>
      </div>

      {/* Table */}
      {loading
        ? <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading…</div>
        : filtered.length === 0
          ? (
            <div style={s.emptyBox}>
              <div style={{ fontSize: 40, marginBottom: 10 }}><i className="bi bi-trophy" /></div>
              <div style={{ fontWeight: 700, color: G.dark, marginBottom: 6 }}>No certificates found</div>
              <div style={{ fontSize: 13, color: "#aaa" }}>Issue a certificate using the button above.</div>
            </div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Recipient</th>
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
                      <div style={{ fontWeight: 600 }}>{c.profiles?.full_name || "—"}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>{c.profiles?.student_id || c.profiles?.email}</div>
                    </td>
                    <td style={s.td}>
                      <code style={{ background: G.wash, padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>
                        {c.certificate_code || "—"}
                      </code>
                    </td>
                    <td style={s.td}>
                      <span style={s.tag(c.reference_type === "seminar" ? "blue" : c.reference_type === "module" ? "green" : c.reference_type === "assessment" ? "orange" : "")}>
                        {typeLabel(c.reference_type)}
                      </span>
                    </td>
                    <td style={s.td}>{formatDate(c.issued_at)}</td>
                    <td style={s.td}>
                      <span style={s.tag(c.is_revoked ? "red" : "green")}>
                        {c.is_revoked ? "Revoked" : "Valid"}
                      </span>
                    </td>
                    <td style={s.td}>
                      <button style={{ padding: "5px 10px", border: "1px solid #DDE8DD", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600, color: "#1A2E1A", marginRight: 4 }}
                        onClick={() => setPreviewCert(c)}>
                        <i className="bi bi-eye me-1" />View
                      </button>
                      <button style={{ padding: "5px 10px", border: "1px solid #DDE8DD", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600, color: "#2D6A2D", marginRight: 4 }}
                        onClick={() => openEdit(c)}>
                        <i className="bi bi-pencil me-1" />Edit
                      </button>
                      <button style={{ padding: "5px 10px", border: "none", borderRadius: 6, background: c.is_revoked ? "#dcfce7" : "#fee2e2", fontSize: 12, cursor: "pointer", fontWeight: 600, color: c.is_revoked ? "#16a34a" : "#dc2626" }}
                        onClick={() => toggleRevoke(c)}>
                        {c.is_revoked ? "Restore" : "Revoke"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
      }

      {previewCert && <CertPreviewModal cert={previewCert} onClose={() => setPreviewCert(null)} />}

      {/* ── Issue Certificate Modal ──────────────────────────────────────── */}
      {showAdd && (
        <div style={s.overlay}>
          <div style={{ ...s.modal(860), display: "flex", flexDirection: "column" }}>
            <div style={s.mHeader}>
              <span style={s.mTitle}><i className="bi bi-patch-check me-2" />Issue Certificate</span>
              <button style={s.iconBtn()} onClick={() => setShowAdd(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
              {/* Left: form */}
              <div style={{ flex: "0 0 380px", borderRight: `1px solid ${G.wash}`, overflow: "auto", padding: "20px 24px" }}>
                {error && (
                  <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ flexShrink: 0, marginTop: 1 }} />{error}
                  </div>
                )}
                <div style={s.fg}>
                  <label style={s.label}>Certificate Type *</label>
                  <select style={s.select} value={form.reference_type || "seminar"}
                    onChange={e => {
                      setF("reference_type", e.target.value);
                      setF("seminar_id", "");
                      setSelectedRecipients([]);
                      setRecipientSearch("");
                      setAttendanceCheck(null);
                      setAlreadyHasCert(false);
                    }}>
                    <option value="seminar">Certificate of Participation (Seminar)</option>
                    <option value="module">Certificate of Completion (Module)</option>
                    <option value="assessment">Certificate of Achievement (Assessment)</option>
                    <option value="manual">Certificate of Recognition (Manual)</option>
                  </select>
                </div>
                {form.reference_type === "seminar" && (
                  <div style={s.fg}>
                    <label style={s.label}>Seminar *</label>
                    <select style={s.select} value={form.seminar_id || ""}
                      onChange={e => setF("seminar_id", e.target.value)}>
                      <option value="">— Select seminar —</option>
                      {seminars.map(sem => (
                        <option key={sem.id} value={sem.id}>
                          {sem.title}{sem.scheduled_start ? ` (${formatDate(sem.scheduled_start)})` : ""}
                        </option>
                      ))}
                    </select>
                    {selectedSeminar && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#888", background: G.wash, borderRadius: 6, padding: "6px 10px" }}>
                        <i className="bi bi-info-circle me-1" />
                        {[
                          selectedSeminar.venue && `Venue: ${selectedSeminar.venue}`,
                          selectedSeminar.scheduled_start && `Date: ${formatDateLong(selectedSeminar.scheduled_start)}`,
                        ].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                )}
                <div style={s.fg}>
                  <label style={s.label}>
                    Recipient *{" "}
                    {selectedRecipients.length > 0 && (
                      <span style={{ color: G.base, fontWeight: 700 }}>({selectedRecipients.length} selected)</span>
                    )}
                  </label>
                  <input
                    style={{ ...s.input, marginBottom: 8 }}
                    placeholder="Search by name, ID, or role…"
                    value={recipientSearch}
                    onChange={e => setRecipientSearch(e.target.value)}
                  />
                  <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #DDE8DD", borderRadius: 6, background: "#fff" }}>
                    {filteredStudents.length === 0 ? (
                      <div style={{ padding: "20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>No results</div>
                    ) : (
                      filteredStudents.map(st => {
                        const checked = selectedRecipients.includes(st.id);
                        return (
                          <label key={st.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${G.wash}`, background: checked ? G.wash : "transparent" }}>
                            <input type="checkbox" checked={checked}
                              onChange={() => setSelectedRecipients(prev => checked ? prev.filter(id => id !== st.id) : [...prev, st.id])}
                              style={{ width: 15, height: 15, accentColor: G.base, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: G.dark }}>{st.full_name}</div>
                              <div style={{ fontSize: 11, color: "#aaa" }}>{[st.student_id, st.role].filter(Boolean).join(" · ")}</div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                  {selectedRecipients.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "#888", display: "flex", justifyContent: "space-between" }}>
                      <span>{selectedRecipients.length} recipient(s) selected</span>
                      <span style={{ cursor: "pointer", color: G.base, textDecoration: "underline" }} onClick={() => setSelectedRecipients([])}>Clear all</span>
                    </div>
                  )}
                </div>
                {renderAttendanceGate()}
                {form.reference_type === "seminar" && !form.seminar_id && (
                  <div style={s.infoBox("blue")}>
                    <i className="bi bi-info-circle-fill" />
                    Select a seminar to auto-populate the certificate template. Only participants with verified attendance can receive a certificate.
                  </div>
                )}
                <div style={{ background: G.wash, borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showTemplateEdit ? 14 : 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: G.dark, display: "flex", alignItems: "center", gap: 6 }}>
                      <i className="bi bi-magic" style={{ color: G.base }} />
                      Auto-populated Template
                      <span style={{ ...s.tag("green"), fontSize: 10 }}>Ready</span>
                    </div>
                    <button
                      style={{ ...s.iconBtn(G.base), fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
                      onClick={() => setShowTemplateEdit(v => !v)}
                    >
                      <i className={`bi ${showTemplateEdit ? "bi-chevron-up" : "bi-pencil"}`} />
                      {showTemplateEdit ? "Collapse" : "Edit"}
                    </button>
                  </div>
                  {!showTemplateEdit && (
                    <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5 }}>
                      <div><strong>Title:</strong> {certTitle(form.reference_type)}</div>
                      <div style={{ marginTop: 3 }}><strong>Signatories:</strong> {template.sig1_name || "GAD Coordinator"} &amp; {template.sig2_name || "GADRC Director"}</div>
                      <div style={{ marginTop: 3 }}><strong>Theme:</strong>
                        <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: template.theme_color || "#2D6A2D", marginLeft: 6, verticalAlign: "middle", border: "1px solid #ccc" }} />
                        <span style={{ marginLeft: 4 }}>{template.theme_color || "#2D6A2D"}</span>
                      </div>
                    </div>
                  )}
                  {showTemplateEdit && (
                    <>
                      <div style={s.fg}>
                        <label style={s.label}>Body Text</label>
                        <textarea style={{ ...s.textarea, minHeight: 80, fontSize: 12 }}
                          value={template.body_text || ""}
                          onChange={e => setT("body_text", e.target.value)} />
                        <div style={{ fontSize: 11, color: "#888", marginTop: 4, cursor: "pointer", textDecoration: "underline" }}
                          onClick={() => {
                            const sem = seminars.find(s => s.id === form.seminar_id) || null;
                            const d   = buildDefaultTemplate({ seminar: sem, refType: form.reference_type });
                            setT("body_text", d.body_text);
                          }}>
                          ↺ Reset to default
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <label style={s.label}>Left Signatory</label>
                          <input style={{ ...s.input, marginBottom: 6 }} value={template.sig1_name || ""} onChange={e => setT("sig1_name", e.target.value)} placeholder="GAD Coordinator" />
                          <input style={s.input} value={template.sig1_title || ""} onChange={e => setT("sig1_title", e.target.value)} placeholder="Title" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={s.label}>Right Signatory</label>
                          <input style={{ ...s.input, marginBottom: 6 }} value={template.sig2_name || ""} onChange={e => setT("sig2_name", e.target.value)} placeholder="GADRC Director" />
                          <input style={s.input} value={template.sig2_title || ""} onChange={e => setT("sig2_title", e.target.value)} placeholder="Title" />
                        </div>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <label style={s.label}>Theme Color</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input type="color" value={template.theme_color || "#2D6A2D"}
                            onChange={e => setT("theme_color", e.target.value)}
                            style={{ width: 40, height: 32, border: "1px solid #DDE8DD", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                          {[["#2D6A2D","Forest Green"],["#1A2E1A","Dark Green"],["#1d4ed8","Blue"],["#7c3aed","Purple"],["#c2410c","Orange"],["#0f766e","Teal"]].map(([c, label]) => (
                            <span key={c} onClick={() => setT("theme_color", c)} title={label}
                              style={{ display: "inline-block", width: 20, height: 20, borderRadius: "50%", background: c, cursor: "pointer", border: template.theme_color === c ? "3px solid #000" : "2px solid transparent" }} />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right: live preview */}
              <div style={{ flex: 1, background: "#F5F7F5", padding: "20px 24px", display: "flex", flexDirection: "column", overflow: "auto" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.6, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bi bi-eye" />Live Preview
                </div>
                <MiniCertPreview
                  recipientName={previewRecipientName}
                  refType={form.reference_type}
                  seminarTitle={selectedSeminar?.title}
                  template={template}
                />
                <div style={{ marginTop: 10, fontSize: 11, color: "#aaa", textAlign: "center" }}>
                  Preview updates as you make changes. The actual certificate code will be generated on issue.
                </div>
              </div>
            </div>

            <div style={s.mFooter}>
              <button style={s.btnSecondary} onClick={() => setShowAdd(false)}>Cancel</button>
              <button
                style={{ ...s.btnPrimary, opacity: (saving || !canIssue()) ? 0.5 : 1, cursor: canIssue() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6 }}
                onClick={issueCert}
                disabled={saving || !canIssue()}>
                <i className="bi bi-send-check" />
                {saving
                  ? "Issuing…"
                  : selectedRecipients.length > 1
                    ? `Issue ${selectedRecipients.length} Certificates`
                    : "Issue Certificate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Certificate Modal ───────────────────────────────────────── */}
      {editCert && (
        <div style={s.overlay}>
          <div style={s.modal(480)}>
            <div style={s.mHeader}>
              <span style={s.mTitle}><i className="bi bi-pencil me-2" />Edit Certificate</span>
              <button style={s.iconBtn()} onClick={() => setEditCert(null)}><i className="bi bi-x-lg" /></button>
            </div>
            <div style={s.mBody}>
              {editError && (
                <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{editError}</div>
              )}
              <div style={s.fg}>
                <label style={s.label}>Recipient *</label>
                <select style={s.select} value={editForm.user_id || ""} onChange={e => setEF("user_id", e.target.value)}>
                  <option value="">— Select student —</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>{st.full_name}{st.student_id ? ` (${st.student_id})` : ""}</option>
                  ))}
                </select>
              </div>
              <div style={s.fg}>
                <label style={s.label}>Certificate Type *</label>
                <select style={s.select} value={editForm.reference_type || "manual"} onChange={e => setEF("reference_type", e.target.value)}>
                  <option value="seminar">Certificate of Participation (Seminar)</option>
                  <option value="module">Certificate of Completion (Module)</option>
                  <option value="assessment">Certificate of Achievement (Assessment)</option>
                  <option value="manual">Certificate of Recognition (Manual)</option>
                </select>
              </div>
              <div style={s.fg}>
                <label style={s.label}>Issue Date *</label>
                <input type="date" style={s.input} value={editForm.issued_at || ""}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={e => setEF("issued_at", e.target.value)} />
              </div>
              <div style={s.fg}>
                <label style={s.label}>Body Text</label>
                <textarea style={{ ...s.textarea, minHeight: 80 }} value={editForm.body_text || ""}
                  onChange={e => setEF("body_text", e.target.value)} />
                <div style={{ fontSize: 11, color: "#888", marginTop: 4, cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => {
                    const d = buildDefaultTemplate({ refType: editForm.reference_type });
                    setEF("body_text", d.body_text);
                  }}>
                  ↺ Reset to default
                </div>
              </div>
              <div style={s.row}>
                <div style={{ flex: 1, ...s.fg }}>
                  <label style={s.label}>Left Signatory Name</label>
                  <input style={s.input} value={editForm.sig1_name || ""} onChange={e => setEF("sig1_name", e.target.value)} placeholder="GAD Coordinator" />
                </div>
                <div style={{ flex: 1, ...s.fg }}>
                  <label style={s.label}>Left Signatory Title</label>
                  <input style={s.input} value={editForm.sig1_title || ""} onChange={e => setEF("sig1_title", e.target.value)} placeholder="Cavite State University" />
                </div>
              </div>
              <div style={s.row}>
                <div style={{ flex: 1, ...s.fg }}>
                  <label style={s.label}>Right Signatory Name</label>
                  <input style={s.input} value={editForm.sig2_name || ""} onChange={e => setEF("sig2_name", e.target.value)} placeholder="GADRC Director" />
                </div>
                <div style={{ flex: 1, ...s.fg }}>
                  <label style={s.label}>Right Signatory Title</label>
                  <input style={s.input} value={editForm.sig2_title || ""} onChange={e => setEF("sig2_title", e.target.value)} placeholder="Cavite State University" />
                </div>
              </div>
              <div style={s.fg}>
                <label style={s.label}>Theme Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="color" value={editForm.theme_color || "#2D6A2D"}
                    onChange={e => setEF("theme_color", e.target.value)}
                    style={{ width: 48, height: 36, border: "1px solid #DDE8DD", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                  <div style={{ flex: 1 }}>
                    {[["#2D6A2D","Forest Green"],["#1A2E1A","Dark Green"],["#1d4ed8","Blue"],["#7c3aed","Purple"],["#c2410c","Orange"],["#0f766e","Teal"]].map(([c, label]) => (
                      <span key={c} onClick={() => setEF("theme_color", c)} title={label}
                        style={{ display: "inline-block", width: 22, height: 22, borderRadius: "50%", background: c, marginRight: 6, cursor: "pointer", border: editForm.theme_color === c ? "3px solid #000" : "2px solid transparent", verticalAlign: "middle" }} />
                    ))}
                  </div>
                  <code style={{ fontSize: 11, color: "#888" }}>{editForm.theme_color}</code>
                </div>
              </div>
              <div style={{ background: G.wash, borderRadius: 6, padding: "10px 14px", fontSize: 12, color: G.dark }}>
                <i className="bi bi-info-circle me-1" />
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUTO-ISSUE TAB
// ─────────────────────────────────────────────────────────────────────────────
function AutoIssueTab() {
  const toast = useToast();

  const [seminars,  setSeminars]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [eligible,  setEligible]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [issuing,   setIssuing]   = useState(false);
  const [issuedIds, setIssuedIds] = useState(new Set());
  const [error,     setError]     = useState("");

  // Signatory settings
  const [sigs, setSigs] = useState({ ...DEFAULT_SIGS });
  useEffect(() => { loadSignatorySettings().then(setSigs); }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("seminars")
        .select("id, title, scheduled_start, scheduled_end, venue, seminar_type, status")
        .order("scheduled_start", { ascending: false });
      setSeminars(data || []);
    })();
  }, []);

  const loadEligible = async (seminarId) => {
    setLoading(true);
    setEligible([]);
    setIssuedIds(new Set());
    setError("");
    const [
      { data: registered, error: regErr },
      { data: evaluated,  error: evalErr },
      { data: existing }
    ] = await Promise.all([
      supabase.from("seminar_registrations")
        .select("user_id, full_name, email, role, department")
        .eq("seminar_id", seminarId),
      supabase.from("seminar_evaluations")
        .select("user_id, submitted_at")
        .eq("seminar_id", seminarId)
        .not("submitted_at", "is", null),
      supabase.from("certificates")
        .select("user_id")
        .eq("reference_type", "seminar")
        .eq("reference_id", seminarId)
        .eq("is_revoked", false),
    ]);
    if (regErr || evalErr) { setError((regErr || evalErr).message); setLoading(false); return; }
    const evaluatedIds = new Set((evaluated || []).map(e => e.user_id));
    const certUserIds  = new Set((existing  || []).map(c => c.user_id));
    const pending      = (registered || []).filter(r => evaluatedIds.has(r.user_id) && !certUserIds.has(r.user_id));
    setEligible(pending);
    setIssuedIds(certUserIds);
    setLoading(false);
  };

  const onSeminarChange = (seminarId) => {
    const sem = seminars.find(s => s.id === seminarId);
    setSelected(sem || null);
    if (seminarId) loadEligible(seminarId);
  };

  const getTemplate = () => buildDefaultTemplate({ seminar: selected, refType: "seminar", sigs });

  const issueOne = async (userId, seminarId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const code     = genCertCode();
    const tmpl     = getTemplate();
    const { error: err } = await supabase.from("certificates").insert({
      user_id:          userId,
      reference_type:   "seminar",
      reference_id:     seminarId,
      certificate_code: code,
      is_revoked:       false,
      issued_at:        new Date().toISOString(),
      issued_by:        user?.id,
      body_text:        tmpl.body_text,
      sig1_name:        tmpl.sig1_name,
      sig1_title:       tmpl.sig1_title,
      sig2_name:        tmpl.sig2_name,
      sig2_title:       tmpl.sig2_title,
      theme_color:      tmpl.theme_color,
    });
    if (!err) await insertCertificateNotification(userId, code, selected?.title);
    return err;
  };

  const issueAll = async () => {
    if (!selected || eligible.length === 0) return;
    setIssuing(true); setError("");
    let failed = 0;
    const newIssued = new Set(issuedIds);
    for (const reg of eligible) {
      const err = await issueOne(reg.user_id, selected.id);
      if (err) { failed++; } else { newIssued.add(reg.user_id); }
    }
    setIssuedIds(newIssued);
    setEligible(prev => prev.filter(r => !newIssued.has(r.user_id)));
    setIssuing(false);
    if (failed > 0) { setError(`${failed} certificate(s) failed to issue.`); }
    else { toast(`${eligible.length} certificate(s) issued for "${selected.title}".`, "success"); }
  };

  const issueSingle = async (reg) => {
    setIssuing(true);
    const err = await issueOne(reg.user_id, selected.id);
    setIssuing(false);
    if (err) { setError(err.message); return; }
    toast(`Certificate issued to ${reg.full_name}.`, "success");
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
      {/* Signatory Settings Panel */}
      <SignatorySettingsPanel sigs={sigs} onChange={setSigs} />

      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #DDE8DD", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: G.dark, marginBottom: 10 }}>
          <i className="bi bi-lightning-charge me-2" style={{ color: G.base }} />
          Select a seminar to see participants who have <strong>registered</strong> and <strong>submitted an evaluation</strong> but have not yet received a certificate.
        </div>
        <select style={{ ...s.select, maxWidth: 480 }}
          value={selected?.id || ""}
          onChange={e => onSeminarChange(e.target.value)}>
          <option value="">— Choose seminar —</option>
          {seminars.map(sem => (
            <option key={sem.id} value={sem.id}>
              {sem.title}{sem.scheduled_start ? ` · ${formatDate(sem.scheduled_start)}` : ""}
            </option>
          ))}
        </select>
        {selected && selectedSeminarInfo && (
          <div style={{ marginTop: 8, fontSize: 11, color: "#888", background: G.wash, borderRadius: 6, padding: "6px 10px", maxWidth: 480 }}>
            <i className="bi bi-info-circle me-1" />{selectedSeminarInfo}
          </div>
        )}
        {selected && (
          <div style={{ marginTop: 10, background: G.wash, borderRadius: 8, padding: "10px 14px", maxWidth: 480 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.dark, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="bi bi-magic" style={{ color: G.base }} />Certificate Template Preview
            </div>
            <div style={{ fontSize: 11, color: "#555", lineHeight: 1.6 }}>
              <div><strong>Title:</strong> {certTitle("seminar")}</div>
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
                {loading ? "Checking records…" : `${eligible.length} participant(s) registered + evaluated, no certificate yet`}
              </div>
            </div>
            {eligible.length > 0 && !loading && (
              <button style={{ ...s.btnSuccess, opacity: issuing ? 0.7 : 1 }} onClick={issueAll} disabled={issuing}>
                {issuing
                  ? <><span className="spinner-border spinner-border-sm" />Issuing…</>
                  : <><i className="bi bi-send-check" />Issue All ({eligible.length})</>
                }
              </button>
            )}
          </div>
          {error && (
            <div style={{ margin: "12px 24px 0", ...s.infoBox("red"), marginBottom: 0 }}>
              <i className="bi bi-exclamation-triangle-fill" />{error}
            </div>
          )}
          {loading
            ? <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Checking registration and evaluation records…</div>
            : eligible.length === 0
              ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <i className="bi bi-check-circle" style={{ fontSize: 36, color: "#16a34a" }} />
                  <div style={{ fontWeight: 700, color: G.dark, marginTop: 12, marginBottom: 6 }}>All caught up!</div>
                  <div style={{ fontSize: 13, color: "#888" }}>All eligible participants have received their certificates.</div>
                </div>
              )
              : (
                <table style={{ ...s.table, borderRadius: 0, boxShadow: "none" }}>
                  <thead>
                    <tr>
                      <th style={s.th}>Participant</th>
                      <th style={s.th}>Role</th>
                      <th style={s.th}>Eligibility</th>
                      <th style={s.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligible.map(reg => (
                      <tr key={reg.user_id}>
                        <td style={s.td}>
                          <div style={{ fontWeight: 600 }}>{reg.full_name || "—"}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>{reg.email}</div>
                        </td>
                        <td style={s.td}>
                          {reg.role && <span style={s.tag("blue")}>{reg.role.charAt(0).toUpperCase() + reg.role.slice(1)}</span>}
                        </td>
                        <td style={s.td}><span style={s.tag("green")}>Registered + Evaluated</span></td>
                        <td style={s.td}>
                          <button style={{ ...s.btnSuccess, padding: "6px 14px", fontSize: 12, opacity: issuing ? 0.6 : 1 }}
                            onClick={() => issueSingle(reg)} disabled={issuing}>
                            <i className="bi bi-send-check" />Issue
                          </button>
                        </td>
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
          <div style={{ fontSize: 13, color: "#aaa" }}>
            Participants who registered and evaluated the seminar but have no certificate will appear here.
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  BADGES TAB
// ─────────────────────────────────────────────────────────────────────────────
function BadgesTab() {
  const [badges,  setBadges]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editB,   setEditB]   = useState(null);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
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

  const openAdd  = () => { setEditB(null); setForm({ badge_type: "completion" }); setError(""); setShowAdd(true); };
  const openEdit = (b) => { setEditB(b); setForm({ ...b }); setError(""); setShowAdd(true); };

  const save = async () => {
    if (!form.name?.trim()) { setError("Name is required."); return; }
    setSaving(true); setError("");
    const payload = {
      name:        form.name.trim(),
      description: form.description?.trim() || null,
      badge_type:  form.badge_type || "completion",
      icon_url:    form.icon_url?.trim() || null,
    };
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
    if (!window.confirm(`Delete "${b.name}"?${count > 0 ? ` This will remove it from ${count} student(s).` : ""}`)) return;
    await supabase.from("badges").delete().eq("id", b.id);
    reload();
  };

  const BADGE_TYPES = ["completion", "score", "attendance", "streak", "special"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#888" }}>{badges.length} badge{badges.length !== 1 ? "s" : ""} created</div>
        <button style={s.addBtn} onClick={openAdd}><i className="bi bi-plus-lg" />Create Badge</button>
      </div>
      {loading
        ? <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading…</div>
        : badges.length === 0
          ? (
            <div style={s.emptyBox}>
              <i className="bi bi-award" style={{ fontSize: 40, color: G.pale }} />
              <div style={{ fontWeight: 700, color: G.dark, margin: "10px 0 6px" }}>No badges created yet</div>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>Create badges to award students for completing modules or passing assessments.</div>
              <button style={s.addBtn} onClick={openAdd}>+ Create First Badge</button>
            </div>
          )
          : (
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
                <label style={s.label}>Badge Name *</label>
                <input style={s.input} value={form.name || ""} onChange={e => setF("name", e.target.value)} placeholder="e.g. Gender Champion" autoFocus />
              </div>
              <div style={s.fg}>
                <label style={s.label}>Description</label>
                <textarea style={s.textarea} value={form.description || ""} onChange={e => setF("description", e.target.value)} placeholder="What does this badge represent?" />
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
              <button style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>
                {saving ? "Saving…" : editB ? "Save Changes" : "Create Badge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function CertificatesPage() {
  const [tab, setTab] = useState("certificates");
  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}><i className="bi bi-trophy me-2" />Certificates & Badges</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>Manage student achievements and recognitions</div>
        </div>
      </div>
      <div style={s.tabs}>
        <div style={s.tab(tab === "certificates")} onClick={() => setTab("certificates")}>
          <i className="bi bi-patch-check" />Certificates
        </div>
        <div style={s.tab(tab === "auto-issue")} onClick={() => setTab("auto-issue")}>
          <i className="bi bi-lightning-charge" />Auto-Issue
          <span style={{ ...s.tag("blue"), marginLeft: 4, fontSize: 10 }}>Reg + Eval gated</span>
        </div>
        <div style={s.tab(tab === "badges")} onClick={() => setTab("badges")}>
          <i className="bi bi-award" />Badges
        </div>
      </div>
      {tab === "certificates" && <CertificatesTab />}
      {tab === "auto-issue"   && <AutoIssueTab />}
      {tab === "badges"       && <BadgesTab />}
    </div>
  );
}