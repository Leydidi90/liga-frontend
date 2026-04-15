import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API_URL from '../api';

export default function OrganizerDashboard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [equipos, setEquipos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [torneos, setTorneos] = useState([]);
  const [torneoForm, setTorneoForm] = useState({ nombre: '', formato: 'Liga (Todos contra todos)', fecha_inicio: '', fecha_fin: '', estatus: 'En Registro', premio: '' });
  const [arbitros, setArbitros] = useState([]);
  const [equipoForm, setEquipoForm] = useState({ nombre: '', delegado: '', escudo: '' });
  const [jornadaActiva, setJornadaActiva] = useState('Todas');
  const [activeSegment, setActiveSegment] = useState('EQUIPOS'); // 'EQUIPOS', 'CALENDARIO', 'ARBITROS'
  const [programacionOpen, setProgramacionOpen] = useState(false);
  const [partidoAProgramar, setPartidoAProgramar] = useState(null);
  const [programacionForm, setProgramacionForm] = useState({ sede: '', horario: '' });
  const [nuevoArbitro, setNuevoArbitro] = useState('');
  const [nuevoRol, setNuevoRol] = useState('Central');
  const [nuevaMatricula, setNuevaMatricula] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [nuevoEquipoAsignado, setNuevoEquipoAsignado] = useState('');
  const [editandoArbitroId, setEditandoArbitroId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tenantData, setTenantData] = useState(null);

  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [activeMatch, setActiveMatch] = useState(null);
  const [statsForm, setStatsForm] = useState({
      goles_local: 0, goles_visitante: 0,
      anotadores_local: '', anotadores_visitante: '',
      remates_local: 0, remates_visitante: 0,
      remates_arco_local: 0, remates_arco_visitante: 0,
      posesion_local: 50,
      faltas_local: 0, faltas_visitante: 0,
      amarillas_local: 0, amarillas_visitante: 0,
      rojas_local: 0, rojas_visitante: 0,
      corners_local: 0, corners_visitante: 0,
      posicion_adelantada_local: 0, posicion_adelantada_visitante: 0
  });

  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem(`tenant_token_${slug}`);
    if (!token) {
      navigate(`/organizer/${slug}/login`);
      return null;
    }
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    
    const res = await fetch(url, { ...options, headers });
    
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem(`tenant_token_${slug}`);
      navigate(`/organizer/${slug}/login`);
      return null;
    }
    return res;
  };

  useEffect(() => {
    const token = localStorage.getItem(`tenant_token_${slug}`);
    if (!token) {
      navigate(`/organizer/${slug}/login`);
      return;
    }

    // 1. Verificar Seguridad Middleware
    const verificarAcceso = async () => {
      try {
        const res = await fetch(`${API_URL}/api/verify-tenant/${slug}`);
        const data = await res.json();
        if (!res.ok) {
           toast.error(data.error);
           navigate('/suspended', { state: { tenant: data.data, error: data.error } });
           return;
        }
        setTenantData(data.data);
        fetchEquipos();
        fetchPartidos();
        fetchTorneos();
        fetchArbitros();
      } catch(err) {
        toast.error("Error validando tenant");
      }
    };
    verificarAcceso();
  }, [slug]);

  const handleLogout = () => {
    localStorage.removeItem(`tenant_token_${slug}`);
    navigate(`/organizer/${slug}/login`);
    toast.success("Sesión cerrada");
  };

  const fetchEquipos = async () => {
    const res = await fetchWithAuth(`${API_URL}/api/organizer/${slug}/equipos`);
    if (res) setEquipos(await res.json());
  };

  const fetchPartidos = async () => {
    const res = await fetchWithAuth(`${API_URL}/api/organizer/${slug}/calendario`);
    if (res) setPartidos(await res.json());
  };

  const fetchTorneos = async () => {
    const res = await fetchWithAuth(`${API_URL}/api/organizer/${slug}/torneos`);
    if (res) setTorneos(await res.json());
  };

  const fetchArbitros = async () => {
    const res = await fetchWithAuth(`${API_URL}/api/organizer/${slug}/arbitros`);
    if (res) setArbitros(await res.json());
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setEquipoForm({ ...equipoForm, escudo: reader.result }); };
      reader.readAsDataURL(file);
    }
  };

  const handleAddEquipo = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`${API_URL}/api/organizer/${slug}/equipos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(equipoForm)
      });
      if (!res.ok) throw new Error("Error creando");
      toast.success("Equipo inscrito");
      setEquipoForm({ nombre: '', delegado: '', escudo: '' });
      fetchEquipos();
    } catch (err) { toast.error("Fallo al registrar equipo"); }
  };

  const handleAddTorneo = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`${API_URL}/api/organizer/${slug}/torneos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(torneoForm)
      });
      if (res.ok) { 
          toast.success("Torneo Creado"); 
          setTorneoForm({ nombre: '', formato: 'Liga (Todos contra todos)', fecha_inicio: '', fecha_fin: '', estatus: 'En Registro', premio: '' }); 
          fetchTorneos(); 
      }
    } catch (err) {}
  };

  const handleAddArbitro = async (e) => {
    e.preventDefault();
    try {
      const url = editandoArbitroId 
          ? `${API_URL}/api/organizer/${slug}/arbitros/${editandoArbitroId}`
          : `${API_URL}/api/organizer/${slug}/arbitros`;
      const method = editandoArbitroId ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nuevoArbitro, rol: nuevoRol, matricula: nuevaMatricula, categoria: nuevaCategoria, equipo_id: nuevoEquipoAsignado })
      });
      if (res.ok) { 
          toast.success(editandoArbitroId ? "Árbitro Modificado" : "Árbitro Agregado al Padrón"); 
          resetArbitroForm();
          fetchArbitros(); 
      }
    } catch (err) {}
  };

  const resetArbitroForm = () => {
      setNuevoArbitro(''); 
      setNuevaMatricula('');
      setNuevaCategoria('');
      setNuevoRol('Central');
      setNuevoEquipoAsignado('');
      setEditandoArbitroId(null);
  };

  const handleEditMode = (a) => {
      setEditandoArbitroId(a.id);
      setNuevoArbitro(a.nombre);
      setNuevaMatricula(a.matricula || '');
      setNuevaCategoria(a.categoria || '');
      setNuevoRol(a.rol);
      setNuevoEquipoAsignado(a.equipo_id || '');
  };

  const handleDeleteArbitro = async (id) => {
      if(!window.confirm("¿Seguro que deseas dar de baja a este árbitro?")) return;
      try {
          const res = await fetchWithAuth(`${API_URL}/api/organizer/${slug}/arbitros/${id}`, { method: 'DELETE' });
          if(res && res.ok) { fetchArbitros(); toast.success("Árbitro dado de baja"); }
      } catch(err){}
  };

  const openMatchModal = (partido) => {
      setActiveMatch(partido);
      const st = partido.stats || {};
      const remates = st.remates || { local: 0, vis: 0 };
      const remates_arco = st.remates_arco || { local: 0, vis: 0 };
      const posesion = st.posesion || { local: 50, vis: 50 };
      const faltas = st.faltas || { local: 0, vis: 0 };
      const amarillas = st.amarillas || { local: 0, vis: 0 };
      const rojas = st.rojas || { local: 0, vis: 0 };
      const corners = st.corners || { local: 0, vis: 0 };
      const posicion_adelantada = st.posicion_adelantada || { local: 0, vis: 0 };

      setStatsForm({
          goles_local: partido.goles_local || 0, 
          goles_visitante: partido.goles_visitante || 0,
          anotadores_local: st.anotadoresLocal ? st.anotadoresLocal.join('\n') : '', 
          anotadores_visitante: st.anotadoresVisitante ? st.anotadoresVisitante.join('\n') : '',
          remates_local: remates.local, remates_visitante: remates.vis,
          remates_arco_local: remates_arco.local, remates_arco_visitante: remates_arco.vis,
          posesion_local: posesion.local,
          faltas_local: faltas.local, faltas_visitante: faltas.vis,
          amarillas_local: amarillas.local, amarillas_visitante: amarillas.vis,
          rojas_local: rojas.local, rojas_visitante: rojas.vis,
          corners_local: corners.local, corners_visitante: corners.vis,
          posicion_adelantada_local: posicion_adelantada.local, posicion_adelantada_visitante: posicion_adelantada.vis
      });
      setMatchModalOpen(true);
  };

  const handleSaveMatchStats = async (e) => {
      e.preventDefault();
      const statsObj = {
          anotadoresLocal: statsForm.anotadores_local.split('\n').filter(Boolean),
          anotadoresVisitante: statsForm.anotadores_visitante.split('\n').filter(Boolean),
          remates: { local: statsForm.remates_local, vis: statsForm.remates_visitante },
          remates_arco: { local: statsForm.remates_arco_local, vis: statsForm.remates_arco_visitante },
          posesion: { local: statsForm.posesion_local, vis: 100 - statsForm.posesion_local },
          faltas: { local: statsForm.faltas_local, vis: statsForm.faltas_visitante },
          amarillas: { local: statsForm.amarillas_local, vis: statsForm.amarillas_visitante },
          rojas: { local: statsForm.rojas_local, vis: statsForm.rojas_visitante },
          corners: { local: statsForm.corners_local, vis: statsForm.corners_visitante },
          posicion_adelantada: { local: statsForm.posicion_adelantada_local, vis: statsForm.posicion_adelantada_visitante },
      };
      
      try {
        const res = await fetchWithAuth(`${API_URL}/api/organizer/${slug}/partidos/${activeMatch.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goles_local: parseInt(statsForm.goles_local), goles_visitante: parseInt(statsForm.goles_visitante), stats: statsObj })
        });
        if (res && res.ok) {
           const data = await res.json();
           toast.success(data.message);
           setMatchModalOpen(false);
           fetchPartidos();
           fetchEquipos();
        }
      } catch {}
  };

  const handleGenerarRoundRobin = async () => {
    if (equipos.length < 2) {
       toast.error("Debes tener al menos 2 equipos para programar una jornada.");
       return;
    }
    const myPromise = fetchWithAuth(`${API_URL}/api/organizer/${slug}/generar-calendario`, { method: 'POST' });
    
    toast.promise(myPromise, {
      loading: 'Calculando Rol de Juegos (Algoritmo Round Robin)...',
      success: '¡Calendario Matemático Creado! Cero choques de horarios.',
      error: 'Error al generar horario',
    });

    await myPromise;
    fetchPartidos();
  };

  const openProgramacion = (partido) => {
    setPartidoAProgramar(partido);
    setProgramacionForm({ sede: partido.sede || '', horario: partido.horario || '' });
    setProgramacionOpen(true);
  };

  const handleSaveProgramacion = async (e) => {
    e.preventDefault();
    try {
        const res = await fetchWithAuth(`${API_URL}/api/organizer/${slug}/partidos/${partidoAProgramar.id}/programacion`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(programacionForm)
        });
        if (res && res.ok) {
            toast.success("Programación guardada.");
            setProgramacionOpen(false);
            fetchPartidos();
        }
    } catch {}
  };

  if (!tenantData) return <div style={{ color: 'white', padding: '2rem' }}>Cargando portal seguro...</div>;

  // Filtrado de Jornadas
  const jornadasReales = [...new Set(partidos.map(p => p.jornada))].sort((a,b)=>a-b);
  const partidosFiltrados = jornadaActiva === 'Todas' ? partidos : partidos.filter(p => p.jornada.toString() === jornadaActiva.toString());

  return (
    <div className="main-content" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span className="premium-badge-txt" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)'}}>
                 🛡️ Panel de Organizador (Cliente)
            </span>
            <h2 style={{ margin: 0 }}>Comité Organizador: {tenantData.nombre_liga}</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem'}}>Arquitectura SaaS Aislada Múlti-Inquilino.</p>
          </div>
          
          <button onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.6rem 1.2rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🚪 Cerrar Sesión
          </button>
       </div>

       {/* Tab Navigation */}
       <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)', width: 'fit-content' }}>
           <button 
                onClick={() => setActiveSegment('EQUIPOS')}
                style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', border: 'none', background: activeSegment === 'EQUIPOS' ? 'linear-gradient(90deg, #8b5cf6, #6366f1)' : 'transparent', color: activeSegment === 'EQUIPOS' ? '#fff' : '#9ca3af', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }}
           >
               ⚽ Equipos (Franquicias)
           </button>
           <button 
                onClick={() => setActiveSegment('CALENDARIO')}
                style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', border: 'none', background: activeSegment === 'CALENDARIO' ? 'linear-gradient(90deg, #8b5cf6, #6366f1)' : 'transparent', color: activeSegment === 'CALENDARIO' ? '#fff' : '#9ca3af', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }}
           >
               🏆 Torneos & Calendario
           </button>
           <button 
                onClick={() => setActiveSegment('ARBITROS')}
                style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', border: 'none', background: activeSegment === 'ARBITROS' ? 'linear-gradient(90deg, #8b5cf6, #6366f1)' : 'transparent', color: activeSegment === 'ARBITROS' ? '#fff' : '#9ca3af', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }}
           >
               🏁 Árbitros (Comisión)
           </button>
       </div>

       {activeSegment === 'EQUIPOS' && (
         <div style={{ animation: 'slideUp 0.4s ease-out' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3>Registrar Equipo Oficial</h3>
                    <form onSubmit={handleAddEquipo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem'}}>
                        <input required value={equipoForm.nombre} onChange={e => setEquipoForm({...equipoForm, nombre: e.target.value})} placeholder="Nombre de Franquicia (Ej: FC Cuervos)" style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff'}}/>
                        <input value={equipoForm.delegado} onChange={e => setEquipoForm({...equipoForm, delegado: e.target.value})} placeholder="Nombre del Delegado / DT" style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff'}}/>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.2)', cursor: 'pointer', textAlign: 'center', fontSize: '0.85rem', color: '#9ca3af' }}>
                                <span>📁 Subir Escudo (Logo)</span>
                                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                            </label>
                            {equipoForm.escudo && <img src={equipoForm.escudo} alt="Preview" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '50%' }} />}
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Inscribir Equipo</button>
                    </form>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem'}}>Listado Oficial Privado</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    {equipos.map(e => (
                        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {e.escudo ? (
                                <img src={e.escudo} alt={e.nombre} style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', padding: '2px' }} />
                            ) : (
                                <div className="avatar" style={{width: '50px', height: '50px', fontSize:'1.4rem'}}>{e.nombre.substring(0,2).toUpperCase()}</div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ fontSize: '1.2rem', color: '#fff' }}>{e.nombre}</strong>
                            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>DT: {e.delegado || 'Sin Asignar'}</span>
                            </div>
                        </div>
                    ))}
                    {equipos.length === 0 && <span style={{ color:'gray', fontSize: '0.8rem' }}>Sin equipos registrados...</span>}
                    </div>
                </div>
            </div>
         </div>
       )}

       {activeSegment === 'CALENDARIO' && (
         <div style={{ animation: 'slideUp 0.4s ease-out' }}>
            <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
                <h2 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: '#fff', marginTop: 0 }}>🏆 Gestión de Torneos Oficiales</h2>
                
                <form onSubmit={handleAddTorneo} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem', display: 'block' }}>Nombre del Torneo *</label>
                        <input 
                            type="text" required placeholder="Ej: Torneo Clausura 2026" 
                            value={torneoForm.nombre} onChange={e => setTorneoForm({...torneoForm, nombre: e.target.value})}
                            style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem', display: 'block' }}>Configuración del Formato</label>
                            <select value={torneoForm.formato} onChange={e => setTorneoForm({...torneoForm, formato: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}>
                                <option value="Liga (Todos contra todos)">Liga (Todos contra todos)</option>
                                <option value="Eliminación Directa">Eliminación Directa</option>
                                <option value="Grupos + Liguilla">Grupos + Liguilla</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem', display: 'block' }}>Estado del Torneo</label>
                            <select value={torneoForm.estatus} onChange={e => setTorneoForm({...torneoForm, estatus: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}>
                                <option value="En Registro">🟢 En Registro</option>
                                <option value="Activo">⚽ Activo (Jugándose)</option>
                                <option value="Pausado">⏸️ Pausado</option>
                                <option value="Finalizado">🏁 Finalizado</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr) minmax(200px, 1fr)', gap: '1.5rem', alignItems: 'end' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem', display: 'block' }}>Fecha de Inicio</label>
                            <input type="date" value={torneoForm.fecha_inicio} onChange={e => setTorneoForm({...torneoForm, fecha_inicio: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none', colorScheme: 'dark' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem', display: 'block' }}>Fecha de Fin (Estimada)</label>
                            <input type="date" value={torneoForm.fecha_fin} onChange={e => setTorneoForm({...torneoForm, fecha_fin: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none', colorScheme: 'dark' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem', display: 'block' }}>Premio / Trofeo</label>
                            <input type="text" placeholder="Ej: Copa de Oro, 1000 USD" value={torneoForm.premio} onChange={e => setTorneoForm({...torneoForm, premio: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem 2rem', background: 'linear-gradient(90deg, #ec4899, #8b5cf6)', border: 'none' }}>Registrar Torneo Oficial</button>
                    </div>
                </form>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginTop: '3rem' }}>
                    {torneos.map(t => {
                        let badgeColor = '#3b82f6';
                        let badgeBg = 'rgba(59, 130, 246, 0.1)';
                        if (t.estatus === 'Activo') { badgeColor = '#10b981'; badgeBg = 'rgba(16, 185, 129, 0.1)'; }
                        if (t.estatus === 'Pausado') { badgeColor = '#f59e0b'; badgeBg = 'rgba(245, 158, 11, 0.1)'; }
                        if (t.estatus === 'Finalizado') { badgeColor = '#ef4444'; badgeBg = 'rgba(239, 68, 68, 0.1)'; }

                        return (
                        <div key={t.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 style={{ margin: 0, color: '#f3f4f6', fontSize: '1.2rem', paddingRight: '1rem' }}>{t.nombre}</h3>
                                <span style={{ color: badgeColor, background: badgeBg, border: `1px solid ${badgeColor}`, padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                    {t.estatus || 'En Registro'}
                                </span>
                            </div>
                            
                            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>
                                <div><span style={{ color: '#d1d5db' }}>Formato:</span> {t.formato || 'No especificado'}</div>
                                <div><span style={{ color: '#d1d5db' }}>Vigencia:</span> {t.fecha_inicio ? new Date(t.fecha_inicio).toLocaleDateString() : 'TBD'} - {t.fecha_fin ? new Date(t.fecha_fin).toLocaleDateString() : 'TBD'}</div>
                                {t.premio && <div style={{ marginTop: '0.5rem', color: '#facc15', fontWeight: 'bold' }}>🎓 Premio Disp: {t.premio}</div>}
                            </div>
                        </div>
                    )})}
                    {torneos.length === 0 && <span style={{ color:'gray', fontSize: '0.8rem' }}>Sin torneos gestionados...</span>}
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>📅 Calendario Oficial Desarrollado</h3>
                    <select value={jornadaActiva} onChange={e => setJornadaActiva(e.target.value)} style={{ padding: '0.6rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#fff', borderRadius: '8px', outline: 'none' }}>
                        <option value="Todas">Toda la pre-temporada</option>
                        {jornadasReales.map(j => <option key={j} value={j}>Ver Jornada {j}</option>)}
                    </select>
                </div>
                <button className="btn" style={{ background: '#ec4899', color: '#fff' }} onClick={handleGenerarRoundRobin}>
                    ✨ Generar Rol (Round Robin)
                </button>
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)'}}>
                        <th style={{ padding: '1rem', textAlign: 'center', borderRadius: '10px 0 0 10px'}}>Jornada</th>
                        <th style={{ padding: '1rem', textAlign: 'center'}}>Local</th>
                        <th style={{ padding: '1rem', textAlign: 'center'}}>Programación (Cancha / Hora)</th>
                        <th style={{ padding: '1rem', textAlign: 'center'}}>Visitante</th>
                        <th style={{ padding: '1rem', textAlign: 'right', borderRadius: '0 10px 10px 0'}}>Administrar</th>
                    </tr>
                </thead>
                <tbody>
                    {partidosFiltrados.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af' }}>Jornada {p.jornada}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', justifyContent: 'flex-end' }}>
                                <strong style={{fontSize: '1.1rem'}}>{p.local_nombre}</strong>
                                {p.local_escudo && <img src={p.local_escudo} alt={p.local_nombre} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'contain' }} />}
                            </div>
                        </td>
                        <td style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontSize: '0.9rem', color: p.sede ? '#facc15' : '#6b7280', fontWeight: 'bold' }}>📍 {p.sede || 'Sin Sede'}</span>
                                <span style={{ fontSize: '0.9rem', color: p.horario ? '#34d399' : '#6b7280' }}>🕒 {p.horario || 'Sin Horario'}</span>
                                <button onClick={() => openProgramacion(p)} className="btn btn-sm block-hover" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.8rem', border: '1px solid rgba(255,255,255,0.1)', color: '#a78bfa', fontSize: '0.75rem', marginTop: '0.4rem' }}>📅 Fijar Fecha / Sede</button>
                            </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', justifyContent: 'flex-start' }}>
                                {p.visitante_escudo && <img src={p.visitante_escudo} alt={p.visitante_nombre} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'contain' }} />}
                                <strong style={{fontSize: '1.1rem'}}>{p.visitante_nombre}</strong>
                            </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                            {p.estatus === 'Pendiente' ? (
                                <button onClick={() => openMatchModal(p)} className="btn btn-sm" style={{ background: '#3b82f6', color: '#fff', fontSize: '0.8rem', padding: '0.5rem 1rem'}}>
                                    📝 Cargar Stats
                                </button>
                            ) : (
                                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem'}}>
                                <span className="premium-badge-txt" style={{ margin:0, color:'#10b981', border:'1px solid #10b981', background:'rgba(16,185,129,0.1)', padding: '0.3rem 0.6rem'}}>
                                    {p.goles_local} - {p.goles_visitante} ✅
                                </span>
                                <button onClick={() => openMatchModal(p)} className="btn btn-sm" style={{ background: 'transparent', color: '#a78bfa', fontSize: '0.8rem', padding: '0.3rem 0.6rem', border: '1px solid rgba(167, 139, 250, 0.4)'}}>
                                    ✏️ Editar Acta
                                </button>
                                </div>
                            )}
                        </td>
                    </tr>
                    ))}
                    {partidosFiltrados.length === 0 && (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'gray', fontSize: '1.1rem'}}>Usa el algoritmo matemático para crear el torneo automáticamente o cambia el Filtro de Jornada.</td></tr>
                    )}
                </tbody>
                </table>
            </div>
         </div>
       )}

       {activeSegment === 'ARBITROS' && (
         <div style={{ animation: 'slideUp 0.4s ease-out' }}>
            <div className="glass-panel" style={{ padding: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                   <h2 style={{ margin: 0 }}>🏁 Gestionar Comisión de Árbitros</h2>
                </div>
                
                <form onSubmit={handleAddArbitro} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem', background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 2 }}>
                            <label style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.4rem', display: 'block' }}>Nombre del Silbante</label>
                            <input required value={nuevoArbitro} onChange={e => setNuevoArbitro(e.target.value)} placeholder="Ej: Adonai Escobedo" style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff'}}/>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.4rem', display: 'block' }}>Rol de Campo</label>
                            <select value={nuevoRol} onChange={e => setNuevoRol(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', cursor: 'pointer'}}>
                                <option value="Central">Central</option>
                                <option value="Asistente 1">Asistente 1</option>
                                <option value="Asistente 2">Asistente 2</option>
                                <option value="Cuarto Árbitro">Cuarto Árbitro</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.4rem', display: 'block' }}>Matrícula Profesional</label>
                            <input value={nuevaMatricula} onChange={e => setNuevaMatricula(e.target.value)} placeholder="ID Oficial" style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff'}}/>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.4rem', display: 'block' }}>Nivel / Categoría</label>
                            <input value={nuevaCategoria} onChange={e => setNuevaCategoria(e.target.value)} placeholder="Ej: FIFA / Juvenil A" style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff'}}/>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.4rem', display: 'block' }}>Club Asignado</label>
                            <select value={nuevoEquipoAsignado} onChange={e => setNuevoEquipoAsignado(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', cursor: 'pointer'}}>
                                <option value="">Libre (Sin conflicto)</option>
                                {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem 2rem' }}>{editandoArbitroId ? '⚡ Actualizar' : '➕ Registrar'}</button>
                        {editandoArbitroId && <button type="button" onClick={resetArbitroForm} className="btn" style={{background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '0.8rem'}}>X</button>}
                    </div>
                </form>

                <div style={{ position: 'relative', marginBottom: '2rem' }}>
                    <span style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem' }}>🔍</span>
                    <input 
                    placeholder="Buscador Inteligente de Silbantes (Nombre, Matrícula o Categoría)..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', borderRadius: '15px', border: '1px solid rgba(139, 92, 246, 0.4)', background: 'rgba(139, 92, 246, 0.05)', color: '#fff', outline: 'none', transition: 'all 0.3s', fontSize: '1.1rem' }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.2rem' }}>
                {arbitros
                    .filter(a => {
                        const term = searchQuery.toLowerCase();
                        return a.nombre.toLowerCase().includes(term) || (a.matricula && a.matricula.toLowerCase().includes(term)) || (a.categoria && a.categoria.toLowerCase().includes(term));
                    })
                    .map(a => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', borderLeft: a.disponibilidad ? '5px solid #10b981' : '5px solid #ef4444' }}>
                        
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: a.disponibilidad ? '#10b981' : '#ef4444', boxShadow: a.disponibilidad ? '0 0 12px #10b981' : '0 0 12px #ef4444' }}></div>
                            <strong style={{ fontSize: '1.2rem', color: '#fff'}}>{a.nombre}</strong>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', paddingLeft: '1.5rem'}}>
                            {a.matricula ? `ID: ${a.matricula}` : 'Sin ID'} • {a.categoria || 'Regional'}
                            {a.equipo_asignado_nombre && <span style={{color: '#f87171'}}> • Excluido de: {a.equipo_asignado_nombre}</span>}
                        </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className="premium-badge-txt" style={{ margin:0, background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', borderColor: 'rgba(139, 92, 246, 0.3)', padding: '0.3rem 0.6rem' }}>{a.rol}</span>
                        <button onClick={() => handleEditMode(a)} className="btn btn-sm block-hover" title="Editar" style={{ background: 'transparent', padding: '0.5rem', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', borderRadius: '8px' }}>✏️</button>
                        <button onClick={() => handleDeleteArbitro(a.id)} className="btn btn-sm block-hover" title="Eliminar" style={{ background: 'transparent', padding: '0.5rem', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', borderRadius: '8px' }}>🗑️</button>
                        </div>
                    </div>
                    ))}
                {arbitros.length === 0 && <span style={{ color:'gray', fontSize: '1rem', textAlign: 'center', padding: '3rem', gridColumn: '1/-1' }}>Padrón de silbantes vacío. Comienza registrando uno arriba.</span>}
                </div>
            </div>
         </div>
       )}

      {matchModalOpen && activeMatch && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '0', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
             
             {/* Modal Header */}
             <div style={{ background: 'linear-gradient(90deg, #1e1b4b, #3b82f6)', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                <h2 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span>📊</span> Match Center (Captura Avanzada)</h2>
                <button onClick={() => setMatchModalOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }} className="block-hover">×</button>
             </div>

             <form onSubmit={handleSaveMatchStats} style={{ padding: '2rem' }}>
                
                {/* Score Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ textAlign: 'center', width: '35%' }}>
                        <div style={{ width: '60px', height: '60px', background: '#1e1b4b', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', margin: '0 auto 1rem', border: '2px solid rgba(255,255,255,0.2)' }}>{activeMatch.local_nombre.substring(0,2).toUpperCase()}</div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f3f4f6' }}>{activeMatch.local_nombre}</h3>
                        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Equipo Local</span>
                        <input type="number" required min="0" value={statsForm.goles_local} onChange={e => setStatsForm({...statsForm, goles_local: e.target.value})} disabled={activeMatch.estatus === 'Finalizado'} style={{ width: '80px', padding: '0.5rem', background: 'transparent', border: activeMatch.estatus === 'Finalizado' ? '2px solid gray' : '2px solid #3b82f6', color: '#fff', borderRadius: '12px', textAlign: 'center', fontSize: '2.5rem', fontWeight: 'bold', marginTop: '1rem', outline: 'none' }} />
                    </div>
                    
                    <div style={{ textAlign: 'center', width: '30%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                         <span style={{fontSize: '1rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '2px'}}>Jornada {activeMatch.jornada}</span>
                         {activeMatch.estatus === 'Finalizado' && <span style={{fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding:'0.2rem 0.5rem', borderRadius:'8px'}}>Modo Edición</span>}
                         <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4b5563' }}>VS</div>
                         
                         <div style={{ width: '100%', marginTop: '1rem' }}>
                            <label style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem', display: 'block' }}>Posesión de Balón</label>
                            <input type="range" title="Controla la posesión del Local. La visita se calcula automático." required min="0" max="100" value={statsForm.posesion_local} onChange={e => setStatsForm({...statsForm, posesion_local: e.target.value})} style={{ width: '100%', accentColor: '#3b82f6', height: '6px', borderRadius: '5px' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontWeight: 'bold' }}>
                                <span style={{ color: '#60a5fa' }}>{statsForm.posesion_local}% L</span>
                                <span style={{ color: '#f87171' }}>{100 - statsForm.posesion_local}% V</span>
                            </div>
                         </div>
                    </div>
                    
                    <div style={{ textAlign: 'center', width: '35%' }}>
                        <div style={{ width: '60px', height: '60px', background: '#3b82f6', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', margin: '0 auto 1rem', border: '2px solid rgba(255,255,255,0.2)' }}>{activeMatch.visitante_nombre.substring(0,2).toUpperCase()}</div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f3f4f6' }}>{activeMatch.visitante_nombre}</h3>
                        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Equipo Visitante</span>
                        <input type="number" required min="0" value={statsForm.goles_visitante} onChange={e => setStatsForm({...statsForm, goles_visitante: e.target.value})} disabled={activeMatch.estatus === 'Finalizado'} style={{ width: '80px', padding: '0.5rem', background: 'transparent', border: activeMatch.estatus === 'Finalizado' ? '2px solid gray' : '2px solid #ef4444', color: '#fff', borderRadius: '12px', textAlign: 'center', fontSize: '2.5rem', fontWeight: 'bold', marginTop: '1rem', outline: 'none' }} />
                    </div>
                </div>

                {/* Grid Anotadores */}
                <h4 style={{ color: '#a78bfa', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Cronología (Autores de los Goles)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                    <div>
                        <textarea rows="3" placeholder={`Ejemplo:\nPedro Vite 48'\nChino Huerta 90'`} value={statsForm.anotadores_local} onChange={e => setStatsForm({...statsForm, anotadores_local: e.target.value})} style={{ width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#fff', borderRadius: '12px', resize: 'vertical', fontFamily: 'monospace', outline: 'none' }} />
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Un jugador por línea. Asegúrate de incluir el minuto.</span>
                    </div>
                    <div>
                        <textarea rows="3" placeholder={`Ejemplo:\nArmando González 55'`} value={statsForm.anotadores_visitante} onChange={e => setStatsForm({...statsForm, anotadores_visitante: e.target.value})} style={{ width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fff', borderRadius: '12px', resize: 'vertical', fontFamily: 'monospace', outline: 'none' }} />
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Un jugador por línea.</span>
                    </div>
                </div>

                {/* Grid Estadísticas Espejo */}
                <h4 style={{ color: '#a78bfa', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Métricas Avanzadas (Input Tabular)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 180px minmax(250px, 1fr)', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', alignItems: 'center' }}>
                     
                     {/* Columna Local Inputs */}
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}><input type="number" min="0" value={statsForm.remates_local} onChange={e => setStatsForm({...statsForm, remates_local: e.target.value})} style={inputStatStyle}/><input type="number" min="0" value={statsForm.remates_arco_local} onChange={e => setStatsForm({...statsForm, remates_arco_local: e.target.value})} style={inputStatStyle}/></div>
                        <input type="number" min="0" value={statsForm.faltas_local} onChange={e => setStatsForm({...statsForm, faltas_local: e.target.value})} style={inputStatStyle}/>
                        <div style={{ display: 'flex', gap: '0.5rem' }}><input title="Amarillas" type="number" min="0" value={statsForm.amarillas_local} onChange={e => setStatsForm({...statsForm, amarillas_local: e.target.value})} style={{...inputStatStyle, borderBottom: '2px solid #facc15'}}/><input title="Rojas" type="number" min="0" value={statsForm.rojas_local} onChange={e => setStatsForm({...statsForm, rojas_local: e.target.value})} style={{...inputStatStyle, borderBottom: '2px solid #ef4444'}}/></div>
                        <input type="number" min="0" value={statsForm.posicion_adelantada_local} onChange={e => setStatsForm({...statsForm, posicion_adelantada_local: e.target.value})} style={inputStatStyle}/>
                        <input type="number" min="0" value={statsForm.corners_local} onChange={e => setStatsForm({...statsForm, corners_local: e.target.value})} style={inputStatStyle}/>
                     </div>
                     
                     {/* Columna Etiquetas Centrales */}
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center', fontSize: '0.85rem', color: '#d1d5db', textTransform: 'uppercase', fontWeight: 'bold' }}>
                        <div style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Remates / Al Arco</div>
                        <div style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Faltas</div>
                        <div style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Tarjetas (Am / Rj)</div>
                        <div style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Fueras de Lugar</div>
                        <div style={{ height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Tiros de Esquina</div>
                     </div>

                     {/* Columna Visita Inputs */}
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}><input type="number" min="0" value={statsForm.remates_visitante} onChange={e => setStatsForm({...statsForm, remates_visitante: e.target.value})} style={inputStatStyle}/><input type="number" min="0" value={statsForm.remates_arco_visitante} onChange={e => setStatsForm({...statsForm, remates_arco_visitante: e.target.value})} style={inputStatStyle}/></div>
                        <input type="number" min="0" value={statsForm.faltas_visitante} onChange={e => setStatsForm({...statsForm, faltas_visitante: e.target.value})} style={inputStatStyle}/>
                        <div style={{ display: 'flex', gap: '0.5rem' }}><input title="Amarillas" type="number" min="0" value={statsForm.amarillas_visitante} onChange={e => setStatsForm({...statsForm, amarillas_visitante: e.target.value})} style={{...inputStatStyle, borderBottom: '2px solid #facc15'}}/><input title="Rojas" type="number" min="0" value={statsForm.rojas_visitante} onChange={e => setStatsForm({...statsForm, rojas_visitante: e.target.value})} style={{...inputStatStyle, borderBottom: '2px solid #ef4444'}}/></div>
                        <input type="number" min="0" value={statsForm.posicion_adelantada_visitante} onChange={e => setStatsForm({...statsForm, posicion_adelantada_visitante: e.target.value})} style={inputStatStyle}/>
                        <input type="number" min="0" value={statsForm.corners_visitante} onChange={e => setStatsForm({...statsForm, corners_visitante: e.target.value})} style={inputStatStyle}/>
                     </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', gap: '1rem' }}>
                    <button type="button" onClick={() => setMatchModalOpen(false)} className="btn" style={{ background: 'transparent', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>Cancelar Captura</button>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(90deg, #ec4899, #8b5cf6)', border: 'none', boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)' }}>✅ Sellar Acta Oficial</button>
                </div>
             </form>
          </div>
        </div>
      )}
      {programacionOpen && partidoAProgramar && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '2rem', borderRadius: '24px' }}>
             <h3 style={{ marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>📅 Programar Partido</h3>
             <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{partidoAProgramar.local_nombre} vs {partidoAProgramar.visitante_nombre}</p>
             
             <form onSubmit={handleSaveProgramacion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                <div>
                   <label style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem', display: 'block' }}>Sede Oficial / Cancha</label>
                   <input required value={programacionForm.sede} onChange={e => setProgramacionForm({...programacionForm, sede: e.target.value})} placeholder="Ej: Cancha TESJo 1" style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }} />
                </div>
                <div>
                   <label style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.5rem', display: 'block' }}>Horario Oficial</label>
                   <input type="time" required value={programacionForm.horario} onChange={e => setProgramacionForm({...programacionForm, horario: e.target.value})} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none', colorScheme: 'dark' }} />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" onClick={() => setProgramacionOpen(false)} className="btn" style={{ flex: 1, background: 'transparent', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Fijación</button>
                </div>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}

const inputStatStyle = {
    width: '60px', height: '38px', padding: '0.5rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', textAlign: 'center', outline: 'none'
};
