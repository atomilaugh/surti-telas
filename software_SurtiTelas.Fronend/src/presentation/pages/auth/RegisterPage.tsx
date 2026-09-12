import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Eye, EyeOff, MapPin, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import partnerLogo from '@/assets/images/logos/partner-logo-2-Photoroom.png';
import { authApi } from '@/infrastructure/api/authApi';
import { tokenStorage } from '@/infrastructure/api/tokenStorage';
import { useAuthStore, mapRole } from '@/core/stores/authStore';
import { appContent } from '@/shared/config/appContent';
import { isValidPhone } from '@/shared/utils/phone';
import { isValidDocumentNumber } from '@/shared/utils/document';
import './AuthPage.css';

const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía (CC)' },
  { value: 'NIE', label: 'NIE' },
  { value: 'PASSPORT', label: 'Pasaporte' },
  { value: 'CE', label: 'Cédula de Extranjería (CE)' },
  { value: 'OTHER', label: 'Otro' },
] as const;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
   const login = useAuthStore((s) => s.login);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [documentType, setDocumentType] = useState('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submittedRef = useRef(false);

  const passwordStrength = (pwd: string): null | 'weak' | 'fair' | 'strong' => {
    if (!pwd) return null;
    const score = [/[a-z]/.test(pwd), /[A-Z]/.test(pwd), /\d/.test(pwd), /[^a-zA-Z0-9]/.test(pwd), pwd.length >= 8].filter(Boolean).length;
    if (score <= 2) return 'weak';
    if (score <= 3) return 'fair';
    return 'strong';
  };

  const validateRegister = (): boolean => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'Campo obligatorio';
    if (!lastName.trim()) e.lastName = 'Campo obligatorio';
    if (!email) e.email = 'El email es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email inválido';
    if (!documentNumber.trim()) e.documentNumber = 'El número de documento es obligatorio';
    else if (!isValidDocumentNumber(documentNumber.trim(), documentType)) e.documentNumber = 'Documento inválido para el tipo seleccionado';
    if (phone.trim() && !isValidPhone(phone.trim())) e.phone = 'Teléfono inválido. Usa formato: 3001234567 o +573001234567';
    if (address.trim() && address.trim().length > 150) e.address = 'Máximo 150 caracteres';
    if (!password) e.password = 'La contraseña es obligatoria';
    else if (password.length < 8) e.password = 'Mínimo 8 caracteres';
    if (password !== confirmPassword) e.confirm = 'Las contraseñas no coinciden';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

   const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittedRef.current) return;
    if (!validateRegister()) return;
    submittedRef.current = true;
    setLoading(true);
    try {
      const nombre = firstName.trim();
      const apellidos = lastName.trim();
       const result = await authApi.register({
         nombre,
         apellidos,
         email: email.trim(),
         password,
         role: 'CLIENTE',
         telefono: phone.trim() || undefined,
         direccion: address.trim() || undefined,
         tipoDocumento: documentType,
         numeroDocumento: documentNumber.trim() || undefined,
       });

       tokenStorage.setAccessToken(result.accessToken);
       const role = mapRole(result.user.role);
       login({
         uid: result.user.id,
         email: result.user.email,
         name: result.user.nombre,
         role,
         permissions: result.user.permissions,
         avatar: result.user.avatar,
       });
       setSuccess(true);
       setTimeout(() => navigate('/cliente/inicio', { replace: true }), 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la cuenta';
      if (message.toLowerCase().includes('ya está registrado') || message.toLowerCase().includes('ya existe') || message.toLowerCase().includes('duplicado')) {
        toast.error(`No se puede crear la cuenta: ${message}`);
      } else if (message.includes('422')) {
        toast.error(`No se puede crear la cuenta: datos inválidos - ${message}`);
      } else {
        toast.error(`No se puede crear la cuenta: ${message}`);
      }
    } finally {
      setLoading(false);
      submittedRef.current = false;
    }
  };

  const pwdStrength = passwordStrength(password);

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
            <p className="formWelcome">Únete ahora</p>
            <h2 className="formTitle">Crea tu cuenta</h2>
            <p className="formSubtitle">Completa tu información y comienza en segundos.</p>
          </div>

          <div className="tabToggle">
            <button className="tabBtn" type="button" onClick={() => navigate('/login')}>Iniciar sesión</button>
            <button className="tabBtn tabBtn--active" type="button">Registrarse</button>
          </div>

          <form className="form" onSubmit={handleRegister} noValidate>
            <div className="fieldWrap">
              <input
                className={`fieldInput ${errors.firstName ? 'fieldInput--error' : ''}`}
                type="text"
                placeholder="Nombre"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
              />
              <label className="fieldLabel">Nombre</label>
              {errors.firstName && <span className="fieldError">{errors.firstName}</span>}
            </div>

            <div className="fieldWrap">
              <input
                className={`fieldInput ${errors.lastName ? 'fieldInput--error' : ''}`}
                type="text"
                placeholder="Apellido"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
              />
              <label className="fieldLabel">Apellido</label>
              {errors.lastName && <span className="fieldError">{errors.lastName}</span>}
            </div>

            <div className="fieldWrap fieldWrap--icon">
              <input
                className={`fieldInput ${errors.email ? 'fieldInput--error' : ''}`}
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
              <label className="fieldLabel">Correo electrónico</label>
              <span className="fieldIcon"><Mail size={18} /></span>
              {errors.email && <span className="fieldError">{errors.email}</span>}
            </div>

            <div className="fieldWrap">
              <input
                className={`fieldInput ${errors.phone ? 'fieldInput--error' : ''}`}
                type="tel"
                placeholder="Número telefónico"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              <label className="fieldLabel">Número telefónico</label>
              {errors.phone && <span className="fieldError">{errors.phone}</span>}
            </div>

            <div className="fieldWrap fieldWrap--icon">
              <input
                className={`fieldInput ${errors.address ? 'fieldInput--error' : ''}`}
                type="text"
                placeholder="Dirección"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
              <label className="fieldLabel">Dirección</label>
              <span className="fieldIcon"><MapPin size={18} /></span>
              {errors.address && <span className="fieldError">{errors.address}</span>}
            </div>

            <div className="formRow">
              <div className="fieldWrap fieldWrap--icon">
                <select
                  className={`fieldInput ${errors.documentType ? 'fieldInput--error' : ''}`}
                  value={documentType}
                  onChange={e => setDocumentType(e.target.value)}
                >
                  {DOCUMENT_TYPES.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <label className="fieldLabel">Tipo de documento</label>
                {errors.documentType && <span className="fieldError">{errors.documentType}</span>}
              </div>
              <div className="fieldWrap">
                <input
                  className={`fieldInput ${errors.documentNumber ? 'fieldInput--error' : ''}`}
                  type="text"
                  placeholder="Número de documento"
                  value={documentNumber}
                  onChange={e => setDocumentNumber(e.target.value)}
                  autoComplete="off"
                />
                <label className="fieldLabel">Número de documento</label>
                {errors.documentNumber && <span className="fieldError">{errors.documentNumber}</span>}
              </div>
            </div>

            <div className="fieldWrap fieldWrap--icon">
              <input
                className={`fieldInput ${errors.password ? 'fieldInput--error' : ''}`}
                type={showPass ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <label className="fieldLabel">Contraseña</label>
              <button className="fieldIcon" type="button" onClick={() => setShowPass(v => !v)}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {errors.password && <span className="fieldError">{errors.password}</span>}
            </div>
            {pwdStrength && (
              <div className="passwordStrength">
                <div className="strengthTrack">
                  <div className={`strengthFill strengthFill--${pwdStrength}`} />
                </div>
                <span className={`strengthLabel strengthLabel--${pwdStrength}`}>
                  {pwdStrength === 'weak' && 'Contraseña débil'}
                  {pwdStrength === 'fair' && 'Contraseña moderada'}
                  {pwdStrength === 'strong' && 'Contraseña fuerte ✓'}
                </span>
              </div>
            )}

            <div className="fieldWrap fieldWrap--icon">
              <input
                className={`fieldInput ${errors.confirm ? 'fieldInput--error' : ''}`}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <label className="fieldLabel">Confirmar contraseña</label>
              <button className="fieldIcon" type="button" onClick={() => setShowConfirm(v => !v)}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {errors.confirm && <span className="fieldError">{errors.confirm}</span>}
            </div>

            <button type="submit" className={`submitBtn ${loading ? 'submitBtn--loading' : ''}`} disabled={loading}>
              <span className="btnInner">{loading && <span className="spinner" />}
                {loading ? 'Creando cuenta...' : 'Crear cuenta '}
              </span>
            </button>
          </form>

          <div className="formFooter">
            ¿Ya tienes cuenta?{' '}
            <button className="switchLink" onClick={() => navigate('/login')}>Inicia sesión</button>
          </div>
        </div>
      </main>

      {success && (
        <div className="successToast">
          <div className="toastIcon"><User size={16} /></div>
          <div>
            <div className="toastTitle">¡Cuenta creada!</div>
            <div className="toastDesc">Redirigiendo al panel...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;