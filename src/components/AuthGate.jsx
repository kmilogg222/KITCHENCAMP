/**
 * @file AuthGate.jsx
 * @description Componente de autenticación que actúa como gate de acceso a la app.
 * Si no hay sesión activa, muestra un modal de login/signup con diseño glass-card.
 * Si hay sesión, renderiza los children normalmente.
 * Si USE_SUPABASE = false, renderiza los children directamente (modo localStorage).
 */
import { useState } from 'react';
import { useAuthContext } from '../hooks/AuthContext';
import { USE_SUPABASE } from '../lib/db/client';
import { COLORS, INPUT_STYLE } from '../constants/theme';
import { ChefHat, LogIn, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';

// ── Componente principal ────────────────────────────────────────────────────────
export default function AuthGate({ children }) {
  const { user, loading } = useAuthContext();

  // Si Supabase no está configurado, pasar directo (retrocompatibilidad)
  if (!USE_SUPABASE) return children;

  // Pantalla de carga inicial mientras se verifica la sesión
  if (loading) return <SplashLoader />;

  // Usuario autenticado: renderizar la app
  if (user) return children;

  // Sin sesión: mostrar el modal de auth
  return <AuthModal />;
}

// ── Splash loader mientras se resuelve la sesión ────────────────────────────────
function SplashLoader() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'linear-gradient(135deg, #1a0b35 0%, #3d1a78 50%, #1a0b35 100%)',
      gap: 16,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'linear-gradient(135deg, #4ecdc4, #38b2ac)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 32px rgba(78,205,196,0.4)',
      }}>
        <ChefHat size={32} color="white" />
      </div>
      <Loader2 size={20} color="#9b6dca" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Modal de autenticación ──────────────────────────────────────────────────────
function AuthModal() {
  const { signIn, signUp } = useAuthContext();
  const [tab, setTab]           = useState('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [showCfm, setShowCfm]   = useState(false);
  const [errors, setErrors]     = useState({});
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next = {};
    if (!email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email.';
    if (!password) next.password = 'Password is required.';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters.';
    if (tab === 'signup') {
      if (!confirm) next.confirm = 'Please confirm your password.';
      else if (confirm !== password) next.confirm = 'Passwords do not match.';
    }
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length > 0) { setErrors(validation); return; }
    setErrors({});
    setAuthError('');
    setSubmitting(true);

    const fn = tab === 'signin' ? signIn : signUp;
    const { error } = await fn(email, password);

    setSubmitting(false);
    if (error) {
      setAuthError(error.message || 'Authentication failed. Please try again.');
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0b35 0%, #3d1a78 50%, #1a0b35 100%)',
      padding: 24,
    }}>
      {/* Orbs decorativos */}
      <div style={{ position: 'fixed', top: '10%', left: '5%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(78,205,196,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '15%', right: '8%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(155,109,202,0.1) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{
        width: '100%', maxWidth: 420,
        background: 'rgba(61,26,120,0.55)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(155,109,202,0.3)', borderRadius: 24,
        padding: '40px 36px', boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #4ecdc4, #38b2ac)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(78,205,196,0.35)' }}>
            <ChefHat size={32} color="white" />
          </div>
          <h1 style={{ color: 'white', fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>KitchenCalc</h1>
          <p style={{ color: 'rgba(212,195,240,0.7)', fontSize: 13, margin: '6px 0 0' }}>Smart kitchen inventory &amp; requisition</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 4, marginBottom: 28 }}>
          {[{ key: 'signin', label: 'Sign In', icon: LogIn }, { key: 'signup', label: 'Sign Up', icon: UserPlus }].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setTab(key); setErrors({}); setAuthError(''); }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s', background: tab === key ? 'rgba(78,205,196,0.25)' : 'transparent', color: tab === key ? '#4ecdc4' : 'rgba(255,255,255,0.5)', boxShadow: tab === key ? 'inset 0 0 0 1px rgba(78,205,196,0.4)' : 'none' }}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', color: 'rgba(212,195,240,0.85)', fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 0.3 }}>EMAIL</label>
            <input id="auth-email" type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }} placeholder="chef@kitchen.com"
              style={{ ...INPUT_STYLE, background: 'rgba(255,255,255,0.08)', border: `1.5px solid ${errors.email ? COLORS.danger : 'rgba(155,109,202,0.35)'}`, color: 'white' }} autoComplete="email" />
            {errors.email && <p style={{ color: COLORS.danger, fontSize: 11, margin: '4px 0 0' }}>{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', color: 'rgba(212,195,240,0.85)', fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 0.3 }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input id="auth-password" type={showPwd ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }} placeholder="Min. 6 characters"
                style={{ ...INPUT_STYLE, background: 'rgba(255,255,255,0.08)', border: `1.5px solid ${errors.password ? COLORS.danger : 'rgba(155,109,202,0.35)'}`, color: 'white', paddingRight: 40 }} autoComplete={tab === 'signin' ? 'current-password' : 'new-password'} />
              <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(155,109,202,0.7)', padding: 0 }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p style={{ color: COLORS.danger, fontSize: 11, margin: '4px 0 0' }}>{errors.password}</p>}
          </div>

          {/* Confirm password */}
          {tab === 'signup' && (
            <div>
              <label style={{ display: 'block', color: 'rgba(212,195,240,0.85)', fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 0.3 }}>CONFIRM PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input id="auth-confirm" type={showCfm ? 'text' : 'password'} value={confirm} onChange={e => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: '' })); }} placeholder="Repeat password"
                  style={{ ...INPUT_STYLE, background: 'rgba(255,255,255,0.08)', border: `1.5px solid ${errors.confirm ? COLORS.danger : 'rgba(155,109,202,0.35)'}`, color: 'white', paddingRight: 40 }} autoComplete="new-password" />
                <button type="button" onClick={() => setShowCfm(v => !v)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(155,109,202,0.7)', padding: 0 }}>
                  {showCfm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirm && <p style={{ color: COLORS.danger, fontSize: 11, margin: '4px 0 0' }}>{errors.confirm}</p>}
            </div>
          )}

          {/* Error de Supabase */}
          {authError && (
            <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10, padding: '10px 14px', color: '#fca5a5', fontSize: 13, lineHeight: 1.4 }}>
              {authError}
            </div>
          )}

          {/* Submit */}
          <button id="auth-submit-btn" type="submit" disabled={submitting}
            style={{ padding: '13px 0', borderRadius: 12, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', background: submitting ? 'rgba(78,205,196,0.4)' : 'linear-gradient(135deg, #4ecdc4, #38b2ac)', color: 'white', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s', marginTop: 4, boxShadow: submitting ? 'none' : '0 4px 16px rgba(78,205,196,0.3)' }}>
            {submitting
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
              : tab === 'signin' ? <><LogIn size={16} /> Sign In</> : <><UserPlus size={16} /> Create Account</>}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'rgba(155,109,202,0.5)', fontSize: 11, marginTop: 24, marginBottom: 0 }}>
          Your data is private and secured by Supabase RLS.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        #auth-email::placeholder, #auth-password::placeholder, #auth-confirm::placeholder { color: rgba(155,109,202,0.45); }
      `}</style>
    </div>
  );
}
