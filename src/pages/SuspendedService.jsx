import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';

export default function SuspendedService() {
  const location = useLocation();
  const navigate = useNavigate();
  const tenant = location.state?.tenant;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at top right, #450a0a, #000)', padding: '2rem', fontFamily: "'Inter', sans-serif" }}>
      <div className="glass-panel popup-animation" style={{ width: '100%', maxWidth: '550px', padding: '4rem 3rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)', position: 'relative', background: 'rgba(10, 10, 10, 0.8)' }}>
        
        {/* Animated Background Pulse */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.05) 0%, transparent 70%)', borderRadius: '50%', zIndex: -1 }}></div>

        <div style={{ width: '90px', height: '90px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', border: '2px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 0 30px rgba(239, 68, 68, 0.1)' }}>
          <span style={{ fontSize: '3rem' }}>🛡️</span>
        </div>

        <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: '#fff', marginBottom: '1rem', letterSpacing: '-1px' }}>
          SERVICIO SUSPENDIDO
        </h1>

        <div style={{ height: '4px', width: '60px', background: '#ef4444', margin: '0 auto 2rem', borderRadius: '2px' }}></div>
        
        {tenant ? (
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ color: '#d1d5db', fontSize: '1.1rem', lineHeight: '1.6', margin: 0 }}>
              El acceso administrativo para la liga <strong style={{ color: '#fff', fontSize: '1.2rem' }}>{tenant.nombre_liga}</strong> ha sido restringido temporalmente.
            </p>
            <div style={{ marginTop: '1.5rem', padding: '1.2rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)', textAlign: 'left' }}>
               <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Detalles del Estado</p>
               <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.95rem' }}>
                 • Suscripción: Plan {tenant.plan}<br/>
                 • Motivo: Pago pendiente o periodo de gracia finalizado.
               </p>
            </div>
          </div>
        ) : (
          <p style={{ color: '#9ca3af', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
            El acceso a esta liga ha sido deshabilitado por el administrador del sistema.
          </p>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <button 
            onClick={() => window.location.href = 'mailto:soporte@ligamaster.com?subject=Reactivación de Liga: ' + (tenant?.nombre_liga || 'Consulta')}
            style={{ width: '100%', padding: '1rem', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.3s' }}
           >
             Contactar Soporte Técnico
           </button>
           <button 
            onClick={() => navigate('/')}
            style={{ width: '100%', padding: '1rem', background: 'transparent', color: '#6b7280', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.3s' }}
           >
             ← Volver al Portal de Inicio
           </button>
        </div>

        <p style={{ marginTop: '2.5rem', fontSize: '0.75rem', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '2px' }}>
          LigaMaster Enterprise Security
        </p>
      </div>
    </div>
  );
}
