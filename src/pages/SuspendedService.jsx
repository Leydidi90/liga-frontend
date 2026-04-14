import React from 'react';
import { useLocation, Link } from 'react-router-dom';

export default function SuspendedService() {
  const location = useLocation();
  const tenant = location.state?.tenant;

  return (
    <div className="suspended-container">
      <div className="glass-panel suspended-card">
        <div className="suspended-icon">
          <span style={{ fontSize: '3rem' }}>🚫</span>
        </div>
        <h1 className="suspended-title">Servicio Suspendido</h1>
        
        {tenant && (
          <p className="suspended-text">
            El acceso a la plataforma para <strong>{tenant.nombre_liga}</strong> ha sido deshabilitado.<br/>
            Esto puede deberse a la falta de pago de la suscripción (Plan {tenant.plan}).
          </p>
        )}
        
        {!tenant && (
          <p className="suspended-text">
            El acceso a esta liga ha sido deshabilitado.
          </p>
        )}
        
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
           <Link to="/" className="btn btn-primary">Volver al SuperAdmin</Link>
        </div>
      </div>
    </div>
  );
}
