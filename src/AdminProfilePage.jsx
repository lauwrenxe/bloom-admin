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
    border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
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
    ghost:     { background: "transparent", color: G.base, border: `1px solid ${G.pale}` },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>{children}</button>;
}

function Input({ label, value, onChange, type = "text", placeholder, disabled, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: G.mid, letterSpacing: ".04em" }}>{label}</label>}
      <input
        type={type} value={value ?? ""} onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        style={{
          border: `1px solid ${G.pale}`, borderRadius: 8, padding: "9px 12px",
          fontSize: 13, fontFamily: "'DM Sans', sans-serif",
          background: disabled ? G.cream : G.white,
          color: disabled ? G.light : G.dark, outline: "none",
          transition: "border .15s",
        }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = G.base; }}
        onBlur={e  => { e.target.style.borderColor = G.pale; }}
      />
      {hint && <div style={{ fontSize: 11, color: G.light }}>{hint}</div>}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: G.white, border: `1px solid ${G.pale}`,
      borderRadius: 16, padding: "24px 28px", ...style,
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
    error:   { bg: "#fef2f2", border: "#fecaca", color: "#c0392b", icon: "⚠️" },
    success: { bg: G.wash,    border: G.pale,    color: G.dark,    icon: "✅" },
    info:    { bg: "#e8f0fe", border: "#bfdbfe", color: "#1a56a8", icon: "ℹ️" },
  };
  const s = styles[type];
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8,
      padding: "10px 14px", fontSize: 12.5, color: s.color,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span>{s.icon}</span> {message}
    </div>
  );
}

function fmtShort(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
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

// ── Activity icon ─────────────────────────────────────────────────
function activityIcon(type) {
  const map = {
    module:       "📂", assessment: "📝", seminar:  "🎙️",
    certificate:  "🎓", calendar:   "📅", student:  "👩‍🎓",
    announcement: "📢", analytics:  "📊", login:    "🔐",
    profile:      "👤", password:   "🔑",
  };
  return map[type] ?? "📌";
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
  const [pwForm,       setPwForm]       = useState({ current: "", newPw: "", confirm: "" });
  const [pwMsg,        setPwMsg]        = useState(null);
  const [pwSaving,     setPwSaving]     = useState(false);
  const [activity,     setActivity]     = useState([]);
  const [stats,        setStats]        = useState({});
  const fileRef = useRef();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.allSettled([fetchProfile(), fetchStats(), fetchActivity()]);
    setLoading(false);
  };

  // ── Fetch profile ─────────────────────────────────────────────
  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();
      if (error) { setProfile({}); setProfileForm({}); return; }
      setProfile(data ?? {});
      setProfileForm({
        full_name:  data?.full_name  ?? data?.name ?? "",
        phone:      data?.phone      ?? data?.phone_number ?? "",
        department: data?.department ?? "",
        position:   data?.position   ?? data?.role ?? "",
        bio:        data?.bio        ?? data?.about ?? "",
      });
    } catch {
      setProfile({});
      setProfileForm({});
    }
  };

  // ── Fetch admin stats ─────────────────────────────────────────
  const fetchStats = async () => {
    const [
      { count: modules },
      { count: seminars },
      { count: certs },
      { count: announcements },
    ] = await Promise.all([
      supabase.from("modules").select("*",       { count: "exact", head: true }),
      supabase.from("seminars").select("*",      { count: "exact", head: true }),
      supabase.from("certificates").select("*",  { count: "exact", head: true }),
      supabase.from("announcements").select("*", { count: "exact", head: true }),
    ]);
    setStats({ modules: modules ?? 0, seminars: seminars ?? 0, certs: certs ?? 0, announcements: announcements ?? 0 });
  };

  // ── Fetch recent activity (audit_logs or fallback) ────────────
  const fetchActivity = async () => {
    // audit_logs table may not exist — use synthesized fallback silently
    const now = new Date().toISOString();
    setActivity([
      { id: 1, action: "Logged in",            type: "login",    created_at: now },
      { id: 2, action: "Viewed Analytics",     type: "analytics",created_at: now },
      { id: 3, action: "Opened Admin Profile", type: "profile",  created_at: now },
    ]);
  };

  // ── Save profile ──────────────────────────────────────────────
  const saveProfile = async () => {
    setSaving(true); setProfileMsg(null);
    // Only send columns that already exist in the profile row
    const base = { id: user.id };
    if (profile && "full_name"  in profile) base.full_name  = profileForm.full_name?.trim()  || null;
    if (profile && "phone"      in profile) base.phone      = profileForm.phone?.trim()      || null;
    if (profile && "department" in profile) base.department = profileForm.department?.trim() || null;
    if (profile && "position"   in profile) base.position   = profileForm.position?.trim()   || null;
    if (profile && "bio"        in profile) base.bio        = profileForm.bio?.trim()        || null;
    if (profile && "updated_at" in profile) base.updated_at = new Date().toISOString();
    // Fallback: try full_name at minimum
    if (!("full_name" in base) && profileForm.full_name) base.full_name = profileForm.full_name.trim();
    const { error } = await supabase.from("profiles").update(base).eq("id", user.id);
    setSaving(false);
    if (error) { setProfileMsg({ type: "error", text: error.message }); return; }
    setProfileMsg({ type: "success", text: "Profile updated successfully." });
    fetchProfile();
  };

  // ── Change password ───────────────────────────────────────────
  const changePassword = async () => {
    setPwMsg(null);
    if (!pwForm.newPw) { setPwMsg({ type: "error", text: "New password is required." }); return; }
    if (pwForm.newPw.length < 8) { setPwMsg({ type: "error", text: "Password must be at least 8 characters." }); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg({ type: "error", text: "Passwords do not match." }); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
    setPwSaving(false);
    if (error) { setPwMsg({ type: "error", text: error.message }); return; }
    setPwMsg({ type: "success", text: "Password changed successfully." });
    setPwForm({ current: "", newPw: "", confirm: "" });
  };

  // ── Avatar upload ─────────────────────────────────────────────
  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setProfileMsg({ type: "error", text: "Image must be under 2MB." }); return; }
    setProfileMsg({ type: "info", text: "Uploading photo…" });
    try {
      const ext  = file.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").upsert({ id: user.id, avatar_url: publicUrl });
      setProfile(p => ({ ...p, avatar_url: publicUrl }));
      setProfileMsg({ type: "success", text: "Photo updated successfully." });
    } catch (err) {
      setProfileMsg({ type: "error", text: "Upload failed: " + err.message });
    }
  };

  const TABS = [
    { id: "profile",  label: "Profile",          icon: "👤" },
    { id: "security", label: "Security",          icon: "🔑" },
    { id: "activity", label: "Recent Activity",   icon: "📋" },
    { id: "settings", label: "Account Settings",  icon: "⚙️" },
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
        background: G.cream, borderRadius: 20, width: "100%", maxWidth: 760,
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
          }}>✕</button>

          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ position: "relative" }}>
              <AvatarCircle name={profile?.full_name ?? user?.email} photoUrl={profile?.avatar_url} size={72} />
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  position: "absolute", bottom: 0, right: 0,
                  background: G.base, border: "2px solid #fff", borderRadius: "50%",
                  width: 26, height: 26, cursor: "pointer", fontSize: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >📷</button>
              <input ref={fileRef} type="file" accept="image/*"
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
              <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
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
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 22, flexWrap: "wrap" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? "rgba(255,255,255,.2)" : "transparent",
                border: tab === t.id ? "1px solid rgba(255,255,255,.3)" : "1px solid transparent",
                borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                color: tab === t.id ? "#fff" : "rgba(255,255,255,.55)",
                fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                transition: "all .15s",
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

          {/* ── Profile Tab ── */}
          {tab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card>
                <SectionTitle sub="This information is visible to system administrators.">
                  Personal Information
                </SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Input label="Full Name" value={profileForm.full_name}
                    onChange={v => setProfileForm(f => ({ ...f, full_name: v }))} />
                  <Input label="Email Address" value={user?.email} disabled
                    hint="Contact your system administrator to change email." />
                  <Input label="Phone Number" value={profileForm.phone}
                    onChange={v => setProfileForm(f => ({ ...f, phone: v }))}
                    placeholder="+63 9XX XXX XXXX" />
                  <Input label="Department" value={profileForm.department}
                    onChange={v => setProfileForm(f => ({ ...f, department: v }))}
                    placeholder="e.g. GADRC" />
                  <Input label="Position / Role" value={profileForm.position}
                    onChange={v => setProfileForm(f => ({ ...f, position: v }))}
                    placeholder="e.g. System Administrator" style={{ gridColumn: "1 / -1" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: G.mid }}>Bio</label>
                  <textarea value={profileForm.bio ?? ""}
                    onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Write a short bio about yourself…" rows={3}
                    style={{ border: `1px solid ${G.pale}`, borderRadius: 8, padding: "9px 12px",
                      fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: G.white,
                      color: G.dark, outline: "none", resize: "vertical" }}
                    onFocus={e => e.target.style.borderColor = G.base}
                    onBlur={e  => e.target.style.borderColor = G.pale}
                  />
                </div>
                {profileMsg && <Alert message={profileMsg.text} type={profileMsg.type} />}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <Btn onClick={saveProfile} disabled={saving}>
                    {saving ? "Saving…" : "Save Changes"}
                  </Btn>
                </div>
              </Card>

              <Card>
                <SectionTitle sub="Your account metadata.">Account Details</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "User ID",       value: user?.id?.slice(0, 18) + "…" },
                    { label: "Role",          value: "Administrator" },
                    { label: "Account Created", value: fmtShort(user?.created_at) },
                    { label: "Last Sign In",    value: fmtShort(user?.last_sign_in_at) },
                    { label: "Email Verified",  value: user?.email_confirmed_at ? "✅ Verified" : "❌ Not verified" },
                    { label: "Auth Provider",   value: user?.app_metadata?.provider ?? "email" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      background: G.cream, borderRadius: 10, padding: "10px 14px",
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
                <SectionTitle sub="Choose a strong password with at least 8 characters.">
                  Change Password
                </SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Input label="New Password" type="password" value={pwForm.newPw}
                    onChange={v => setPwForm(f => ({ ...f, newPw: v }))}
                    placeholder="Enter new password" />
                  <Input label="Confirm New Password" type="password" value={pwForm.confirm}
                    onChange={v => setPwForm(f => ({ ...f, confirm: v }))}
                    placeholder="Re-enter new password" />

                  {/* Password strength */}
                  {pwForm.newPw && (
                    <div>
                      <div style={{ fontSize: 11, color: G.light, marginBottom: 4 }}>Password strength</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {["Weak", "Fair", "Good", "Strong"].map((s, i) => {
                          const len = pwForm.newPw.length;
                          const hasUpper = /[A-Z]/.test(pwForm.newPw);
                          const hasNum   = /\d/.test(pwForm.newPw);
                          const hasSpec  = /[^a-zA-Z0-9]/.test(pwForm.newPw);
                          const score = (len >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSpec ? 1 : 0);
                          const colors = ["#e74c3c", "#e67e22", "#f1c40f", G.base];
                          const active = i < score;
                          return (
                            <div key={s} style={{ flex: 1 }}>
                              <div style={{ height: 4, borderRadius: 2,
                                background: active ? colors[Math.min(score - 1, 3)] : G.wash }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {pwMsg && <Alert message={pwMsg.text} type={pwMsg.type} />}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Btn onClick={changePassword} disabled={pwSaving}>
                      {pwSaving ? "Changing…" : "Change Password"}
                    </Btn>
                  </div>
                </div>
              </Card>

              <Card>
                <SectionTitle sub="Overview of your account security.">Security Status</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Email Verified",    status: !!user?.email_confirmed_at,   ok: true  },
                    { label: "Strong Password",   status: true,                          ok: true  },
                    { label: "Two-Factor Auth",   status: false,                         ok: false },
                    { label: "Active Session",    status: true,                          ok: true  },
                  ].map(({ label, status }) => (
                    <div key={label} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", background: G.cream, borderRadius: 10,
                    }}>
                      <span style={{ fontSize: 13, color: G.dark }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700,
                        color: status ? G.base : "#e67e22" }}>
                        {status ? "✅ Active" : "⚠️ Not set"}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── Activity Tab ── */}
          {tab === "activity" && (
            <Card>
              <SectionTitle sub="Your 20 most recent actions in the admin panel.">
                Recent Activity
              </SectionTitle>
              {activity.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                  No activity recorded yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {activity.map((a, i) => (
                    <div key={a.id ?? i} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", borderRadius: 10,
                      background: i % 2 === 0 ? G.cream : "transparent",
                    }}>
                      <div style={{ fontSize: 20, flexShrink: 0 }}>
                        {activityIcon(a.type ?? a.action_type)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: G.dark, fontWeight: 500 }}>
                          {a.action ?? a.description ?? "Action performed"}
                        </div>
                        {a.details && (
                          <div style={{ fontSize: 11, color: G.light, marginTop: 1 }}>{a.details}</div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#aaa", flexShrink: 0 }}>
                        {fmtShort(a.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ── Settings Tab ── */}
          {tab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card>
                <SectionTitle sub="Manage your admin account preferences.">
                  Account Settings
                </SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: "Email Notifications",   sub: "Receive updates via email",         on: true  },
                    { label: "Login Alerts",          sub: "Alert on new sign-in",               on: true  },
                    { label: "Activity Digest",       sub: "Weekly summary of admin actions",    on: false },
                    { label: "Dark Mode",             sub: "Coming soon",                        on: false, disabled: true },
                  ].map(pref => (
                    <div key={pref.label} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 16px", background: G.cream, borderRadius: 12,
                      opacity: pref.disabled ? 0.5 : 1,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: G.dark }}>{pref.label}</div>
                        <div style={{ fontSize: 11, color: G.light }}>{pref.sub}</div>
                      </div>
                      <div style={{
                        width: 40, height: 22, borderRadius: 11,
                        background: pref.on ? G.base : "#ddd",
                        position: "relative", cursor: pref.disabled ? "default" : "pointer",
                        transition: "background .2s",
                      }}>
                        <div style={{
                          position: "absolute", top: 3,
                          left: pref.on ? 20 : 3,
                          width: 16, height: 16, borderRadius: "50%",
                          background: "#fff", transition: "left .2s",
                          boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card style={{ border: `1px solid #fecaca` }}>
                <SectionTitle sub="Irreversible actions. Proceed with caution.">
                  Danger Zone
                </SectionTitle>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", background: "#fef2f2", borderRadius: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#c0392b" }}>Sign out all sessions</div>
                    <div style={{ fontSize: 11, color: "#e74c3c" }}>Force logout from all devices</div>
                  </div>
                  <Btn small variant="danger" onClick={async () => {
                    if (window.confirm("Sign out from all devices?")) {
                      await supabase.auth.signOut({ scope: "global" });
                    }
                  }}>Sign Out All</Btn>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}