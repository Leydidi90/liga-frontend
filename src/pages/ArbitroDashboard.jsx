import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API_URL from '../api';

const inputStyle = { width: '100%', padding: '0.6rem 0.7rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff', outline: 'none', fontSize: '0.85rem' };

export default function ArbitroDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [arbitro, setArbitro] = useState(null);
  const [liga, setLiga] = useState(null);
  const [ligas, setLigas] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(() => localStorage.getItem('arb_slug') || '');
  const [partidos, setPartidos] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [jugadoresPorEquipo, setJugadoresPorEquipo] = useState({});
  const [multas, setMultas] = useState([]);
  const [jornadaFiltro, setJornadaFiltro] = useState('Todas');
  const [multaForm, setMultaForm] = useState({ tipo: 'equipo', equipo_nombre: '', jugador_nombre: '', jornada: '', motivo: '', monto: '' });
  const [savingMulta, setSavingMulta] = useState(false);

  const loadDashboard = async (slug) => {
    const token = localStorage.getItem('arb_token');
    if (!token) {
      navigate('/arbitro/login');
      return;
    }
    try {
      const qs = slug ? `?slug=${encodeURIComponent(slug)}` : '';
      const res = await fetch(`${API_URL}/api/arbitro/dashboard${qs}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el panel.');
      setArbitro(data.arbitro);
      setLiga(data.liga);
      setLigas(Array.isArray(data.ligas) ? data.ligas : []);
      if (data.liga?.slug) {
        setSelectedSlug(data.liga.slug);
        localStorage.setItem('arb_slug', data.liga.slug);
      }
      setPartidos(Array.isArray(data.partidos) ? data.partidos : []);
      setEquipos(Array.isArray(data.equipos) ? data.equipos : []);
      setJugadoresPorEquipo(data.jugadoresPorEquipo || {});
      setMultas(Array.isArray(data.multas) ? data.multas : []);
    } catch (err) {
      localStorage.removeItem('arb_token');
      toast.error(err.message);
      navigate('/arbitro/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(localStorage.getItem('arb_slug') || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangeLiga = (slug) => {
    setSelectedSlug(slug);
    localStorage.setItem('arb_slug', slug);
    setJornadaFiltro('Todas');
    setMultaForm({ tipo: 'equipo', equipo_nombre: '', jugador_nombre: '', jornada: '', motivo: '', monto: '' });
    setLoading(true);
    loadDashboard(slug);
  };

  const handleLogout = () => {
    localStorage.removeItem('arb_token');
    localStorage.removeItem('arb_slug');
    localStorage.removeItem('arb_ligas');
    navigate('/arbitro/login');
  };

  const jornadas = useMemo(() => [...new Set(partidos.map((p) => p.jornada))].sort((a, b) => a - b), [partidos]);
  const partidosFiltrados = jornadaFiltro === 'Todas' ? partidos : partidos.filter((p) => p.jornada?.toString() === jornadaFiltro.toString());

  const teamStats = useMemo(() => {
    const num = (v) => Number(v || 0);
    const map = {};
    const ensure = (nombre, escudo) => {
      if (!nombre) return null;
      if (!map[nombre]) map[nombre] = { nombre, escudo: escudo || '', pj: 0, gf: 0, gc: 0, faltas: 0, amarillas: 0, rojas: 0 };
      if (escudo && !map[nombre].escudo) map[nombre].escudo = escudo;
      return map[nombre];
    };
    partidosFiltrados.forEach((p) => {
      const st = p.stats || {};
      const faltas = st.faltas || { local: 0, vis: 0 };
      const amarillas = st.amarillas || { local: 0, vis: 0 };
      const rojas = st.rojas || { local: 0, vis: 0 };
      const finalizado = p.estatus === 'Finalizado';
      const local = ensure(p.local_nombre, p.local_escudo);
      const visit = ensure(p.visitante_nombre, p.visitante_escudo);
      if (local) {
        local.gf += num(p.goles_local); local.gc += num(p.goles_visitante);
        local.faltas += num(faltas.local); local.amarillas += num(amarillas.local); local.rojas += num(rojas.local);
        if (finalizado) local.pj++;
      }
      if (visit) {
        visit.gf += num(p.goles_visitante); visit.gc += num(p.goles_local);
        visit.faltas += num(faltas.vis); visit.amarillas += num(amarillas.vis); visit.rojas += num(rojas.vis);
        if (finalizado) visit.pj++;
      }
    });
    return Object.values(map).sort((a, b) => (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf);
  }, [partidosFiltrados]);

  const jugadoresDelEquipo = multaForm.equipo_nombre ? (jugadoresPorEquipo[multaForm.equipo_nombre] || []) : [];

  const handleSubmitMulta = async (e) => {
    e.preventDefault();
    if (!multaForm.equipo_nombre) { toast.error('Selecciona un equipo.'); return; }
    if (multaForm.tipo === 'jugador' && !multaForm.jugador_nombre) { toast.error('Selecciona o escribe el jugador a multar.'); return; }
    if (!multaForm.motivo.trim()) { toast.error('Indica el motivo.'); return; }
    if (!(Number(multaForm.monto) > 0)) { toast.error('El monto debe ser mayor a 0.'); return; }
    const token = localStorage.getItem('arb_token');
    if (!token) { navigate('/arbitro/login'); return; }
    setSavingMulta(true);
    try {
      const res = await fetch(`${API_URL}/api/arbitro/multas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...multaForm, slug: selectedSlug })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar la multa.');
      toast.success(data.message || 'Multa registrada.');
      setMultaForm({ tipo: 'equipo', equipo_nombre: '', jugador_nombre: '', jornada: '', motivo: '', monto: '' });
      await loadDashboard(selectedSlug);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingMulta(false);
    }
  };

  const handleDeleteMulta = async (id) => {
    const token = localStorage.getItem('arb_token');
    if (!token) { navigate('/arbitro/login'); return; }
    try {
      const res = await fetch(`${API_URL}/api/arbitro/multas/${id}?slug=${encodeURIComponent(selectedSlug)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar.');
      toast.success(data.message || 'Multa eliminada.');
      await loadDashboard(selectedSlug);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: '2rem' }}>Cargando panel del árbitro...</div>;

  const pendientes = partidos.filter((p) => p.estatus !== 'Finalizado').length;
  const totalMultas = multas.reduce((acc, m) => acc + Number(m.monto || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(900px 420px at 10% -10%, rgba(14,165,233,0.16), transparent 60%), #020202', color: '#fff', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '1.2rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div>
              <span style={{ fontSize: '.72rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7dd3fc', border: '1px solid rgba(14,165,233,.35)', borderRadius: '999px', padding: '.2rem .6rem', background: 'rgba(8,47,73,.3)' }}>
                Panel del árbitro
              </span>
              <h2 style={{ margin: '0.45rem 0 0 0', fontSize: '1.9rem' }}>{arbitro?.nombre}</h2>
              <p style={{ color: '#94a3b8', margin: '0.3rem 0 0 0', fontSize: '0.9rem' }}>
                Liga: <strong style={{ color: '#dbeafe' }}>{liga?.nombre || 'N/D'}</strong> · Rol: <strong style={{ color: '#cbd5e1' }}>{arbitro?.rol || 'N/D'}</strong> · Matrícula: <strong style={{ color: '#cbd5e1' }}>{arbitro?.matricula || 'N/D'}</strong> · Categoría: {arbitro?.categoria || 'N/D'}
              </p>
              {arbitro?.equipo_excluido && (
                <p style={{ color: '#f87171', margin: '0.2rem 0 0 0', fontSize: '0.82rem' }}>Excluido de partidos de: {arbitro.equipo_excluido}</p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {ligas.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Liga a consultar</span>
                  <select value={selectedSlug} onChange={(e) => handleChangeLiga(e.target.value)} style={{ padding: '0.5rem', background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.45)', color: '#fff', borderRadius: '8px', outline: 'none', fontWeight: 700 }}>
                    {ligas.map((l) => <option key={l.slug} value={l.slug}>{l.nombre || l.slug}</option>)}
                  </select>
                </div>
              )}
              <button onClick={handleLogout} style={{ border: '1px solid rgba(248,113,113,0.45)', background: 'rgba(127,29,29,0.2)', color: '#fca5a5', borderRadius: '10px', padding: '0.45rem 0.85rem', cursor: 'pointer', fontWeight: 700 }}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '0.9rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.6rem' }}>
          <div className="glass-panel" style={{ padding: '0.7rem 0.9rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '.78rem', color: '#94a3b8' }}>Jornadas</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{jornadas.length}</div>
          </div>
          <div className="glass-panel" style={{ padding: '0.7rem 0.9rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '.78rem', color: '#94a3b8' }}>Partidos por dirigir</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fbbf24' }}>{pendientes}</div>
          </div>
          <div className="glass-panel" style={{ padding: '0.7rem 0.9rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '.78rem', color: '#94a3b8' }}>Multas emitidas</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#a78bfa' }}>{multas.length} · ${totalMultas.toLocaleString()}</div>
          </div>
        </div>

        {/* Filtro de jornada */}
        <div className="glass-panel" style={{ marginTop: '1rem', padding: '1rem 1.2rem', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
          <strong style={{ color: '#7dd3fc' }}>Jornadas en las que participas</strong>
          <select value={jornadaFiltro} onChange={(e) => setJornadaFiltro(e.target.value)} style={{ padding: '0.5rem', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.4)', color: '#fff', borderRadius: '8px', outline: 'none' }}>
            <option value="Todas">Todas las jornadas</option>
            {jornadas.map((j) => <option key={j} value={j}>Jornada {j}</option>)}
          </select>
        </div>

        {/* Estadísticas por jornada */}
        <div className="glass-panel" style={{ marginTop: '1rem', padding: '1.2rem', borderRadius: '14px' }}>
          <strong style={{ color: '#c4b5fd', fontSize: '1.03rem' }}>📊 Estadísticas de equipos {jornadaFiltro === 'Todas' ? '(todas las jornadas)' : `(jornada ${jornadaFiltro})`}</strong>
          {teamStats.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.7rem' }}>Sin datos de partidos para mostrar.</p>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: '0.8rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'center', color: '#a5b4fc', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                    <th style={{ padding: '0.6rem', textAlign: 'left' }}>Equipo</th>
                    <th style={{ padding: '0.6rem' }} title="Partidos jugados">PJ</th>
                    <th style={{ padding: '0.6rem' }} title="Goles a favor">GF</th>
                    <th style={{ padding: '0.6rem' }} title="Goles en contra">GC</th>
                    <th style={{ padding: '0.6rem' }} title="Diferencia">DIF</th>
                    <th style={{ padding: '0.6rem' }}>Faltas</th>
                    <th style={{ padding: '0.6rem' }}>🟨</th>
                    <th style={{ padding: '0.6rem' }}>🟥</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStats.map((ts) => {
                    const dif = ts.gf - ts.gc;
                    return (
                      <tr key={ts.nombre} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0', textAlign: 'center' }}>
                        <td style={{ padding: '0.55rem', textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {ts.escudo ? <img src={ts.escudo} alt={ts.nombre} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'contain' }} /> : <div className="avatar" style={{ width: '26px', height: '26px', fontSize: '0.65rem' }}>{ts.nombre.substring(0, 2).toUpperCase()}</div>}
                            <strong>{ts.nombre}</strong>
                          </div>
                        </td>
                        <td style={{ padding: '0.55rem', color: '#9ca3af' }}>{ts.pj}</td>
                        <td style={{ padding: '0.55rem' }}>{ts.gf}</td>
                        <td style={{ padding: '0.55rem' }}>{ts.gc}</td>
                        <td style={{ padding: '0.55rem', color: dif > 0 ? '#34d399' : dif < 0 ? '#f87171' : '#9ca3af' }}>{dif > 0 ? `+${dif}` : dif}</td>
                        <td style={{ padding: '0.55rem' }}>{ts.faltas}</td>
                        <td style={{ padding: '0.55rem', color: '#facc15' }}>{ts.amarillas}</td>
                        <td style={{ padding: '0.55rem', color: '#ef4444' }}>{ts.rojas}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Multas */}
        <div className="glass-panel" style={{ marginTop: '1rem', padding: '1.2rem', borderRadius: '14px' }}>
          <strong style={{ color: '#fca5a5', fontSize: '1.03rem' }}>💸 Multas a equipos y jugadores</strong>
          <form onSubmit={handleSubmitMulta} style={{ marginTop: '0.9rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Tipo de multa</label>
              <select value={multaForm.tipo} onChange={(e) => setMultaForm({ ...multaForm, tipo: e.target.value, jugador_nombre: '' })} style={inputStyle}>
                <option value="equipo">Equipo</option>
                <option value="jugador">Jugador</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Equipo</label>
              <select value={multaForm.equipo_nombre} onChange={(e) => setMultaForm({ ...multaForm, equipo_nombre: e.target.value, jugador_nombre: '' })} style={inputStyle}>
                <option value="">Selecciona equipo</option>
                {equipos.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
              </select>
            </div>
            {multaForm.tipo === 'jugador' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Jugador</label>
                {jugadoresDelEquipo.length > 0 ? (
                  <select value={multaForm.jugador_nombre} onChange={(e) => setMultaForm({ ...multaForm, jugador_nombre: e.target.value })} style={inputStyle}>
                    <option value="">Selecciona jugador</option>
                    {jugadoresDelEquipo.map((nombre, i) => <option key={i} value={nombre}>{nombre}</option>)}
                  </select>
                ) : (
                  <input value={multaForm.jugador_nombre} onChange={(e) => setMultaForm({ ...multaForm, jugador_nombre: e.target.value })} placeholder="Nombre del jugador" style={inputStyle} />
                )}
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Jornada (opcional)</label>
              <select value={multaForm.jornada} onChange={(e) => setMultaForm({ ...multaForm, jornada: e.target.value })} style={inputStyle}>
                <option value="">Sin jornada</option>
                {jornadas.map((j) => <option key={j} value={j}>Jornada {j}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Monto ($)</label>
              <input type="number" min="1" value={multaForm.monto} onChange={(e) => setMultaForm({ ...multaForm, monto: e.target.value })} placeholder="Ej: 150" style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Motivo</label>
              <input value={multaForm.motivo} onChange={(e) => setMultaForm({ ...multaForm, motivo: e.target.value })} placeholder="Ej: Conducta antideportiva, tarjeta roja, etc." style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" disabled={savingMulta} style={{ border: 'none', background: 'linear-gradient(90deg,#ef4444,#f97316)', color: '#fff', borderRadius: '10px', padding: '0.6rem 1.1rem', cursor: savingMulta ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: savingMulta ? 0.6 : 1 }}>
                {savingMulta ? 'Registrando...' : 'Aplicar multa'}
              </button>
            </div>
          </form>

          <div style={{ marginTop: '1.2rem' }}>
            <strong style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Historial de multas ({multas.length})</strong>
            {multas.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '0.4rem' }}>No se han registrado multas.</p>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: '0.6rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#a5b4fc', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                      <th style={{ padding: '0.5rem' }}>Tipo</th>
                      <th style={{ padding: '0.5rem' }}>Equipo</th>
                      <th style={{ padding: '0.5rem' }}>Jugador</th>
                      <th style={{ padding: '0.5rem' }}>Motivo</th>
                      <th style={{ padding: '0.5rem' }}>Jornada</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Monto</th>
                      <th style={{ padding: '0.5rem' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {multas.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0' }}>
                        <td style={{ padding: '0.5rem', textTransform: 'capitalize' }}>{m.tipo}</td>
                        <td style={{ padding: '0.5rem' }}>{m.equipo_nombre}</td>
                        <td style={{ padding: '0.5rem', color: '#9ca3af' }}>{m.jugador_nombre || '—'}</td>
                        <td style={{ padding: '0.5rem', color: '#cbd5e1' }}>{m.motivo}</td>
                        <td style={{ padding: '0.5rem', color: '#9ca3af', textAlign: 'center' }}>{m.jornada != null ? m.jornada : '—'}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', color: '#fbbf24', fontWeight: 'bold' }}>${Number(m.monto || 0).toLocaleString()}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                          <button onClick={() => handleDeleteMulta(m.id)} title="Eliminar" style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.4)', color: '#fca5a5', borderRadius: '8px', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.72rem' }}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Mis partidos */}
        <div className="glass-panel" style={{ marginTop: '1rem', padding: '1.2rem', borderRadius: '14px' }}>
          <strong style={{ color: '#7dd3fc', fontSize: '1.03rem' }}>📋 Mis partidos</strong>
          {partidosFiltrados.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.7rem' }}>No hay partidos {jornadaFiltro === 'Todas' ? 'registrados' : `en la jornada ${jornadaFiltro}`}.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.8rem' }}>
              {partidosFiltrados.map((p) => {
                const finalizado = p.estatus === 'Finalizado';
                return (
                  <div key={p.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '0.9rem', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Jornada {p.jornada}</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 'bold', color: finalizado ? '#34d399' : '#fbbf24', border: `1px solid ${finalizado ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.4)'}`, borderRadius: '999px', padding: '0.15rem 0.55rem' }}>
                        {finalizado ? 'Finalizado' : 'Pendiente'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', margin: '0.7rem 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'flex-end' }}>
                        <strong style={{ fontSize: '1.05rem' }}>{p.local_nombre}</strong>
                        {p.local_escudo && <img src={p.local_escudo} alt={p.local_nombre} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'contain' }} />}
                      </div>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: finalizado ? '#34d399' : '#64748b', minWidth: '60px', textAlign: 'center' }}>
                        {finalizado ? `${p.goles_local} - ${p.goles_visitante}` : 'vs'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        {p.visitante_escudo && <img src={p.visitante_escudo} alt={p.visitante_nombre} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'contain' }} />}
                        <strong style={{ fontSize: '1.05rem' }}>{p.visitante_nombre}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.82rem', color: '#9ca3af' }}>
                      <span style={{ color: p.sede ? '#facc15' : '#6b7280' }}>📍 {p.sede || 'Sin sede'}</span>
                      <span style={{ color: p.horario ? '#34d399' : '#6b7280' }}>🕒 {p.horario || 'Sin horario'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
