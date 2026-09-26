import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import partnerLogo from '@/assets/images/logos/partner-logo-2-Photoroom.png';
import { authApi } from '@/infrastructure/api/authApi';
import { Turnstile } from '@marsidev/react-turnstile';
import './AuthPage.css';

const isDevelopment = import.meta.env.DEV;

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('El email es obligatorio');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email inválido');
      return;
    }

    if (!isDevelopment && !turnstileToken) {
      setError('Verificación de seguridad pendiente. Recarga la página.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authApi.forgotPassword({ email, ...(isDevelopment || !turnstileToken ? {} : { turnstileToken }) });
      setSuccess(true);
      toast.success('Si el correo existe, recibirás un enlace de recuperación.');
    } catch (error) {
      const apiError = error as { status?: number } | undefined;
      if (apiError?.status === 429) {
        setError('Demasiados intentos. Esperá 1 hora antes de reintentar.');
        toast.error('Demasiados intentos');
      } else {
        setError('No se pudo procesar la solicitud. Intenta nuevamente.');
        toast.error('Error al enviar solicitud');
      }
    } finally {
      setLoading(false);
    }
  };

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
          <p className="leftTagline">Plataforma de gestión</p>
          <h1 className="leftHeading">
            Recupera tu acceso<br />en segundos
          </h1>
          <p className="leftDesc">
            Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.
          </p>
        </div>

        <div className="testimonial">
          <p className="testimonialQuote">
            Tu seguridad es nuestra prioridad. Protegemos tus datos con encriptación de última generación.
          </p>
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
            <p className="formWelcome">Recuperar contraseña</p>
            <h2 className="formTitle">¿Olvidaste tu contraseña?</h2>
            <p className="formSubtitle">
              Ingresa tu correo electrónico para recibir un enlace de recuperación.
            </p>
          </div>

          <div className="tabToggle">
            <button className="tabBtn" onClick={() => navigate('/login')}>Iniciar sesión</button>
            <button className="tabBtn" onClick={() => navigate('/registro')}>Registrarse</button>
          </div>

          {!success ? (
            <div className="form">
              <div className="fieldWrap fieldWrap -= 1icon">
                <input
                  className={`fieldInput ${error ? 'fieldInput -= 1error' : ''}`}
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                />
                <label className="fieldLabel">Correo electrónico</label>
                <span className="fieldIcon"><Mail size={16} /></span>
                {error && <span className="fieldError">{error}</span>}
              </div>

              {!isDevelopment && (
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                  <Turnstile
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                    onSuccess={(token: string) => setTurnstileToken(token)}
                    onError={() => setError('Error de verificación. Intenta nuevamente.')}
                    onExpire={() => setTurnstileToken(null)}
                    options={{ theme: 'light', language: 'es' }}
                  />
                </div>
              )}

              <button className={`submitBtn ${loading ? 'submitBtn -= 1loading' : ''}`} onClick={handleSubmit} disabled={loading}>
                <span className="btnInner">
                  {loading ? <span className="spinner" /> : <Mail size={18} />}
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </span>
              </button>

              <div className="formFooter">
                ¿Recordaste tu contraseña?{' '}
                <button className="switchLink" onClick={() => navigate('/login')}>Inicia sesión</button>
              </div>
            </div>
          ) : (
            <div className="form">
              <div className="successState" style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle2 size={48} color="#22c55e" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111111', marginBottom: '8px' }}>
                  ¡Solicitud procesada!
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#555555', lineHeight: 1.6 }}>
                  Si el correo existe, recibirás instrucciones para restablecer tu contraseña.
                </p>
              </div>

              <button className="submitBtn" onClick={() => navigate('/login')}>
                <span className="btnInner">Volver al inicio de sesión</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ForgotPasswordPage;
