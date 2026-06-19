import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import API_URL from '../api';

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
const CURP_ALPHABET = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

const calculateCurpCheckDigit = (curp17) => {
  const upper = String(curp17 || '').toUpperCase();
  let sum = 0;
  for (let i = 0; i < 17; i += 1) {
    const value = CURP_ALPHABET.indexOf(upper[i]);
    if (value < 0) return null;
    sum += value * (18 - i);
  }
  return String((10 - (sum % 10)) % 10);
};

const SKIP_CURP = import.meta.env.VITE_SKIP_CURP_VALIDATION === 'true';

const isValidCurp = (curp) => {
  const value = String(curp || '').toUpperCase().trim();
  if (SKIP_CURP) return value.length >= 5;
  if (!CURP_REGEX.test(value)) return false;
  const expectedDigit = calculateCurpCheckDigit(value.slice(0, 17));
  return expectedDigit !== null && expectedDigit === value.slice(17);
};

const emptyPlayer = { nombre: '', apellido_paterno: '', apellido_materno: '', numero_playera: '', curp: '', rol_liderazgo: 'Ninguno', foto_jugador: '' };

export default function RepresentativeDashboard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [inscripciones, setInscripciones] = useState([]);
  const [addPlayersFor, setAddPlayersFor] = useState(null);
  const [playersToAdd, setPlayersToAdd] = useState([]);
  const [newPlayer, setNewPlayer] = useState(emptyPlayer);
  const [savingPlayers, setSavingPlayers] = useState(false);

  const loadDashboard = async () => {
    const token = localStorage.getItem(`rep_token_${slug}`);
    if (!token) {
      navigate(`/representative/${slug}/login`);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/organizer/${slug}/representative/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el dashboard.');
      setProfile(data.representative);
      setInscripciones(Array.isArray(data.inscripciones) ? data.inscripciones : []);
    } catch (err) {
      localStorage.removeItem(`rep_token_${slug}`);
      toast.error(err.message);
      navigate(`/representative/${slug}/login`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [slug, navigate]);

  const handleLogout = () => {
    localStorage.removeItem(`rep_token_${slug}`);
    navigate(`/representative/${slug}/login`);
  };

  const openAddPlayers = (ins) => {
    setAddPlayersFor(ins);
    setPlayersToAdd([]);
    setNewPlayer(emptyPlayer);
  };

  const handlePlayerPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setNewPlayer((prev) => ({ ...prev, foto_jugador: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };

  const handleAddPlayerToList = () => {
    const nombre = String(newPlayer.nombre || '').trim();
    const apellido_paterno = String(newPlayer.apellido_paterno || '').trim();
    const apellido_materno = String(newPlayer.apellido_materno || '').trim();
    const numero = Number(newPlayer.numero_playera);
    const curp = String(newPlayer.curp || '').toUpperCase().trim();
    const rol_liderazgo = String(newPlayer.rol_liderazgo || 'Ninguno');

    if (!nombre) { toast.error('Ingresa el nombre del jugador.'); return; }
    if (!apellido_paterno || !apellido_materno) { toast.error('Debes capturar apellido paterno y materno.'); return; }
    if (!Number.isFinite(numero) || numero <= 0) { toast.error('Ingresa un número de playera válido.'); return; }
    if (!isValidCurp(curp)) { toast.error('La CURP del jugador no es válida.'); return; }

    const existentes = addPlayersFor?.jugadores || [];
    const todos = [...existentes, ...playersToAdd];
    if (todos.some((j) => Number(j.numero_playera) === numero)) { toast.error('Ese número de playera ya está asignado.'); return; }
    if (todos.some((j) => String(j.curp || '').toUpperCase() === curp)) { toast.error('Esa CURP ya está registrada en el equipo.'); return; }
    if (rol_liderazgo === 'Capitán' && todos.some((j) => j.rol_liderazgo === 'Capitán')) { toast.error('Ya existe un capitán en el equipo.'); return; }
    if (rol_liderazgo === 'Subcapitán' && todos.some((j) => j.rol_liderazgo === 'Subcapitán')) { toast.error('Ya existe un subcapitán en el equipo.'); return; }

    setPlayersToAdd([...playersToAdd, { nombre, apellido_paterno, apellido_materno, numero_playera: numero, curp, rol_liderazgo, foto_jugador: newPlayer.foto_jugador }]);
    setNewPlayer(emptyPlayer);
  };

  const handleRemoveFromList = (idx) => {
    setPlayersToAdd(playersToAdd.filter((_, i) => i !== idx));
  };

  const handleSubmitPlayers = async () => {
    if (playersToAdd.length === 0) { toast.error('Agrega al menos un jugador a la lista.'); return; }
    const token = localStorage.getItem(`rep_token_${slug}`);
    if (!token) { navigate(`/representative/${slug}/login`); return; }
    setSavingPlayers(true);
    try {
      const res = await fetch(`${API_URL}/api/organizer/${slug}/representative/inscripciones/${addPlayersFor.id}/jugadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jugadores: playersToAdd })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron agregar los jugadores.');
      toast.success(data.message || 'Jugadores agregados.');
      setAddPlayersFor(null);
      setPlayersToAdd([]);
      setNewPlayer(emptyPlayer);
      await loadDashboard();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPlayers(false);
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: '2rem' }}>Cargando dashboard del representante...</div>;

  const getPaymentTone = (estatusPago) => {
    const value = String(estatusPago || '').toLowerCase();
    if (value.includes('pagado')) return { color: '#34d399', bg: 'rgba(16,185,129,0.14)', border: 'rgba(52,211,153,0.35)', label: 'Pagado' };
    if (value.includes('pendiente')) return { color: '#fbbf24', bg: 'rgba(251,191,36,0.14)', border: 'rgba(251,191,36,0.35)', label: 'Pendiente' };
    return { color: '#cbd5e1', bg: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.35)', label: estatusPago || 'Sin definir' };
  };

  const getTournamentTone = (estatusTorneo) => {
    const value = String(estatusTorneo || '').toLowerCase();
    if (value.includes('activo')) return { color: '#22d3ee', bg: 'rgba(34,211,238,0.14)', border: 'rgba(34,211,238,0.35)', label: 'Abierto' };
    if (value.includes('registro')) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.35)', label: 'En registro' };
    if (value.includes('final') || value.includes('paus')) return { color: '#f87171', bg: 'rgba(248,113,113,0.14)', border: 'rgba(248,113,113,0.35)', label: 'Cerrado' };
    return { color: '#cbd5e1', bg: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.35)', label: estatusTorneo || 'N/D' };
  };

  const totalPagado = inscripciones.reduce((acc, ins) => acc + Number(ins.total_cobro || 0), 0);
  const totalJugadores = inscripciones.reduce((acc, ins) => acc + (Array.isArray(ins.jugadores) ? ins.jugadores.length : 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1000px 440px at 10% -10%, rgba(79,70,229,0.18), transparent 60%), radial-gradient(800px 380px at 100% 0, rgba(14,165,233,0.1), transparent 60%), #020202', color: '#fff', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes repFloatUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes repDriftA {
          0% { transform: translate(0, 0) scale(1); opacity: .26; }
          50% { transform: translate(16px, -22px) scale(1.08); opacity: .5; }
          100% { transform: translate(0, 0) scale(1); opacity: .26; }
        }
        @keyframes repDriftB {
          0% { transform: translate(0, 0) scale(1); opacity: .22; }
          50% { transform: translate(-18px, 20px) scale(1.1); opacity: .45; }
          100% { transform: translate(0, 0) scale(1); opacity: .22; }
        }
        @keyframes repShimmer {
          0% { background-position: -220% 0; }
          100% { background-position: 220% 0; }
        }
        @keyframes repPulseGlow {
          0% { box-shadow: 0 0 0 rgba(99,102,241,0.14); }
          50% { box-shadow: 0 0 32px rgba(99,102,241,0.34); }
          100% { box-shadow: 0 0 0 rgba(99,102,241,0.14); }
        }
        @keyframes repBorderFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes repBadgePulse {
          0% { transform: translateY(0); filter: brightness(1); }
          50% { transform: translateY(-1px); filter: brightness(1.08); }
          100% { transform: translateY(0); filter: brightness(1); }
        }
        @keyframes repGridMove {
          0% { transform: translateY(0px); }
          100% { transform: translateY(26px); }
        }
        .rep-orb-a, .rep-orb-b, .rep-orb-c {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          filter: blur(10px);
          z-index: 0;
        }
        .rep-orb-a {
          width: 360px;
          height: 360px;
          left: -90px;
          top: -120px;
          background: radial-gradient(circle, rgba(59,130,246,.32), transparent 70%);
          animation: repDriftA 7.5s ease-in-out infinite;
        }
        .rep-orb-b {
          width: 420px;
          height: 420px;
          right: -140px;
          bottom: -150px;
          background: radial-gradient(circle, rgba(139,92,246,.3), transparent 70%);
          animation: repDriftB 8.4s ease-in-out infinite;
        }
        .rep-orb-c {
          width: 260px;
          height: 260px;
          right: 22%;
          top: 25%;
          background: radial-gradient(circle, rgba(236,72,153,.2), transparent 72%);
          animation: repDriftA 9.2s ease-in-out infinite;
        }
        .rep-head {
          position: relative;
          overflow: hidden;
          animation: repPulseGlow 3.4s ease-in-out infinite;
        }
        .rep-head::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,.08) 50%, transparent 80%);
          background-size: 220% 100%;
          animation: repShimmer 6.5s linear infinite;
          pointer-events: none;
        }
        .rep-border-glow {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(120deg, rgba(59,130,246,.45), rgba(99,102,241,.25), rgba(236,72,153,.38), rgba(59,130,246,.45));
          background-size: 230% 230%;
          animation: repBorderFlow 8s ease infinite;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: .8;
        }
        .rep-card {
          position: relative;
          overflow: hidden;
          transition: transform .24s ease, box-shadow .24s ease, border-color .24s ease;
        }
        .rep-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 25%, rgba(255,255,255,.08) 50%, transparent 75%);
          background-size: 220% 100%;
          opacity: 0;
          transition: opacity .24s ease;
          pointer-events: none;
        }
        .rep-card:hover {
          transform: translateY(-4px) scale(1.01);
          border-color: rgba(129,140,248,.35) !important;
          box-shadow: 0 20px 40px rgba(15,23,42,.55), 0 0 0 1px rgba(99,102,241,.22) inset, 0 0 24px rgba(99,102,241,.22);
        }
        .rep-card:hover::after {
          opacity: 1;
          animation: repShimmer 2.8s linear infinite;
        }
        .rep-badge {
          animation: repBadgePulse 2.8s ease-in-out infinite;
        }
        .rep-action {
          transition: transform .18s ease, box-shadow .2s ease, filter .2s ease;
        }
        .rep-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(79,70,229,.35);
          filter: brightness(1.06);
        }
        .rep-title-gradient {
          background: linear-gradient(90deg, #dbeafe, #a5b4fc, #67e8f9);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .rep-modern-card {
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          background: linear-gradient(140deg, rgba(15,23,42,.72), rgba(2,6,23,.55));
          backdrop-filter: blur(10px);
          box-shadow: 0 18px 40px rgba(2,6,23,.42);
        }
      `}</style>
      <div className="rep-orb-a" />
      <div className="rep-orb-b" />
      <div className="rep-orb-c" />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 75%)', animation: 'repGridMove 4s linear infinite', pointerEvents: 'none' }} />
      <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <div className="glass-panel rep-head rep-modern-card" style={{ padding: '1rem 1.1rem' }}>
          <div className="rep-border-glow" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div>
              <span style={{ fontSize: '.74rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#93c5fd', border: '1px solid rgba(59,130,246,.3)', borderRadius: '999px', padding: '.2rem .6rem', background: 'rgba(30,58,138,.2)' }}>
                Area privada
              </span>
              <h2 className="rep-title-gradient" style={{ margin: '0.45rem 0 0 0', fontSize: '2rem', letterSpacing: '-.5px' }}>Panel del Representante</h2>
              <p style={{ color: '#94a3b8', margin: '0.35rem 0 0 0' }}>
                Gestiona tus inscripciones, pagos y equipos desde un solo lugar.
              </p>
              <p style={{ color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
                <strong style={{ color: '#cbd5e1' }}>{profile?.nombre_representante}</strong> · {profile?.email}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link className="rep-action" to="/representative/leagues" style={{ color: '#dbeafe', textDecoration: 'none', border: '1px solid rgba(129,140,248,.35)', background: 'linear-gradient(90deg, rgba(79,70,229,.3), rgba(124,58,237,.35))', borderRadius: '10px', padding: '0.42rem 0.75rem', fontWeight: 700 }}>
                + Nueva inscripción
              </Link>
              <button className="rep-action" onClick={handleLogout} style={{ border: '1px solid rgba(248,113,113,0.45)', background: 'rgba(127,29,29,0.2)', color: '#fca5a5', borderRadius: '10px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontWeight: 700 }}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '0.9rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem' }}>
          <div className="rep-modern-card" style={{ padding: '0.7rem 0.8rem' }}>
            <div style={{ fontSize: '.78rem', color: '#94a3b8' }}>Inscripciones</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#e2e8f0' }}>{inscripciones.length}</div>
          </div>
          <div className="rep-modern-card" style={{ padding: '0.7rem 0.8rem' }}>
            <div style={{ fontSize: '.78rem', color: '#94a3b8' }}>Jugadores registrados</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#e2e8f0' }}>{totalJugadores}</div>
          </div>
          <div className="rep-modern-card" style={{ padding: '0.7rem 0.8rem' }}>
            <div style={{ fontSize: '.78rem', color: '#94a3b8' }}>Monto acumulado</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fbbf24' }}>${totalPagado.toFixed(2)}</div>
          </div>
        </div>

        <div className="glass-panel rep-modern-card" style={{ marginTop: '1rem', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <strong style={{ color: '#c4b5fd', fontSize: '1.03rem' }}>Mis inscripciones</strong>
            <div style={{ fontSize: '.82rem', color: '#94a3b8' }}>
              Total registradas: <strong style={{ color: '#e2e8f0' }}>{inscripciones.length}</strong>
            </div>
          </div>
          {inscripciones.length === 0 ? (
            <p style={{ color: '#94a3b8', marginTop: '.75rem' }}>No tienes inscripciones registradas aún.</p>
          ) : (
            <div style={{ marginTop: '0.8rem', display: 'grid', gap: '0.65rem' }}>
              {inscripciones.map((ins, index) => {
                const payTone = getPaymentTone(ins.estatus_pago);
                const tournamentTone = getTournamentTone(ins.torneo?.estatus);
                return (
                  <div
                    key={ins.id}
                    className="rep-card"
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '0.85rem',
                      background: 'linear-gradient(120deg, rgba(255,255,255,0.02), rgba(99,102,241,0.08))',
                      animation: `repFloatUp .28s ease-out ${Math.min(index * 70, 280)}ms both`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <strong style={{ fontSize: '1.02rem' }}>{ins.nombre_equipo}</strong>
                      <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '1.02rem' }}>${Number(ins.total_cobro || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ marginTop: '0.45rem', display: 'flex', gap: '.45rem', flexWrap: 'wrap' }}>
                      <span className="rep-badge" style={{ fontSize: '.76rem', color: tournamentTone.color, border: `1px solid ${tournamentTone.border}`, background: tournamentTone.bg, borderRadius: '999px', padding: '.18rem .55rem', fontWeight: 700 }}>
                        Torneo: {tournamentTone.label}
                      </span>
                      <span className="rep-badge" style={{ fontSize: '.76rem', color: payTone.color, border: `1px solid ${payTone.border}`, background: payTone.bg, borderRadius: '999px', padding: '.18rem .55rem', fontWeight: 700, animationDelay: '.2s' }}>
                        Pago: {payTone.label}
                      </span>
                      <span className="rep-badge" style={{ fontSize: '.76rem', color: '#cbd5e1', border: '1px solid rgba(148,163,184,0.35)', background: 'rgba(148,163,184,0.14)', borderRadius: '999px', padding: '.18rem .55rem', fontWeight: 700, animationDelay: '.35s' }}>
                        Jugadores: {(ins.jugadores || []).length}
                      </span>
                    </div>
                    <div style={{ marginTop: '0.45rem', color: '#94a3b8', fontSize: '0.86rem' }}>
                      Torneo: <strong style={{ color: '#dbeafe' }}>{ins.torneo?.nombre || 'N/D'}</strong> · Categoría: {ins.torneo?.categoria || 'N/D'}
                    </div>
                    <div style={{ marginTop: '0.7rem' }}>
                      <button
                        className="rep-action"
                        onClick={() => openAddPlayers(ins)}
                        style={{ border: '1px solid rgba(129,140,248,.4)', background: 'linear-gradient(90deg, rgba(79,70,229,.3), rgba(124,58,237,.35))', color: '#dbeafe', borderRadius: '10px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}
                      >
                        + Agregar jugadores
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {addPlayersFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(7px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="rep-modern-card" style={{ width: '100%', maxWidth: '1040px', maxHeight: '92vh', overflowY: 'auto', padding: '1.3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.8rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.2rem' }}>Agregar jugadores</h3>
                <p style={{ margin: '0.3rem 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Equipo: <strong style={{ color: '#dbeafe' }}>{addPlayersFor.nombre_equipo}</strong> · Actuales: {(addPlayersFor.jugadores || []).length}
                </p>
              </div>
              <button onClick={() => setAddPlayersFor(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#cbd5e1', borderRadius: '8px', padding: '0.3rem 0.6rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginTop: '1rem', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '14px', padding: '1rem', background: 'linear-gradient(130deg, rgba(91,33,182,.14), rgba(2,6,23,.35))' }}>
              <strong style={{ display: 'block', marginBottom: '0.7rem', color: '#c4b5fd' }}>Jugadores a inscribir</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                <input
                  value={newPlayer.nombre}
                  onChange={e => setNewPlayer({ ...newPlayer, nombre: e.target.value })}
                  placeholder="Nombre(s)"
                  style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
                />
                <input
                  value={newPlayer.apellido_paterno}
                  onChange={e => setNewPlayer({ ...newPlayer, apellido_paterno: e.target.value })}
                  placeholder="Apellido paterno"
                  style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
                />
                <input
                  value={newPlayer.apellido_materno}
                  onChange={e => setNewPlayer({ ...newPlayer, apellido_materno: e.target.value })}
                  placeholder="Apellido materno"
                  style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
                />
                <input
                  type="number"
                  min="1"
                  value={newPlayer.numero_playera}
                  onChange={e => setNewPlayer({ ...newPlayer, numero_playera: e.target.value })}
                  placeholder="Núm. playera"
                  style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
                />
                <input
                  value={newPlayer.curp}
                  onChange={e => setNewPlayer({ ...newPlayer, curp: String(e.target.value || '').toUpperCase() })}
                  placeholder="CURP del jugador"
                  maxLength={18}
                  style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff', textTransform: 'uppercase' }}
                />
                <select
                  value={newPlayer.rol_liderazgo}
                  onChange={e => setNewPlayer({ ...newPlayer, rol_liderazgo: e.target.value })}
                  style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
                >
                  <option value="Ninguno">Sin rol</option>
                  <option value="Capitán">Capitán</option>
                  <option value="Subcapitán">Subcapitán</option>
                </select>
                <button type="button" className="rep-action" onClick={handleAddPlayerToList} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
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
                {newPlayer.foto_jugador ? (
                  <img src={newPlayer.foto_jugador} alt="Preview jugador" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(99,102,241,0.65)' }} />
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Foto obligatoria</span>
                )}
              </div>
              <div style={{ marginTop: '0.75rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflowX: 'auto', background: 'rgba(2,6,23,0.5)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
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
                    {playersToAdd.map((player, idx) => (
                      <tr key={`${player.nombre}-${idx}`} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
                          <button type="button" className="rep-action" onClick={() => handleRemoveFromList(idx)} style={{ background: 'transparent', color: '#f87171', border: '1px solid rgba(248,113,113,0.4)', borderRadius: '8px', padding: '0.25rem 0.55rem', cursor: 'pointer' }}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {playersToAdd.length === 0 && (
                <p style={{ margin: '0.65rem 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>Aún no has agregado jugadores. Debes incluir nombre, apellidos y número de playera{SKIP_CURP ? '' : ', y CURP válida'}.</p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.2rem' }}>
              <button onClick={() => setAddPlayersFor(null)} style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#cbd5e1', borderRadius: '10px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 700 }}>
                Cancelar
              </button>
              <button onClick={handleSubmitPlayers} disabled={savingPlayers || playersToAdd.length === 0} className="rep-action" style={{ border: 'none', background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', color: '#fff', borderRadius: '10px', padding: '0.5rem 1.1rem', cursor: savingPlayers || playersToAdd.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: savingPlayers || playersToAdd.length === 0 ? 0.6 : 1 }}>
                {savingPlayers ? 'Guardando...' : `Inscribir ${playersToAdd.length} jugador(es)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
