// src/CertificateTemplateEditor.jsx
// BLOOM GAD Admin — Certificate Design Templates
// Upload a background design, drag text fields onto it, style each one with Canva-style smart alignment guides.

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./lib/supabase.js";
import { ConfirmModal, useToast } from "./App.jsx";
import { logActivity } from "./lib/activityLog.js";

const G = {
  dark: "#1A2E1A", mid: "#2D6A2D", base: "#3A7A3A",
  light: "#4CAF50", pale: "#C8E6C9", wash: "#E8F5E9",
};

// All text sizes on a design are stored relative to a certificate that is 842 units wide.
// The editor canvas, the previews, and the printed page all scale from this same base,
// so what you see while designing is what gets printed.
const BASE_WIDTH = 842;
const DEFAULT_RATIO = 842 / 595; // A4 landscape

const STORAGE_BUCKET = "certificate-templates";

const s = {
  fg:           { marginBottom: 16 },
  label:        { fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.6 },
  input:        { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark },
  select:       { width: "100%", padding: "9px 12px", border: "1px solid #DDE8DD", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark, colorScheme: "light" },
  btnPrimary:   { padding: "9px 20px", background: G.dark, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnSecondary: { padding: "9px 20px", background: G.wash, color: G.dark, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  addBtn:       { padding: "9px 18px", background: G.dark, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 },
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  mHeader:      { padding: "16px 24px", borderBottom: "1px solid #DDE8DD", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 2 },
  mTitle:       { fontSize: 16, fontWeight: 700, color: G.dark },
  mFooter:      { padding: "14px 24px", borderTop: "1px solid #DDE8DD", display: "flex", gap: 8, justifyContent: "flex-end", position: "sticky", bottom: 0, background: "#fff" },
  iconBtn:     (c) => ({ background: "none", border: "none", cursor: "pointer", color: c || "#999", fontSize: 14, padding: "4px 6px", borderRadius: 6 }),
  error:        { background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginBottom: 14 },
};

export const FIELD_VARIABLES = [
  { id: "recipient_name", label: "Recipient Name" },
  { id: "seminar_title",  label: "Seminar / Event Title" },
  { id: "date",           label: "Date" },
  { id: "cert_code",      label: "Certificate Code" },
  { id: "sig1_name",      label: "Left Signatory Name" },
  { id: "sig1_title",     label: "Left Signatory Title" },
  { id: "sig2_name",      label: "Right Signatory Name" },
  { id: "sig2_title",     label: "Right Signatory Title" },
  { id: "body_text",      label: "Body / Description Text" },
  { id: "custom",         label: "Custom Text" },
];

const FONT_FAMILIES = [
  "Georgia, serif", "'Playfair Display', serif", "'Times New Roman', serif",
  "'Inter', sans-serif", "'Segoe UI', sans-serif", "Arial, sans-serif",
  "'Brush Script MT', cursive", "'Courier New', monospace",
];

const REF_TYPES = [
  ["seminar", "Seminar Participation"], ["module", "Module Completion"],
  ["assessment", "Assessment Achievement"], ["manual", "Manual Recognition"],
  ["any", "All Certificate Types"],
];

const SAMPLE_DATA = {
  recipient_name: "Juan Dela Cruz",
  seminar_title:  "Gender Sensitivity Training",
  date:           "September 21, 2026",
  cert_code:      "CERT-SAMPLE1",
  sig1_name:      "GAD Coordinator",
  sig1_title:     "Cavite State University",
  sig2_name:      "GADRC Director",
  sig2_title:     "Cavite State University",
  body_text:      "has successfully participated in the seminar organized by the GADRC.",
};

function uid() { return Math.random().toString(36).slice(2, 10); }

function blankField(variable) {
  return {
    id: uid(), variable, customText: variable === "custom" ? "Custom Text" : "",
    x: 50, y: 50, fontSize: 24, fontFamily: "Georgia, serif", color: "#1A2E1A",
    bold: false, italic: false, textAlign: "center", maxWidth: 80,
  };
}

// Escapes text for HTML content AND for use inside double-quoted attributes.
function escapeHTML(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fieldValue(f, data) {
  return f.variable === "custom" ? (f.customText || "") : (data[f.variable] ?? "");
}

function fieldTranslateX(f) {
  return f.textAlign === "center" ? "-50%" : f.textAlign === "right" ? "-100%" : "0%";
}

// ─────────────────────────────────────────────────────────────────────────────
//  STORAGE
// ─────────────────────────────────────────────────────────────────────────────
export async function uploadTemplateImage(file) {
  const ext  = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `templates/${Date.now()}_${uid()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Deletes an uploaded design image from storage, given its public URL.
// Failures are only logged: a leftover image never breaks anything.
export async function removeTemplateImage(url) {
  if (!url) return;
  const marker = `/${STORAGE_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return;
  const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) console.warn("removeTemplateImage failed:", error.message);
}

export async function loadTemplates() {
  const { data, error } = await supabase
    .from("certificate_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadTemplates failed:", error.message);
    return [];
  }
  return data || [];
}

// ─────────────────────────────────────────────────────────────────────────────
//  PRINTABLE HTML
//  Uses container-relative units (cqw) so text scales with the certificate,
//  exactly like the on-screen canvas. Waits for the image and fonts before printing.
// ─────────────────────────────────────────────────────────────────────────────
export function buildTemplateHTML(tmpl, data, { autoPrint = false } = {}) {
  const fields = tmpl.fields || [];

  const fieldsHTML = fields.map(f => {
    const value     = fieldValue(f, data);
    const fontCqw   = ((Number(f.fontSize) || 16) / BASE_WIDTH) * 100;
    const style = [
      "position:absolute",
      `left:${Number(f.x) || 0}%`,
      `top:${Number(f.y) || 0}%`,
      `transform:translate(${fieldTranslateX(f)},-50%)`,
      `max-width:${Number(f.maxWidth) || 80}%`,
      `font-size:${fontCqw.toFixed(4)}cqw`,
      `font-family:${f.fontFamily || "Georgia, serif"}`,
      `color:${f.color || "#1A2E1A"}`,
      `font-weight:${f.bold ? 700 : 400}`,
      `font-style:${f.italic ? "italic" : "normal"}`,
      `text-align:${f.textAlign || "center"}`,
      `white-space:${f.variable === "body_text" ? "normal" : "nowrap"}`,
      "line-height:1.3",
    ].join(";");
    return `<div style="${escapeHTML(style)}">${escapeHTML(value)}</div>`;
  }).join("");

  const background = tmpl.image_url
    ? `<img id="bg" src="${escapeHTML(tmpl.image_url)}" alt="" />`
    : `<div class="fallback"></div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
      * { box-sizing:border-box; margin:0; padding:0; }
      @page { size: A4 landscape; margin: 0; }
      html, body { width:100%; height:100%; }
      body {
        display:flex; align-items:center; justify-content:center; background:#fff;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .stage {
        --r: ${DEFAULT_RATIO};
        position: relative;
        width: min(100vw, calc(100vh * var(--r)));
        aspect-ratio: var(--r);
        container-type: inline-size;
        overflow: hidden;
      }
      .stage img, .stage .fallback { position:absolute; inset:0; width:100%; height:100%; display:block; }
      .stage img { object-fit: fill; }
      .stage .fallback { border: 10px double #2D6A2D; background: #fafdf6; }
    </style></head><body>
    <div class="stage" id="stage">
      ${background}
      ${fieldsHTML}
    </div>
    <script>
      (function () {
        var stage = document.getElementById("stage");
        var img = document.getElementById("bg");
        var autoPrint = ${autoPrint ? "true" : "false"};
        var done = false;
        function ready() {
          if (done) return; done = true;
          if (img && img.naturalWidth && img.naturalHeight) {
            stage.style.setProperty("--r", img.naturalWidth / img.naturalHeight);
          }
          var fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
          fonts.then(function () {
            if (autoPrint) setTimeout(function () { window.focus(); window.print(); }, 200);
          });
        }
        if (!img || img.complete) ready();
        else { img.onload = ready; img.onerror = ready; }
      })();
    </script>
    </body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  NUMBER INPUT — lets you clear and retype without the value jumping to 0
// ─────────────────────────────────────────────────────────────────────────────
function NumberField({ value, min, max, onChange, style }) {
  const [text, setText] = useState(String(Math.round(Number(value) || 0)));

  useEffect(() => { setText(String(Math.round(Number(value) || 0))); }, [value]);

  const commitIfValid = (t) => {
    const n = Number(t);
    if (t.trim() !== "" && !Number.isNaN(n) && n >= min && n <= max) onChange(n);
  };

  const onBlur = () => {
    const n = Number(text);
    if (text.trim() === "" || Number.isNaN(n)) {
      setText(String(Math.round(Number(value) || 0)));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    onChange(clamped);
    setText(String(Math.round(clamped)));
  };

  return (
    <input
      type="number" min={min} max={max} style={style} value={text}
      onChange={e => { setText(e.target.value); commitIfValid(e.target.value); }}
      onBlur={onBlur}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  INTERACTIVE CANVAS with inter-field alignment guides (Canva-style)
// ─────────────────────────────────────────────────────────────────────────────
export function TemplateCanvas({ imageUrl, fields = [], data = SAMPLE_DATA, editable = false, selectedId = null, onSelect, onFieldChange, width = 700 }) {
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const [natural, setNatural] = useState({ w: 842, h: 595 });
  const [activeGuides, setActiveGuides] = useState([]);

  useEffect(() => {
    if (!editable) return undefined;

    const move = (e) => {
      const d = dragRef.current;
      if (!d || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dxPct = ((e.clientX - d.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - d.startY) / rect.height) * 100;

      let nx = Math.min(100, Math.max(0, d.origX + dxPct));
      let ny = Math.min(100, Math.max(0, d.origY + dyPct));

      // Smart alignment targets: canvas centre + every other field
      const xTargets = [50];
      const yTargets = [50];
      fields.forEach(f => {
        if (f.id !== d.id) { xTargets.push(f.x); yTargets.push(f.y); }
      });

      const threshold = 1.5; // snap distance in %
      const guides = [];

      // Snap to the closest target on each axis
      let bestX = null;
      for (const tx of xTargets) {
        const dist = Math.abs(nx - tx);
        if (dist <= threshold && (bestX === null || dist < Math.abs(nx - bestX))) bestX = tx;
      }
      if (bestX !== null) { nx = bestX; guides.push({ type: "v", pos: bestX }); }

      let bestY = null;
      for (const ty of yTargets) {
        const dist = Math.abs(ny - ty);
        if (dist <= threshold && (bestY === null || dist < Math.abs(ny - bestY))) bestY = ty;
      }
      if (bestY !== null) { ny = bestY; guides.push({ type: "h", pos: bestY }); }

      setActiveGuides(guides);
      onFieldChange && onFieldChange(d.id, { x: nx, y: ny });
    };

    const up = () => {
      dragRef.current = null;
      setActiveGuides([]);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [onFieldChange, fields, editable]);

  const hRatio = natural.w > 0 ? natural.h / natural.w : 595 / 842;
  const height = width * hRatio;
  const scale  = width / BASE_WIDTH;

  return (
    <div
      ref={containerRef}
      onClick={() => editable && onSelect && onSelect(null)}
      style={{ position: "relative", width, height, background: "#eee", overflow: "hidden", userSelect: "none", borderRadius: 4, boxShadow: editable ? "0 0 0 1px #ccc" : "0 4px 16px rgba(0,0,0,0.1)", margin: "0 auto" }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Certificate Background"
          draggable={false}
          crossOrigin="anonymous"
          onLoad={e => { if (e.target.naturalWidth > 0) setNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight }); }}
          style={{ width: "100%", height: "100%", objectFit: "fill", display: "block", pointerEvents: "none" }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", border: "4px double #2D6A2D", background: "linear-gradient(135deg,#fafdf6 0%,#f6f9f0 100%)", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", color: "#2D6A2D", fontSize: 13, fontWeight: 600 }}>
          No background image (Canvas layout only)
        </div>
      )}

      {/* Alignment guides — red: vertical (X), blue: horizontal (Y) */}
      {editable && activeGuides.map((g, idx) => (
        g.type === "v" ? (
          <div key={`v-${idx}`} style={{ position: "absolute", left: `${g.pos}%`, top: 0, bottom: 0, width: "1.5px", background: "#ef4444", zIndex: 10, pointerEvents: "none" }} />
        ) : (
          <div key={`h-${idx}`} style={{ position: "absolute", top: `${g.pos}%`, left: 0, right: 0, height: "1.5px", background: "#3b82f6", zIndex: 10, pointerEvents: "none" }} />
        )
      ))}

      {fields.map(f => {
        const value = f.variable === "custom" ? (f.customText || "Custom Text") : (data[f.variable] ?? "");
        return (
          <div
            key={f.id}
            onPointerDown={(e) => {
              if (!editable) return;
              e.stopPropagation();
              e.preventDefault();
              onSelect && onSelect(f.id);
              dragRef.current = { id: f.id, startX: e.clientX, startY: e.clientY, origX: f.x, origY: f.y };
            }}
            onClick={(e) => { e.stopPropagation(); editable && onSelect && onSelect(f.id); }}
            style={{
              position: "absolute", left: `${f.x}%`, top: `${f.y}%`,
              transform: `translate(${fieldTranslateX(f)}, -50%)`,
              maxWidth: `${f.maxWidth || 80}%`,
              fontSize: (f.fontSize || 16) * scale,
              fontFamily: f.fontFamily || "Georgia, serif",
              color: f.color || "#1A2E1A",
              fontWeight: f.bold ? 700 : 400,
              fontStyle: f.italic ? "italic" : "normal",
              textAlign: f.textAlign || "center",
              cursor: editable ? "move" : "default",
              touchAction: editable ? "none" : "auto",
              outline: editable && selectedId === f.id ? "1.5px dashed #ef4444" : "none",
              whiteSpace: f.variable === "body_text" ? "normal" : "nowrap",
              lineHeight: 1.3,
            }}
          >
            {value}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  DESIGNER MODAL — Create / Edit Template
// ─────────────────────────────────────────────────────────────────────────────
export function TemplateDesignerModal({ template, seminars = [], onClose, onSaved }) {
  const toast = useToast();
  const [name, setName]             = useState(template?.name || "");
  const [refType, setRefType]       = useState(template?.reference_type || "seminar");
  const [seminarId, setSeminarId]   = useState(template?.seminar_id || "");
  const [imageUrl, setImageUrl]     = useState(template?.image_url || "");
  const [isDefault, setIsDefault]   = useState(template?.is_default || false);
  const [fields, setFields]         = useState(template?.fields || []);
  const [selectedId, setSelectedId] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  // Images uploaded while this modal is open (cleaned up if not used)
  const [sessionUploads, setSessionUploads] = useState([]);

  const selected = fields.find(f => f.id === selectedId) || null;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Image is too large. Please use an image under 5 MB."); return; }
    setUploading(true); setError("");
    try {
      const url = await uploadTemplateImage(file);
      setImageUrl(url);
      setSessionUploads(list => [...list, url]);
    } catch (err) {
      setError("Image upload failed: " + err.message);
    }
    setUploading(false);
  };

  const addField = (variable) => {
    const f = blankField(variable);
    setFields(fs => [...fs, f]);
    setSelectedId(f.id);
  };

  const updateField = useCallback((id, patch) => {
    setFields(fs => fs.map(f => f.id === id ? { ...f, ...patch } : f));
  }, []);

  const deleteField = (id) => {
    setFields(fs => fs.filter(f => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const onSeminarLinkChange = (value) => {
    setSeminarId(value);
    // A design linked to a seminar is a seminar certificate design
    if (value) setRefType("seminar");
  };

  // Close without saving: remove any images uploaded in this session
  const cancel = async () => {
    await Promise.all(sessionUploads.map(removeTemplateImage));
    onClose();
  };

  const save = async () => {
    if (!name.trim()) { setError("Please name this template."); return; }
    setSaving(true); setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Only one default design per certificate type
      if (isDefault) {
        let clear = supabase
          .from("certificate_templates")
          .update({ is_default: false })
          .eq("reference_type", refType || "seminar")
          .eq("is_default", true);
        if (template?.id) clear = clear.neq("id", template.id);
        const { error: clearErr } = await clear;
        if (clearErr) {
          setSaving(false);
          setError("Could not update the previous default design: " + clearErr.message);
          return;
        }
      }

      const payload = {
        name: name.trim(),
        reference_type: refType || "seminar",
        seminar_id: seminarId || null,
        image_url: imageUrl || "",
        fields: fields || [],
        is_default: isDefault,
        updated_at: new Date().toISOString(),
      };

      let err;
      if (template?.id) {
        ({ error: err } = await supabase
          .from("certificate_templates")
          .update(payload)
          .eq("id", template.id));
      } else {
        ({ error: err } = await supabase
          .from("certificate_templates")
          .insert({ ...payload, created_by: user?.id ?? null }));
      }

      setSaving(false);
      if (err) { setError("Database error: " + err.message); return; }

      // Clean up images that are no longer used by this design
      const unused = sessionUploads.filter(u => u !== imageUrl);
      if (template?.image_url && template.image_url !== imageUrl) unused.push(template.image_url);
      await Promise.all(unused.map(removeTemplateImage));

      toast(template ? "Template updated." : "Template created.", "success");
      logActivity(template ? "certificate_template_updated" : "certificate_template_created", { name: payload.name });
      onSaved();
      onClose();
    } catch (err2) {
      setSaving(false);
      setError("Failed to save design: " + err2.message);
    }
  };

  return (
    <div style={s.overlay}>
      <div style={{ background: "#fff", borderRadius: 10, width: "100%", maxWidth: 1080, maxHeight: "94vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
        <div style={s.mHeader}>
          <span style={s.mTitle}><i className="bi bi-vector-pen me-2" />{template ? "Edit" : "New"} Certificate Design</span>
          <button style={s.iconBtn()} onClick={cancel}><i className="bi bi-x-lg" /></button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
          <div style={{ flex: "1 1 520px", padding: "20px 24px", borderRight: "1px solid #DDE8DD" }}>
            {error && <div style={s.error}>{error}</div>}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={s.label}>Template Name *</label>
                <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gender Sensitivity Webinar 2026" />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={s.label}>Applies To</label>
                <select style={s.select} value={refType} onChange={e => setRefType(e.target.value)} disabled={!!seminarId}>
                  {REF_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={s.label}>Link to Seminar (optional)</label>
                <select style={s.select} value={seminarId} onChange={e => onSeminarLinkChange(e.target.value)}>
                  <option value="">— Not tied to a seminar —</option>
                  {seminars.map(sem => <option key={sem.id} value={sem.id}>{sem.title}</option>)}
                </select>
              </div>
            </div>
            {seminarId && (
              <div style={{ fontSize: 11, color: "#888", marginTop: -8, marginBottom: 14 }}>
                <i className="bi bi-link-45deg me-1" />This design is picked automatically when issuing certificates for the linked seminar.
              </div>
            )}

            <div style={s.fg}>
              <label style={s.label}>Design Image <span style={{ textTransform: "none", color: "#aaa" }}>(optional, max 5 MB)</span></label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ ...s.btnSecondary, cursor: uploading ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <i className="bi bi-upload" />{uploading ? "Uploading…" : imageUrl ? "Replace Image" : "Upload Image"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} style={{ display: "none" }} disabled={uploading} />
                </label>
                {imageUrl && <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Image uploaded ✓</span>}
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: G.dark, fontWeight: 600, marginBottom: 16 }}>
              <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} style={{ width: 15, height: 15, accentColor: G.base }} />
              Set as default design for this certificate type
            </label>

            <div style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={s.label}>Canvas — drag fields to position them</label>
              <select style={{ ...s.select, width: "auto" }} value="" onChange={e => { if (e.target.value) addField(e.target.value); }}>
                <option value="">＋ Add Field…</option>
                {FIELD_VARIABLES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>

            <TemplateCanvas
              imageUrl={imageUrl} fields={fields} data={SAMPLE_DATA} editable
              selectedId={selectedId} onSelect={setSelectedId} onFieldChange={updateField}
              width={520}
            />
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 8, textAlign: "center" }}>
              Smart guidelines appear when dragging near other fields (Vertical: Red, Horizontal: Blue).
            </div>
          </div>

          <div style={{ flex: "0 0 320px", padding: "20px 24px" }}>
            <label style={s.label}>Fields on Design ({fields.length})</label>
            {fields.length === 0 ? (
              <div style={{ fontSize: 12, color: "#aaa", padding: "16px 0" }}>No fields yet. Use "Add Field" above to place recipient name, date, signatures, etc.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 18 }}>
                {fields.map(f => {
                  const label = FIELD_VARIABLES.find(v => v.id === f.variable)?.label || f.variable;
                  return (
                    <div key={f.id} onClick={() => setSelectedId(f.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 6, cursor: "pointer", background: selectedId === f.id ? G.wash : "#f9fafb", border: `1px solid ${selectedId === f.id ? G.pale : "transparent"}` }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: G.dark }}>{label}</span>
                      <button style={s.iconBtn("#dc2626")} onClick={(e) => { e.stopPropagation(); deleteField(f.id); }}><i className="bi bi-trash" /></button>
                    </div>
                  );
                })}
              </div>
            )}

            {selected && (
              <div style={{ borderTop: "1px solid #DDE8DD", paddingTop: 14 }}>
                <label style={s.label}>{FIELD_VARIABLES.find(v => v.id === selected.variable)?.label} — Style</label>

                {selected.variable === "custom" && (
                  <div style={s.fg}>
                    <label style={s.label}>Text</label>
                    <input style={s.input} value={selected.customText} onChange={e => updateField(selected.id, { customText: e.target.value })} />
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>X %</label>
                    <NumberField min={0} max={100} style={s.input} value={selected.x} onChange={v => updateField(selected.id, { x: v })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>Y %</label>
                    <NumberField min={0} max={100} style={s.input} value={selected.y} onChange={v => updateField(selected.id, { y: v })} />
                  </div>
                </div>

                {/* Quick alignment helpers */}
                <div style={{ marginBottom: 12 }}>
                  <label style={s.label}>Quick Align</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={() => updateField(selected.id, { x: 50 })} style={{ flex: 1, padding: "6px 8px", background: G.wash, color: G.dark, border: "1px solid #dde8dd", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      <i className="bi bi-align-center me-1" /> Center X
                    </button>
                    <button onClick={() => updateField(selected.id, { y: 50 })} style={{ flex: 1, padding: "6px 8px", background: G.wash, color: G.dark, border: "1px solid #dde8dd", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      <i className="bi bi-align-middle me-1" /> Center Y
                    </button>
                    <button onClick={() => updateField(selected.id, { x: 20 })} style={{ padding: "6px 8px", background: "#f3f4f6", color: G.dark, border: "1px solid #dde8dd", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      Left 20%
                    </button>
                    <button onClick={() => updateField(selected.id, { x: 80 })} style={{ padding: "6px 8px", background: "#f3f4f6", color: G.dark, border: "1px solid #dde8dd", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      Right 80%
                    </button>
                  </div>
                </div>

                <div style={s.fg}>
                  <label style={s.label}>Font</label>
                  <select style={s.select} value={selected.fontFamily} onChange={e => updateField(selected.id, { fontFamily: e.target.value })}>
                    {FONT_FAMILIES.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f.split(",")[0].replace(/'/g, "")}</option>)}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>Size (px)</label>
                    <NumberField min={6} max={120} style={s.input} value={selected.fontSize} onChange={v => updateField(selected.id, { fontSize: v })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={s.label}>Color</label>
                    <input type="color" style={{ ...s.input, padding: 2, height: 36 }} value={selected.color} onChange={e => updateField(selected.id, { color: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  <button onClick={() => updateField(selected.id, { bold: !selected.bold })} style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "1px solid #DDE8DD", background: selected.bold ? G.dark : "#fff", color: selected.bold ? "#fff" : G.dark, fontWeight: 700, cursor: "pointer" }}>B</button>
                  <button onClick={() => updateField(selected.id, { italic: !selected.italic })} style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "1px solid #DDE8DD", background: selected.italic ? G.dark : "#fff", color: selected.italic ? "#fff" : G.dark, fontStyle: "italic", cursor: "pointer" }}>I</button>
                  {["left", "center", "right"].map(a => (
                    <button key={a} onClick={() => updateField(selected.id, { textAlign: a })} title={a} style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "1px solid #DDE8DD", background: selected.textAlign === a ? G.dark : "#fff", color: selected.textAlign === a ? "#fff" : G.dark, cursor: "pointer" }}>
                      <i className={`bi bi-text-${a}`} />
                    </button>
                  ))}
                </div>

                <div style={s.fg}>
                  <label style={s.label}>Max Width % (for wrapping)</label>
                  <NumberField min={10} max={100} style={s.input} value={selected.maxWidth} onChange={v => updateField(selected.id, { maxWidth: v })} />
                </div>

                <button style={{ ...s.btnSecondary, width: "100%", color: "#dc2626", background: "#fee2e2" }} onClick={() => deleteField(selected.id)}><i className="bi bi-trash me-2" />Remove Field</button>
              </div>
            )}
          </div>
        </div>

        <div style={s.mFooter}>
          <button style={s.btnSecondary} onClick={cancel}>Cancel</button>
          <button style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving || uploading}>{saving ? "Saving…" : "Save Design"}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TEMPLATES TAB — list view
// ─────────────────────────────────────────────────────────────────────────────
export function TemplatesTab() {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [seminars, setSeminars]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(null);
  const [confirm, setConfirm]     = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const [t, sem] = await Promise.all([
      loadTemplates(),
      supabase.from("seminars").select("id, title").order("scheduled_start", { ascending: false }),
    ]);
    setTemplates(t);
    setSeminars(sem.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const seminarTitle = (id) => seminars.find(sm => sm.id === id)?.title;

  const del = async (t) => {
    // Find out how many issued certificates use this design first
    const { count, error: countErr } = await supabase
      .from("certificates")
      .select("id", { count: "exact", head: true })
      .eq("template_id", t.id);
    const used = countErr ? null : (count || 0);

    const message = used > 0
      ? `${used} issued certificate${used !== 1 ? "s use" : " uses"} "${t.name}". If you delete this design, ${used !== 1 ? "they" : "it"} will switch to the default BLOOM layout. The certificate details and codes stay the same.`
      : used === null
        ? `Delete "${t.name}"? Certificates that use this design will switch to the default BLOOM layout.`
        : `Delete "${t.name}"? This cannot be undone.`;

    setConfirm({
      title: "Delete Design",
      message,
      confirmLabel: "Delete", danger: true,
      onConfirm: async () => {
        // Detach the design from any issued certificates so the delete isn't blocked
        const { error: detachErr } = await supabase
          .from("certificates")
          .update({ template_id: null })
          .eq("template_id", t.id);
        if (detachErr) {
          toast("Could not update certificates using this design: " + detachErr.message, "error");
          setConfirm(null);
          return;
        }

        const { error: delErr } = await supabase.from("certificate_templates").delete().eq("id", t.id);
        if (delErr) {
          toast("Failed to delete design: " + delErr.message, "error");
          setConfirm(null);
          return;
        }

        // Remove the image only if no other design uses the same file
        if (t.image_url && !templates.some(o => o.id !== t.id && o.image_url === t.image_url)) {
          await removeTemplateImage(t.image_url);
        }

        logActivity("certificate_template_deleted", { name: t.name, certificates_detached: used || 0 });
        toast("Design deleted.", "success");
        setConfirm(null);
        reload();
      },
    });
  };

  const typeLabel = (t) => (REF_TYPES.find(([v]) => v === t)?.[1]) || t;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#888" }}>{templates.length} design{templates.length !== 1 ? "s" : ""} uploaded</div>
        <button style={s.addBtn} onClick={() => setEditing("new")}><i className="bi bi-plus-lg" />New Design</button>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading…</div>
        : templates.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 14, border: `2px dashed ${G.pale}`, padding: "50px 20px", textAlign: "center" }}>
            <i className="bi bi-image" style={{ fontSize: 40, color: G.pale }} />
            <div style={{ fontWeight: 700, color: G.dark, margin: "10px 0 6px" }}>No designs uploaded yet</div>
            <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>Upload a certificate design and place recipient name, date, and signature fields on it.</div>
            <button style={s.addBtn} onClick={() => setEditing("new")}>+ Upload First Design</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {templates.map(t => (
              <div key={t.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #DDE8DD", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ width: "100%", aspectRatio: "842/595", background: "#f5f5f5", overflow: "hidden", position: "relative" }}>
                  {t.image_url ? (
                    <img src={t.image_url} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", border: "4px double #2D6A2D", background: "linear-gradient(135deg,#fafdf6 0%,#f6f9f0 100%)", padding: 12, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between", textAlign: "center" }}>
                      <div style={{ fontSize: 7, fontWeight: 700, color: "#2D6A2D", letterSpacing: 1, textTransform: "uppercase" }}>Cavite State University</div>
                      <div>
                        <div style={{ fontSize: 12, fontFamily: "Georgia, serif", fontWeight: 700, color: "#1A2E1A" }}>{t.name}</div>
                        <div style={{ fontSize: 8, color: "#888", marginTop: 2 }}>[ Default Code Layout ]</div>
                      </div>
                      <div style={{ fontSize: 7, color: "#2D6A2D" }}>★ GADRC ★</div>
                    </div>
                  )}
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: G.dark, marginBottom: 4 }}>{t.name}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: G.wash, color: G.base }}>{typeLabel(t.reference_type)}</span>
                    {t.is_default && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#fef9c3", color: "#92400e" }}>Default</span>}
                    {t.seminar_id && (
                      <span title={seminarTitle(t.seminar_id) || ""} style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#dbeafe", color: "#1d4ed8", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <i className="bi bi-link-45deg" /> {seminarTitle(t.seminar_id) || "Linked seminar"}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ flex: 1, padding: "6px 0", border: "1px solid #DDE8DD", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600, color: G.base }} onClick={() => setEditing(t)}><i className="bi bi-pencil me-1" />Edit</button>
                    <button style={{ flex: 1, padding: "6px 0", border: "none", borderRadius: 6, background: "#fee2e2", fontSize: 12, cursor: "pointer", fontWeight: 600, color: "#dc2626" }} onClick={() => del(t)}><i className="bi bi-trash me-1" />Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {editing && (
        <TemplateDesignerModal
          template={editing === "new" ? null : editing}
          seminars={seminars}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
      {confirm && <ConfirmModal title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}