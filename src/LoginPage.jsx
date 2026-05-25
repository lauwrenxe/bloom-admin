import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./lib/supabase.js";
import { G } from "../styles/theme";
import { BloomLogo, Input } from "../components/ui";
import { checkSessionTimeout, clearSessionMeta } from "./sessionUtils.js";

// ─────────────────────────────────────────────────────────────────────────────
//  RATE LIMITER
// ─────────────────────────────────────────────────────────────────────────────
const RL_KEY          = "bloom_admin_rl";
const RL_MAX_ATTEMPTS = 5;
const RL_WINDOW_MS    = 15 * 60 * 1000;
const RL_LOCKOUT_MS   = 15 * 60 * 1000;
const RESET_RL_KEY    = "bloom_admin_reset_rl";
const RESET_MAX       = 3;
const RESET_WINDOW_MS = 60 * 60 * 1000;

function getRL(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : { attempts: 0, windowStart: Date.now(), lockedUntil: 0 };
  } catch { return { attempts: 0, windowStart: Date.now(), lockedUntil: 0 }; }
}
function saveRL(key, state) {
  try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* quota */ }
}
function clearRL(key) {
  try { localStorage.removeItem(key); } catch { /* unavailable */ }
}
function checkRL(key, maxAttempts = RL_MAX_ATTEMPTS, windowMs = RL_WINDOW_MS) {
  const s = getRL(key), now = Date.now();
  if (s.lockedUntil > now || s.attempts >= maxAttempts) {
    const msLeft = Math.max(s.lockedUntil - now, 0);
    return { allowed: false, msLeft, minutesLeft: Math.ceil(msLeft / 60000) };
  }
  if (now - s.windowStart > windowMs)
    saveRL(key, { attempts: 0, windowStart: now, lockedUntil: 0 });
  return { allowed: true };
}
function recordFailure(key, maxAttempts = RL_MAX_ATTEMPTS,
    windowMs = RL_WINDOW_MS, lockoutMs = RL_LOCKOUT_MS) {
  let s = getRL(key); const now = Date.now();
  if (now - s.windowStart > windowMs) s = { attempts: 1, windowStart: now, lockedUntil: 0 };
  else s.attempts += 1;
  if (s.attempts >= maxAttempts) s.lockedUntil = now + lockoutMs;
  saveRL(key, s); return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
function sanitizeEmail(v)    { return v.trim().toLowerCase().slice(0, 254); }
function sanitizePassword(v) { if (!v || !v.trim()) return ""; return v.slice(0, 128); }
function isValidEmail(v)     { return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,63}$/.test(v); }
function isValidPassword(v)  { return typeof v === "string" && v.trim().length >= 8; }

// ─────────────────────────────────────────────────────────────────────────────
//  DESIGN TOKENS (mapped from theme.js)
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  brand:      "#2D6A2D",
  brand2:     "#1F5C1F",
  brandMid:   "#3A7A3A",
  brandLight: "#E8F5E9",
  brandPale:  "#C8E6C9",
  text1:      "#1A2E1A",
  text2:      "#4A5E4A",
  text3:      "#8A9E8A",
  border:     "#DDE8DD",
  surface:    "#FFFFFF",
  appBg:      "#F5F7F5",
  danger:     "#C50F1F",
  dangerBg:   "#FDE7E9",
  shadow2:    "0 4px 12px rgba(26,46,26,.08), 0 2px 4px rgba(26,46,26,.04)",
  shadow3:    "0 8px 32px rgba(26,46,26,.14), 0 4px 8px rgba(26,46,26,.06)",
};

// ─────────────────────────────────────────────────────────────────────────────
//  SMALL REUSABLE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function FieldLabel({ children }) {
  return (
    <label style={{
      fontSize: 11, fontWeight: 700, color: C.text2,
      letterSpacing: ".5px", textTransform: "uppercase",
      display: "block", marginBottom: 6,
    }}>
      {children}
    </label>
  );
}

function TextField({ label, value, onChange, type = "text", placeholder, autoComplete }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "11px 14px",
            border: `1.5px solid ${focused ? C.brand : C.border}`,
            borderRadius: 10,
            fontSize: 14, fontFamily: "inherit",
            color: C.text1, background: C.surface,
            outline: "none",
            transition: "border-color .15s, box-shadow .15s",
            boxShadow: focused
              ? `0 0 0 3px rgba(45,106,45,.10)`
              : "none",
          }}
        />
      </div>
    </div>
  );
}

function PrimaryButton({ onClick, disabled, loading, locked, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", padding: "13px",
        border: "none", borderRadius: 10,
        background: locked
          ? "#b0bdb0"
          : hovered && !disabled
            ? C.brand2
            : C.brand,
        color: "#fff", fontSize: 14, fontWeight: 700,
        fontFamily: "inherit", letterSpacing: ".2px",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background .15s, transform .12s, box-shadow .15s",
        transform: hovered && !disabled ? "translateY(-1px)" : "none",
        boxShadow: hovered && !disabled
          ? "0 6px 20px rgba(45,106,45,.30)"
          : "0 2px 8px rgba(45,106,45,.15)",
        display: "flex", alignItems: "center",
        justifyContent: "center", gap: 8,
      }}
    >
      {loading && (
        <span style={{
          width: 16, height: 16, border: "2px solid rgba(255,255,255,.4)",
          borderTopColor: "#fff", borderRadius: "50%",
          display: "inline-block", animation: "spin .7s linear infinite",
        }} />
      )}
      {children}
    </button>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{
      background: C.dangerBg,
      border: `1px solid rgba(197,15,31,.18)`,
      borderRadius: 10, padding: "11px 14px",
      display: "flex", alignItems: "flex-start", gap: 10,
    }}>
      <span style={{ fontSize: 15, lineHeight: 1.4 }}>⚠️</span>
      <span style={{ fontSize: 13, color: C.danger, lineHeight: 1.5 }}>
        {message}
      </span>
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, margin: "4px 0",
    }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      {label && (
        <span style={{ fontSize: 11, color: C.text3, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: ".5px" }}>
          {label}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  LOGIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function LoginPage({ onLogin }) {
  const [view,       setView]       = useState("login");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [lockoutMs,  setLockoutMs]  = useState(0);

  const submitRef    = useRef(false);
  const countdownRef = useRef(null);

  // ── Lockout countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (lockoutMs <= 0) { clearInterval(countdownRef.current); return; }
    countdownRef.current = setInterval(() => {
      setLockoutMs(prev => {
        const next = prev - 1000;
        if (next <= 0) {
          clearInterval(countdownRef.current);
          setError(""); return 0;
        }
        const mins = Math.floor(next / 60000);
        const secs = Math.floor((next % 60000) / 1000);
        setError(`Too many failed attempts. Try again in ${mins}:${String(secs).padStart(2, "0")}.`);
        return next;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [lockoutMs]);

  // ── Resume lockout on page refresh ─────────────────────────────────────
  useEffect(() => {
    const rl = checkRL(RL_KEY);
    if (!rl.allowed) {
      setLockoutMs(rl.msLeft);
      const mins = Math.floor(rl.msLeft / 60000);
      const secs = Math.floor((rl.msLeft % 60000) / 1000);
      setError(`Too many failed attempts. Try again in ${mins}:${String(secs).padStart(2, "0")}.`);
    }
  }, []);

  void checkSessionTimeout;
  void clearSessionMeta;

  const switchView = (v) => { setError(""); setView(v); };

  // ── Login ───────────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (submitRef.current || loading) return;
    setError("");
    const cleanEmail    = sanitizeEmail(email);
    const cleanPassword = sanitizePassword(password);
    if (!cleanEmail)              { setError("Email is required."); return; }
    if (!isValidEmail(cleanEmail)){ setError("Please enter a valid email address."); return; }
    if (!cleanPassword)           { setError("Password is required."); return; }
    if (!isValidPassword(cleanPassword)) { setError("Password must be at least 8 characters."); return; }

    const rl = checkRL(RL_KEY);
    if (!rl.allowed) {
      setLockoutMs(rl.msLeft);
      const mins = Math.ceil(rl.msLeft / 60000);
      setError(`Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`);
      return;
    }

    submitRef.current = true; setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail, password: cleanPassword,
      });
      if (authErr) {
        const s = recordFailure(RL_KEY), rl2 = checkRL(RL_KEY);
        if (!rl2.allowed) {
          setLockoutMs(rl2.msLeft);
          const mins = Math.ceil(rl2.msLeft / 60000);
          setError(`Too many failed attempts. Locked for ${mins} minute${mins !== 1 ? "s" : ""}.`);
        } else {
          const remaining = RL_MAX_ATTEMPTS - s.attempts;
          setError(`Invalid credentials.${remaining > 0 ? ` ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` : ""}`);
        }
        setLoading(false); submitRef.current = false; return;
      }
      const { data: rows, error: roleErr } = await supabase
        .from("user_roles").select("roles(name)").eq("user_id", data.user.id);
      if (roleErr || !rows?.length) {
        await supabase.auth.signOut(); recordFailure(RL_KEY);
        setError("Access denied. No role assigned to this account.");
        setLoading(false); submitRef.current = false; return;
      }
      const roleNames = rows.map(r => r.roles?.name).filter(Boolean);
      if (!roleNames.includes("admin") && !roleNames.includes("super_admin")) {
        await supabase.auth.signOut(); recordFailure(RL_KEY);
        setError("Access denied. Admin accounts only.");
        setLoading(false); submitRef.current = false; return;
      }
      const { data: profile } = await supabase
        .from("profiles").select("is_active").eq("id", data.user.id).maybeSingle();
      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        setError("This account has been deactivated. Contact your administrator.");
        setLoading(false); submitRef.current = false; return;
      }
      await supabase.from("activity_logs").insert({
        user_id: data.user.id, activity_type: "admin_login",
        metadata: { email: cleanEmail, role: roleNames.includes("super_admin") ? "super_admin" : "admin" },
        created_at: new Date().toISOString(),
      }).then(() => {}, () => {});
      sessionStorage.setItem("bloom_session_start", Date.now().toString());
      clearRL(RL_KEY);
      const role = roleNames.includes("super_admin") ? "super_admin" : "admin";
      setLoading(false); submitRef.current = false;
      onLogin(data.user, role);
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false); submitRef.current = false;
    }
  }, [email, password, loading, onLogin]);

  // ── Reset ───────────────────────────────────────────────────────────────
  const sendReset = useCallback(async () => {
    setError("");
    const cleanEmail = sanitizeEmail(resetEmail);
    if (!cleanEmail)               { setError("Email is required."); return; }
    if (!isValidEmail(cleanEmail)) { setError("Please enter a valid email address."); return; }
    const rl = checkRL(RESET_RL_KEY, RESET_MAX, RESET_WINDOW_MS);
    if (!rl.allowed) {
      const mins = Math.ceil(rl.msLeft / 60000);
      setError(`Too many reset attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`);
      return;
    }
    setLoading(true);
    try {
      recordFailure(RESET_RL_KEY, RESET_MAX, RESET_WINDOW_MS, RESET_WINDOW_MS);
      await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      }).then(() => {}, () => {});
      setView("success");
    } catch { setView("success"); }
    finally  { setLoading(false); }
  }, [resetEmail]);

  const handleLoginKeyDown = (e) => { if (e.key === "Enter") submit(); };
  const handleResetKeyDown = (e) => { if (e.key === "Enter") sendReset(); };

  // ── RENDER ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* Spinner keyframe */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,700;1,600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{
        width: "100%", minHeight: "100vh",
        background: C.appBg,
        display: "flex",
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        position: "relative", overflow: "hidden",
      }}>

        {/* ── LEFT PANEL — deep green brand ── */}
        <div style={{
          flex: "0 0 46%", minHeight: "100vh",
          background: `linear-gradient(160deg, ${C.brand2} 0%, ${C.brand} 55%, ${C.brandMid} 100%)`,
          display: "flex", flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 52px",
          position: "relative", overflow: "hidden",
        }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", border: "1px solid rgba(255,255,255,.07)", top: -140, right: -100, pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", border: "1px solid rgba(255,255,255,.06)", top: -60, right: 40, pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", border: "1px solid rgba(255,255,255,.05)", bottom: -100, left: -80, pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.04)", bottom: 80, right: -40, pointerEvents: "none" }} />

          {/* Top — logo + wordmark */}
          <div style={{ animation: "fadeIn .6s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 56 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(255,255,255,.15)",
                border: "1px solid rgba(255,255,255,.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
              }}>🌸</div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: ".3px" }}>BLOOM</div>
                <div style={{ color: "rgba(255,255,255,.55)", fontSize: 11, letterSpacing: ".5px", textTransform: "uppercase" }}>GADRC · CvSU</div>
              </div>
            </div>

            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700, fontSize: "clamp(30px,3.2vw,46px)",
              color: "#fff", lineHeight: 1.15,
              margin: "0 0 20px",
            }}>
              Admin<br />
              <span style={{ fontStyle: "italic", color: C.brandPale }}>
                Control Center
              </span>
            </h1>
            <p style={{
              fontSize: 14, color: "rgba(255,255,255,.65)",
              lineHeight: 1.8, maxWidth: 340, margin: 0,
            }}>
              Manage GAD learning modules, run live seminars, track analytics, and issue certificates — all from one platform.
            </p>
          </div>

          {/* Middle — feature list */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 10,
            animation: "fadeUp .7s .15s ease both",
          }}>
            {[
              { icon: "📂", label: "Module & Assessment Management" },
              { icon: "📊", label: "Real-time Analytics & Reports"  },
              { icon: "🎙️", label: "Live Seminar Hosting"           },
              { icon: "🎓", label: "Automated Certifications"       },
            ].map(f => (
              <div key={f.label} style={{
                display: "flex", alignItems: "center", gap: 14,
                background: "rgba(255,255,255,.07)",
                border: "1px solid rgba(255,255,255,.10)",
                borderRadius: 12, padding: "12px 16px",
                backdropFilter: "blur(4px)",
              }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "rgba(255,255,255,.10)",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 17, flexShrink: 0,
                }}>{f.icon}</span>
                <span style={{
                  fontSize: 13, color: "rgba(255,255,255,.85)",
                  fontWeight: 500, letterSpacing: ".1px",
                }}>
                  {f.label}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom — footnote */}
          <div style={{
            fontSize: 11, color: "rgba(255,255,255,.35)",
            letterSpacing: ".3px",
            animation: "fadeIn .8s .3s ease both",
          }}>
            © {new Date().getFullYear()} Cavite State University · GADRC
          </div>
        </div>

        {/* ── RIGHT PANEL — form ── */}
        <div style={{
          flex: 1, display: "flex",
          alignItems: "center", justifyContent: "center",
          padding: "40px 32px",
          animation: "fadeIn .5s ease both",
        }}>
          <div style={{
            width: "100%", maxWidth: 420,
            animation: "fadeUp .55s .1s ease both",
          }}>

            {/* ── LOGIN VIEW ── */}
            {view === "login" && (
              <div>
                {/* Header */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: C.brandLight,
                    border: `1px solid ${C.brandPale}`,
                    borderRadius: 20, padding: "4px 12px",
                    fontSize: 11, fontWeight: 700,
                    color: C.brand, letterSpacing: ".4px",
                    textTransform: "uppercase", marginBottom: 16,
                  }}>
                    <span>🔐</span> Admin Access
                  </div>
                  <h2 style={{
                    fontSize: 28, fontWeight: 700,
                    color: C.text1, margin: "0 0 6px",
                    letterSpacing: "-.3px",
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}>
                    Welcome back
                  </h2>
                  <p style={{ fontSize: 14, color: C.text3, margin: 0 }}>
                    Sign in to your GADRC admin account.
                  </p>
                </div>

                {/* Form */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 20 }}
                  onKeyDown={handleLoginKeyDown}
                >
                  <TextField
                    label="Email Address"
                    value={email}
                    onChange={setEmail}
                    type="email"
                    placeholder="you@cvsu.edu.ph"
                    autoComplete="username"
                  />
                  <TextField
                    label="Password"
                    value={password}
                    onChange={setPassword}
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />

                  {/* Forgot password link */}
                  <div style={{ textAlign: "right", marginTop: -8 }}>
                    <span
                      onClick={() => switchView("forgot")}
                      style={{
                        fontSize: 13, color: C.brand, fontWeight: 600,
                        cursor: "pointer", textDecoration: "none",
                        borderBottom: `1px solid transparent`,
                        transition: "border-color .15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderBottomColor = C.brand}
                      onMouseLeave={e => e.currentTarget.style.borderBottomColor = "transparent"}
                    >
                      Forgot password?
                    </span>
                  </div>

                  <ErrorBanner message={error} />

                  <PrimaryButton
                    onClick={submit}
                    disabled={loading || lockoutMs > 0}
                    loading={loading}
                    locked={lockoutMs > 0}
                  >
                    {loading ? "Signing in…" : lockoutMs > 0 ? "Account Locked" : "Sign In →"}
                  </PrimaryButton>

                  <Divider label="Secure Admin Portal" />

                  {/* Security badge row */}
                  <div style={{
                    display: "flex", justifyContent: "center",
                    gap: 20, flexWrap: "wrap",
                  }}>
                    {["🔒 Encrypted", "🛡️ Role-verified", "📋 Audit logged"].map(b => (
                      <span key={b} style={{
                        fontSize: 11, color: C.text3, fontWeight: 500,
                      }}>{b}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── FORGOT PASSWORD VIEW ── */}
            {view === "forgot" && (
              <div style={{ animation: "fadeUp .4s ease both" }}>
                {/* Back */}
                <button
                  onClick={() => switchView("login")}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "none", border: "none", cursor: "pointer",
                    color: C.text3, fontSize: 13, fontWeight: 600,
                    padding: 0, marginBottom: 28, fontFamily: "inherit",
                    transition: "color .15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = C.brand}
                  onMouseLeave={e => e.currentTarget.style.color = C.text3}
                >
                  ← Back to Sign In
                </button>

                <div style={{ marginBottom: 32 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: C.brandLight,
                    border: `1px solid ${C.brandPale}`,
                    display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 24,
                    marginBottom: 16,
                  }}>🔑</div>
                  <h2 style={{
                    fontSize: 26, fontWeight: 700, color: C.text1,
                    margin: "0 0 6px", letterSpacing: "-.2px",
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}>
                    Reset Password
                  </h2>
                  <p style={{ fontSize: 14, color: C.text3, margin: 0, lineHeight: 1.6 }}>
                    Enter your admin email and we'll send a secure reset link.
                  </p>
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 20 }}
                  onKeyDown={handleResetKeyDown}
                >
                  <TextField
                    label="Email Address"
                    value={resetEmail}
                    onChange={setResetEmail}
                    type="email"
                    placeholder="you@cvsu.edu.ph"
                    autoComplete="email"
                  />

                  <ErrorBanner message={error} />

                  <PrimaryButton onClick={sendReset} disabled={loading} loading={loading}>
                    {loading ? "Sending…" : "Send Reset Link →"}
                  </PrimaryButton>
                </div>
              </div>
            )}

            {/* ── SUCCESS VIEW ── */}
            {view === "success" && (
              <div style={{
                textAlign: "center",
                animation: "fadeUp .4s ease both",
              }}>
                {/* Icon */}
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: C.brandLight,
                  border: `1px solid ${C.brandPale}`,
                  display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 32,
                  margin: "0 auto 24px",
                }}>📬</div>

                <h2 style={{
                  fontSize: 26, fontWeight: 700, color: C.text1,
                  margin: "0 0 8px", letterSpacing: "-.2px",
                  fontFamily: "'Playfair Display', Georgia, serif",
                }}>
                  Check your inbox
                </h2>
                <p style={{
                  fontSize: 13, color: C.text3, margin: "0 0 20px",
                  fontWeight: 600, textTransform: "uppercase",
                  letterSpacing: ".4px",
                }}>
                  Reset link sent
                </p>

                {/* Info card */}
                <div style={{
                  background: C.brandLight,
                  border: `1px solid ${C.brandPale}`,
                  borderRadius: 12, padding: "16px 20px",
                  fontSize: 14, color: C.text2,
                  lineHeight: 1.7, textAlign: "left",
                  marginBottom: 28,
                }}>
                  If <strong style={{ color: C.brand }}>{resetEmail}</strong> is
                  registered as an admin account, a password reset link has been sent.
                  Check your spam folder if it doesn't arrive within a few minutes.
                </div>

                <button
                  onClick={() => switchView("login")}
                  style={{
                    background: "none", border: `1.5px solid ${C.border}`,
                    borderRadius: 10, padding: "11px 24px",
                    fontSize: 13, fontWeight: 700, color: C.text2,
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "border-color .15s, color .15s",
                    width: "100%",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = C.brand;
                    e.currentTarget.style.color = C.brand;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.color = C.text2;
                  }}
                >
                  ← Back to Sign In
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}