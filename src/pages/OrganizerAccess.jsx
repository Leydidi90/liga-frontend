import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API_URL from '../api';

const PLAN_INFO = {
  Bronce: {
    precio: 50,
    descripcion: 'Ideal para ligas que inician operaciones con funciones base.',
    privilegios: ['Hasta 8 equipos', 'Calendario y resultados', 'Soporte por correo'],
    maxEquipos: '8 equipos',
    soporte: 'Basico',
    activacion: 'Inmediata'
  },
  Plata: {
    precio: 100,
    descripcion: 'Balance entre costo y herramientas para ligas en crecimiento.',
    privilegios: ['Hasta 16 equipos', 'Estadisticas avanzadas', 'Prioridad media de soporte'],
    maxEquipos: '16 equipos',
    soporte: 'Prioridad media',
    activacion: 'Inmediata'
  },
  Oro: {
    precio: 200,
    descripcion: 'Plan completo para operacion profesional.',
    privilegios: ['Equipos ilimitados', 'Soporte prioritario', 'Gestion avanzada'],
    maxEquipos: 'Ilimitados',
    soporte: 'Prioridad alta',
    activacion: 'Inmediata'
  }
};

const PLAN_THEME = {
  Bronce: { tag: 'Inicio', glow: 'bronze' },
  Plata: { tag: 'Popular', glow: 'silver' },
  Oro: { tag: 'Premium', glow: 'gold' },
};

const normalizeSlug = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '')
  .split('/')[0]
  .split('.')[0]
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const normalizeLegacySlug = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '')
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

export default function OrganizerAccess() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [slug, setSlug] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [simTxRef, setSimTxRef] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    holder: '',
    expiry: '',
    cvv: '',
  });
  const [newTenant, setNewTenant] = useState({
    nombre_liga: '',
    subdominio_o_slug: '',
    plan: 'Bronce',
    dueno_nombre: '',
    dueno_email: '',
    password: ''
  });
  const [paymentContext, setPaymentContext] = useState(null);
  const selectedPlanInfo = PLAN_INFO[newTenant.plan];
  const modeIndex = mode === 'login' ? 1 : mode === 'register' ? 2 : 3;

  const handleOrganizerAccess = async (e) => {
    e.preventDefault();
    const normalizedSlug = normalizeSlug(slug);
    const legacySlug = normalizeLegacySlug(slug);
    const candidates = [...new Set([normalizedSlug, legacySlug].filter(Boolean))];

    if (!candidates[0] || candidates[0].length < 3) {
      toast.error('Ingresa un slug valido (minimo 3 caracteres, sin @ ni dominios).');
      return;
    }

    if (candidates[0] !== slug) {
      setSlug(candidates[0]);
    }

    try {
      let foundSlug = null;
      let lastError = null;

      for (const candidate of candidates) {
        const resp = await fetch(`${API_URL}/api/verify-tenant/${encodeURIComponent(candidate)}`);
        const data = await resp.json();
        if (resp.ok) {
          foundSlug = candidate;
          break;
        }
        if (resp.status === 403) {
          navigate('/suspended', { state: { tenant: data.data, error: data.error } });
          return;
        }
        lastError = data;
      }

      if (!foundSlug) {
        toast.error(lastError?.error || 'El codigo de liga no existe.');
        return;
      }

      navigate(`/organizer/${foundSlug}/login`);
    } catch (err) {
      toast.error('Error de conexion');
    }
  };

  const handleRegisterOrganizer = async (e) => {
    e.preventDefault();
    const normalizedRegistrationSlug = normalizeSlug(newTenant.subdominio_o_slug);
    if (normalizedRegistrationSlug.length < 3) {
      toast.error('El slug/subdominio debe tener al menos 3 caracteres validos.');
      return;
    }

    setIsRegistering(true);
    try {
      const res = await fetch(`${API_URL}/api/public/register-organizer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTenant,
          subdominio_o_slug: normalizedRegistrationSlug
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar la liga');

      setPaymentContext({
        tenantId: data.id,
        slug: data.subdominio_o_slug,
        nombre_liga: data.nombre_liga,
        plan: data.plan,
        password: newTenant.password
      });
      setPaymentForm({
        cardNumber: '',
        holder: newTenant.dueno_nombre || '',
        expiry: '',
        cvv: '',
      });
      setSimTxRef(`SIM-${Date.now().toString().slice(-6)}`);
      setMode('payment');
      toast.success('Liga registrada. Completa el pago para activar acceso.');
    } catch (err) {
      toast.error(err.message || 'Error de registro');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleFirstPayment = async (e) => {
    e.preventDefault();
    if (!paymentContext) return;

    const cleanCard = paymentForm.cardNumber.replace(/\s+/g, '');
    if (!/^\d{16}$/.test(cleanCard)) {
      toast.error('Numero de tarjeta invalido (16 digitos).');
      return;
    }
    if (!paymentForm.holder.trim()) {
      toast.error('Ingresa el titular de la tarjeta.');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(paymentForm.expiry)) {
      toast.error('Formato de vencimiento invalido. Usa MM/AA.');
      return;
    }
    if (!/^\d{3,4}$/.test(paymentForm.cvv)) {
      toast.error('CVV invalido.');
      return;
    }

    setIsPaying(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1600));
      toast.success(`Autorizacion simulada aprobada (${simTxRef || 'SIM-OK'}).`);

      const payRes = await fetch(`${API_URL}/api/public/organizer/${paymentContext.tenantId}/first-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: paymentContext.password, slug: paymentContext.slug })
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error || 'No se pudo confirmar el pago');

      const loginRes = await fetch(`${API_URL}/api/organizer/${paymentContext.slug}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: paymentContext.slug, password: paymentContext.password })
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.error || 'Pago aplicado, pero fallo el acceso');

      localStorage.setItem(`tenant_token_${paymentContext.slug}`, loginData.token);
      toast.success(`Pago confirmado. Bienvenido a ${loginData.nombre_liga}`);
      navigate(`/organizer/${paymentContext.slug}`);
    } catch (err) {
      toast.error(err.message || 'Error al procesar pago');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="organizer-access-page">
      <div className="organizer-bg-orb orb-a" />
      <div className="organizer-bg-orb orb-b" />
      <div className="organizer-bg-orb orb-c" />
      <div className="organizer-bg-orb orb-d" />
      <div className="organizer-bg-grid" />
      <div className="organizer-bg-pulse" />

      <div className="organizer-access-wrap">
        <button onClick={() => navigate('/')} className="organizer-back-btn">
          ← Volver al portal publico
        </button>

        <div className="organizer-access-layout">
          <aside className="organizer-promo-panel">
            <span className="promo-kicker">LigaMaster SaaS</span>
            <h2 className="promo-title">Haz despegar tu liga con una experiencia premium</h2>
            <p className="promo-text">
              Escoge tu plan y activa en minutos: panel profesional, control total y crecimiento continuo.
            </p>
            <div className="promo-pill-row">
              <span className="promo-pill">⚡ Activacion rapida</span>
              <span className="promo-pill">🛡️ Soporte continuo</span>
              <span className="promo-pill">📈 Escalable</span>
            </div>
            <div className="promo-plan-highlight">
              <div className="promo-plan-glow" />
              <p className="promo-plan-name">{newTenant.plan} · ${selectedPlanInfo.precio}/mes</p>
              <p className="promo-plan-desc">{selectedPlanInfo.descripcion}</p>
              <div className="promo-metric-grid">
                <div className="promo-metric-item">
                  <span className="promo-metric-label">Capacidad</span>
                  <strong>{selectedPlanInfo.maxEquipos}</strong>
                </div>
                <div className="promo-metric-item">
                  <span className="promo-metric-label">Soporte</span>
                  <strong>{selectedPlanInfo.soporte}</strong>
                </div>
                <div className="promo-metric-item">
                  <span className="promo-metric-label">Activacion</span>
                  <strong>{selectedPlanInfo.activacion}</strong>
                </div>
              </div>
              <ul className="promo-feature-list">
                {selectedPlanInfo.privilegios.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="promo-trust-row">
              <div className="promo-trust-item">
                <strong>+120</strong>
                <span>Ligas activas</span>
              </div>
              <div className="promo-trust-item">
                <strong>99.9%</strong>
                <span>Disponibilidad</span>
              </div>
              <div className="promo-trust-item">
                <strong>24/7</strong>
                <span>Monitoreo</span>
              </div>
            </div>
          </aside>

          <section className={`organizer-access-card mode-${mode}`}>
            <h2 className="organizer-access-title">
              {mode === 'login' && 'Acceso Organizador'}
              {mode === 'register' && 'Registro de Organizador'}
              {mode === 'payment' && 'Activacion por Pago'}
            </h2>
            <p className="organizer-access-subtitle">
              Administra tu liga, selecciona la membresia ideal y activa tu acceso de inmediato.
            </p>
            <div className="organizer-progress-wrap">
              <div className="organizer-progress-bar" style={{ width: `${(modeIndex / 3) * 100}%` }} />
            </div>

            <div className="organizer-tab-row">
              <button type="button" onClick={() => setMode('login')} className={`organizer-tab ${mode === 'login' ? 'active' : ''}`}>Iniciar sesion</button>
              <button type="button" onClick={() => setMode('register')} className={`organizer-tab ${mode === 'register' ? 'active alt' : ''}`}>Registrarme</button>
              <button type="button" disabled className={`organizer-tab ${mode === 'payment' ? 'active pay' : ''}`}>Pago</button>
            </div>

            {mode === 'login' && (
              <form onSubmit={handleOrganizerAccess}>
                <label className="organizer-label stagger-item" style={{ '--stagger-delay': '60ms' }}>Codigo de liga (slug)</label>
                <input
                  required
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase())}
                  placeholder="Ej: liga-fernando"
                  className="organizer-input stagger-item"
                  style={{ '--stagger-delay': '120ms' }}
                />
                <small className="organizer-input-help stagger-item" style={{ '--stagger-delay': '140ms' }}>
                  Puedes escribir <code>chavitas.com</code> y se tomara como <code>chavitas</code>.
                </small>
                <button type="submit" className="organizer-main-btn stagger-item" style={{ '--stagger-delay': '180ms' }}>
                  IDENTIFICAR LIGA Y LOGIN →
                </button>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegisterOrganizer}>
                <div className="organizer-field-grid two">
                  <div>
                    <label className="organizer-label stagger-item" style={{ '--stagger-delay': '60ms' }}>Nombre de la liga</label>
                    <input required value={newTenant.nombre_liga} onChange={e => setNewTenant({ ...newTenant, nombre_liga: e.target.value })} className="organizer-input stagger-item" style={{ '--stagger-delay': '90ms' }} />
                  </div>
                  <div>
                    <label className="organizer-label stagger-item" style={{ '--stagger-delay': '120ms' }}>Slug / subdominio</label>
                    <input required value={newTenant.subdominio_o_slug} onChange={e => setNewTenant({ ...newTenant, subdominio_o_slug: e.target.value.toLowerCase() })} className="organizer-input stagger-item" style={{ '--stagger-delay': '150ms' }} />
                    <small className="organizer-input-help stagger-item" style={{ '--stagger-delay': '165ms' }}>
                      Si pones <code>cerdos.com</code>, se guarda como <code>cerdos</code>.
                    </small>
                  </div>
                </div>

                <div className="plans-grid">
                  {Object.entries(PLAN_INFO).map(([plan, info], idx) => (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => setNewTenant({ ...newTenant, plan })}
                      className={`plan-fx-card ${PLAN_THEME[plan].glow} ${newTenant.plan === plan ? 'selected' : ''}`}
                      style={{ '--stagger-delay': `${180 + idx * 60}ms` }}
                    >
                      <div className="plan-fx-head">
                        <strong>{plan} (${info.precio}/mes)</strong>
                        <span className="plan-fx-tag">{PLAN_THEME[plan].tag}</span>
                      </div>
                      <p className="plan-fx-desc">{info.descripcion}</p>
                      <ul className="plan-fx-list">
                        {info.privilegios.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                      {newTenant.plan === plan && <span className="plan-fx-selected">Plan Seleccionado</span>}
                    </button>
                  ))}
                </div>
                <div className="selected-plan-banner stagger-item" style={{ '--stagger-delay': '360ms' }}>
                  <span className="selected-plan-banner-tag">Plan elegido</span>
                  <strong>{newTenant.plan}</strong>
                  <span>${selectedPlanInfo.precio}/mes · {selectedPlanInfo.maxEquipos} · {selectedPlanInfo.soporte}</span>
                </div>

                <div className="organizer-field-grid three">
                  <input required placeholder="Nombre organizador" value={newTenant.dueno_nombre} onChange={e => setNewTenant({ ...newTenant, dueno_nombre: e.target.value })} className="organizer-input stagger-item" style={{ '--stagger-delay': '420ms' }} />
                  <input required type="email" placeholder="Correo organizador" value={newTenant.dueno_email} onChange={e => setNewTenant({ ...newTenant, dueno_email: e.target.value })} className="organizer-input stagger-item" style={{ '--stagger-delay': '460ms' }} />
                  <input required type="password" placeholder="Contrasena de acceso" value={newTenant.password} onChange={e => setNewTenant({ ...newTenant, password: e.target.value })} className="organizer-input stagger-item" style={{ '--stagger-delay': '500ms' }} />
                </div>

                <button type="submit" disabled={isRegistering} className="organizer-main-btn register stagger-item" style={{ '--stagger-delay': '560ms' }}>
                  {isRegistering ? 'Registrando...' : 'Registrar liga y continuar a pago'}
                </button>
              </form>
            )}

            {mode === 'payment' && paymentContext && (
              <form onSubmit={handleFirstPayment}>
                <div className="payment-fx-card">
                  <p style={{ margin: 0 }}><strong>Liga:</strong> {paymentContext.nombre_liga}</p>
                  <p style={{ margin: '0.35rem 0' }}><strong>Plan:</strong> {paymentContext.plan}</p>
                  <p className="payment-total"><strong>Total:</strong> ${PLAN_INFO[paymentContext.plan].precio}.00 MXN</p>
                <p style={{ margin: '0.35rem 0 0 0', color: '#93c5fd', fontSize: '0.8rem' }}>
                  <strong>Referencia:</strong> {simTxRef || 'SIM-PENDIENTE'}
                </p>
                </div>
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <span>Pasarela Segura LigaMaster</span>
                  <span>SIMULACION</span>
                </div>
                <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.78rem', color: '#a5b4fc' }}>
                  Este checkout es de demostracion academica. No se realiza ningun cobro real.
                </p>
                <label className="organizer-label">Numero de tarjeta</label>
                <input
                  required
                  inputMode="numeric"
                  maxLength={19}
                  placeholder="1234 5678 9012 3456"
                  className="organizer-input"
                  value={paymentForm.cardNumber}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                    const grouped = raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
                    setPaymentForm({ ...paymentForm, cardNumber: grouped });
                  }}
                />

                <div className="organizer-field-grid two">
                  <div>
                    <label className="organizer-label">Titular</label>
                    <input
                      required
                      className="organizer-input"
                      value={paymentForm.holder}
                      onChange={(e) => setPaymentForm({ ...paymentForm, holder: e.target.value })}
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div>
                    <label className="organizer-label">Vencimiento (MM/AA)</label>
                    <input
                      required
                      className="organizer-input"
                      maxLength={5}
                      value={paymentForm.expiry}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
                        const formatted = raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw;
                        setPaymentForm({ ...paymentForm, expiry: formatted });
                      }}
                      placeholder="12/29"
                    />
                  </div>
                </div>

                <div>
                  <label className="organizer-label">CVV</label>
                  <input
                    required
                    type="password"
                    className="organizer-input"
                    maxLength={4}
                    inputMode="numeric"
                    value={paymentForm.cvv}
                    onChange={(e) => setPaymentForm({ ...paymentForm, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="123"
                  />
                </div>
              </div>
                <p className="payment-help">
                  Simulacion de pasarela: confirma para activar tu cuenta y entrar al panel de organizador.
                </p>
                <button type="submit" disabled={isPaying} className="organizer-main-btn pay">
                  {isPaying ? 'Procesando pago...' : 'Confirmar pago y entrar'}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
