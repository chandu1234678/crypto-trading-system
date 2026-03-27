// ui/src/components/Settings.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

export default function Settings({ toast }) {
  const { user, logout } = useAuth();
  const [keysStatus, setKeysStatus] = useState(null);

  // Exchange keys form
  const [exchForm, setExchForm] = useState({ api_key:"", api_secret:"", api_base_url:"https://testnet.binance.vision" });
  const [exchLoading, setExchLoading] = useState(false);

  // Gemini key form
  const [gemForm, setGemForm] = useState({ gemini_api_key:"", gemini_model:"gemini-2.5-flash-lite" });
  const [gemLoading, setGemLoading] = useState(false);

  // Password change
  const [pwForm, setPwForm] = useState({ current_password:"", new_password:"", confirm:"" });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    api.keysStatus().then(setKeysStatus).catch(() => {});
  }, []);

  async function saveExchangeKeys(e) {
    e.preventDefault();
    setExchLoading(true);
    try {
      await api.saveExchangeKeys(exchForm.api_key, exchForm.api_secret, exchForm.api_base_url);
      toast("ok", "Exchange keys saved securely");
      setExchForm(f => ({ ...f, api_key:"", api_secret:"" }));
      setKeysStatus(await api.keysStatus());
    } catch (err) { toast("err", err.message); }
    finally { setExchLoading(false); }
  }

  async function deleteExchangeKeys() {
    if (!confirm("Remove exchange keys?")) return;
    try {
      await api.deleteExchangeKeys();
      toast("ok", "Exchange keys removed");
      setKeysStatus(await api.keysStatus());
    } catch (err) { toast("err", err.message); }
  }

  async function saveGeminiKey(e) {
    e.preventDefault();
    setGemLoading(true);
    try {
      await api.saveGeminiKey(gemForm.gemini_api_key, gemForm.gemini_model);
      toast("ok", "Gemini key saved securely");
      setGemForm(f => ({ ...f, gemini_api_key:"" }));
      setKeysStatus(await api.keysStatus());
    } catch (err) { toast("err", err.message); }
    finally { setGemLoading(false); }
  }

  async function deleteGeminiKey() {
    if (!confirm("Remove Gemini key?")) return;
    try {
      await api.deleteGeminiKey();
      toast("ok", "Gemini key removed");
      setKeysStatus(await api.keysStatus());
    } catch (err) { toast("err", err.message); }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) return toast("err", "Passwords do not match");
    setPwLoading(true);
    try {
      await api.changePassword(pwForm.current_password, pwForm.new_password);
      toast("ok", "Password changed successfully");
      setPwForm({ current_password:"", new_password:"", confirm:"" });
    } catch (err) { toast("err", err.message); }
    finally { setPwLoading(false); }
  }

  const StatusBadge = ({ ok, label }) => (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:6, fontSize:12,
      padding:"3px 10px", borderRadius:999,
      background: ok ? "rgba(34,197,94,.15)" : "rgba(239,68,68,.15)",
      color: ok ? "var(--green)" : "var(--red)",
      border: `1px solid ${ok ? "var(--green)" : "var(--red)"}`,
    }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:"currentColor", display:"inline-block" }} />
      {label}
    </span>
  );

  return (
    <div className="page fade-in" style={{ gap:16, maxWidth:700 }}>
      {/* Profile */}
      <div className="card">
        <div className="card-title">Profile</div>
        <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <div style={{ width:48, height:48, borderRadius:"50%", background:"var(--accent-soft)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:20, fontWeight:700, color:"var(--accent)" }}>
            {user?.username?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>{user?.username}</div>
            <div style={{ fontSize:12, color:"var(--muted)" }}>{user?.email}</div>
          </div>
          {user?.is_admin && <span className="badge badge-buy" style={{ marginLeft:"auto" }}>Admin</span>}
          <button className="btn btn-sm btn-red" onClick={logout} style={{ marginLeft:"auto" }}>Sign Out</button>
        </div>
      </div>

      {/* Key status */}
      <div className="card">
        <div className="card-title">API Key Status</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <StatusBadge ok={keysStatus?.has_exchange_keys} label={keysStatus?.has_exchange_keys ? "Exchange Keys Set" : "No Exchange Keys"} />
          <StatusBadge ok={keysStatus?.has_gemini_key} label={keysStatus?.has_gemini_key ? "Gemini Key Set" : "No Gemini Key"} />
        </div>
        {keysStatus?.has_exchange_keys && (
          <div style={{ fontSize:11, color:"var(--muted)", marginTop:8 }}>
            Exchange: {keysStatus.api_base_url} · Model: {keysStatus.gemini_model}
          </div>
        )}
      </div>

      {/* Exchange keys */}
      <div className="card">
        <div className="card-title">Binance Exchange Keys</div>
        <p style={{ fontSize:12, color:"var(--muted)", marginBottom:14, lineHeight:1.6 }}>
          Keys are encrypted with AES-256 (Fernet) before being stored in the database.
          Get testnet keys from <a href="https://testnet.binance.vision" target="_blank" rel="noreferrer"
          style={{ color:"var(--accent)" }}>testnet.binance.vision</a>
        </p>
        <form onSubmit={saveExchangeKeys} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div className="form-grid">
            <div className="field">
              <label>API Key</label>
              <input value={exchForm.api_key} onChange={e => setExchForm(f=>({...f,api_key:e.target.value}))}
                placeholder={keysStatus?.has_exchange_keys ? "••••••••••••• (stored)" : "Enter API key"}
                required={!keysStatus?.has_exchange_keys} />
            </div>
            <div className="field">
              <label>API Secret</label>
              <input type="password" value={exchForm.api_secret} onChange={e => setExchForm(f=>({...f,api_secret:e.target.value}))}
                placeholder={keysStatus?.has_exchange_keys ? "••••••••••••• (stored)" : "Enter API secret"}
                required={!keysStatus?.has_exchange_keys} />
            </div>
          </div>
          <div className="field">
            <label>Base URL</label>
            <select value={exchForm.api_base_url} onChange={e => setExchForm(f=>({...f,api_base_url:e.target.value}))}>
              <option value="https://testnet.binance.vision">Testnet — testnet.binance.vision</option>
              <option value="https://api.binance.com">Live — api.binance.com</option>
            </select>
          </div>
          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={exchLoading}>
              {exchLoading ? "Saving…" : keysStatus?.has_exchange_keys ? "Update Keys" : "Save Keys"}
            </button>
            {keysStatus?.has_exchange_keys && (
              <button type="button" className="btn btn-red btn-sm" onClick={deleteExchangeKeys}>Remove</button>
            )}
          </div>
        </form>
      </div>

      {/* Gemini key */}
      <div className="card">
        <div className="card-title">Gemini AI Key</div>
        <p style={{ fontSize:12, color:"var(--muted)", marginBottom:14, lineHeight:1.6 }}>
          Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
          style={{ color:"var(--accent)" }}>aistudio.google.com</a>. Stored encrypted.
        </p>
        <form onSubmit={saveGeminiKey} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div className="form-grid">
            <div className="field">
              <label>Gemini API Key</label>
              <input type="password" value={gemForm.gemini_api_key} onChange={e => setGemForm(f=>({...f,gemini_api_key:e.target.value}))}
                placeholder={keysStatus?.has_gemini_key ? "••••••••••••• (stored)" : "AIzaSy..."}
                required={!keysStatus?.has_gemini_key} />
            </div>
            <div className="field">
              <label>Model</label>
              <select value={gemForm.gemini_model} onChange={e => setGemForm(f=>({...f,gemini_model:e.target.value}))}>
                <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (recommended)</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              </select>
            </div>
          </div>
          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={gemLoading}>
              {gemLoading ? "Saving…" : keysStatus?.has_gemini_key ? "Update Key" : "Save Key"}
            </button>
            {keysStatus?.has_gemini_key && (
              <button type="button" className="btn btn-red btn-sm" onClick={deleteGeminiKey}>Remove</button>
            )}
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="card">
        <div className="card-title">Change Password</div>
        <form onSubmit={changePassword} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div className="field">
            <label>Current Password</label>
            <input type="password" value={pwForm.current_password}
              onChange={e => setPwForm(f=>({...f,current_password:e.target.value}))} required />
          </div>
          <div className="form-grid">
            <div className="field">
              <label>New Password</label>
              <input type="password" value={pwForm.new_password} minLength={8}
                onChange={e => setPwForm(f=>({...f,new_password:e.target.value}))} required />
            </div>
            <div className="field">
              <label>Confirm New Password</label>
              <input type="password" value={pwForm.confirm} minLength={8}
                onChange={e => setPwForm(f=>({...f,confirm:e.target.value}))} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={pwLoading} style={{ alignSelf:"flex-start" }}>
            {pwLoading ? "Updating…" : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
