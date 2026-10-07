import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase.js";

const G = {
  dark:  "#1A2E1A", mid:   "#2D6A2D", base:  "#3A7A3A",
  light: "#4CAF50", pale:  "#C8E6C9", wash:  "#E8F5E9",
  cream: "#F5F7F5", white: "#FFFFFF",
};

// ── UI Atoms ──────────────────────────────────────────────────────

function Btn({ children, onClick, variant = "primary", small, disabled, style = {} }) {
  const base = {
    border: "none", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'Inter', sans-serif", fontWeight: 600,
    padding: small ? "6px 14px" : "10px 22px",
    fontSize: small ? 12 : 13,
    opacity: disabled ? 0.5 : 1,
    transition: "all .15s",
    ...style,
  };
  const variants = {
    primary:   { background: G.dark,        color: "#fff" },
    secondary: { background: G.wash,        color: G.dark },
    danger:    { background: "#fef2f2",     color: "#c0392b" },
    ghost:     { background: "transparent", color: G.base, border: "1px solid #DDE8DD" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>;
}

function Input({ label, value, onChange, type = "text", placeholder, disabled, hint, maxLength }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid, letterSpacing: ".04em" }}>{label}</label>}
      <input
        type={type} value={value ?? ""} onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder} disabled={disabled} maxLength={maxLength}
        style={{
          border: "1px solid #DDE8DD", borderRadius: 6, padding: "9px 12px",
          fontSize: 13, fontFamily: "'Inter', sans-serif",
          background: disabled ? G.cream : G.white,
          color: disabled ? G.light : G.dark, outline: "none",
          transition: "border .15s",
        }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = G.base; }}
        onBlur={e  => { e.target.style.borderColor = "#DDE8DD"; }}
      />
      {hint && <div style={{ fontSize: 11, color: G.light }}>{hint}</div>}
    </div>
  );
}

// Password field with a show/hide (eye) button
function PasswordInput({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid, letterSpacing: ".04em" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"} value={value ?? ""} onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder} autoComplete="new-password"
          style={{
            width: "100%", boxSizing: "border-box",
            border: "1px solid #DDE8DD", borderRadius: 6, padding: "9px 40px 9px 12px",
            fontSize: 13, fontFamily: "'Inter', sans-serif",
            background: G.white, color: G.dark, outline: "none", transition: "border .15s",
          }}
          onFocus={e => { e.target.style.borderColor = G.base; }}
          onBlur={e  => { e.target.style.borderColor = "#DDE8DD"; }}
        />
        <button type="button" onClick={() => setShow(v => !v)}
          title={show ? "Hide password" : "Show password"}
          aria-label={show ? "Hide password" : "Show password"}
          style={{
            position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "#888",
            padding: "4px 6px", fontSize: 15, lineHeight: 1,
          }}>
          <i className={`bi ${show ? "bi-eye-slash" : "bi-eye"}`}/>
        </button>
      </div>
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#FFFFFF", border: "1px solid #DDE8DD",
      borderRadius: 10, padding: "24px 28px", ...style,
    }}>{children}</div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: G.dark, margin: 0 }}>
        {children}
      </h2>
      {sub && <p style={{ fontSize: 12, color: G.light, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

function Alert({ message, type = "error" }) {
  if (!message) return null;
  const styles = {
    error:   { bg: "#fef2f2", border: "#fecaca", color: "#c0392b", icon: "bi-exclamation-circle" },
    success: { bg: G.wash,    border: G.pale,    color: G.dark,    icon: "bi-check-circle" },
    info:    { bg: "#e8f0fe", border: "#bfdbfe", color: "#1a56a8", icon: "bi-info-circle" },
  };
  const s = styles[type];
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: 6,
      padding: "10px 14px", fontSize: 12.5, color: s.color, marginTop: 14,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <i className={`bi ${s.icon}`}/> {message}
    </div>
  );
}

function fmtShort(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric",
  });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// ── Avatar component ──────────────────────────────────────────────
function AvatarCircle({ name, photoUrl, size = 80 }) {
  const initials = (name ?? "A").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  if (photoUrl) {
    return (
      <img src={photoUrl} alt="avatar"
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover",
          border: `3px solid ${G.pale}` }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${G.base}, ${G.dark})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color: "#fff",
      border: `3px solid ${G.pale}`, flexShrink: 0,
    }}>{initials}</div>
  );
}

// ── Activity helpers (real entries from activity_logs) ────────────
function activityIcon(action = "") {
  const a = action.toLowerCase();
  if (a.includes("login") || a.includes("sign"))        return "bi-key";
  if (a.includes("module"))                              return "bi-book";
  if (a.includes("assessment") || a.includes("question")) return "bi-clipboard-check";
  if (a.includes("seminar") || a.includes("meeting") || a.includes("attendance")) return "bi-people";
  if (a.includes("certificate") || a.includes("template")) return "bi-patch-check";
  if (a.includes("badge"))                               return "bi-award";
  if (a.includes("event") || a.includes("calendar"))     return "bi-calendar3";
  if (a.includes("announcement"))                        return "bi-megaphone";
  if (a.includes("admin"))                               return "bi-shield-lock";
  if (a.includes("user") || a.includes("masterlist") || a.includes("student") || a.includes("role")) return "bi-person";
  if (a.includes("password"))                            return "bi-lock";
  if (a.includes("profile"))                             return "bi-person-circle";
  if (a.includes("delete") || a.includes("remove"))      return "bi-trash";
  return "bi-pin-angle";
}

function activityLabel(action = "") {
  if (!action) return "Action performed";
  const text = action.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Pick a short, human-readable detail from the log's metadata
function activityDetails(meta) {
  if (!meta || typeof meta !== "object") return "";
  const keys = ["title", "name", "seminar", "module", "email", "file"];
  for (const k of keys) {
    if (meta[k] && typeof meta[k] === "string") return meta[k];
  }
  if (typeof meta.count === "number") return `${meta.count} item(s)`;
  if (typeof meta.added === "number") return `${meta.added} added`;
  return "";
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
export default function AdminProfilePage({ user, onClose }) {
  const [tab,          setTab]          = useState("profile");
  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [profileForm,  setProfileForm]  = useState({});
  const [profileMsg,   setProfileMsg]   = useState(null);
  const [photoMsg,     setPhotoMsg]     = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [pwForm,       setPwForm]       = useState({ current: "", newPw: "", confirm: "" });
  const [pwMsg,        setPwMsg]        = useState(null);
  const [pwSaving,     setPwSaving]     = useState(false);
  const [currentEmail, setCurrentEmail] = useState(user?.email || "");
  const [pendingEmail, setPendingEmail] = useState("");
  const [emForm,       setEmForm]       = useState({ newEmail: "", password: "" });
  const [emMsg,        setEmMsg]        = useState(null);
  const [emSaving,     setEmSaving]     = useState(false);
  const [activity,     setActivity]     = useState([]);
  const [activityErr,  setActivityErr]  = useState("");
  const [stats,        setStats]        = useState({});
  const fileRef = useRef();

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.allSettled([fetchProfile(), fetchStats(), fetchActivity()]);
    setLoading(false);
  };

  // ── Fetch profile ─────────────────────────────────────────────
  const fetchProfile = async () => {
    // Fresh login info: shows the current email and any change waiting for confirmation
    const { data: { user: fresh } } = await supabase.auth.getUser();
    if (fresh) {
      setCurrentEmail(fresh.email || "");
      setPendingEmail(fresh.new_email || "");
    }
    const { data, error } = await supabase
      .from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (error || !data) { setProfile({}); setProfileForm({}); return; }
    // A confirmed email change updates the login email — copy it to the profile too
    if (fresh?.email && data.email !== fresh.email) {
      await supabase.from("profiles").update({ email: fresh.email }).eq("id", user.id);
      data.email = fresh.email;
    }
    setProfile(data);
    setProfileForm({
      full_name:      data.full_name      ?? "",
      contact_number: data.contact_number ?? "",
      department:     data.department     ?? "",
      position:       data.position       ?? "",
      bio:            data.bio            ?? "",
    });
  };

  // ── System totals shown in the header ─────────────────────────
  const fetchStats = async () => {
    const [m, s, c, a] = await Promise.all([
      supabase.from("modules").select("*",       { count: "exact", head: true }),
      supabase.from("seminars").select("*",      { count: "exact", head: true }),
      supabase.from("certificates").select("*",  { count: "exact", head: true }).eq("is_revoked", false),
      supabase.from("announcements").select("*", { count: "exact", head: true }),
    ]);
    setStats({ modules: m.count ?? 0, seminars: s.count ?? 0, certs: c.count ?? 0, announcements: a.count ?? 0 });
  };

  // ── Real recent activity of THIS admin (activity_logs) ────────
  const fetchActivity = async () => {
    setActivityErr("");
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) { setActivity([]); setActivityErr("Could not load your activity."); return; }
    setActivity(data ?? []);
  };

  // ── Save profile ──────────────────────────────────────────────
  const saveProfile = async () => {
    setProfileMsg(null);
    const name = profileForm.full_name?.trim() ?? "";
    if (name.length < 2) { setProfileMsg({ type: "error", text: "Full name is required." }); return; }
    const phone = profileForm.contact_number?.trim() ?? "";
    if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) {
      setProfileMsg({ type: "error", text: "Please enter a valid phone number." }); return;
    }

    setSaving(true);
    const { data, error } = await supabase.from("profiles").update({
      full_name:      name,
      contact_number: phone || null,
      department:     profileForm.department?.trim() || null,
      position:       profileForm.position?.trim()   || null,
      bio:            profileForm.bio?.trim()        || null,
      updated_at:     new Date().toISOString(),
    }).eq("id", user.id).select("id");
    setSaving(false);

    if (error) {
      const missing = /column .* does not exist|Could not find the '(\w+)' column/i.test(error.message);
      setProfileMsg({ type: "error", text: missing
        ? "Your database is missing a profile column (phone, position, or bio). Run the profile SQL update, then try again."
        : "Could not save your profile: " + error.message });
      return;
    }
    if (!data || data.length === 0) {
      setProfileMsg({ type: "error", text: "Your profile could not be saved (no permission to update it)." });
      return;
    }
    setProfileMsg({ type: "success", text: "Profile updated successfully." });
    fetchProfile();
  };

  // ── Change password (current password required) ───────────────
  // ── Change email (current password required, confirmed by email) ──
  const changeEmail = async () => {
    setEmMsg(null);
    const next = emForm.newEmail.trim().toLowerCase();
    if (!next) { setEmMsg({ type: "error", text: "Please enter your new email address." }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) { setEmMsg({ type: "error", text: "Please enter a valid email address." }); return; }
    if (next === (currentEmail || "").toLowerCase()) { setEmMsg({ type: "error", text: "That is already your email address." }); return; }
    if (!emForm.password) { setEmMsg({ type: "error", text: "Please enter your current password." }); return; }

    setEmSaving(true);
    const { error: checkErr } = await supabase.auth.signInWithPassword({ email: currentEmail, password: emForm.password });
    if (checkErr) {
      setEmSaving(false);
      setEmMsg({ type: "error", text: "Your current password is incorrect." });
      return;
    }
    const { error } = await supabase.auth.updateUser(
      { email: next },
      { emailRedirectTo: window.location.origin }
    );
    setEmSaving(false);
    if (error) {
      setEmMsg({ type: "error", text: /already|registered|exists/i.test(error.message)
        ? "That email is already used by another account."
        : /rate|too many|seconds/i.test(error.message)
          ? "Too many requests. Please wait a minute and try again."
          : "Could not change your email: " + error.message });
      return;
    }
    setPendingEmail(next);
    setEmForm({ newEmail: "", password: "" });
    setEmMsg({ type: "success", text: `Almost done! We sent a confirmation link to ${next}. Your email changes after you open it. (If asked, also confirm from your current inbox.)` });
    supabase.from("activity_logs").insert({
      user_id: user.id, action_type: "email_change_requested", metadata: { new_email: next }, created_at: new Date().toISOString(),
    }).then(() => fetchActivity(), () => {});
  };

  const changePassword = async () => {
    setPwMsg(null);
    if (!pwForm.current) { setPwMsg({ type: "error", text: "Please enter your current password." }); return; }
    if (!pwForm.newPw)   { setPwMsg({ type: "error", text: "New password is required." }); return; }
    if (pwForm.newPw.length < 8) { setPwMsg({ type: "error", text: "New password must be at least 8 characters." }); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg({ type: "error", text: "New passwords do not match." }); return; }
    if (pwForm.newPw === pwForm.current) { setPwMsg({ type: "error", text: "New password must be different from your current password." }); return; }

    setPwSaving(true);
    // 1. Confirm the current password is correct
    const { error: checkErr } = await supabase.auth.signInWithPassword({ email: user.email, password: pwForm.current });
    if (checkErr) {
      setPwSaving(false);
      setPwMsg({ type: "error", text: "Your current password is incorrect." });
      return;
    }
    // 2. Set the new password
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
    setPwSaving(false);
    if (error) { setPwMsg({ type: "error", text: error.message }); return; }
    setPwMsg({ type: "success", text: "Password changed successfully." });
    setPwForm({ current: "", newPw: "", confirm: "" });
    supabase.from("activity_logs").insert({
      user_id: user.id, action_type: "password_changed", created_at: new Date().toISOString(),
    }).then(() => fetchActivity(), () => {});
  };

  // ── Avatar upload ─────────────────────────────────────────────
  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) { setPhotoMsg({ type: "error", text: "Please choose a PNG, JPG, WEBP, or GIF image." }); return; }
    if (file.size > 2 * 1024 * 1024) { setPhotoMsg({ type: "error", text: "Image must be under 2 MB." }); return; }

    setUploading(true);
    setPhotoMsg({ type: "info", text: "Uploading photo…" });
    try {
      const ext  = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `avatars/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(/bucket/i.test(upErr.message)
        ? 'The "avatars" storage bucket does not exist yet.'
        : upErr.message);

      // Add a version so the browser shows the NEW photo instead of a cached one
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const versionedUrl = `${publicUrl}?v=${Date.now()}`;

      const { data, error: saveErr } = await supabase.from("profiles")
        .update({ avatar_url: versionedUrl }).eq("id", user.id).select("id");
      if (saveErr) throw new Error(saveErr.message);
      if (!data || data.length === 0) throw new Error("no permission to update your profile.");

      setProfile(p => ({ ...p, avatar_url: versionedUrl }));
      setPhotoMsg({ type: "success", text: "Photo updated successfully." });
    } catch (err) {
      setPhotoMsg({ type: "error", text: "Upload failed: " + err.message });
    }
    setUploading(false);
  };

  const TABS = [
    { id: "profile",  label: "Profile" },
    { id: "security", label: "Security" },
    { id: "activity", label: "Recent Activity" },
  ];

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000, padding: 20,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#F5F7F5", borderRadius: 20, width: "100%", maxWidth: 760,
        maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 80px rgba(0,0,0,.25)",
      }}>

        {/* ── Header ── */}
        <div style={{
          background: `linear-gradient(135deg, ${G.dark}, ${G.mid})`,
          padding: "28px 32px 24px", position: "relative",
        }}>
          <button onClick={onClose} style={{
            position: "absolute", top: 16, right: 16,
            background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%",
            width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>

          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ position: "relative" }}>
              <AvatarCircle name={profile?.full_name || user?.email} photoUrl={profile?.avatar_url} size={72} />
              <button
                onClick={() => !uploading && fileRef.current?.click()}
                title="Change photo"
                style={{
                  position: "absolute", bottom: 0, right: 0,
                  background: G.base, border: "2px solid #fff", borderRadius: "50%",
                  width: 26, height: 26, cursor: uploading ? "wait" : "pointer", fontSize: 12, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              ><i className={`bi ${uploading ? "bi-hourglass-split" : "bi-camera"}`}/></button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={uploadAvatar} style={{ display: "none" }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22,
                fontWeight: 700, color: "#fff" }}>
                {loading ? "Loading…" : (profile?.full_name || "GADRC Admin")}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", marginTop: 2 }}>
                {user?.email}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                {[
                  { label: "Modules",       value: stats.modules       ?? 0 },
                  { label: "Seminars",      value: stats.seminars      ?? 0 },
                  { label: "Certificates",  value: stats.certs         ?? 0 },
                  { label: "Announcements", value: stats.announcements ?? 0 },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: G.pale }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.45)",
                      textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
                  </div>
                ))}
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", paddingBottom: 2 }}>· system totals</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 22, flexWrap: "wrap" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? "rgba(255,255,255,.2)" : "transparent",
                border: tab === t.id ? "1px solid rgba(255,255,255,.3)" : "1px solid transparent",
                borderRadius: 6, padding: "6px 14px", cursor: "pointer",
                color: tab === t.id ? "#fff" : "rgba(255,255,255,.55)",
                fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                transition: "all .15s",
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

          {photoMsg && <div style={{ marginTop: -14, marginBottom: 14 }}><Alert message={photoMsg.text} type={photoMsg.type} /></div>}

          {/* ── Profile Tab ── */}
          {tab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card>
                <SectionTitle sub="This information is visible to system administrators.">
                  Personal Information
                </SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Input label="Full Name *" value={profileForm.full_name} maxLength={100}
                    onChange={v => setProfileForm(f => ({ ...f, full_name: v }))} />
                  <Input label="Email Address" value={currentEmail} disabled
                    hint={pendingEmail ? `Waiting for confirmation: ${pendingEmail}` : "To change your email, go to the Security tab."} />
                  <Input label="Phone Number" value={profileForm.contact_number} maxLength={20}
                    onChange={v => setProfileForm(f => ({ ...f, contact_number: v }))}
                    placeholder="+63 9XX XXX XXXX" />
                  <Input label="Department" value={profileForm.department} maxLength={120}
                    onChange={v => setProfileForm(f => ({ ...f, department: v }))}
                    placeholder="e.g. GADRC" />
                  <Input label="Position" value={profileForm.position} maxLength={100}
                    onChange={v => setProfileForm(f => ({ ...f, position: v }))}
                    placeholder="e.g. GAD Focal Person" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>Bio</label>
                  <textarea value={profileForm.bio ?? ""} maxLength={500}
                    onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Write a short bio about yourself…" rows={3}
                    style={{ border: "1px solid #DDE8DD", borderRadius: 6, padding: "9px 12px",
                      fontSize: 13, fontFamily: "'Inter', sans-serif", background: "#FFFFFF",
                      color: G.dark, outline: "none", resize: "vertical" }}
                    onFocus={e => e.target.style.borderColor = G.base}
                    onBlur={e  => e.target.style.borderColor = "#DDE8DD"}
                  />
                  <div style={{ fontSize: 11, color: "#aaa", textAlign: "right" }}>{(profileForm.bio ?? "").length}/500</div>
                </div>
                {profileMsg && <Alert message={profileMsg.text} type={profileMsg.type} />}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <Btn onClick={saveProfile} disabled={saving || loading}>
                    {saving ? "Saving…" : "Save Changes"}
                  </Btn>
                </div>
              </Card>

              <Card>
                <SectionTitle sub="Your account information.">Account Details</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Role",            value: "Administrator" },
                    { label: "Account Created", value: fmtShort(user?.created_at) },
                    { label: "Last Sign In",    value: fmtDateTime(user?.last_sign_in_at) },
                    { label: "Email Verified",  value: user?.email_confirmed_at ? "Verified" : "Not verified" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      background: "#F5F7F5", borderRadius: 10, padding: "10px 14px",
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: G.light,
                        textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 13, color: G.dark, fontWeight: 500 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── Security Tab ── */}
          {tab === "security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card>
                <SectionTitle sub="You'll sign in with your new email after you confirm it.">
                  Change Email
                </SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Input label="Current Email" value={currentEmail} disabled />
                  {pendingEmail && (
                    <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 6, padding: "10px 14px", fontSize: 12.5, color: "#9a3412" }}>
                      <i className="bi bi-hourglass-split me-1"/>
                      Waiting for you to confirm <strong>{pendingEmail}</strong>. Open the link in that inbox to finish.
                    </div>
                  )}
                  <Input label="New Email" type="email" value={emForm.newEmail} maxLength={254}
                    onChange={v => setEmForm(f => ({ ...f, newEmail: v }))}
                    placeholder="new.email@cvsu.edu.ph" />
                  <PasswordInput label="Current Password" value={emForm.password}
                    onChange={v => setEmForm(f => ({ ...f, password: v }))}
                    placeholder="Enter your current password to confirm" />
                  {emMsg && <Alert message={emMsg.text} type={emMsg.type} />}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Btn onClick={changeEmail} disabled={emSaving}>
                      {emSaving ? "Sending…" : "Change Email"}
                    </Btn>
                  </div>
                </div>
              </Card>

              <Card>
                <SectionTitle sub="Enter your current password, then choose a new one with at least 8 characters.">
                  Change Password
                </SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <PasswordInput label="Current Password" value={pwForm.current}
                    onChange={v => setPwForm(f => ({ ...f, current: v }))}
                    placeholder="Enter your current password" />
                  <PasswordInput label="New Password" value={pwForm.newPw}
                    onChange={v => setPwForm(f => ({ ...f, newPw: v }))}
                    placeholder="Enter new password" />
                  <PasswordInput label="Confirm New Password" value={pwForm.confirm}
                    onChange={v => setPwForm(f => ({ ...f, confirm: v }))}
                    placeholder="Re-enter new password" />

                  {/* Password strength */}
                  {pwForm.newPw && (() => {
                    const pw = pwForm.newPw;
                    const score = (pw.length >= 8 ? 1 : 0) + (/[A-Z]/.test(pw) ? 1 : 0) + (/\d/.test(pw) ? 1 : 0) + (/[^a-zA-Z0-9]/.test(pw) ? 1 : 0);
                    const colors = ["#e74c3c", "#e67e22", "#f1c40f", G.base];
                    const labels = ["Weak", "Fair", "Good", "Strong"];
                    return (
                      <div>
                        <div style={{ fontSize: 11, color: G.light, marginBottom: 4 }}>
                          Password strength: <strong style={{ color: score ? colors[score - 1] : "#e74c3c" }}>{score ? labels[score - 1] : "Weak"}</strong>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2,
                              background: i < score ? colors[Math.max(score - 1, 0)] : G.wash }} />
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {pwMsg && <Alert message={pwMsg.text} type={pwMsg.type} />}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Btn onClick={changePassword} disabled={pwSaving}>
                      {pwSaving ? "Changing…" : "Change Password"}
                    </Btn>
                  </div>
                </div>
              </Card>

            </div>
          )}

          {/* ── Activity Tab ── */}
          {tab === "activity" && (
            <Card>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <SectionTitle sub="Your 20 most recent actions in the admin panel.">
                  Recent Activity
                </SectionTitle>
                <Btn small variant="ghost" onClick={fetchActivity}><i className="bi bi-arrow-clockwise me-1"/>Refresh</Btn>
              </div>
              {activityErr ? (
                <Alert message={activityErr} type="error" />
              ) : activity.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}><i className="bi bi-clock-history"/></div>
                  No activity recorded yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {activity.map((a, i) => {
                    const action  = a.action_type ?? a.activity_type ?? "";
                    const details = activityDetails(a.metadata);
                    return (
                      <div key={a.id ?? i} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 12px", borderRadius: 10,
                        background: i % 2 === 0 ? G.cream : "transparent",
                      }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: G.wash, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <i className={`bi ${activityIcon(action)}`} style={{ fontSize: 13, color: G.mid }}/>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: G.dark, fontWeight: 500 }}>{activityLabel(action)}</div>
                          {details && (
                            <div style={{ fontSize: 11, color: "#888", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{details}</div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#aaa", flexShrink: 0 }}>
                          {fmtDateTime(a.created_at)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}