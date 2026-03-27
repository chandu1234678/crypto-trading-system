// ui/src/components/LoginPage.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

export default function LoginPage({ toast }) {
  const { login, register } = useAuth();
  const [mode,     setMode]     = useState("login"); // login | register | forgot | reset
  const [loading,  setLoading]  = useState(false);
  const [resetToken, setResetToken] = useState("");

  const [form, setForm] = useState({ email:"", username:"", password:"", confirm:"", newPassword:"" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        toast("ok", "Welcome back!");
      } else if (mode === "register") {
        if (form.password !== form.confirm) throw new Error("Passwords do not match");
        await register(form.email, form.username, form.password);
        toast("ok", "Account created!");
      } else if (mode === "forgot") {
        const r = await api.forgotPassword(form.email);
        toast("ok", r.message);
        if (r.reset_token) {
          setResetToken(r.reset_token);
          setMode("reset");
        }
      } else if (mode === "reset") {
        await api.resetPassword(resetToken, form.newPassword);
        toast("ok", "Password reset! Please log in.");
        setMode("login");
      }
    } catch (err) {
      toast("err", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"var(--bg)", padding:20,
    }}>
      <div style={{
        width:"100%", maxWidth:420, background:"var(--bg-card)",
        border:"1px solid var(--border)", borderRadius:16, padding:"32px 28px",
      }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:28, fontWeight:800, letterSpacing:".06em" }}>
            CTP<span style={{ color:"var(--accent)" }}>·BOT</span>
          </div>
          <div style={{ fontSize:12, color:"var(--muted)", marginTop:4 }}>
            Crypto Trade Professional
          </div>
        </div>

        {/* Tab switcher */}
        {(mode === "login" || mode === "register") && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginBottom:24,
            background:"var(--bg-input)", borderRadius:10, padding:4 }}>
            {["login","register"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding:"8px", borderRadius:8, border:"none", cursor:"pointer",
                fontWeight:600, fontSize:13, fontFamily:"inherit",
                background: mode===m ? "var(--accent)" : "transparent",
                color: mode===m ? "#fff" : "var(--muted)",
                transition:"all .15s",
              }}>{m === "login" ? "Sign In" : "Register"}</button>
            ))}
          </div>
        )}

        {/* Title for other modes */}
        {mode === "forgot" && <div style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>Reset Password</div>}
        {mode === "reset"  && <div style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>Set New Password</div>}

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Email */}
          {(mode === "login" || mode === "register" || mode === "forgot") && (
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                placeholder="you@example.com" required autoComplete="email" />
            </div>
          )}

          {/* Username (register only) */}
          {mode === "register" && (
            <div className="field">
              <label>Username</label>
              <input value={form.username} onChange={e => set("username", e.target.value)}
                placeholder="your_username" required minLength={3} pattern="[a-zA-Z0-9_]+" />
            </div>
          )}

          {/* Password */}
          {(mode === "login" || mode === "register") && (
            <div className="field">
              <label>Password</label>
              <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
                placeholder="••••••••" required minLength={8} autoComplete={mode==="login" ? "current-password" : "new-password"} />
            </div>
          )}

          {/* Confirm password */}
          {mode === "register" && (
            <div className="field">
              <label>Confirm Password</label>
              <input type="password" value={form.confirm} onChange={e => set("confirm", e.target.value)}
                placeholder="••••••••" required minLength={8} autoComplete="new-password" />
            </div>
          )}

          {/* New password (reset) */}
          {mode === "reset" && (
            <div className="field">
              <label>New Password</label>
              <input type="password" value={form.newPassword} onChange={e => set("newPassword", e.target.value)}
                placeholder="••••••••" required minLength={8} autoComplete="new-password" />
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ padding:"11px", fontSize:14, fontWeight:700, marginTop:4 }}>
            {loading ? <span><span className="spin">⟳</span> Please wait…</span> : (
              mode === "login"    ? "Sign In" :
              mode === "register" ? "Create Account" :
              mode === "forgot"   ? "Send Reset Link" : "Reset Password"
            )}
          </button>
        </form>

        {/* Footer links */}
        <div style={{ marginTop:20, textAlign:"center", fontSize:12, color:"var(--muted)", display:"flex", flexDirection:"column", gap:8 }}>
          {mode === "login" && (
            <button onClick={() => setMode("forgot")} style={{ background:"none", border:"none",
              color:"var(--accent)", cursor:"pointer", fontSize:12 }}>
              Forgot password?
            </button>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <button onClick={() => setMode("login")} style={{ background:"none", border:"none",
              color:"var(--accent)", cursor:"pointer", fontSize:12 }}>
              ← Back to sign in
            </button>
          )}
          <div style={{ color:"var(--muted)", fontSize:11 }}>
            Binance Spot Testnet — no real money
          </div>
        </div>
      </div>
    </div>
  );
}
