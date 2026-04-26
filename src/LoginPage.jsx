import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { G } from "../styles/theme";
import { BloomLogo, Input } from "../components/ui";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default function LoginPage({ onLogin }) {
  const [view,       setView]       = useState("login");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);

  const switchView = (v) => { setError(""); setView(v); };

  const submit = () => {
    setError("");
    if (!email || !password) { setError("Please enter your credentials."); return; }
    setLoading(true);
    setTimeout(() => {
      if (email === "admin@bloom.edu" && password === "admin123") {
        onLogin();
      } else {
        setError("Invalid credentials. Use admin@bloom.edu / admin123");
        setLoading(false);
      }
    }, 900);
  };

  const sendReset = async () => {
    setError("");
    if (!resetEmail) { setError("Please enter your email address."); return; }
    if (!/\S+@\S+\.\S+/.test(resetEmail)) { setError("Please enter a valid email address."); return; }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: "http://localhost:3000/reset-password",
    });
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setView("success");
    }
  };

  const onKey = (fn) => (e) => { if (e.key === "Enter") fn(); };

  return (
    <div style={{
      width: "100%", minHeight: "100vh",
      background: `linear-gradient(135deg,${G.dark} 0%,${G.mid} 50%,${G.base} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorative blobs */}
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: G.light, filter: "blur(90px)", opacity: .12, top: -120, right: -80 }} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: G.pale,  filter: "blur(70px)", opacity: .1,  bottom: -60, left: 40 }} />

      {/* Left — branding */}
      <div style={{ flex: "1 1 420px", maxWidth: 480, padding: "60px 48px", color: "#fff", display: "flex", flexDirection: "column", gap: "28px" }}>
        <BloomLogo light />
        <div>
          <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "clamp(32px,4vw,52px)", lineHeight: 1.1, marginBottom: "16px" }}>
            Admin<br /><span style={{ color: G.pale, fontStyle: "italic" }}>Control Center</span>
          </h1>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,.7)", lineHeight: 1.75, maxWidth: "360px" }}>
            Manage GAD learning modules, run live seminars, track analytics, and issue certificates — all from one platform.
          </p>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { icon: "📂", text: "Module & Assessment Management" },
            { icon: "📊", text: "Real-time Analytics & Reports"  },
            { icon: "🎙️", text: "Live Seminar Hosting"           },
            { icon: "🎓", text: "Automated Certifications"       },
          ].map(f => (
            <div key={f.text} style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,.08)", borderRadius: "10px", padding: "10px 16px", border: "1px solid rgba(255,255,255,.12)" }}>
              <span style={{ fontSize: "18px" }}>{f.icon}</span>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,.85)", fontWeight: 500 }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — card */}
      <div style={{ flex: "0 0 auto", width: "440px", margin: "40px 60px 40px 0", background: "#fff", borderRadius: "24px", padding: "48px 44px", boxShadow: "0 24px 80px rgba(0,0,0,.2)" }}>

        {/* ── LOGIN VIEW ── */}
        {view === "login" && (
          <>
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "26px", color: G.dark, marginBottom: "6px" }}>
                Welcome back
              </h2>
              <p style={{ fontSize: "13.5px", color: "#888" }}>Sign in to your GADRC admin account.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }} onKeyDown={onKey(submit)}>
              <Input label="Email Address" value={email}    onChange={setEmail}    type="email"    placeholder="admin@bloom.edu" />
              <Input label="Password"      value={password} onChange={setPassword} type="password" placeholder="••••••••"        />

              {error && (
                <div style={{ background: "#fdecea", border: "1px solid #f5c6cb", borderRadius: "10px", padding: "10px 14px", fontSize: "12.5px", color: "#c0392b" }}>
                  {error}
                </div>
              )}

              <button
                onClick={submit}
                disabled={loading}
                style={{
                  marginTop: "8px", border: "none", borderRadius: "12px", padding: "14px",
                  background: `linear-gradient(135deg,${G.base},${G.dark})`,
                  color: "#fff", fontSize: "15px", fontWeight: 700,
                  cursor: loading ? "wait" : "pointer",
                  fontFamily: "'DM Sans',sans-serif", letterSpacing: ".3px",
                  transition: "opacity .2s, transform .15s",
                  opacity: loading ? .7 : 1,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
              >
                {loading ? "Signing in…" : "Sign In →"}
              </button>

              <div style={{ textAlign: "center", fontSize: "13px", color: "#999" }}>
                <span
                  onClick={() => switchView("forgot")}
                  style={{ color: G.base, fontWeight: 600, cursor: "pointer" }}
                >
                  Forgot password?
                </span>
              </div>

              <div style={{ textAlign: "center", fontSize: "12px", color: "#bbb" }}>
                Demo: <strong style={{ color: G.base }}>admin@bloom.edu</strong> / <strong style={{ color: G.base }}>admin123</strong>
              </div>
            </div>
          </>
        )}

        {/* ── FORGOT PASSWORD VIEW ── */}
        {view === "forgot" && (
          <>
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "26px", color: G.dark, marginBottom: "6px" }}>
                Reset Password
              </h2>
              <p style={{ fontSize: "13.5px", color: "#888" }}>Enter your admin email and we'll send a reset link.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }} onKeyDown={onKey(sendReset)}>
              <Input label="Email Address" value={resetEmail} onChange={setResetEmail} type="email" placeholder="admin@bloom.edu" />

              {error && (
                <div style={{ background: "#fdecea", border: "1px solid #f5c6cb", borderRadius: "10px", padding: "10px 14px", fontSize: "12.5px", color: "#c0392b" }}>
                  {error}
                </div>
              )}

              <button
                onClick={sendReset}
                disabled={loading}
                style={{
                  marginTop: "8px", border: "none", borderRadius: "12px", padding: "14px",
                  background: `linear-gradient(135deg,${G.base},${G.dark})`,
                  color: "#fff", fontSize: "15px", fontWeight: 700,
                  cursor: loading ? "wait" : "pointer",
                  fontFamily: "'DM Sans',sans-serif", letterSpacing: ".3px",
                  transition: "opacity .2s, transform .15s",
                  opacity: loading ? .7 : 1,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
              >
                {loading ? "Sending…" : "Send Reset Link →"}
              </button>

              <div style={{ textAlign: "center", fontSize: "13px", color: "#999" }}>
                <span
                  onClick={() => switchView("login")}
                  style={{ color: G.base, fontWeight: 600, cursor: "pointer" }}
                >
                  ← Back to Sign In
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── SUCCESS VIEW ── */}
        {view === "success" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "52px", marginBottom: "20px" }}>📬</div>
            <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontWeight: 700, fontSize: "26px", color: G.dark, marginBottom: "8px" }}>
              Check your inbox
            </h2>
            <p style={{ fontSize: "13.5px", color: "#888", marginBottom: "24px" }}>Reset link sent!</p>
            <p style={{ fontSize: "14px", color: "#555", lineHeight: 1.75, marginBottom: "32px" }}>
              If <strong style={{ color: G.base }}>{resetEmail}</strong> is registered, a password reset link has been sent. Check your spam folder if you don't see it within a few minutes.
            </p>
            <span
              onClick={() => switchView("login")}
              style={{ color: G.base, fontWeight: 600, cursor: "pointer", fontSize: "13px" }}
            >
              ← Back to Sign In
            </span>
          </div>
        )}

      </div>
    </div>
  );
}