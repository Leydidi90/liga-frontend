import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import API_URL from '../api';

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const CURP_ALPHABET = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

const calculateCurpCheckDigit = (curp17) => {
  const upper = String(curp17 || '').toUpperCase();
  let sum = 0;
  for (let i = 0; i < 17; i += 1) {
    const char = upper[i];
    const value = CURP_ALPHABET.indexOf(char);
    if (value < 0) return null;
    sum += value * (18 - i);
  }
  const digit = (10 - (sum % 10)) % 10;
  return String(digit);
};

const SKIP_CURP = import.meta.env.VITE_SKIP_CURP_VALIDATION === 'true';

const isValidCurp = (curp) => {
  const value = String(curp || '').toUpperCase().trim();
  if (SKIP_CURP) return value.length >= 5;
  if (!CURP_REGEX.test(value)) return false;
  const expectedDigit = calculateCurpCheckDigit(value.slice(0, 17));
  return expectedDigit !== null && expectedDigit === value.slice(17);
};

export default function RepresentativeEnrollment() {
  const { slug, torneoId } = useParams();
  const navigate = useNavigate();
  const [torneos, setTorneos] = useState([]);
  const [selectedTorneoId, setSelectedTorneoId] = useState(torneoId || '');
  const [torneoInfo, setTorneoInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerApellidoPaterno, setNewPlayerApellidoPaterno] = useState('');
  const [newPlayerApellidoMaterno, setNewPlayerApellidoMaterno] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [newPlayerCurp, setNewPlayerCurp] = useState('');
  const [newPlayerLeadership, setNewPlayerLeadership] = useState('Ninguno');
  const [newPlayerPhoto, setNewPlayerPhoto] = useState('');
  const [form, setForm] = useState({
    nombre_representante: '',
    email: '',
    password: '',
    nombre_equipo: '',
    color_playera: '',
    color_short: '',
    color_medias: '',
    jugadores: []
  });
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    holder: '',
    expiry: '',
    cvv: ''
  });

  useEffect(() => {
    const loadTorneos = async () => {
      try {
        const res = await fetch(`${API_URL}/api/organizer/${slug}/torneos`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setTorneos(list);
        if (!selectedTorneoId && list.length > 0) setSelectedTorneoId(list[0].id);
      } catch {
        toast.error('No se pudieron cargar torneos.');
      } finally {
        setLoading(false);
      }
    };
    loadTorneos();
  }, [slug]);

  useEffect(() => {
    if (!selectedTorneoId) return;
    const loadInfo = async () => {
      try {
        const res = await fetch(`${API_URL}/api/organizer/${slug}/torneos/${selectedTorneoId}/inscripcion-info`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar información del torneo.');
        setTorneoInfo(data.torneo);
      } catch (err) {
        toast.error(err.message);
        setTorneoInfo(null);
      }
    };
    loadInfo();
  }, [slug, selectedTorneoId]);

  const jugadoresList = form.jugadores;

  const handlePlayerPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPlayerPhoto(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleAddPlayer = () => {
    const nombre = String(newPlayerName || '').trim();
    const apellido_paterno = String(newPlayerApellidoPaterno || '').trim();
    const apellido_materno = String(newPlayerApellidoMaterno || '').trim();
    const numero = Number(newPlayerNumber);
    const curp = String(newPlayerCurp || '').toUpperCase().trim();
    const rol_liderazgo = String(newPlayerLeadership || 'Ninguno');
    if (!nombre) return;
    if (!apellido_paterno || !apellido_materno) {
      toast.error('Debes capturar apellido paterno y materno.');
      return;
    }
    if (!Number.isFinite(numero) || numero <= 0) {
      toast.error('Debes ingresar un número de playera válido.');
      return;
    }
    if (!isValidCurp(curp)) {
      toast.error('La CURP del jugador no es válida.');
      return;
    }
    const fullKey = `${nombre}|${apellido_paterno}|${apellido_materno}`.toLowerCase();
    if (form.jugadores.some((j) => `${j.nombre}|${j.apellido_paterno}|${j.apellido_materno}`.toLowerCase() === fullKey)) {
      toast.error('Ese jugador ya fue agregado.');
      return;
    }
    if (form.jugadores.some((j) => Number(j.numero_playera) === numero)) {
      toast.error('Ese número de playera ya está asignado.');
      return;
    }
    if (form.jugadores.some((j) => String(j.curp || '').toUpperCase() === curp)) {
      toast.error('Esa CURP ya fue registrada en este equipo.');
      return;
    }
    if (rol_liderazgo === 'Capitán' && form.jugadores.some((j) => j.rol_liderazgo === 'Capitán')) {
      toast.error('Solo puede existir un capitán por equipo.');
      return;
    }
    if (rol_liderazgo === 'Subcapitán' && form.jugadores.some((j) => j.rol_liderazgo === 'Subcapitán')) {
      toast.error('Solo puede existir un subcapitán por equipo.');
      return;
    }

    setForm({
      ...form,
      jugadores: [
        ...form.jugadores,
        {
          nombre,
          apellido_paterno,
          apellido_materno,
          numero_playera: numero,
          curp,
          rol_liderazgo,
          foto_jugador: newPlayerPhoto
        }
      ]
    });
    setNewPlayerName('');
    setNewPlayerApellidoPaterno('');
    setNewPlayerApellidoMaterno('');
    setNewPlayerNumber('');
    setNewPlayerCurp('');
    setNewPlayerLeadership('Ninguno');
    setNewPlayerPhoto('');
  };

  const handleRemovePlayer = (idx) => {
    setForm({ ...form, jugadores: form.jugadores.filter((_, i) => i !== idx) });
  };

  const totals = useMemo(() => {
    const cobros = torneoInfo?.cobros || {};
    const legacyTotal = Number(cobros.mantenimiento_cancha || 0) +
      Number(cobros.arbitraje || 0) +
      Number(cobros.inscripcion_equipo || 0) +
      Number(cobros.costo_por_jugador || 0);
    const totalFinal = cobros.costo_total !== undefined && cobros.costo_total !== null
      ? Number(cobros.costo_total || 0)
      : legacyTotal;
    return { totalFinal };
  }, [torneoInfo, jugadoresList.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTorneoId) {
      toast.error('Selecciona un torneo para continuar.');
      return;
    }
    if (!form.color_playera || !form.color_short || !form.color_medias) {
      toast.error('Debes indicar color de playera, short y medias.');
      return;
    }
    setPaymentError('');
    setShowPaymentModal(true);
  };

  const handleConfirmPaymentAndSubmit = async () => {
    setPaymentError('');
    const cleanCard = paymentForm.cardNumber.replace(/\s+/g, '');
    if (!/^\d{16}$/.test(cleanCard)) {
      setPaymentError('Número de tarjeta inválido (16 dígitos).');
      return;
    }
    if (!String(paymentForm.holder || '').trim()) {
      setPaymentError('Debes ingresar el titular de la tarjeta.');
      return;
    }
    const expiryValue = String(paymentForm.expiry || '').trim();
    if (!/^\d{2}\/\d{2}$/.test(expiryValue)) {
      setPaymentError('Vencimiento inválido. Usa formato MM/AA.');
      return;
    }
    const [monthRaw, yearRaw] = expiryValue.split('/');
    const month = Number(monthRaw);
    const year2d = Number(yearRaw);
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      setPaymentError('El mes de vencimiento debe estar entre 01 y 12.');
      return;
    }
    const now = new Date();
    const currentYear2d = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;
    if (year2d < currentYear2d || (year2d === currentYear2d && month < currentMonth)) {
      setPaymentError('La tarjeta está vencida. Verifica MM/AA.');
      return;
    }
    if (!/^\d{3,4}$/.test(String(paymentForm.cvv || ''))) {
      setPaymentError('CVV inválido.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/organizer/${slug}/torneos/${selectedTorneoId}/inscripcion-representante`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_representante: form.nombre_representante,
          email: form.email,
          password: form.password,
          nombre_equipo: form.nombre_equipo,
          color_playera: form.color_playera,
          color_short: form.color_short,
          color_medias: form.color_medias,
          jugadores: jugadoresList,
          payment: {
            cardNumber: cleanCard,
            holder: paymentForm.holder,
            expiry: paymentForm.expiry,
            cvv: paymentForm.cvv
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo completar la inscripción.');
      toast.success('Inscripción creada correctamente.');
      setShowPaymentModal(false);
      navigate(`/liga/${slug}`);
    } catch (err) {
      setPaymentError(err.message || 'No se pudo procesar el pago.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: '2rem' }}>Cargando torneos...</div>;

  return (
    <div className="enroll-shell" style={{ minHeight: '100vh', background: 'radial-gradient(1200px 500px at 80% -10%, rgba(79,70,229,0.25), transparent), #020202', color: '#fff', padding: '2rem', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes floatUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 rgba(99,102,241,0.15); }
          50% { box-shadow: 0 0 22px rgba(99,102,241,0.35); }
          100% { box-shadow: 0 0 0 rgba(99,102,241,0.15); }
        }
        @keyframes drift {
          0% { transform: translateY(0px) translateX(0px); opacity: 0.35; }
          50% { transform: translateY(-18px) translateX(10px); opacity: 0.55; }
          100% { transform: translateY(0px) translateX(0px); opacity: 0.35; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes borderDance {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulseSoft {
          0% { transform: scale(1); opacity: .85; }
          50% { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1); opacity: .85; }
        }
        .enroll-shell input,
        .enroll-shell select,
        .enroll-shell textarea {
          transition: all .22s ease;
        }
        .enroll-shell input:focus,
        .enroll-shell select:focus,
        .enroll-shell textarea:focus {
          outline: none;
          border-color: rgba(129,140,248,.95) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,.22), 0 0 25px rgba(99,102,241,.18);
          transform: translateY(-1px);
        }
        .enroll-shell .fx-btn {
          transition: transform .18s ease, box-shadow .2s ease, opacity .2s ease;
        }
        .enroll-shell .fx-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(99,102,241,.35);
        }
      `}</style>
      <div style={{ position: 'absolute', width: '340px', height: '340px', top: '-120px', left: '-80px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.25), transparent 70%)', filter: 'blur(8px)', animation: 'drift 6s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: '420px', height: '420px', bottom: '-170px', right: '-120px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)', filter: 'blur(8px)', animation: 'drift 7.5s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: '280px', height: '280px', top: '35%', right: '22%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.18), transparent 70%)', filter: 'blur(12px)', animation: 'drift 8.5s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', flexWrap: 'wrap' }}>
        <Link to="/" style={{ color: '#93c5fd', textDecoration: 'none', fontWeight: 'bold' }}>← Volver al portal</Link>
        <Link to={`/representative/${slug}/login`} style={{ color: '#c4b5fd', textDecoration: 'none', fontWeight: 'bold' }}>
          Ya tengo cuenta de representante
        </Link>
      </div>
      <div className="glass-panel" style={{ maxWidth: '1080px', margin: '1.2rem auto', padding: '2.1rem 2.3rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '22px', animation: 'floatUp 0.5s ease-out', backdropFilter: 'blur(14px)', position: 'relative', boxShadow: '0 20px 55px rgba(2,6,23,0.55), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', borderRadius: '20px 20px 0 0', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)', backgroundSize: '200% 100%', animation: 'shimmer 6s linear infinite' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '0.35rem', fontSize: '2.1rem', letterSpacing: '-0.7px', textShadow: '0 4px 18px rgba(15,23,42,.45)' }}>
              Inscripción de Representante de Equipo
            </h2>
            <p style={{ color: '#94a3b8', marginTop: 0, marginBottom: '.35rem' }}>
              Registra tu equipo de forma profesional y realiza el pago de inscripción para completar tu registro.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '.45rem', flexWrap: 'wrap' }}>
            {!SKIP_CURP && (
            <span style={{ fontSize: '.78rem', padding: '.3rem .55rem', borderRadius: '999px', border: '1px solid rgba(59,130,246,.35)', color: '#93c5fd', background: 'rgba(30,58,138,.25)', animation: 'pulseSoft 2.2s ease-in-out infinite' }}>CURP validada</span>
            )}
            <span style={{ fontSize: '.78rem', padding: '.3rem .55rem', borderRadius: '999px', border: '1px solid rgba(236,72,153,.35)', color: '#f9a8d4', background: 'rgba(131,24,67,.2)', animation: 'pulseSoft 2.5s ease-in-out infinite' }}>Costo en tiempo real</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.95rem' }}>
          <label style={{ fontWeight: 'bold', color: '#cbd5e1' }}>Torneo</label>
          <select
            value={selectedTorneoId}
            onChange={(e) => setSelectedTorneoId(e.target.value)}
            style={{ padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
          >
            <option value="">Selecciona un torneo</option>
            {torneos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre} · {t.categoria || 'Sin categoría'} · {t.estatus}</option>
            ))}
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.8rem' }}>
            <input required placeholder="Nombre representante" value={form.nombre_representante} onChange={(e) => setForm({ ...form, nombre_representante: e.target.value })} style={{ padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
            <input required type="email" placeholder="Correo representante" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.8rem' }}>
            <input required type="password" placeholder="Contraseña representante" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
            <input required placeholder="Nombre del equipo" value={form.nombre_equipo} onChange={(e) => setForm({ ...form, nombre_equipo: e.target.value })} style={{ padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
          </div>

          <div style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: '14px', padding: '1rem', background: 'linear-gradient(130deg, rgba(67,56,202,.18), rgba(2,6,23,.3))', animation: 'floatUp 0.45s ease-out' }}>
            <strong style={{ display: 'block', marginBottom: '0.75rem', color: '#c4b5fd' }}>Uniforme del equipo</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem' }}>
              <input required value={form.color_playera} onChange={(e) => setForm({ ...form, color_playera: e.target.value })} placeholder="Color playera (Ej: Azul marino)" style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <input required value={form.color_short} onChange={(e) => setForm({ ...form, color_short: e.target.value })} placeholder="Color short (Ej: Blanco)" style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <input required value={form.color_medias} onChange={(e) => setForm({ ...form, color_medias: e.target.value })} placeholder="Color medias (Ej: Azul)" style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn btn-primary fx-btn" style={{ padding: '1rem', marginTop: '0.45rem', fontWeight: 'bold', fontSize: '1.05rem', background: 'linear-gradient(90deg, #4f46e5, #7c3aed, #a855f7)', border: 'none', borderRadius: '12px' }}>
            {saving ? 'Procesando...' : 'Inscribirme al torneo'}
          </button>
        </form>
      </div>

      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.78)', backdropFilter: 'blur(7px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '620px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.16)', background: 'linear-gradient(140deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))', padding: '1.3rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#e2e8f0' }}>Pago con tarjeta (obligatorio)</h3>
            <p style={{ margin: '0.4rem 0 0.9rem 0', color: '#94a3b8', fontSize: '0.88rem' }}>
              Completa el pago para finalizar la inscripción al torneo.
            </p>
            <div style={{ border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.12)', borderRadius: '10px', padding: '0.6rem 0.8rem', marginBottom: '0.9rem', color: '#a7f3d0', fontWeight: 'bold' }}>
              Total a pagar: ${totals.totalFinal.toFixed(2)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem' }}>
              <input
                inputMode="numeric"
                maxLength={19}
                placeholder="Número de tarjeta"
                value={paymentForm.cardNumber}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                  const grouped = raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
                  setPaymentForm({ ...paymentForm, cardNumber: grouped });
                }}
                style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
              />
              <input
                placeholder="Titular"
                value={paymentForm.holder}
                onChange={(e) => setPaymentForm({ ...paymentForm, holder: e.target.value })}
                style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
              />
              <input
                maxLength={5}
                placeholder="MM/AA"
                value={paymentForm.expiry}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
                  const formatted = raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw;
                  setPaymentForm({ ...paymentForm, expiry: formatted });
                }}
                style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
              />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="CVV"
                value={paymentForm.cvv}
                onChange={(e) => setPaymentForm({ ...paymentForm, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => { setPaymentError(''); setShowPaymentModal(false); }} style={{ padding: '0.65rem 0.95rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#cbd5e1', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmPaymentAndSubmit} disabled={saving} style={{ padding: '0.65rem 1rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg,#10b981,#059669)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                {saving ? 'Procesando...' : 'Confirmar pago e inscribir'}
              </button>
            </div>
            {paymentError && (
              <div style={{ marginTop: '0.75rem', border: '1px solid rgba(248,113,113,0.45)', background: 'rgba(127,29,29,0.35)', color: '#fecaca', borderRadius: '10px', padding: '0.55rem 0.75rem', fontSize: '0.86rem' }}>
                {paymentError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
