import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API_URL from '../api';

export default function ValidationPortal() {
  const [ligas, setLigas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [slug, setSlug] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/api/tenants`)
       .then(res => res.json())
       .then(data => {
           if(Array.isArray(data)) {
               const now = new Date();
               // Filtrar por estatus manual Y por fecha de vencimiento
               setLigas(data.filter(d => d.estatus_pago && new Date(d.fecha_vencimiento) > now));
           }
           setLoading(false);
       })
       .catch(() => setLoading(false));
  }, []);

  const handleOrganizerAccess = async (e) => {
    e.preventDefault();
    if (!slug) return;
    try {
      const resp = await fetch(`${API_URL}/api/verify-tenant/${slug}`);
      const data = await resp.json();

      if (!resp.ok) {
        if (resp.status === 403) {
          // La liga existe pero está suspendida
          navigate('/suspended', { state: { tenant: data.data, error: data.error } });
        } else {
          toast.error("El código de liga no existe.");
        }
      } else {
        navigate(`/organizer/${slug}/login`);
      }
    } catch (err) {
      toast.error('Error de conexión');
    }
  };

  return (
    <div style={{ background: '#020202', minHeight: '100vh', color: 'white', fontFamily: "'Inter', sans-serif" }}>
      
      {/* 0. Top Navigation Bar (Branding) */}
      <nav style={{ 
          position: 'fixed', top: 0, left: 0, width: '100%', 
          height: '70px', background: 'rgba(2,2,2,0.8)', backdropFilter: 'blur(10px)', 
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 5%', borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff', letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ background: '#3b82f6', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>LM</span>
                  <span>LigaMaster SaaS</span>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: '#9ca3af', fontWeight: '500' }}>
                  <span onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ color: '#fff', cursor: 'pointer' }}>Inicio</span>
                  <span onClick={() => { const el = document.getElementById('leagues-section'); if(el) el.scrollIntoView({ behavior: 'smooth' }); }} style={{ cursor: 'pointer' }}>Ligas</span>
                  <span onClick={() => { const el = document.getElementById('leagues-section'); if(el) el.scrollIntoView({ behavior: 'smooth' }); }} style={{ cursor: 'pointer' }}>Calendario</span>
              </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <span style={{ fontSize: '1.1rem', cursor: 'pointer' }}>🔍</span>
              <button onClick={() => setShowOrganizerModal(true)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>Inicia sesión</button>
          </div>
      </nav>

      {/* 1. Hero Section (DAZN STYLE) */}
      <section style={{ 
          position: 'relative', 
          height: '80vh', 
          width: '100%', 
          backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%), linear-gradient(to bottom, rgba(2,2,2,0) 60%, rgba(2,2,2,1) 100%), url('/assets/hero-banner.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 5%'
      }}>
          <div style={{ maxWidth: '800px', animation: 'fadeIn 1s ease-out', marginTop: '70px' }}>
             <span style={{ background: '#3b82f6', color: '#fff', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1rem', display: 'inline-block' }}>Exclusivo para Aficionados</span>
             <h1 style={{ fontSize: '4.5rem', fontWeight: '950', color: '#fff', margin: '0 0 1rem', textTransform: 'uppercase', letterSpacing: '-3px', lineHeight: '0.9' }}>
                GOLES, <br/>RESÚMENES Y <br/><span style={{ color: '#3b82f6' }}>PASIÓN</span>
             </h1>
             <p style={{ fontSize: '1.25rem', color: '#d1d5db', marginBottom: '2.5rem', maxWidth: '550px', lineHeight: '1.4' }}>
                Bienvenido a <strong>LigaMaster SaaS</strong>. El centro de mando unificado para el fútbol profesional en México. Resultados en tiempo real y estadísticas avanzadas.
             </p>
             <div style={{ display: 'flex', gap: '1rem' }}>
                 <button 
                    onClick={() => window.scrollTo({ top: window.innerHeight * 0.75, behavior: 'smooth' })}
                    style={{ background: '#fff', color: '#000', padding: '1.1rem 3.5rem', borderRadius: '4px', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                 >
                    EXPLORAR LIGAS
                 </button>
             </div>
          </div>
      </section>

      {/* 2. Public Directory (DIRECT ACCESS) */}
      <main id="leagues-section" style={{ padding: '4rem 5%', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
             <div>
                 <h2 style={{ fontSize: '2.2rem', margin: 0, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-1px' }}>🏆 Ligas en Competencia</h2>
                 <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Resultados oficiales avalados por el Comité Organizador.</p>
             </div>
             <div style={{ display: 'flex', gap: '1rem' }}>
                 <button style={{ background: '#222', color: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' }}>{'<'}</button>
                 <button style={{ background: '#222', color: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' }}>{'>'}</button>
             </div>
          </div>
          
          {loading ? (
              <div style={{ textAlign: 'center', padding: '5rem', color: '#6b7280' }}>
                  <div style={{ width: '40px', height: '40px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }}></div>
                  <p>Sincronizando con los estadios...</p>
              </div>
          ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                  {ligas.map(l => (
                      <div 
                        key={l.id} 
                        onClick={() => navigate(`/liga/${l.subdominio_o_slug}`)}
                        className="glass-panel block-hover"
                        style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all 0.4s' }}
                      >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.8rem' }}>
                               <div className="avatar" style={{ width: '70px', height: '70px', borderRadius: '12px', background: 'linear-gradient(135deg, #1e1b4b, #3b82f6)', fontSize: '1.8rem', fontWeight: '900', color: '#fff' }}>{l.nombre_liga.charAt(0)}</div>
                               <div style={{ flex: 1 }}>
                                   <strong style={{ display: 'block', fontSize: '1.3rem', color: '#fff', marginBottom: '0.3rem' }}>{l.nombre_liga}</strong>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                       <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
                                       <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 'bold', textTransform: 'uppercase' }}>Liga Activa</span>
                                   </div>
                               </div>
                               <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                   →
                               </div>
                          </div>
                      </div>
                  ))}
                  {ligas.length === 0 && <p style={{ color: 'gray', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No hay ligas públicas disponibles en este momento.</p>}
              </div>
          )}
      </main>

      {/* 4. Footer Section */}
      <footer style={{ marginTop: '5rem', padding: '6rem 5% 4rem', background: '#000', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4rem', justifyContent: 'space-between' }}>
              <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#fff', letterSpacing: '-1px', marginBottom: '1.5rem' }}>
                      <span style={{ background: '#3b82f6', padding: '0.2rem 0.6rem', borderRadius: '4px', marginRight: '0.5rem' }}>LM</span>
                      <span>LigaMaster SaaS</span>
                  </div>
                  <p style={{ color: '#4b5563', maxWidth: '300px', fontSize: '0.95rem', lineHeight: '1.6' }}>La infraestructura SaaS definitiva para la organización de torneos profesionales de alto impacto.</p>
              </div>

              <div style={{ display: 'flex', gap: '5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <span style={{ color: '#fff', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>🏢 Corporativo</span>
                      <button onClick={() => setShowOrganizerModal(true)} style={{ background: 'none', border: 'none', color: '#4b5563', textAlign: 'left', cursor: 'pointer', padding: 0, fontSize: '0.95rem' }} className="link-hover">Oficina del Organizador</button>
                      <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#4b5563', textAlign: 'left', cursor: 'pointer', padding: 0, fontSize: '0.95rem' }} className="link-hover">SaaS Central Admin</button>
                      <span style={{ color: '#4b5563', fontSize: '0.95rem', cursor: 'pointer' }}>Privacidad</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <span style={{ color: '#fff', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Soporte</span>
                      <span style={{ color: '#4b5563', fontSize: '0.95rem', cursor: 'pointer' }}>Reportar Incidencia</span>
                      <span style={{ color: '#4b5563', fontSize: '0.95rem', cursor: 'pointer' }}>Documentación Beta</span>
                  </div>
              </div>
          </div>
          <div style={{ marginTop: '8rem', textAlign: 'center', opacity: 0.1, userSelect: 'none', pointerEvents: 'none' }}>
              <div style={{ fontSize: '15vw', fontWeight: '950', letterSpacing: '-1vw', color: '#fff', padding: 0, margin: 0, lineHeight: 0.8 }}>LIGAMASTER</div>
          </div>
          <div style={{ textAlign: 'center', color: '#222', fontSize: '0.8rem', marginTop: '2rem' }}>
              © 2026 LigaMaster SaaS Enterprise. Todos los derechos reservados.
          </div>
      </footer>

      {/* Organizer Login / Identification Modal */}
      {showOrganizerModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '3.5rem 2.5rem', position: 'relative', background: '#0a0a0a', border: '1px solid #222', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                  <button onClick={() => setShowOrganizerModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#222', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
                    <h2 style={{ color: '#fff', margin: 0, fontSize: '1.8rem', fontWeight: '900' }}>Acceso Organizador</h2>
                  </div>
                  <form onSubmit={handleOrganizerAccess}>
                      <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ color: '#6b7280', fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Código de Liga (Slug)</label>
                          <input 
                            required
                            autoFocus
                            placeholder="Ej: liga-fernando"
                            value={slug}
                            onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                            style={{ width: '100%', padding: '1rem', background: '#151515', border: '1px solid #222', color: '#fff', borderRadius: '12px', fontSize: '1.1rem', outline: 'none', textAlign: 'center', letterSpacing: '1px' }}
                          />
                      </div>
                      <button type="submit" style={{ width: '100%', padding: '1.1rem', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: '900', borderRadius: '12px', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.3s' }} className="block-hover">
                          IDENTIFICAR LIGAY LOGIN →
                      </button>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
}
