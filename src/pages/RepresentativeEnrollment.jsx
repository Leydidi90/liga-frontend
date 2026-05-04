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

const isValidCurp = (curp) => {
  const value = String(curp || '').toUpperCase().trim();
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
    if (form.jugadores.some((j) => j.nombre.toLowerCase() === nombre.toLowerCase())) {
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
    if (!newPlayerPhoto) {
      toast.error('La foto del jugador es obligatoria.');
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
    const mantenimiento = Number(cobros.mantenimiento_cancha || 0);
    const arbitraje = Number(cobros.arbitraje || 0);
    const inscripcion = Number(cobros.inscripcion_equipo || 0);
    const costoPorJugador = Number(cobros.costo_por_jugador || 0);
    const costoUnitarioJugador = mantenimiento + arbitraje + inscripcion + costoPorJugador;
    const totalFinal = costoUnitarioJugador * jugadoresList.length;
    return { mantenimiento, arbitraje, inscripcion, costoPorJugador, costoUnitarioJugador, totalFinal };
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
    if (jugadoresList.length === 0) {
      toast.error('Agrega al menos un jugador para continuar.');
      return;
    }
    setShowPaymentModal(true);
  };

  const handleConfirmPaymentAndSubmit = async () => {
    const cleanCard = paymentForm.cardNumber.replace(/\s+/g, '');
    if (!/^\d{16}$/.test(cleanCard)) {
      toast.error('Número de tarjeta inválido (16 dígitos).');
      return;
    }
    if (!String(paymentForm.holder || '').trim()) {
      toast.error('Debes ingresar el titular de la tarjeta.');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(paymentForm.expiry)) {
      toast.error('Vencimiento inválido. Usa MM/AA.');
      return;
    }
    if (!/^\d{3,4}$/.test(String(paymentForm.cvv || ''))) {
      toast.error('CVV inválido.');
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
      toast.error(err.message);
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
      <Link to="/" style={{ color: '#93c5fd', textDecoration: 'none', fontWeight: 'bold' }}>← Volver al portal</Link>
      <div className="glass-panel" style={{ maxWidth: '1080px', margin: '1.2rem auto', padding: '2.1rem 2.3rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '22px', animation: 'floatUp 0.5s ease-out', backdropFilter: 'blur(14px)', position: 'relative', boxShadow: '0 20px 55px rgba(2,6,23,0.55), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', borderRadius: '20px 20px 0 0', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)', backgroundSize: '200% 100%', animation: 'shimmer 6s linear infinite' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '0.35rem', fontSize: '2.1rem', letterSpacing: '-0.7px', textShadow: '0 4px 18px rgba(15,23,42,.45)' }}>
              Inscripción de Representante de Equipo
            </h2>
            <p style={{ color: '#94a3b8', marginTop: 0, marginBottom: '.35rem' }}>
              Registra tu equipo de forma profesional: define uniforme, agrega jugadores y valida tu costo final antes de enviar.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '.45rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.78rem', padding: '.3rem .55rem', borderRadius: '999px', border: '1px solid rgba(59,130,246,.35)', color: '#93c5fd', background: 'rgba(30,58,138,.25)', animation: 'pulseSoft 2.2s ease-in-out infinite' }}>CURP validada</span>
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
              <input value={form.color_playera} onChange={(e) => setForm({ ...form, color_playera: e.target.value })} placeholder="Color playera (Ej: Azul marino)" style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <input value={form.color_short} onChange={(e) => setForm({ ...form, color_short: e.target.value })} placeholder="Color short (Ej: Blanco)" style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
              <input value={form.color_medias} onChange={(e) => setForm({ ...form, color_medias: e.target.value })} placeholder="Color medias (Ej: Azul)" style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }} />
            </div>
          </div>

          <div style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: '14px', padding: '1rem', background: 'linear-gradient(130deg, rgba(91,33,182,.14), rgba(2,6,23,.35))', animation: 'floatUp 0.55s ease-out' }}>
            <strong style={{ display: 'block', marginBottom: '0.7rem', color: '#c4b5fd' }}>Jugadores a inscribir</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
              <input
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Nombre(s)"
                style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
              />
              <input
                value={newPlayerApellidoPaterno}
                onChange={(e) => setNewPlayerApellidoPaterno(e.target.value)}
                placeholder="Apellido paterno"
                style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
              />
              <input
                value={newPlayerApellidoMaterno}
                onChange={(e) => setNewPlayerApellidoMaterno(e.target.value)}
                placeholder="Apellido materno"
                style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
              />
              <input
                type="number"
                min="1"
                value={newPlayerNumber}
                onChange={(e) => setNewPlayerNumber(e.target.value)}
                placeholder="Núm. playera"
                style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
              />
              <input
                value={newPlayerCurp}
                onChange={(e) => setNewPlayerCurp(String(e.target.value || '').toUpperCase())}
                placeholder="CURP del jugador"
                maxLength={18}
                style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
              />
              <select
                value={newPlayerLeadership}
                onChange={(e) => setNewPlayerLeadership(e.target.value)}
                style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
              >
                <option value="Ninguno">Sin rol</option>
                <option value="Capitán">Capitán</option>
                <option value="Subcapitán">Subcapitán</option>
              </select>
              <button type="button" className="fx-btn" onClick={handleAddPlayer} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                + Agregar
              </button>
            </div>
            <div style={{ marginTop: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handlePlayerPhotoChange}
                style={{ color: '#cbd5e1', fontSize: '0.82rem' }}
              />
              {newPlayerPhoto ? (
                <img src={newPlayerPhoto} alt="Preview jugador" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(99,102,241,0.65)' }} />
              ) : (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Foto obligatoria</span>
              )}
            </div>
            <div style={{ marginTop: '0.75rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflowX: 'auto', background: 'rgba(2,6,23,0.5)' }}>
              <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(99,102,241,0.2)' }}>
                    <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem' }}>Foto</th>
                    <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem' }}>Jugador</th>
                    <th style={{ textAlign: 'center', padding: '0.65rem 0.75rem' }}>Número</th>
                    <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem' }}>Rol</th>
                    <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem' }}>CURP</th>
                    <th style={{ textAlign: 'right', padding: '0.65rem 0.75rem' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {jugadoresList.map((player, idx) => (
                    <tr key={`${player.nombre}-${idx}`} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', animation: 'floatUp 0.25s ease-out' }}>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#94a3b8' }}>{idx + 1}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        {player.foto_jugador ? (
                          <img src={player.foto_jugador} alt={`${player.nombre}`} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(99,102,241,0.5)' }} />
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Sin foto</span>
                        )}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#e5e7eb', fontWeight: 600 }}>
                        {player.nombre} {player.apellido_paterno} {player.apellido_materno}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', color: '#c4b5fd' }}>#{player.numero_playera}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: player.rol_liderazgo === 'Capitán' ? '#fbbf24' : player.rol_liderazgo === 'Subcapitán' ? '#a5b4fc' : '#94a3b8' }}>{player.rol_liderazgo || 'Ninguno'}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#fef08a', fontFamily: 'monospace' }}>{player.curp}</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                        <button type="button" className="fx-btn" onClick={() => handleRemovePlayer(idx)} style={{ background: 'transparent', color: '#f87171', border: '1px solid rgba(248,113,113,0.4)', borderRadius: '8px', padding: '0.25rem 0.55rem', cursor: 'pointer' }}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {jugadoresList.length === 0 && (
              <p style={{ margin: '0.65rem 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>Aún no has agregado jugadores. Debes incluir nombre, número y CURP válida.</p>
            )}
          </div>

          {torneoInfo && (
            <div style={{ border: '1px solid rgba(59,130,246,0.45)', borderRadius: '14px', padding: '1rem', background: 'linear-gradient(120deg, rgba(30,58,138,0.35), rgba(30,64,175,0.18))', animation: 'pulseGlow 1.8s ease-in-out infinite', boxShadow: 'inset 0 0 30px rgba(37,99,235,.12)' }}>
              <strong style={{ fontSize: '1.1rem' }}>{torneoInfo.nombre}</strong>
              <div style={{ marginTop: '0.6rem', color: '#cbd5e1', fontSize: '0.9rem', display: 'grid', gap: '0.35rem' }}>
                <div>Mantenimiento por jugador: <strong>${totals.mantenimiento.toFixed(2)}</strong></div>
                <div>Arbitraje por jugador: <strong>${totals.arbitraje.toFixed(2)}</strong></div>
                <div>Inscripción por jugador: <strong>${totals.inscripcion.toFixed(2)}</strong></div>
                <div>Costo adicional por jugador: <strong>${totals.costoPorJugador.toFixed(2)}</strong></div>
                <div>
                  <strong>Costo total unitario por jugador:</strong> ${totals.costoUnitarioJugador.toFixed(2)}
                </div>
                <div>
                  Jugadores inscritos: <strong>{jugadoresList.length}</strong>
                </div>
              </div>
              <div style={{ marginTop: '0.6rem', color: '#fbbf24', fontWeight: 'bold', fontSize: '1.25rem' }}>
                Total final a pagar ({jugadoresList.length} jugadores): ${totals.totalFinal.toFixed(2)}
              </div>
            </div>
          )}

          <button type="submit" disabled={saving || jugadoresList.length === 0} className="btn btn-primary fx-btn" style={{ padding: '1rem', marginTop: '0.45rem', fontWeight: 'bold', fontSize: '1.05rem', background: 'linear-gradient(90deg, #4f46e5, #7c3aed, #a855f7)', border: 'none', borderRadius: '12px' }}>
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
              <button type="button" onClick={() => setShowPaymentModal(false)} style={{ padding: '0.65rem 0.95rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#cbd5e1', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmPaymentAndSubmit} disabled={saving} style={{ padding: '0.65rem 1rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg,#10b981,#059669)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                {saving ? 'Procesando...' : 'Confirmar pago e inscribir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
