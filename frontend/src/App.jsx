import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CarFront,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  CircleCheckBig,
  Eye,
  EyeOff,
  FileText,
  Flag,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import './index.css';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

function TextField({ icon: Icon, label, value, onChange, placeholder, type = 'text', autoComplete, inputMode, required = true }) {
  return (
    <div className="auth-group">
      <label className="auth-label">{label}</label>
      <div className="input-wrapper">
        <Icon size={18} />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          inputMode={inputMode}
          required={required}
        />
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, placeholder, autoComplete }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="auth-group">
      <label className="auth-label">{label}</label>
      <div className="input-wrapper">
        <Lock size={18} />
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          className="icon-toggle"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [authView, setAuthView] = useState('login');
  const [authMessage, setAuthMessage] = useState(null);

  const [registerStep, setRegisterStep] = useState(1);
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirm, setRegisterConfirm] = useState('');
  const [registerCode, setRegisterCode] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));
  const openModal = (tipo, userId, reportId, nombre) => setConfirmModal({ tipo, userId, reportId, nombre });
  const closeModal = () => {
    if (!actionLoading) setConfirmModal(null);
  };

  const resetAuthMessage = () => setAuthMessage(null);
  const showAuthMessage = (type, text) => setAuthMessage({ type, text });

  useEffect(() => {
    const tk = localStorage.getItem('admin_token');
    if (tk) setToken(tk);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    resetAuthMessage();
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.usuario.rol !== 'ADMINISTRADOR') {
        showAuthMessage('error', 'Tu cuenta no tiene permisos de administrador.');
        return;
      }
      setToken(res.data.token);
      localStorage.setItem('admin_token', res.data.token);
    } catch (err) {
      showAuthMessage('error', err.response?.data?.error || 'Error de autenticacion.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterRequest = async (e) => {
    e.preventDefault();
    resetAuthMessage();

    if (!registerName.trim() || !registerEmail.trim() || !registerPassword || !registerConfirm) {
      showAuthMessage('error', 'Completa todos los campos.');
      return;
    }
    if (!registerEmail.trim().endsWith('@uta.edu.ec')) {
      showAuthMessage('error', 'Usa tu correo institucional @uta.edu.ec.');
      return;
    }
    if (registerPassword.length < 6) {
      showAuthMessage('error', 'La contrasena debe tener al menos 6 caracteres.');
      return;
    }
    if (registerPassword !== registerConfirm) {
      showAuthMessage('error', 'Las contrasenas no coinciden.');
      return;
    }

    setRegisterLoading(true);
    try {
      await api.post('/auth/register', {
        nombre: registerName.trim(),
        email: registerEmail.trim(),
        password: registerPassword,
      });
      setRegisterStep(2);
      showAuthMessage('success', 'Se envio un codigo de verificacion a tu correo.');
    } catch (err) {
      showAuthMessage('error', err.response?.data?.error || 'No se pudo registrar.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleVerifyRegister = async (e) => {
    e.preventDefault();
    resetAuthMessage();

    if (!registerCode.trim() || registerCode.trim().length !== 6) {
      showAuthMessage('error', 'Ingresa el codigo de 6 digitos.');
      return;
    }

    setRegisterLoading(true);
    try {
      await api.post('/auth/verify-register', {
        email: registerEmail.trim(),
        code: registerCode.trim(),
      });
      setEmail(registerEmail.trim());
      setPassword('');
      setRegisterStep(1);
      setRegisterCode('');
      setAuthView('login');
      showAuthMessage('success', 'Cuenta creada correctamente. Ya puedes iniciar sesion.');
    } catch (err) {
      showAuthMessage('error', err.response?.data?.error || 'Codigo incorrecto o expirado.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    resetAuthMessage();

    if (!forgotEmail.trim()) {
      showAuthMessage('error', 'Ingresa tu correo institucional.');
      return;
    }
    if (!forgotEmail.trim().endsWith('@uta.edu.ec')) {
      showAuthMessage('error', 'Usa tu correo @uta.edu.ec.');
      return;
    }

    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotStep(2);
      showAuthMessage('success', 'Se envio un codigo de recuperacion a tu correo.');
    } catch (err) {
      showAuthMessage('error', err.response?.data?.error || 'No se pudo enviar el codigo.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    resetAuthMessage();

    if (!forgotCode.trim() || forgotCode.trim().length !== 6) {
      showAuthMessage('error', 'Ingresa el codigo de 6 digitos.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      showAuthMessage('error', 'Completa la nueva contrasena.');
      return;
    }
    if (newPassword.length < 6) {
      showAuthMessage('error', 'La contrasena debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAuthMessage('error', 'Las contrasenas no coinciden.');
      return;
    }

    setForgotLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: forgotEmail.trim(),
        code: forgotCode.trim(),
        newPassword,
      });
      setPassword('');
      setForgotStep(1);
      setForgotCode('');
      setNewPassword('');
      setConfirmPassword('');
      setAuthView('login');
      showAuthMessage('success', 'Contrasena actualizada. Ya puedes iniciar sesion.');
    } catch (err) {
      showAuthMessage('error', err.response?.data?.error || 'No se pudo restablecer la contrasena.');
    } finally {
      setForgotLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('admin_token');
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/reportes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(res.data.reportes || []);
    } catch {
      alert('Sesion expirada.');
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchReports();
  }, [token]);

  const executeAction = async () => {
    if (!confirmModal) return;
    const { tipo, userId, reportId } = confirmModal;
    setActionLoading(true);
    try {
      if (tipo === 'SUSPENSION') {
        await api.put(`/admin/usuarios/${userId}/suspender`, {}, { headers: { Authorization: `Bearer ${token}` } });
        await api.put(
          `/admin/reportes/${reportId}/resolver`,
          { nuevo_estado: 'RESUELTO', resolucion_admin: 'SUSPENSION' },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } else {
        await api.put(
          `/admin/reportes/${reportId}/resolver`,
          { nuevo_estado: 'RESUELTO', resolucion_admin: 'ADVERTENCIA' },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
      fetchReports();
      setConfirmModal(null);
    } catch {
      alert('Error al procesar la accion.');
    } finally {
      setActionLoading(false);
    }
  };

  const abiertos = reports.filter((r) => r.estado === 'ABIERTO').length;
  const resueltos = reports.filter((r) => r.estado === 'RESUELTO').length;
  const total = reports.length;

  const renderAuthMessage = () => {
    if (!authMessage) return null;
    return <div className={`auth-message ${authMessage.type}`}>{authMessage.text}</div>;
  };

  const renderLoginView = () => (
    <div className="login-screen auth-screen">
      <div className="login-blob1" />
      <div className="login-blob2" />
      <div className="login-card auth-card">
        <div className="login-brand">
          <div className="login-logo">
            <CarFront size={26} color="white" />
          </div>
          <span className="login-app-name">U-Ride</span>
        </div>
        <p className="login-subtitle">Acceso web para estudiantes y administracion</p>
        <h2 className="login-title">Iniciar sesion</h2>
        {renderAuthMessage()}

        <form onSubmit={handleLogin} className="auth-form">
          <TextField
            icon={Mail}
            label="Correo"
            type="email"
            placeholder="correo@uta.edu.ec"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
          />
          <PasswordField
            label="Contrasena"
            placeholder="Ingresa tu contrasena"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />

          <button type="submit" className="btn btn-primary auth-submit">
            {loginLoading ? <span className="spinner" /> : (
              <>
                <ShieldCheck size={18} />
                Acceder al panel
              </>
            )}
          </button>

          <div className="auth-links">
            <button type="button" className="text-link" onClick={() => setAuthView('forgot')}>
              ¿Olvidaste tu contrasena?
            </button>
            <button type="button" className="text-link strong" onClick={() => setAuthView('register')}>
              Crear cuenta UTA
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderRegisterView = () => (
    <div className="login-screen auth-screen">
      <div className="login-blob1" />
      <div className="login-blob2" />
      <div className="login-card auth-card">
        <div className="auth-topbar">
          <button type="button" className="back-link" onClick={() => setAuthView('login')}>
            <ArrowLeft size={16} />
            Volver
          </button>
          <span className="auth-kicker">Registro web</span>
        </div>
        <div className="login-brand">
          <div className="login-logo">
            <UserPlus size={26} color="white" />
          </div>
          <span className="login-app-name">U-Ride</span>
        </div>
        <p className="login-subtitle">Crea tu cuenta con correo institucional y verifica el codigo.</p>
        <h2 className="login-title">{registerStep === 1 ? 'Registrate' : 'Verifica tu correo'}</h2>
        {renderAuthMessage()}

        {registerStep === 1 ? (
          <form onSubmit={handleRegisterRequest} className="auth-form">
            <TextField
              icon={User}
              label="Nombre completo"
              placeholder="Tu nombre"
              value={registerName}
              onChange={(event) => setRegisterName(event.target.value)}
              autoComplete="name"
            />
            <TextField
              icon={Mail}
              label="Correo institucional"
              type="email"
              placeholder="correo@uta.edu.ec"
              value={registerEmail}
              onChange={(event) => setRegisterEmail(event.target.value)}
              autoComplete="email"
              inputMode="email"
            />
            <PasswordField
              label="Contrasena"
              placeholder="Minimo 6 caracteres"
              value={registerPassword}
              onChange={(event) => setRegisterPassword(event.target.value)}
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirmar contrasena"
              placeholder="Repite la contrasena"
              value={registerConfirm}
              onChange={(event) => setRegisterConfirm(event.target.value)}
              autoComplete="new-password"
            />

            <button type="submit" className="btn btn-primary auth-submit">
              {registerLoading ? <span className="spinner" /> : (
                <>
                  <UserPlus size={18} />
                  Enviar codigo
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyRegister} className="auth-form">
            <div className="code-summary">
              <CircleCheckBig size={18} />
              <span>Se envio un codigo a {registerEmail}</span>
            </div>
            <TextField
              icon={KeyRound}
              label="Codigo de verificacion"
              placeholder="000000"
              value={registerCode}
              onChange={(event) => setRegisterCode(event.target.value)}
              autoComplete="one-time-code"
              inputMode="numeric"
            />

            <button type="submit" className="btn btn-primary auth-submit">
              {registerLoading ? <span className="spinner" /> : (
                <>
                  <CircleCheckBig size={18} />
                  Crear cuenta
                </>
              )}
            </button>

            <button type="button" className="btn btn-ghost auth-secondary" onClick={() => setRegisterStep(1)}>
              Editar datos
            </button>
          </form>
        )}
      </div>
    </div>
  );

  const renderForgotView = () => (
    <div className="login-screen auth-screen">
      <div className="login-blob1" />
      <div className="login-blob2" />
      <div className="login-card auth-card">
        <div className="auth-topbar">
          <button type="button" className="back-link" onClick={() => setAuthView('login')}>
            <ArrowLeft size={16} />
            Volver
          </button>
          <span className="auth-kicker">Recuperacion web</span>
        </div>
        <div className="login-brand">
          <div className="login-logo">
            <KeyRound size={26} color="white" />
          </div>
          <span className="login-app-name">U-Ride</span>
        </div>
        <p className="login-subtitle">Solicita un codigo por correo y luego crea una nueva contrasena.</p>
        <h2 className="login-title">{forgotStep === 1 ? 'Recuperar contrasena' : 'Restablecer contrasena'}</h2>
        {renderAuthMessage()}

        {forgotStep === 1 ? (
          <form onSubmit={handleForgotRequest} className="auth-form">
            <TextField
              icon={Mail}
              label="Correo institucional"
              type="email"
              placeholder="correo@uta.edu.ec"
              value={forgotEmail}
              onChange={(event) => setForgotEmail(event.target.value)}
              autoComplete="email"
              inputMode="email"
            />

            <button type="submit" className="btn btn-primary auth-submit">
              {forgotLoading ? <span className="spinner" /> : (
                <>
                  <Send size={18} />
                  Enviar codigo
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="code-summary">
              <CircleCheckBig size={18} />
              <span>Revisa el codigo enviado a {forgotEmail}</span>
            </div>
            <TextField
              icon={KeyRound}
              label="Codigo de recuperacion"
              placeholder="000000"
              value={forgotCode}
              onChange={(event) => setForgotCode(event.target.value)}
              autoComplete="one-time-code"
              inputMode="numeric"
            />
            <PasswordField
              label="Nueva contrasena"
              placeholder="Minimo 6 caracteres"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
            <PasswordField
              label="Confirmar contrasena"
              placeholder="Repite la nueva contrasena"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />

            <button type="submit" className="btn btn-primary auth-submit">
              {forgotLoading ? <span className="spinner" /> : (
                <>
                  <CircleCheckBig size={18} />
                  Guardar nueva contrasena
                </>
              )}
            </button>

            <button type="button" className="btn btn-ghost auth-secondary" onClick={() => setForgotStep(1)}>
              Cambiar correo
            </button>
          </form>
        )}
      </div>
    </div>
  );

  if (!token) {
    if (authView === 'register') return renderRegisterView();
    if (authView === 'forgot') return renderForgotView();
    return renderLoginView();
  }

  return (
    <div className="app-wrapper">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">
            <CarFront size={22} color="white" />
          </div>
          <div>
            <div className="topbar-title">U-Ride Admin</div>
            <div className="topbar-sub">Panel de Administracion · RF11</div>
          </div>
        </div>
        <div className="topbar-right">
          <button className="btn btn-ghost btn-sm" onClick={fetchReports}>
            <RefreshCw size={14} />
            Actualizar
          </button>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            <LogOut size={14} />
            Salir
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Gestion de Reportes</h1>
          <p className="page-sub">Revisa, resuelve y aplica acciones disciplinarias sobre los reportes de la comunidad.</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon warning"><AlertTriangle size={22} /></div>
            <div>
              <div className="stat-value">{abiertos}</div>
              <div className="stat-label">Reportes Abiertos</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success"><CheckCircle size={22} /></div>
            <div>
              <div className="stat-value">{resueltos}</div>
              <div className="stat-label">Resueltos</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon primary"><FileText size={22} /></div>
            <div>
              <div className="stat-value">{total}</div>
              <div className="stat-label">Total Reportes</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon primary"><Users size={22} /></div>
            <div>
              <div className="stat-value">{new Set(reports.map((report) => report.persona_denunciada_id)).size}</div>
              <div className="stat-label">Usuarios Involucrados</div>
            </div>
          </div>
        </div>

        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <Flag size={18} color="var(--primary)" />
              Registro de Reportes
            </div>
            <button className="refresh-btn" onClick={fetchReports} title="Refrescar">
              <RefreshCw size={15} />
            </button>
          </div>

          {loading ? (
            <div className="empty-state">
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)', width: 32, height: 32 }} />
              </div>
              <p className="empty-sub" style={{ marginTop: 16 }}>Cargando datos...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={56} color="var(--border)" />
              <p className="empty-title">Sin reportes pendientes</p>
              <p className="empty-sub">La comunidad U-Ride se esta comportando correctamente.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Denunciante</th>
                  <th>Denunciado</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const isExpanded = expandedId === report.id;
                  return (
                    <React.Fragment key={report.id}>
                      <tr
                        onClick={() => toggleExpand(report.id)}
                        style={{ cursor: 'pointer', backgroundColor: isExpanded ? 'var(--primary-lt)' : undefined, transition: 'background 0.2s' }}
                      >
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>#{report.id}</td>
                        <td style={{ color: 'var(--gray)', fontSize: 13 }}>
                          {new Date(report.creado_en).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                              {report.autor_denuncia?.charAt(0) ?? '?'}
                            </div>
                            {report.autor_denuncia}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--danger-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>
                              {report.persona_denunciada?.charAt(0) ?? '?'}
                            </div>
                            <strong>{report.persona_denunciada}</strong>
                          </div>
                        </td>
                        <td className="motivo-cell">
                          <span className="motivo-text" title={report.motivo}>{report.motivo}</span>
                        </td>
                        <td>
                          <span className={`badge ${report.estado.toLowerCase()}`}>
                            {report.estado === 'ABIERTO' ? <AlertTriangle size={11} /> : <CheckCircle size={11} />}
                            {report.estado}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {report.estado === 'ABIERTO' ? (
                              <div style={{ display: 'flex', gap: 6 }} onClick={(event) => event.stopPropagation()}>
                                <button className="btn btn-sm" style={{ backgroundColor: '#F59E0B', color: '#fff', padding: '6px 10px', fontSize: 12, border: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }} onClick={() => openModal('ADVERTENCIA', report.persona_denunciada_id, report.id, report.persona_denunciada)}>
                                  <AlertTriangle size={14} />
                                  Advertir
                                </button>
                                <button className="btn btn-danger btn-sm" style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => openModal('SUSPENSION', report.persona_denunciada_id, report.id, report.persona_denunciada)}>
                                  <Ban size={14} />
                                  Suspender
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted">
                                <CheckSquare size={14} />
                                Resuelto
                              </span>
                            )}
                            {isExpanded ? <ChevronUp size={16} color="var(--primary)" /> : <ChevronDown size={16} color="var(--gray)" />}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ backgroundColor: '#F8FAFF' }}>
                          <td colSpan={7} style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                              <div>
                                <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>Denunciante</p>
                                <p style={{ fontWeight: 600 }}>{report.autor_denuncia}</p>
                              </div>
                              <div>
                                <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>Denunciado</p>
                                <p style={{ fontWeight: 600, color: 'var(--danger)' }}>{report.persona_denunciada}</p>
                              </div>
                              <div style={{ gridColumn: '1 / -1' }}>
                                <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>Motivo Completo</p>
                                <p style={{ lineHeight: 1.6, color: 'var(--dark)', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px' }}>{report.motivo}</p>
                              </div>
                              {report.evidencia_url && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 8 }}>Evidencia Adjunta</p>
                                  <a href={`http://localhost:5000${report.evidencia_url}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--primary)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                                    Ver Evidencia
                                  </a>
                                </div>
                              )}
                              <div>
                                <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>Fecha del Reporte</p>
                                <p>{new Date(report.creado_en).toLocaleString('es-EC')}</p>
                              </div>
                              <div>
                                <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--gray)', textTransform: 'uppercase', marginBottom: 6 }}>Resolucion Aplicada</p>
                                <p style={{ fontWeight: 600, color: report.resolucion_admin === 'SUSPENSION' ? 'var(--danger)' : report.resolucion_admin === 'ADVERTENCIA' ? '#D97706' : 'var(--gray)' }}>
                                  {report.resolucion_admin ?? 'Sin resolucion aun'}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {confirmModal && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={(event) => event.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', position: 'relative' }}>
            <button onClick={closeModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: confirmModal.tipo === 'SUSPENSION' ? '#FEF2F2' : '#FFFBEB' }}>
                {confirmModal.tipo === 'SUSPENSION' ? <Ban size={24} color="var(--danger)" /> : <AlertTriangle size={24} color="#D97706" />}
              </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 18, color: 'var(--dark)', margin: 0 }}>
                  {confirmModal.tipo === 'SUSPENSION' ? 'Suspender Usuario' : 'Enviar Advertencia'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--gray)', margin: '2px 0 0' }}>Accion administrativa — RF11</p>
              </div>
            </div>
            <p style={{ color: 'var(--dark)', lineHeight: 1.6, marginBottom: 24, background: 'var(--surface)', borderRadius: 10, padding: '14px 16px', fontSize: 14 }}>
              {confirmModal.tipo === 'SUSPENSION'
                ? <><strong>¿Suspender la cuenta de {confirmModal.nombre}?</strong><br />El usuario perdera la capacidad de publicar viajes y solicitar cupos. Se le notificara con el motivo del reporte.</>
                : <><strong>¿Enviar advertencia formal a {confirmModal.nombre}?</strong><br />El reporte se marcara como resuelto y el usuario recibira un aviso en su bandeja de solicitudes.</>}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closeModal} disabled={actionLoading} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid var(--border)', background: '#fff', fontWeight: 600, cursor: 'pointer', color: 'var(--gray)' }}>
                Cancelar
              </button>
              <button onClick={executeAction} disabled={actionLoading} style={{ flex: 1.5, padding: '12px', borderRadius: 10, border: 'none', background: confirmModal.tipo === 'SUSPENSION' ? 'var(--danger)' : '#D97706', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {actionLoading ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : (
                  <>{confirmModal.tipo === 'SUSPENSION' ? <Ban size={16} /> : <AlertTriangle size={16} />} Confirmar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
