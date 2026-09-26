import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Eye, EyeOff, Phone, Building2, Check } from 'lucide-react';
import { useAuth } from '@/app/providers/AppProviders';
import { toast } from 'sonner';
import { appContent } from '@/shared/config/appContent';
import './AuthPage.css';

type Tab = 'login' | 'register';
type RoleId = 'admin' | 'asesor' | 'domiciliario' | 'cliente';

const ROLES: { id: RoleId; icon: React.ReactNode; label: string; desc: string; iconClass: string }[] = appContent.auth.roles as { id: RoleId; icon: React.ReactNode; label: string; desc: string; iconClass: string }[];

function passwordStrength(pwd: string): null | 'weak' | 'fair' | 'strong' {
  if (!pwd) return null;
  const score = [/[a-z]/.test(pwd), /[A-Z]/.test(pwd), /\d/.test(pwd), /[^a-zA-Z0-9]/.test(pwd), pwd.length >= 8].filter(Boolean).length;
  if (score <= 2) return 'weak';
  if (score <= 3) return 'fair';
  return 'strong';
}

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/catalogo';
  const { loginWithCredentials, clearReturnTo } = useAuth();

  const [tab, setTab] = useState<Tab>('login');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [reg, setReg] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    password: '',
    confirm: '',
    role: 'cliente' as RoleId,
    terms: false,
  });

  const switchTab = (t: Tab) => { setTab(t); setErrors({}); setSuccess(false); };

  const validateLogin = (): boolean => {
    const e: Record<string, string> = {};
    if (!loginEmail) e.email = 'El email es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) e.email = 'Email inválido';
    if (!loginPassword) e.password = 'La contraseña es obligatoria';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateRegister = (): boolean => {
    const e: Record<string, string> = {};
    if (!reg.firstName.trim()) e.firstName = 'Campo obligatorio';
    if (!reg.lastName.trim()) e.lastName = 'Campo obligatorio';
    if (!reg.email) e.email = 'El email es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reg.email)) e.email = 'Email inválido';
    if (!reg.password) e.password = 'La contraseña es obligatoria';
    else if (reg.password.length < 8) e.password = 'Mínimo 8 caracteres';
    if (reg.password !== reg.confirm) e.confirm = 'Las contraseñas no coinciden';
    if (!reg.terms) e.terms = 'Debes aceptar los términos';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validateLogin()) return;
    setLoading(true);
    try {
      const result = await loginWithCredentials(loginEmail.trim(), loginPassword);
      if (result.success) {
        clearReturnTo();
        setSuccess(true);
        toast.success('¡Sesión iniciada exitosamente!');
        setTimeout(() => navigate(from, { replace: true }), 1000);
      } else {
        toast.error(result.error || 'Credenciales incorrectas');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validateRegister()) return;
    setLoading(true);
    try {
      const result = await loginWithCredentials(reg.email.trim(), reg.password);
      if (result.success) {
        setSuccess(true);
        toast.success('¡Cuenta creada exitosamente!');
        setTimeout(() => navigate(from, { replace: true }), 1000);
      } else {
        toast.error('No se pudo crear la cuenta. Use credenciales de prueba');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = useCallback(async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSuccess(true);
    toast.success('¡Autenticado con Google!');
    setTimeout(() => navigate(from, { replace: true }), 1000);
  }, [navigate, from]);

  const pwdStrength = passwordStrength(reg.password);

  return (
    <div className="authPage">
      {/* Left Panel - Branding */}
      <aside className="leftPanel">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="panelDivider" />

        <div className="leftLogo">
          <div className="leftLogoIcon">ST</div>
          <span className="leftLogoText">Surtitelas</span>
        </div>

        <div className="leftContent">
          <p className="leftTagline">{appContent.brand.tagline}</p>
          <h1 className="leftHeading">
            {appContent.auth.heading}
          </h1>
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
            <p className="formWelcome">{tab === 'login' ? 'Bienvenido de nuevo' : 'Únete ahora'}</p>
            <h2 className="formTitle">{tab === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h2>
            <p className="formSubtitle">
              {tab === 'login' ? 'Accede al panel de gestión de tu empresa.' : 'Completa tu información y comienza en segundos.'}
            </p>
          </div>

          {/* Tabs */}
          <div className="tabToggle">
            <button className={`tabBtn ${tab === 'login' ? 'tabBtn -= 1active' : ''}`} onClick={() => switchTab('login')}>
              Iniciar sesión
            </button>
            <button className={`tabBtn ${tab === 'register' ? 'tabBtn -= 1active' : ''}`} onClick={() => switchTab('register')}>
              Registrarse
            </button>
          </div>

          {/* Google Button */}
          <button className="googleBtn" onClick={handleGoogle} disabled={loading}>
            <svg className="googleIcon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          <div className="divider">
            <div className="dividerLine" />
            <span className="dividerText">o continúa con email</span>
            <div className="dividerLine" />
          </div>

          {/* Login Form */}
          {tab === 'login' && (
            <div className="formSlide">
              <div className="form">
                <div className="fieldWrap fieldWrap -= 1icon">
                  <input
                    className={`fieldInput ${errors.email ? 'fieldInput -= 1error' : ''}`}
                    type="email"
                    placeholder="Email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <label className="fieldLabel">Correo electrónico</label>
                  <span className="fieldIcon"><Mail size={16} /></span>
                  {errors.email && <span className="fieldError">{errors.email}</span>}
                </div>

                <div className="fieldWrap fieldWrap -= 1icon">
                  <input
                    className={`fieldInput ${errors.password ? 'fieldInput -= 1error' : ''}`}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Contraseña"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <label className="fieldLabel">Contraseña</label>
                  <button className="fieldIcon" type="button" onClick={() => setShowPwd(v => !v)}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {errors.password && <span className="fieldError">{errors.password}</span>}
                </div>

                <div className="formExtras">
                  <label className="checkboxWrap">
                    <input className="checkboxInput" type="checkbox" />
                    <div className="checkboxBox" />
                    <span className="checkboxLabel">Recordar sesión</span>
                  </label>
                  <a href="/olvide-contrasena" className="forgotLink">¿Olvidaste tu contraseña?</a>
                </div>

                <button className={`submitBtn ${loading ? 'submitBtn -= 1loading' : ''}`} onClick={handleLogin} disabled={loading}>
                  <span className="btnInner">{loading && <span className="spinner" />}
                    {loading ? 'Verificando...' : 'Iniciar sesión'}
                  </span>
                </button>
              </div>

              <div className="formFooter">
                ¿No tienes cuenta?{' '}
                <button className="switchLink" onClick={() => switchTab('register')}>Regístrate gratis</button>
              </div>
            </div>
          )}

          {/* Register Form */}
          {tab === 'register' && (
            <div className="formSlide">
              <div className="form">
                <div className="formRow">
                  <div className="fieldWrap">
                    <input
                      className={`fieldInput ${errors.firstName ? 'fieldInput -= 1error' : ''}`}
                      type="text"
                      placeholder="Nombre"
                      value={reg.firstName}
                      onChange={e => setReg(p => ({ ...p, firstName: e.target.value }))}
                    />
                    <label className="fieldLabel">Nombre</label>
                    {errors.firstName && <span className="fieldError">{errors.firstName}</span>}
                  </div>
                  <div className="fieldWrap">
                    <input
                      className={`fieldInput ${errors.lastName ? 'fieldInput -= 1error' : ''}`}
                      type="text"
                      placeholder="Apellido"
                      value={reg.lastName}
                      onChange={e => setReg(p => ({ ...p, lastName: e.target.value }))}
                    />
                    <label className="fieldLabel">Apellido</label>
                    {errors.lastName && <span className="fieldError">{errors.lastName}</span>}
                  </div>
                </div>

                <div className="fieldWrap fieldWrap -= 1icon">
                  <input
                    className={`fieldInput ${errors.email ? 'fieldInput -= 1error' : ''}`}
                    type="email"
                    placeholder="Email"
                    value={reg.email}
                    onChange={e => setReg(p => ({ ...p, email: e.target.value }))}
                    autoComplete="email"
                  />
                  <label className="fieldLabel">Correo electrónico</label>
                  <span className="fieldIcon"><Mail size={16} /></span>
                  {errors.email && <span className="fieldError">{errors.email}</span>}
                </div>

                <div className="formRow">
                  <div className="fieldWrap fieldWrap -= 1icon">
                    <input
                      className="fieldInput"
                      type="tel"
                      placeholder="Teléfono"
                      value={reg.phone}
                      onChange={e => setReg(p => ({ ...p, phone: e.target.value }))}
                    />
                    <label className="fieldLabel">Teléfono</label>
                    <span className="fieldIcon"><Phone size={16} /></span>
                  </div>
                  <div className="fieldWrap fieldWrap -= 1icon">
                    <input
                      className="fieldInput"
                      type="text"
                      placeholder="Empresa"
                      value={reg.company}
                      onChange={e => setReg(p => ({ ...p, company: e.target.value }))}
                    />
                    <label className="fieldLabel">Empresa</label>
                    <span className="fieldIcon"><Building2 size={16} /></span>
                  </div>
                </div>

                <div>
                  <div className="fieldWrap fieldWrap -= 1icon">
                    <input
                      className={`fieldInput ${errors.password ? 'fieldInput -= 1error' : ''}`}
                      type={showPwd ? 'text' : 'password'}
                      placeholder="Contraseña"
                      value={reg.password}
                      onChange={e => setReg(p => ({ ...p, password: e.target.value }))}
                      autoComplete="new-password"
                    />
                    <label className="fieldLabel">Contraseña</label>
                    <button className="fieldIcon" type="button" onClick={() => setShowPwd(v => !v)}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {errors.password && <span className="fieldError">{errors.password}</span>}
                  </div>
                  {pwdStrength && (
                    <div className="passwordStrength">
                      <div className="strengthTrack">
                        <div className={`strengthFill strengthFill -= 1${pwdStrength}`} />
                      </div>
                      <span className={`strengthLabel strengthLabel -= 1${pwdStrength}`}>
                        {pwdStrength === 'weak' && 'Contraseña débil'}
                        {pwdStrength === 'fair' && 'Contraseña moderada'}
                        {pwdStrength === 'strong' && 'Contraseña fuerte ✓'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="fieldWrap fieldWrap -= 1icon">
                  <input
                    className={`fieldInput ${errors.confirm ? 'fieldInput -= 1error' : ''}`}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirmar"
                    value={reg.confirm}
                    onChange={e => setReg(p => ({ ...p, confirm: e.target.value }))}
                    autoComplete="new-password"
                  />
                  <label className="fieldLabel">Confirmar contraseña</label>
                  <button className="fieldIcon" type="button" onClick={() => setShowConfirm(v => !v)}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {errors.confirm && <span className="fieldError">{errors.confirm}</span>}
                </div>

                <div>
                  <p className="roleSectionLabel">Selecciona tu rol</p>
                  <div className="roleGrid">
                    {ROLES.map(role => (
                      <button
                        key={role.id}
                        type="button"
                        className={`roleOption ${reg.role === role.id ? 'roleOption -= 1selected' : ''}`}
                        onClick={() => setReg(p => ({ ...p, role: role.id }))}
                      >
                        <div className="roleOptionCheck" />
                        <div className={`roleIcon ${role.iconClass}`}><span>{role.icon}</span></div>
                        <span className="roleLabel">{role.label}</span>
                        <span className="roleDesc">{role.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="checkboxWrap">
                    <input
                      className="checkboxInput"
                      type="checkbox"
                      checked={reg.terms}
                      onChange={e => setReg(p => ({ ...p, terms: e.target.checked }))}
                    />
                    <div className="checkboxBox" />
                    <span className="checkboxLabel">
                      Acepto los <a href="#" className="termsLink">Términos de servicio</a> y la{' '}
                      <a href="#" className="termsLink">Política de privacidad</a>
                    </span>
                  </label>
                  {errors.terms && <span className="fieldError" style={{ marginTop: 4, display: 'block' }}>{errors.terms}</span>}
                </div>

                <button className={`submitBtn ${loading ? 'submitBtn -= 1loading' : ''}`} onClick={handleRegister} disabled={loading}>
                  <span className="btnInner">{loading && <span className="spinner" />}
                    {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
                  </span>
                </button>
              </div>

              <div className="formFooter">
                ¿Ya tienes cuenta?{' '}
                <button className="switchLink" onClick={() => switchTab('login')}>Inicia sesión</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {success && (
        <div className="successToast">
          <div className="toastIcon"><Check size={16} /></div>
          <div>
            <div className="toastTitle">{tab === 'login' ? '¡Sesión iniciada!' : '¡Cuenta creada!'}</div>
            <div className="toastDesc">Redirigiendo al panel...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthPage;
