import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API_URL from '../api';

export default function PublicLeague() {
  const { slug } = useParams();
  const [equipos, setEquipos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [tenantData, setTenantData] = useState(null);
  const [error, setError] = useState('');
  const [activeTabMapping, setActiveTabMapping] = useState({});
  const [jornadaActiva, setJornadaActiva] = useState('Todas');

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const res = await fetch(`${API_URL}/api/verify-tenant/${slug}`);
        const data = await res.json();
        if (!res.ok) {
           setError("Esta liga está en Suspensión de Servicio Activo.");
           return;
        }
        setTenantData(data.data);

        // Fetch standings
        const res2 = await fetch(`${API_URL}/api/organizer/${slug}/equipos`);
        setEquipos(await res2.json());

        // Fetch calendar matches
        const res3 = await fetch(`${API_URL}/api/organizer/${slug}/calendario`);
        setPartidos(await res3.json());

      } catch(err) {
         setError("Liga No Registrada");
      }
    };
    fetchPublicData();
  }, [slug]);

  const toggleTab = (pId, tab) => {
      setActiveTabMapping({...activeTabMapping, [pId]: tab});
  };

  const StatRow = ({ label, valL, valV }) => {
      const numL = parseInt(valL);
      const numV = parseInt(valV);
      
      const badgeL = numL > numV ? { background: '#1e1b4b', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 'bold' } 
                     : { padding: '0.2rem 0.6rem', color: '#4b5563' };
      const badgeV = numV > numL ? { background: '#3b82f6', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 'bold' } 
                     : { padding: '0.2rem 0.6rem', color: '#4b5563' };
      
      return (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', padding: '0.3rem 0' }}>
             <div style={{ width: '25%', textAlign: 'center' }}><span style={badgeL}>{valL}</span></div>
             <div style={{ width: '50%', textAlign: 'center', color: '#374151' }}>{label}</div>
             <div style={{ width: '25%', textAlign: 'center' }}><span style={badgeV}>{valV}</span></div>
          </div>
      );
  };

  const MatchCard = ({ p }) => {
      const stats = p.stats || {};
      const activeTab = activeTabMapping[p.id] || 'CRONOLOGIA';
      
      const anotadoresLocal = stats.anotadoresLocal || [];
      const anotadoresVisita = stats.anotadoresVisitante || [];

      return (
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem', color: '#1f2937' }}>
             <div style={{ padding: '0.8rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6b7280' }}>
                <span>{tenantData.nombre_liga} · Jornada {p.jornada}</span>
                {p.estatus === 'Finalizado' ? (
                   <span style={{color: '#10b981', fontWeight: 'bold'}}>Finalizado</span>
                ) : (
                   <span style={{color: '#3b82f6', fontWeight: 'bold'}}>Pendiente</span>
                )}
             </div>
             
             <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem 1rem', background: '#fff' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%' }}>
                     {p.local_escudo ? <img src={p.local_escudo} alt={p.local_nombre} style={{ width: '55px', height: '55px', objectFit: 'contain', borderRadius: '50%' }} /> : <div style={{ width: '50px', height: '50px', background: '#1e1b4b', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>{p.local_nombre.substring(0,2).toUpperCase()}</div>}
                     <span style={{ marginTop: '0.5rem', fontWeight: '500', fontSize: '1rem', textAlign: 'center'}}>{p.local_nombre}</span>
                 </div>
                 
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30%', fontSize: '2.5rem', fontWeight: 'normal', color: '#111827' }}>
                     {p.estatus === 'Pendiente' ? (
                         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                             <span style={{ fontSize: '1rem', color: '#9ca3af', fontWeight: 'bold' }}>VS</span>
                             <span style={{ fontSize: '0.85rem', color: '#ec4899', marginTop:'0.5rem', whiteSpace: 'nowrap', fontWeight: 'bold', border: '1px solid #ec4899', padding: '0.2rem 0.6rem', borderRadius: '15px', background: 'rgba(236,72,153,0.1)' }}>{p.horario || 'Por Definir'}</span>
                         </div>
                     ) : (
                         <>
                            <span style={{ width: '30px', textAlign: 'right' }}>{p.goles_local}</span>
                            <span style={{ fontSize: '1.5rem', margin: '0 1rem', color: '#9ca3af' }}>-</span>
                            <span style={{ width: '30px', textAlign: 'left' }}>{p.goles_visitante}</span>
                         </>
                     )}
                 </div>
                 
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%' }}>
                     {p.visitante_escudo ? <img src={p.visitante_escudo} alt={p.visitante_nombre} style={{ width: '55px', height: '55px', objectFit: 'contain', borderRadius: '50%' }} /> : <div style={{ width: '50px', height: '50px', background: '#3b82f6', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>{p.visitante_nombre.substring(0,2).toUpperCase()}</div>}
                     <span style={{ marginTop: '0.5rem', fontWeight: '500', fontSize: '1rem', textAlign: 'center'}}>{p.visitante_nombre}</span>
                 </div>
             </div>

             <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', borderTop: '1px solid #e5e7eb' }}>
                 <button onClick={() => toggleTab(p.id, 'CRONOLOGIA')} style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: 'none', borderBottom: activeTab==='CRONOLOGIA' ? '3px solid #1e1b4b' : '3px solid transparent', fontWeight: activeTab==='CRONOLOGIA' ? 'bold': 'normal', color: activeTab==='CRONOLOGIA' ? '#1e1b4b' : '#6b7280', cursor: 'pointer', fontSize: '0.8rem' }}>CRONOLOGÍA</button>
                 <button onClick={() => toggleTab(p.id, 'ESTADISTICAS')} style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: 'none', borderBottom: activeTab==='ESTADISTICAS' ? '3px solid #1e1b4b' : '3px solid transparent', fontWeight: activeTab==='ESTADISTICAS' ? 'bold': 'normal', color: activeTab==='ESTADISTICAS' ? '#1e1b4b' : '#6b7280', cursor: 'pointer', fontSize: '0.8rem' }}>ESTADÍSTICAS</button>
             </div>

             <div style={{ padding: '1.5rem' }}>
                {activeTab === 'CRONOLOGIA' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ width: '45%', textAlign: 'right', color: '#4b5563', fontSize: '0.9rem' }}>
                           {anotadoresLocal.map((a, i) => <div key={i} style={{marginBottom: '0.3rem'}}>{a} ⚽</div>)}
                           {anotadoresLocal.length === 0 && <span style={{color:'#d1d5db'}}>Sin registros</span>}
                        </div>
                        <div style={{ width: '10%', display: 'flex', justifyContent: 'center', color: '#d1d5db' }}>|</div>
                        <div style={{ width: '45%', textAlign: 'left', color: '#4b5563', fontSize: '0.9rem' }}>
                           {anotadoresVisita.map((a, i) => <div key={i} style={{marginBottom: '0.3rem'}}>⚽ {a}</div>)}
                           {anotadoresVisita.length === 0 && <span style={{color:'#d1d5db'}}>Sin registros</span>}
                        </div>
                    </div>
                )}
                {activeTab === 'ESTADISTICAS' && stats.remates && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.8rem'}}>ESTADÍSTICAS DEL EQUIPO</div>
                        <StatRow label="Remates" valL={stats.remates.local} valV={stats.remates.vis} />
                        <StatRow label="Remates al arco" valL={stats.remates_arco?.local||0} valV={stats.remates_arco?.vis||0} />
                        <StatRow label="Posesión" valL={(stats.posesion?.local||50)+'%'} valV={(stats.posesion?.vis||50)+'%'} />
                        <StatRow label="Faltas" valL={stats.faltas?.local||0} valV={stats.faltas?.vis||0} />
                        <StatRow label="Tarjetas amarillas" valL={stats.amarillas?.local||0} valV={stats.amarillas?.vis||0} />
                        <StatRow label="Tarjetas rojas" valL={stats.rojas?.local||0} valV={stats.rojas?.vis||0} />
                        <StatRow label="Posición adelantada" valL={stats.posicion_adelantada?.local||0} valV={stats.posicion_adelantada?.vis||0} />
                        <StatRow label="Tiros de esquina" valL={stats.corners?.local||0} valV={stats.corners?.vis||0} />
                    </div>
                )}
                {activeTab === 'ESTADISTICAS' && !stats.remates && (
                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: '1rem', fontSize: '0.9rem' }}>Las estadísticas avanzadas de este encuentro no fueron documentadas.</div>
                )}
             </div>
             <div style={{ padding: '0.8rem 1.5rem', borderTop: '1px solid #e5e7eb', background: '#f9fafb', fontSize: '0.8rem', color: '#6b7280' }}>
                 <span style={{ color: '#059669'}}>Lugar:</span> {p.sede || 'Por definir (Sede Oficial)'}
             </div>
          </div>
      );
  };

  if (error) {
      return (
          <div className="login-container">
             <div className="login-glass-panel" style={{ textAlign: 'center' }}>
                 <div className="login-error-badge">⚠️ {error}</div>
                 <h2 style={{color:'white'}}>Portal Fuera de Línea</h2>
                 <p style={{color:'gray'}}>El Administrador ha restringido el acceso público.</p>
                 <Link to="/login" style={{ color: '#3b82f6', marginTop: '1rem', display: 'block'}}>Acceso Empleados</Link>
             </div>
          </div>
      );
  }

  if (!tenantData && !error) return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: 'white' }}>
          <div style={{ textAlign: 'center' }}>
              <div className="avatar" style={{ margin: '0 auto 1rem', width: '60px', height: '60px', border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <p>Conectando con Match Center...</p>
          </div>
      </div>
  );

  if (!tenantData) return null;

  const jornadasReales = [...new Set(partidos.map(p => p.jornada))].sort((a,b)=>a-b);
  const partidosFiltrados = jornadaActiva === 'Todas' ? partidos : partidos.filter(p => p.jornada.toString() === jornadaActiva.toString());

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)'}}>
      {/* Botón Flotante de Regreso */}
      <Link 
        to="/" 
        style={{ 
          position: 'fixed', top: '20px', left: '20px', zIndex: 1000,
          background: 'rgba(5, 5, 5, 0.8)', color: 'white', padding: '0.6rem 1.2rem', 
          borderRadius: '30px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.1)',
          transition: 'all 0.3s'
        }}
      >
        ← Volver al Portal General
      </Link>

      {/* Banner Principal */}
      <div style={{ width: '100%', height: '300px', background: 'linear-gradient(150deg, #1e1b4b, #3b82f6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 -50px 100px -20px var(--bg-dark)' }}>
          <div className="avatar" style={{ width: '80px', height: '80px', fontSize: '2.5rem', marginBottom: '1rem', background: '#fff', color: '#1e1b4b'}}>{tenantData.nombre_liga.charAt(0)}</div>
          <h1 style={{ color: 'white', fontSize: '3rem', margin: 0, textShadow: '0 4px 20px rgba(0,0,0,0.5)', textAlign: 'center' }}>{tenantData.nombre_liga}</h1>
          <span className="badge active" style={{ marginTop: '1rem'}}>
             Temporada Web Oficial
          </span>
      </div>

      <div style={{ maxWidth: '1200px', margin: '-50px auto 0', position: 'relative', zIndex: 10, padding: '0 2rem' }}>
         <div style={{ display: 'flex', gap: '3rem', flexDirection: 'row', flexWrap: 'wrap' }}>
             
             {/* Match Center: Resultados Recientes */}
             <div style={{ flex: '1 1 500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                   <h2 style={{color: 'white', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,1)'}}>🏆 Cronograma</h2>
                   <select value={jornadaActiva} onChange={e => setJornadaActiva(e.target.value)} style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', outline: 'none' }}>
                       <option value="Todas">Temporada Completa</option>
                       {jornadasReales.map(j => <option key={j} value={j}>Ver Jornada {j}</option>)}
                   </select>
                </div>
                {partidosFiltrados.slice().reverse().map(p => <MatchCard key={p.id} p={p}/>)}
                {partidosFiltrados.length === 0 && (
                    <div className="glass-panel" style={{padding:'2rem', textAlign:'center', color: '#9ca3af'}}>
                       La temporada acaba de iniciar o no hay información para esta jornada.
                    </div>
                )}
             </div>

             {/* Standings General Table */}
             <div style={{ flex: '1 1 400px' }}>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h2 style={{ marginTop: 0, color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', fontSize: '1.5rem'}}>Tabla de Posiciones</h2>
                  
                  <table style={{ width: '100%', marginTop: '1rem', fontSize: '0.9rem'}}>
                     <thead>
                       <tr>
                          <th style={{paddingBottom: '0.8rem'}}>Pos</th>
                          <th style={{paddingBottom: '0.8rem', textAlign: 'left'}}>Club</th>
                          <th style={{ textAlign: 'center', paddingBottom: '0.8rem'}}>PJ</th>
                          <th style={{ textAlign: 'center', paddingBottom: '0.8rem'}}>PG</th>
                          <th style={{ textAlign: 'center', paddingBottom: '0.8rem'}}>PP</th>
                          <th style={{ textAlign: 'center', color: '#10b981', paddingBottom: '0.8rem'}}>PTS</th>
                       </tr>
                     </thead>
                     <tbody>
                        {equipos.map((e, index) => (
                            <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{padding: '0.8rem 0'}}>#{index + 1}</td>
                                <td><strong style={{ color: 'white'}}>{e.nombre}</strong></td>
                                <td style={{ textAlign: 'center'}}>{e.partidos_jugados}</td>
                                <td style={{ textAlign: 'center'}}>{e.partidos_ganados}</td>
                                <td style={{ textAlign: 'center'}}>{e.partidos_perdidos}</td>
                                <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 'bold'}}>{e.puntos}</td>
                            </tr>
                        ))}
                        {equipos.length === 0 && (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'gray'}}>Pendiente...</td></tr>
                        )}
                     </tbody>
                  </table>
                </div>
             </div>
         </div>
      </div>
    </div>
  );
}
