import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase.js";
import { ConfirmModal } from "./App.jsx";
import { useToast } from "./App.jsx";
import { V, FieldError } from "./lib/Validate.jsx";
import { logActivity } from "./lib/activityLog.js";


// ── Publish notification helper ───────────────────────────────────────────────
async function sendPublishNotifications(title, notifType, referenceId) {
  try {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_active", true);
    if (!profiles?.length) return;
    const notifs = profiles.map(p => ({
      user_id:        p.id,
      type:           notifType,
      title:          notifType === "new_module" ? "New Module Available" : "New Announcement",
      body:           `"${title}" has been published. Check it out now!`,
      reference_type: notifType === "new_module" ? "module" : "announcement",
      reference_id:   referenceId,
      is_read:        false,
    }));
    for (let i = 0; i < notifs.length; i += 50) {
      await supabase.from("notifications").insert(notifs.slice(i, i + 50));
    }
  } catch (e) { console.error("sendPublishNotifications failed:", e); }
}

// ── Update helper ─────────────────────────────────────────────────────────────
// Supabase does NOT return an error when a row-level security (RLS) policy
// blocks an update — it just updates 0 rows. Asking for the updated row back
// lets us detect that and show a real error instead of a fake "saved" message.
const NO_ROWS_MSG =
  "Nothing was saved. Your account may not have permission to edit announcements " +
  "(check the UPDATE policy on the announcements table in Supabase).";

async function updateAnnouncement(id, patch) {
  const { data, error } = await supabase
    .from("announcements")
    .update(patch)
    .eq("id", id)
    .select("id");
  if (error) return error;
  if (!data || data.length === 0) return { message: NO_ROWS_MSG };
  return null;
}

// Escape text before putting it into the email's HTML
function escapeHtml(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const G = {
  dark:  "#2d4a18", mid:   "#3a5a20", base:  "#5a7a3a",
  light: "#8ab060", pale:  "#b5cc8e", wash:  "#e8f2d8",
  cream: "#f6f9f0", white: "#fafdf6",
};

const s = {
  page:       { padding: "28px 32px", fontFamily: "'Segoe UI', system-ui, sans-serif", background: G.cream, minHeight: "100vh" },
  header:     { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  title:      { fontSize: 22, fontWeight: 800, color: G.dark, margin: 0 },
  subtitle:   { fontSize: 13, color: "#888", marginTop: 2 },
  addBtn:     { padding: "9px 18px", background: G.dark, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 },
  searchBar:  { width: "100%", maxWidth: 320, padding: "9px 14px", border: `1px solid ${G.pale}`, borderRadius: 8, fontSize: 13, outline: "none", background: "#fff" },
  toolbar:    { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
  grid:       { display: "flex", flexDirection: "column", gap: 10 },
  card:       { background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: `1px solid ${G.wash}`, display: "flex", gap: 16, alignItems: "flex-start" },
  cardLeft:   { flex: 1, minWidth: 0 },
  cardTitle:  { fontSize: 15, fontWeight: 700, color: G.dark, marginBottom: 4 },
  cardBody:   { fontSize: 13, color: "#555", lineHeight: 1.5, marginBottom: 8 },
  cardMeta:   { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12 },
  cardActions:{ display: "flex", gap: 6, flexShrink: 0, marginTop: 2 },
  tag:       (c) => ({ display: "inline-flex", alignItems: "center", padding: "2px 9px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: c === "green" ? "#dcfce7" : c === "yellow" ? "#fef9c3" : c === "red" ? "#fee2e2" : c === "blue" ? "#dbeafe" : "#f3f4f6", color: c === "green" ? "#16a34a" : c === "yellow" ? "#92400e" : c === "red" ? "#dc2626" : c === "blue" ? "#1d4ed8" : "#555" }),
  iconBtn:   (c) => ({ background: "none", border: "none", cursor: "pointer", color: c || "#999", fontSize: 15, padding: "5px 7px", borderRadius: 6 }),
  overlay:    { position: "fixed", inset: 0, background: "rgba(0,0,0,0.42)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal:      { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 540, maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" },
  mHeader:    { padding: "20px 24px 16px", borderBottom: `1px solid ${G.wash}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 },
  mTitle:     { fontSize: 17, fontWeight: 700, color: G.dark },
  mBody:      { padding: "20px 24px" },
  mFooter:    { padding: "16px 24px", borderTop: `1px solid ${G.wash}`, display: "flex", gap: 8, justifyContent: "flex-end", position: "sticky", bottom: 0, background: "#fff" },
  label:      { fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.6 },
  input:      { width: "100%", padding: "9px 12px", border: `1px solid ${G.pale}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark },
  select:     { width: "100%", padding: "9px 12px", border: `1px solid ${G.pale}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark, colorScheme: "light" },
  textarea:   { width: "100%", padding: "9px 12px", border: `1px solid ${G.pale}`, borderRadius: 8, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", color: G.dark, resize: "vertical", minHeight: 100 },
  fg:         { marginBottom: 16 },
  row:        { display: "flex", gap: 12 },
  btnPrimary: { padding: "9px 20px", background: G.dark, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnSecondary:{ padding: "9px 20px", background: G.wash, color: G.dark, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  btnDanger:  { padding: "9px 20px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 },
  error:      { background: "#fee2e2", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 },
  pinBadge:   { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#92400e", background: "#fef9c3", borderRadius: 8, padding: "2px 8px" },
};

const PRIORITY_OPTS  = ["low", "normal", "high", "urgent"];
const TYPE_OPTS      = ["general", "academic", "event", "alert"];
const AUDIENCE_OPTS  = ["all", "students", "admins"];

function priorityColor(p) {
  if (p === "urgent" || p === "high") return "red";
  if (p === "normal") return "blue";
  return "default";
}

function formatDate(iso) {
  if (!iso) return "";
  const utcStr = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  return new Date(utcStr).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// "YYYY-MM-DD" for today in Philippine time (for comparing date inputs)
function todayPH() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

// Turn a stored expires_at (date or timestamp) into "YYYY-MM-DD" for the date input
function toDateInput(value) {
  if (!value) return "";
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const utcStr = str.endsWith("Z") || str.includes("+") ? str : str + "Z";
  const d = new Date(utcStr);
  if (Number.isNaN(d.getTime())) return str.slice(0, 10);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

export default function AnnouncementsPage() {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [modal, setModal]       = useState(null); // null | "add" | announcement obj
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [err,   setErr]         = useState({});
  const [showNotify,    setShowNotify]    = useState(false);
  const [notifyTarget,  setNotifyTarget]  = useState(null);
  const [notifyGroup,   setNotifyGroup]   = useState("all");
  const [notifyDept,    setNotifyDept]    = useState("");
  const [notifySending, setNotifySending] = useState(false);
  const [notifyResult,  setNotifyResult]  = useState(null);
  const [departments,   setDepartments]   = useState([]);
  const [confirm, setConfirm] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const { data, error: fetchErr } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (fetchErr) console.error("Fetch error:", fetchErr.message);
    setAnnouncements(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      await fetchData();
      if (!active) return;
      // Load departments for email targeting
      const { data: depts } = await supabase
        .from("profiles")
        .select("department")
        .eq("is_active", true);
      if (!active) return;
      const uniqueDepts = [...new Set((depts || []).map(d => d.department).filter(Boolean))].sort();
      setDepartments(uniqueDepts);
    })();
    return () => { active = false; };
  }, [fetchData]);

  // ── Open modal ─────────────────────────────────────────────────
  const openAdd = () => {
    setForm({ title: "", content: "", priority: "normal", type: "general", target_audience: "all", expires_at: "", is_published: false, is_pinned: false });
    setError(""); setErr({});
    setModal("add");
  };

  const openEdit = (a) => {
    setForm({
      title:           a.title || "",
      content:         a.body  || a.content || "",
      priority:        a.priority  || "normal",
      type:            a.type      || "general",
      target_audience: a.target_audience || "all",
      expires_at:      toDateInput(a.expires_at),
      is_published:    !!a.published_at,
      is_pinned:       !!a.is_pinned,
    });
    setError(""); setErr({});
    setModal(a);
  };

  const closeModal = () => { setModal(null); setForm({}); setError(""); setErr({}); };

  // ── Save (add or edit) ─────────────────────────────────────────
  const save = async () => {
    const isAdd = modal === "add";
    const originalExpiry = isAdd ? "" : toDateInput(modal.expires_at);

    const errors = V.all({
      title:   V.title(form.title, "Title"),
      content: !form.content?.trim()
        ? "Content is required."
        : form.content.trim().length < 10
          ? "Content must be at least 10 characters."
          : form.content.trim().length > 2000
            ? "Content must not exceed 2000 characters."
            : null,
      // Only check the expiry date if the admin changed it — otherwise an
      // announcement that has already expired could never be edited again.
      expires_at: form.expires_at && form.expires_at !== originalExpiry && form.expires_at < todayPH()
        ? "Expiry date cannot be in the past."
        : null,
    });
    if (errors) { setErr(errors); return; }

    setSaving(true);
    setError("");
    setErr({});

    const { data: { user } } = await supabase.auth.getUser();

    // Keep the original publish date when editing an already-published announcement
    const wasPublished = !isAdd && !!modal.published_at;
    const nowPublished = !!form.is_published;
    const publishedAt  = nowPublished
      ? (wasPublished ? modal.published_at : new Date().toISOString())
      : null;

    const payload = {
      title:           form.title.trim(),
      body:            form.content.trim(),
      content:         form.content.trim(),
      priority:        form.priority || "normal",
      type:            form.type || "general",
      is_pinned:       !!form.is_pinned,
      is_published:    nowPublished,
      target_audience: form.target_audience || "all",
      expires_at:      form.expires_at || null,
      published_at:    publishedAt,
    };

    let saveErr = null;
    let savedId = isAdd ? null : modal.id;

    if (isAdd) {
      const { data, error: insertErr } = await supabase
        .from("announcements")
        .insert({ ...payload, created_by: user?.id ?? null })
        .select("id")
        .single();
      saveErr = insertErr;
      savedId = data?.id ?? null;
      if (insertErr) console.error("Insert error:", insertErr);
    } else {
      saveErr = await updateAnnouncement(modal.id, payload);
      if (saveErr) console.error("Update error:", saveErr);
    }

    setSaving(false);

    if (saveErr) { setError(saveErr.message); return; }

    // Notify students when an announcement becomes published through this form
    if (nowPublished && !wasPublished && savedId) {
      sendPublishNotifications(payload.title, "announcement", savedId);
    }

    toast(isAdd ? "Announcement created." : "Announcement updated.", "success");
    logActivity(isAdd ? "announcement_created" : "announcement_updated", { id: savedId, title: payload.title });
    closeModal();
    fetchData();
  };

  // ── Toggle publish ─────────────────────────────────────────────
  const togglePublish = async (a) => {
    const newVal = a.published_at ? null : new Date().toISOString();
    // Keep is_published and published_at in sync
    const updateErr = await updateAnnouncement(a.id, { published_at: newVal, is_published: !!newVal });
    if (updateErr) {
      toast(`Failed to update announcement: ${updateErr.message}`, "error");
      return;
    }
    if (newVal) {
      toast("Announcement published — students notified.", "success");
      logActivity("announcement_published", { id: a.id, title: a.title });
      sendPublishNotifications(a.title, "announcement", a.id);
    } else {
      toast("Announcement unpublished.", "success");
      logActivity("announcement_unpublished", { id: a.id, title: a.title });
    }
    fetchData();
  };

  // ── Toggle pin ─────────────────────────────────────────────────
  const togglePin = async (a) => {
    const updateErr = await updateAnnouncement(a.id, { is_pinned: !a.is_pinned });
    if (updateErr) {
      toast(`Failed to update pin status: ${updateErr.message}`, "error");
      return;
    }
    toast(a.is_pinned ? "Announcement unpinned." : "Announcement pinned.", "success");
    logActivity(a.is_pinned ? "announcement_unpinned" : "announcement_pinned", { id: a.id, title: a.title });
    fetchData();
  };

  // ── Delete ─────────────────────────────────────────────────────
  const deleteAnn = (a) => {
    setConfirm({
      title: "Delete Announcement",
      message: `Delete "${a.title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        const { data, error: delErr } = await supabase
          .from("announcements").delete().eq("id", a.id).select("id");
        if (delErr || !data || data.length === 0) {
          toast(`Failed to delete announcement${delErr ? `: ${delErr.message}` : " (no permission to delete)."}`, "error");
        } else {
          toast("Announcement deleted.", "success");
          logActivity("announcement_deleted", { id: a.id, title: a.title });
          fetchData();
        }
        setConfirm(null);
      }
    });
  };

  // ── Filtered list ──────────────────────────────────────────────
  const q = search.toLowerCase();
  const filtered = announcements
    .filter(a =>
      (a.title || "").toLowerCase().includes(q) ||
      ((a.body || a.content) || "").toLowerCase().includes(q)
    )
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  // ── Form field helper ──────────────────────────────────────────
  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(e => ({ ...e, [k]: null })); };

  const openNotify = (announcement) => {
    setNotifyTarget(announcement);
    setNotifyGroup("all");
    setNotifyDept("");
    setNotifyResult(null);
    setShowNotify(true);
  };

  const sendEmailNotification = async () => {
    const apiKey = import.meta.env.VITE_RESEND_API_KEY;
    if (!apiKey) { toast("Resend API key not found. Add VITE_RESEND_API_KEY to your .env file.", "error"); return; }

    setNotifySending(true); setNotifyResult(null);

    let query = supabase.from("profiles").select("email, full_name").eq("is_active", true);
    if (notifyGroup === "department" && notifyDept) query = query.eq("department", notifyDept);

    const { data: recipients } = await query;
    if (!recipients || recipients.length === 0) {
      setNotifySending(false);
      setNotifyResult({ sent: 0, failed: 0, error: "No recipients found for the selected group." });
      return;
    }

    const announcement = notifyTarget;
    const subject = `New Announcement: ${announcement.title}`;
    const bodyHtml = escapeHtml(announcement.body || announcement.content || "").split("\n").join("<br>");
    const buildHtml = (recipientName) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
              <tr><td style="background:linear-gradient(135deg,#1A2E1A,#2D6A2D);padding:32px 40px;text-align:center;">
                <div style="color:#fff;font-size:13px;letter-spacing:3px;text-transform:uppercase;opacity:0.8;margin-bottom:8px;">BLOOM GAD — CvSU GADRC</div>
                <div style="color:#fff;font-size:24px;font-weight:800;">New Announcement for ${escapeHtml(recipientName || "Student")}</div>
              </td></tr>
              <tr><td style="padding:40px;">
                <h2 style="color:#1A2E1A;font-size:20px;margin:0 0 16px 0;">${escapeHtml(announcement.title)}</h2>
                ${announcement.is_pinned ? '<div style="display:inline-block;background:#dcfce7;color:#16a34a;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:16px;">Pinned Announcement</div>' : ''}
                <div style="color:#444;font-size:15px;line-height:1.8;border-left:4px solid #2D6A2D;padding-left:16px;margin-bottom:24px;">
                  ${bodyHtml}
                </div>
                <div style="color:#888;font-size:12px;">Published: ${new Date(announcement.published_at || announcement.created_at).toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" })}</div>
              </td></tr>
              <tr><td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
                <div style="color:#888;font-size:12px;">This email was sent by BLOOM GAD e-Learning Platform</div>
                <div style="color:#888;font-size:12px;margin-top:4px;">Cavite State University — Gender and Development Resource Center</div>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>`;

    let sent = 0, failed = 0;
    for (const recipient of recipients) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({
            from: "BLOOM GAD <onboarding@resend.dev>",
            to: [recipient.email],
            subject,
            html: buildHtml(recipient.full_name),
          }),
        });
        if (res.ok) sent++; else failed++;
      } catch { failed++; }
    }
    setNotifySending(false);
    setNotifyResult({ sent, failed });
  };

  // ══════════════════════════════════════════════════════════════
  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}><i className="bi bi-megaphone me-2"/>Announcements</div>
          <div style={s.subtitle}>{announcements.length} total · {announcements.filter(a => a.published_at).length} published</div>
        </div>
        <button style={s.addBtn} onClick={openAdd}><i className="bi bi-plus-lg me-1"/>New Announcement</button>
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <input
          style={{...s.searchBar, color:"#1A2E1A"}}
          placeholder="Search announcements…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "#aaa" }}>
          <div style={{ fontSize: 44, marginBottom: 12, color: G.pale }}><i className="bi bi-megaphone"/></div>
          <div style={{ fontWeight: 700, color: G.dark, marginBottom: 6 }}>
            {search ? "No announcements match your search" : "No announcements yet"}
          </div>
          <div style={{ fontSize: 13 }}>
            {!search && <button style={{ ...s.addBtn, display: "inline-flex", marginTop: 12 }} onClick={openAdd}><i className="bi bi-plus-lg me-1"/>Create First Announcement</button>}
          </div>
        </div>
      ) : (
        <div style={s.grid}>
          {filtered.map(a => {
            const body      = a.body || a.content || "";
            const published = !!a.published_at;
            const expired   = a.expires_at && toDateInput(a.expires_at) < todayPH();
            return (
              <div key={a.id} style={{ ...s.card, borderLeft: a.is_pinned ? `4px solid ${G.light}` : `4px solid transparent` }}>
                <div style={s.cardLeft}>
                  <div style={s.cardTitle}>
                    {a.is_pinned && <span style={{ ...s.pinBadge, marginRight: 8 }}><i className="bi bi-pin-angle-fill"/>Pinned</span>}
                    {a.title}
                  </div>
                  <div style={s.cardBody}>{body.length > 160 ? body.slice(0, 160) + "…" : body}</div>
                  <div style={s.cardMeta}>
                    <span style={s.tag(published ? "green" : "yellow")}>
                      {published ? <><i className="bi bi-check-circle me-1"/>Published</> : <><i className="bi bi-pencil-square me-1"/>Draft</>}
                    </span>
                    <span style={s.tag(priorityColor(a.priority))}>
                      {(a.priority || "normal").toUpperCase()}
                    </span>
                    {a.type && <span style={s.tag("blue")}>{a.type}</span>}
                    <span style={s.tag()}>{a.target_audience || "all"}</span>
                    {a.expires_at && (
                      <span style={{ fontSize: 11, color: expired ? "#dc2626" : "#aaa" }}>
                        {expired ? "Expired" : "Expires"} {formatDate(a.expires_at)}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "#ccc" }}>{formatDate(a.created_at)}</span>
                  </div>
                </div>
                <div style={s.cardActions}>
                  <button
                    style={{ ...s.iconBtn(published ? "#f59e0b" : G.base), fontSize: 13, fontWeight: 700, background: published ? "#fef9c3" : G.wash, padding: "5px 10px", borderRadius: 6 }}
                    onClick={() => togglePublish(a)}
                    title={published ? "Unpublish" : "Publish"}
                  >
                    {published ? "Unpublish" : "Publish"}
                  </button>
                  <button style={s.iconBtn(a.is_pinned ? G.base : "#aaa")} onClick={() => togglePin(a)} title={a.is_pinned ? "Unpin" : "Pin"}><i className={`bi ${a.is_pinned ? "bi-pin-angle-fill" : "bi-pin-angle"}`}/></button>
                  <button style={{...s.iconBtn("#1d4ed8"),fontSize:12,padding:"5px 10px",borderRadius:6,background:"#eff6ff",border:"1px solid #bfdbfe",color:"#1d4ed8",cursor:"pointer",fontWeight:600}} onClick={() => openNotify(a)} title="Send Email Notification"><i className="bi bi-envelope me-1"/>Notify</button>
                  <button style={s.iconBtn(G.base)} onClick={() => openEdit(a)} title="Edit"><i className="bi bi-pencil"/></button>
                  <button style={s.iconBtn("#dc2626")} onClick={() => deleteAnn(a)} title="Delete"><i className="bi bi-trash"/></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Email Notification Modal ── */}
      {showNotify && notifyTarget && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth: 520 }}>
            <div style={{padding:"18px 24px",background:`linear-gradient(135deg,${G.dark},${G.base})`,borderRadius:"10px 10px 0 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(255,255,255,0.25)"}}>
                  <i className="bi bi-envelope" style={{color:"#fff",fontSize:18}}/>
                </div>
                <div>
                  <div style={{fontWeight:800,color:"#fff",fontSize:15}}>Send Email Notification</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.65)"}}>Powered by Resend — BLOOM GAD</div>
                </div>
              </div>
              <button style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:6,color:"#fff",cursor:"pointer",fontSize:16,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>{setShowNotify(false);setNotifyResult(null);}}>×</button>
            </div>
            <div style={{...s.mBody,background:G.wash}}>
              <div style={{background:"#fff",border:`1px solid ${G.pale}`,borderRadius:8,padding:"12px 16px",marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:4}}>ANNOUNCEMENT</div>
                <div style={{fontWeight:700,color:G.dark,fontSize:14}}>{notifyTarget.title}</div>
                <div style={{fontSize:12,color:"#666",marginTop:4,lineHeight:1.5,maxHeight:60,overflow:"hidden"}}>
                  {(notifyTarget.body || notifyTarget.content || "").substring(0,150)}{(notifyTarget.body || notifyTarget.content || "").length > 150 ? "…" : ""}
                </div>
              </div>

              <div style={s.fg}>
                <label style={s.label}>Send To</label>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {[
                    ["all", "All Active Students", "bi-people"],
                    ["department", "By Department", "bi-building"],
                  ].map(([val, label, icon]) => (
                    <label key={val} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:notifyGroup===val?"#fff":"#f9fafb",border:`1.5px solid ${notifyGroup===val?G.base:G.pale}`,borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:notifyGroup===val?700:400,color:G.dark}}>
                      <input type="radio" name="notifyGroup" value={val} checked={notifyGroup===val} onChange={()=>setNotifyGroup(val)} style={{accentColor:G.base}}/>
                      <i className={`bi ${icon}`} style={{color:G.base}}/>{label}
                    </label>
                  ))}
                </div>
              </div>

              {notifyGroup === "department" && (
                <div style={s.fg}>
                  <label style={s.label}>Select Department</label>
                  <select style={s.select} value={notifyDept} onChange={e=>setNotifyDept(e.target.value)}>
                    <option value="">— Select department —</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}

              {notifyResult && (
                <div style={{background: notifyResult.error ? "#fee2e2" : "#f0fdf4", border:`1px solid ${notifyResult.error?"#fca5a5":"#86efac"}`, borderRadius:8, padding:"12px 16px", fontSize:13}}>
                  {notifyResult.error
                    ? <><i className="bi bi-exclamation-circle me-2" style={{color:"#dc2626"}}/>Error: {notifyResult.error}</>
                    : <>
                        <i className="bi bi-check-circle me-2" style={{color: notifyResult.sent > 0 ? "#16a34a" : "#dc2626"}}/>
                        <strong style={{color: notifyResult.sent > 0 ? "#16a34a" : "#dc2626"}}>
                          {notifyResult.sent > 0 ? "Emails sent!" : "No emails could be sent."}
                        </strong>
                        <div style={{marginTop:6,color:"#444",fontSize:12}}>
                          <i className="bi bi-check-circle-fill me-1" style={{color:"#16a34a"}}/>Sent: {notifyResult.sent} &nbsp;|&nbsp; <i className="bi bi-x-circle-fill me-1" style={{color:"#dc2626"}}/>Failed: {notifyResult.failed}
                        </div>
                      </>
                  }
                </div>
              )}
            </div>
            <div style={{...s.mFooter,background:G.wash}}>
              <button style={s.btnSecondary} onClick={()=>{setShowNotify(false);setNotifyResult(null);}}>Close</button>
              {!notifyResult && (
                <button
                  style={{...s.btnPrimary, background:`linear-gradient(135deg,#1d4ed8,#2563eb)`, opacity:notifySending?0.7:1}}
                  onClick={sendEmailNotification}
                  disabled={notifySending || (notifyGroup==="department" && !notifyDept)}>
                  {notifySending
                    ? <><span style={{width:14,height:14,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite",marginRight:8}}/> Sending…</>
                    : <><i className="bi bi-send me-2"/>Send Email Notification</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.mHeader}>
              <span style={s.mTitle}>{modal === "add" ? "New Announcement" : "Edit Announcement"}</span>
              <button style={s.iconBtn()} onClick={closeModal} title="Close"><i className="bi bi-x-lg"/></button>
            </div>
            <div style={s.mBody}>
              {error && <div style={s.error}>{error}</div>}
              {Object.values(err).some(Boolean) && !error && (
                <div style={s.error}>Please fix the highlighted fields below.</div>
              )}

              <div style={s.fg}>
                <label style={s.label}>Title *</label>
                <input style={{...s.input, borderColor: err.title ? "#dc2626" : undefined}} value={form.title || ""} onChange={e => setF("title", e.target.value)} placeholder="Announcement title" autoFocus />
                <FieldError msg={err.title}/>
              </div>

              <div style={s.fg}>
                <label style={s.label}>Content * <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none" }}>({(form.content || "").length}/2000)</span></label>
                <textarea style={{...s.textarea, borderColor: err.content ? "#dc2626" : undefined}} value={form.content || ""} onChange={e => setF("content", e.target.value)} placeholder="Write your announcement here…" />
                <FieldError msg={err.content}/>
              </div>

              <div style={{ ...s.row, flexWrap: "wrap" }}>
                <div style={{ ...s.fg, flex: 1, minWidth: 140 }}>
                  <label style={s.label}>Priority</label>
                  <select style={s.select} value={form.priority || "normal"} onChange={e => setF("priority", e.target.value)}>
                    {PRIORITY_OPTS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div style={{ ...s.fg, flex: 1, minWidth: 140 }}>
                  <label style={s.label}>Type</label>
                  <select style={s.select} value={form.type || "general"} onChange={e => setF("type", e.target.value)}>
                    {TYPE_OPTS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div style={{ ...s.fg, flex: 1, minWidth: 140 }}>
                  <label style={s.label}>Target Audience</label>
                  <select style={s.select} value={form.target_audience || "all"} onChange={e => setF("target_audience", e.target.value)}>
                    {AUDIENCE_OPTS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div style={s.fg}>
                <label style={s.label}>Expiry Date (optional)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input style={{...s.input, borderColor: err.expires_at ? "#dc2626" : undefined}} type="date" value={form.expires_at || ""} onChange={e => setF("expires_at", e.target.value)} />
                  {form.expires_at && (
                    <button type="button" style={{ ...s.btnSecondary, padding: "9px 12px", whiteSpace: "nowrap" }} onClick={() => setF("expires_at", "")}>Clear</button>
                  )}
                </div>
                <FieldError msg={err.expires_at}/>
              </div>

              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: G.dark, fontWeight: 600 }}>
                  <input type="checkbox" checked={!!form.is_published} onChange={e => setF("is_published", e.target.checked)} style={{ width: 16, height: 16, accentColor: G.base }} />
                  {modal !== "add" && modal.published_at ? "Published" : "Publish immediately"}
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: G.dark, fontWeight: 600 }}>
                  <input type="checkbox" checked={!!form.is_pinned} onChange={e => setF("is_pinned", e.target.checked)} style={{ width: 16, height: 16, accentColor: G.base }} />
                  Pin to top
                </label>
              </div>
            </div>

            <div style={s.mFooter}>
              <button style={s.btnSecondary} onClick={closeModal}>Cancel</button>
              <button style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>
                {saving ? "Saving…" : modal === "add" ? "Create Announcement" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirm && <ConfirmModal title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}/>}
    </div>
  );
}