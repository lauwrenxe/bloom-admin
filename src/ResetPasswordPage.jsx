import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js";

const BOOTSTRAP_CSS = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
const BI_CSS        = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";
const INTER_CSS     = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap";

function loadCSS(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet"; l.href = href;
  document.head.appendChild(l);
}

export default function ResetPasswordPage() {
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [done,       setDone]       = useState(false);
  const [passErr,    setPassErr]    = useState(false);
  const [confirmErr, setConfirmErr] = useState(false);

  useEffect(() => {
    loadCSS(BOOTSTRAP_CSS);
    loadCSS(BI_CSS);
    loadCSS(INTER_CSS);
  }, []);

  const submit = async () => {
    setError(""); setPassErr(false); setConfirmErr(false);

    if (!password) { setPassErr(true); setError("Please enter a new password."); return; }
    if (password.length < 6) { setPassErr(true); setError("Password must be at least 6 characters."); return; }
    if (!confirm) { setConfirmErr(true); setError("Please confirm your password."); return; }
    if (password !== confirm) { setConfirmErr(true); setError("Passwords do not match."); return; }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) { setError(updateError.message); return; }
    setDone(true);
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{ background: "linear-gradient(135deg,#F1F8F1 0%,#E8F5E9 50%,#D7EED7 100%)", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div className="card border-0 shadow-lg overflow-hidden" style={{ width: 420, borderRadius: 14 }}>

        {/* Brand strip */}
        <div className="p-4 d-flex align-items-center gap-3"
          style={{ background: "linear-gradient(135deg,#2D6A2D,#1A2E1A)" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, fontSize: 22, background: "rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-flower2 text-white" />
          </div>
          <div>
            <div className="fw-bold text-white" style={{ fontSize: 18 }}>BLOOM GAD</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>GADRC CvSU Admin Portal</div>
          </div>
        </div>

        {/* ── SUCCESS VIEW ── */}
        {done ? (
          <div className="card-body p-4 text-center">
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h5 className="fw-bold mb-2" style={{ color: "#1A2E1A" }}>Password Updated!</h5>
            <p className="text-muted mb-4" style={{ fontSize: 13, lineHeight: 1.7 }}>
              Your password has been changed successfully. You can now sign in with your new password.
            </p>
            <a href="/"
              className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
              style={{ padding: "10px", textDecoration: "none" }}>
              Go to Sign In <i className="bi bi-arrow-right" />
            </a>
          </div>
        ) : (

        /* ── FORM VIEW ── */
          <div className="card-body p-4">
            <h5 className="fw-bold mb-1" style={{ color: "#1A2E1A" }}>Set New Password</h5>
            <p className="text-muted mb-4" style={{ fontSize: 13 }}>Choose a strong password for your admin account.</p>

            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: 12 }}>New Password</label>
              <input
                className={`form-control ${passErr ? "is-invalid" : ""}`}
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); if (e.target.value) setPassErr(false); }}
                placeholder="At least 6 characters"
                onKeyDown={e => e.key === "Enter" && submit()}
              />
              {passErr && <div className="invalid-feedback">This field is required</div>}
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: 12 }}>Confirm Password</label>
              <input
                className={`form-control ${confirmErr ? "is-invalid" : ""}`}
                type="password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); if (e.target.value) setConfirmErr(false); }}
                placeholder="Re-enter your password"
                onKeyDown={e => e.key === "Enter" && submit()}
              />
              {confirmErr && <div className="invalid-feedback">Passwords do not match</div>}
            </div>

            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2" style={{ fontSize: 13, borderRadius: 8 }}>
                <i className="bi bi-exclamation-triangle-fill" />{error}
              </div>
            )}

            <button className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={submit} disabled={loading} style={{ padding: "10px" }}>
              {loading
                ? <><span className="spinner-border spinner-border-sm" />Updating…</>
                : <>Update Password <i className="bi bi-shield-lock" /></>
              }
            </button>

            <p className="text-center text-muted mt-3 mb-0" style={{ fontSize: 11 }}>
              Admin access only · Contact GADRC IT for support
            </p>
          </div>
        )}
      </div>
    </div>
  );
}