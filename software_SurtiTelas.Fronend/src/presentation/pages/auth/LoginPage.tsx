import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '@/app/providers/AppProviders';
import { toast } from 'sonner';
import partnerLogo from '@/assets/images/logos/partner-logo-2-Photoroom.png';
import { authApi } from '@/infrastructure/api/authApi';
import { tokenStorage } from '@/infrastructure/api/tokenStorage';
import { mapRole } from '@/core/stores/authStore';
import { ApiError } from '@/infrastructure/api/httpClient';
import { appContent } from '@/shared/config/appContent';
import './AuthPage.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithCredentials, clearReturnTo, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, _setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const describeLoginError = (raw: string | undefined): string => {
    const text = (raw ?? '').toLowerCase();
    if (text.includes('credencial') || text.includes('401') || text.includes('unauthor') || text.includes('invalid')) {
      return 'Email o contraseña incorrectos. Verifica los datos e inténtalo de nuevo.';
    }
    if (text.includes('network') || text.includes('fetch') || text.includes('conexión')) {
      return 'No se pudo conectar con el servidor. Revisa tu conexión a internet.';
    }
    return raw ?? 'No se pudo iniciar sesión. Intenta de nuevo.';
  };

  const isAdminLikeRole = (role: string | undefined): boolean =>
  role === 'admin' || role === 'almacen' || role === 'produccion' || role === 'reportes';

const getDestination = (role: string | undefined, _explicitRedirect?: string | null): string => {
  if (isAdminLikeRole(role)) return '/admin/dashboard';
  if (role === 'asesor') return '/asesor/dashboard';
  if (role === 'domiciliario') return '/domiciliario/dashboard';

  // Rol cliente: tras autenticarse siempre volvemos a la landing '/'.
  // Se ignora cualquier estado de navegación, referrer o ruta de origen.
  return '/';
};

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);

    let result;
    try {
      result = await loginWithCredentials(email.trim().toLowerCase(), password);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? describeLoginError(err.message)
          : 'No se pudo iniciar sesión. Intenta de nuevo.';
      setFormError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    if (result.success) {
      clearReturnTo();
      toast.success('¡Sesión iniciada exitosamente!');
      const destination = getDestination(result.role);
      setTimeout(() => navigate(destination, { replace: true }), 600);
    } else {
      const friendly = describeLoginError(result.error);
      setFormError(friendly);
      toast.error(friendly);
    }

    setLoading(false);
  };

  const handleGoogleSuccess = useCallback(async (response: { credential?: string }) => {
    if (!response.credential) {
      toast.error('No se pudo obtener el token de Google');
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.googleLogin(response.credential);
      tokenStorage.setAccessToken(result.accessToken);
      const role = mapRole(result.user.role);
      login({
        uid: result.user.id,
        email: result.user.email,
        name: result.user.nombre,
        role,
        permissions: result.user.permissions,
      });
      clearReturnTo();
      toast.success('¡Autenticado con Google!');
      const destination = getDestination(role);
      setTimeout(() => navigate(destination, { replace: true }), 800);
    } catch {
      toast.error('Error al autenticar con Google');
    } finally {
      setLoading(false);
    }
    // getDestination es una función pura a nivel de módulo; no cambia entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [login, clearReturnTo, navigate]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || typeof window === 'undefined' || !window.google) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleSuccess,
      });
      window.google.accounts.id.prompt();
    };

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [handleGoogleSuccess]);

  return (
    <div className="authPage">
      {/* Left Panel - Branding */}
      <aside className="leftPanel">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="panelDivider" />

        <div className="leftLogo">
          <button
            type="button"
            className="auth-back-btn"
            onClick={() => navigate('/')}
            aria-label="Volver al inicio"
          >
            <ArrowLeft size={16} />
            <span>Volver al inicio</span>
          </button>
          <img src={partnerLogo} alt="Surtitelas" className="partnerLogo" />
        </div>

        <div className="leftContent">
          <p className="leftTagline">{appContent.brand.tagline}</p>
          <h1 className="leftHeading">{appContent.auth.heading}</h1>
          <p className="leftDesc">{appContent.auth.description}</p>
        </div>
      </aside>

      {/* Right Panel - Form */}
      <main className="rightPanel">
        <div className="formCard">
          <div className="mobileLogo">
            <div className="mobileLogoIcon">ST</div>
            <span className="mobileLogoText">Surtitelas</span>
          </div>

          <div className="formHeader">
            <p className="formWelcome">Bienvenido de nuevo</p>
            <h2 className="formTitle">Inicia sesión</h2>
            <p className="formSubtitle">Accede al panel de gestión de tu empresa.</p>
          </div>

          <div className="tabToggle">
            <button className="tabBtn tabBtn--active">Iniciar sesión</button>
            <button className="tabBtn" onClick={() => navigate('/registro')}>Registrarse</button>
          </div>

          {GOOGLE_CLIENT_ID && (
            <div id="g_id_onload" data-client_id={GOOGLE_CLIENT_ID} data-callback="handleGoogleSuccess" data-auto_prompt="false" />
          )}

          <div className="divider">
            <div className="dividerLine" />
            <span className="dividerText">o continúa con email</span>
            <div className="dividerLine" />
          </div>

          <form className="form" onSubmit={handleLogin} noValidate>
            {formError && (
              <div className="formErrorBanner" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{formError}</span>
              </div>
            )}
            <div className="fieldWrap fieldWrap--icon">
              <input
                className="fieldInput"
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
              <label className="fieldLabel">Correo electrónico</label>
              <span className="fieldIcon"><Mail size={16} /></span>
            </div>

            <div className="fieldWrap fieldWrap--icon">
              <input
                className="fieldInput"
                type={showPass ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <label className="fieldLabel">Contraseña</label>
              <button className="fieldIcon" type="button" onClick={() => setShowPass(v => !v)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="formExtras">
              <label className="checkboxWrap">
                <input className="checkboxInput" type="checkbox" />
                <div className="checkboxBox" />
                <span className="checkboxLabel">Recordar sesión</span>
              </label>
              <a href="/olvide-contrasena" className="forgotLink">¿Olvidaste tu contraseña?</a>
            </div>

            <button type="submit" className={`submitBtn ${loading ? 'submitBtn--loading' : ''}`} disabled={loading}>
              <span className="btnInner">{loading && <span className="spinner" />}
                {loading ? 'Verificando...' : 'Iniciar sesión'}
              </span>
            </button>
          </form>

          <div className="formFooter">
            ¿No tienes cuenta?{' '}
            <button className="switchLink" onClick={() => navigate('/registro')}>Regístrate gratis</button>
          </div>
        </div>
      </main>

      {success && (
        <div className="successToast">
          <div className="toastIcon"><Mail size={16} /></div>
          <div>
            <div className="toastTitle">¡Sesión iniciada!</div>
            <div className="toastDesc">Redirigiendo al panel...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;