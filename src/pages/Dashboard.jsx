import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import API_URL from '../api';

export default function Dashboard() {
  const [tenants, setTenants] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [paymentModalTenant, setPaymentModalTenant] = useState(null);
  const [editModalTenant, setEditModalTenant] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [paymentStep, setPaymentStep] = useState('menu'); // 'menu' | 'checkout'
  const [formData, setFormData] = useState({ 
      nombre_liga: '', 
      subdominio_o_slug: '', 
      plan: 'Bronce',
      dueno_nombre: '',
      dueno_email: '',
      password: ''
  });

  const fetchTenants = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tenants`);
      const data = await res.json();
      setTenants(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const totalActivos = tenants.filter(t => t.estatus_pago).length;
  const totalInactivos = tenants.length - totalActivos;
  
  const getCost = (plan) => {
    if (plan === 'Oro') return 200;
    if (plan === 'Plata') return 100;
    return 50;
  };

  const ingresos = tenants.filter(t => t.estatus_pago).reduce((acc, t) => {
    return acc + getCost(t.plan);
  }, 0);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_URL}/api/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setShowModal(false);
      setFormData({ nombre_liga: '', subdominio_o_slug: '', plan: 'Bronce', dueno_nombre: '', dueno_email: '', password: '' });
      fetchTenants();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_URL}/api/tenants/${editModalTenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dueno_nombre: editModalTenant.dueno_nombre,
          dueno_email: editModalTenant.dueno_email,
          plan: editModalTenant.plan,
          password: editModalTenant.password // Opción para resetear contraseña
        })
      });
      setEditModalTenant(null);
      fetchTenants();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await fetch(`${API_URL}/api/tenants/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus_pago: !currentStatus })
      });
      fetchTenants();
    } catch (err) {
      console.error(err);
    }
  };

  const executeRealPayment = (e) => {
    e.preventDefault();
    setIsProcessingPayment(true);
    // Simular un delay de API bancaria (2 segundos)
    setTimeout(async () => {
       try {
         await fetch(`${API_URL}/api/tenants/${paymentModalTenant.id}/payment`, {
           method: 'POST'
         });
         fetchTenants();
         setIsProcessingPayment(false);
         setPaymentModalTenant(null); // Desaparecer el modal inmediatamente para mostrar la reactividad
         toast.success(`Transacción aprobada.\nSe cobraron $${getCost(paymentModalTenant.plan)}.00 MXN.`, { duration: 5000 });
       } catch (err) {
         console.error(err);
         toast.error("Error al procesar el pago");
         setIsProcessingPayment(false);
       }
    }, 2000);
  };

  const handleSendReminder = async (id, email) => {
    setIsSendingEmail(true);
    try {
      const res = await fetch(`${API_URL}/api/tenants/${id}/send-reminder`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message, { duration: 4000 });
    } catch (err) {
      toast.error(`Error enviando correo: ${err.message}`, { duration: 5000 });
    }
    setIsSendingEmail(false);
    setPaymentModalTenant(null);
  };

  return (
    <div>
      <div className="header">
        <div>
           <span className="premium-badge-txt">⚡ Acceso Exclusivo SuperAdmin</span>
           <h2>Panel de Control</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ Nueva Liga
        </button>
      </div>

      <div className="metrics-grid">
        <div className="glass-panel metric-card">
          <span className="metric-title">Ingresos Mensuales Proyectados</span>
          <span className="metric-value green">${ingresos}</span>
        </div>
        <div className="glass-panel metric-card">
          <span className="metric-title">Ligas Activas</span>
          <span className="metric-value blue">{totalActivos}</span>
        </div>
        <div className="glass-panel metric-card">
          <span className="metric-title">Ligas Inactivas/Suspendidas</span>
          <span className="metric-value red">{totalInactivos}</span>
        </div>
      </div>

      <div className="glass-panel data-section">
        <h3>Actividad de Ligas</h3>
        <table>
          <thead>
            <tr>
              <th>Liga</th>
              <th>Dueño / Organizador</th>
              <th>Subdominio</th>
              <th>Plan</th>
              <th>Vencimiento</th>
              <th>Estatus</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.nombre_liga}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="avatar">{t.dueno_nombre ? t.dueno_nombre.charAt(0).toUpperCase() : '👤'}</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{t.dueno_nombre || 'Sin dueño asignado'}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.dueno_email || ''}</span>
                    </div>
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{t.subdominio_o_slug}</td>
                <td>{t.plan}</td>
                <td>{new Date(t.fecha_vencimiento).toLocaleDateString()}</td>
                <td>
                  <span className={`badge ${t.estatus_pago ? 'active' : 'inactive'}`}>
                    {t.estatus_pago ? 'Activo' : 'Suspendido'}
                  </span>
                </td>
                <td className="actions">
                   <button 
                     className="btn btn-sm btn-outline" 
                     onClick={() => setEditModalTenant(t)}
                     title="Editar Datos"
                   >
                     ✏️
                   </button>
                   <button 
                     className="btn btn-sm btn-outline" 
                     onClick={() => handleToggleStatus(t.id, t.estatus_pago)}
                     title={t.estatus_pago ? 'Suspender' : 'Activar Manulamente'}
                   >
                     {t.estatus_pago ? '⏸️' : '▶️'}
                   </button>
                   <button 
                     className="btn btn-sm btn-primary" 
                     onClick={() => { setPaymentStep('menu'); setPaymentModalTenant(t); }}
                     title="Gestionar Pago / Recordatorio"
                   >
                     💳 Gestionar
                   </button>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No hay ligas registradas en PostgreSQL
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content popup-animation">
            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Registrar Nueva Liga</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Nombre Comercial</label>
                <input required value={formData.nombre_liga} onChange={e => setFormData({...formData, nombre_liga: e.target.value})} placeholder="Ej: Liga Master Toluca" />
              </div>
              <div className="form-group">
                <label>Subdominio / Slug (Único)</label>
                <input required value={formData.subdominio_o_slug} onChange={e => setFormData({...formData, subdominio_o_slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} placeholder="ej: liga-toluca" />
              </div>
              <div className="form-group">
                <label>Plan Inicial</label>
                <select value={formData.plan} onChange={e => setFormData({...formData, plan: e.target.value})}>
                  <option value="Bronce">Bronce ($50/mes)</option>
                  <option value="Plata">Plata ($100/mes)</option>
                  <option value="Oro">Oro ($200/mes)</option>
                </select>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '1rem 0' }} />
              <div style={{ background: 'rgba(236, 72, 153, 0.05)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(236, 72, 153, 0.2)', marginTop: '1rem' }}>
                <label style={{ color: '#ec4899', fontWeight: 'bold', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>🔑 CONTRASEÑA DE ACCESO ORGANIZADOR</label>
                <input required type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Ej: admin123" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.8rem', borderRadius: '8px' }} />
                <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.4rem', display: 'block' }}>Esta es la clave que usará el cliente para entrar a su match center.</span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}>
                Crear Liga y Asignar Dueño
              </button>
            </form>
          </div>
        </div>
      )}

      {editModalTenant && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content popup-animation">
            <button className="modal-close" onClick={() => setEditModalTenant(null)}>✕</button>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Editar Datos - {editModalTenant.nombre_liga}</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Plan Configurado</label>
                <select value={editModalTenant.plan} onChange={e => setEditModalTenant({...editModalTenant, plan: e.target.value})}>
                  <option value="Bronce">Bronce ($50/mes)</option>
                  <option value="Plata">Plata ($100/mes)</option>
                  <option value="Oro">Oro ($200/mes)</option>
                </select>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '1rem 0' }} />
              <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)', marginTop: '1rem' }}>
                <label style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>🔄 RESETEAR CONTRASEÑA</label>
                <input type="text" value={editModalTenant.password || ''} onChange={e => setEditModalTenant({...editModalTenant, password: e.target.value})} placeholder="Nueva contraseña (dejar vacío para no cambiar)" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.8rem', borderRadius: '8px' }} />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}>
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}

      {paymentModalTenant && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content popup-animation" style={paymentStep === 'checkout' ? {maxWidth: '500px'} : {}}>
            <button className="modal-close" onClick={() => setPaymentModalTenant(null)}>✕</button>
            
            {paymentStep === 'menu' && (
              <>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Gestión de Ciclo de Facturación</h3>
                <p style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 'bold' }}>{paymentModalTenant.nombre_liga}</p>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Responsable de Cobro: <span style={{ color: '#fff'}}>{paymentModalTenant.dueno_nombre || 'N/A'}</span></p>
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Estado: <span style={{ color: paymentModalTenant.estatus_pago ? '#10b981' : '#ef4444'}}>{paymentModalTenant.estatus_pago ? 'Al día (Acceso Permitido)' : 'Atrasado (Acceso Suspendido)'}</span></p>
                    
                    {paymentModalTenant.estatus_pago ? (
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#10b981', fontWeight: 'bold' }}>
                        Suscripción Cubierta ✅ (Próximo mes: ${getCost(paymentModalTenant.plan)}.00 MXN)
                      </p>
                    ) : (
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#fbbf24', fontWeight: 'bold' }}>
                        Cobro Atrasado / Pendiente: ${getCost(paymentModalTenant.plan)}.00 MXN (Plan {paymentModalTenant.plan})
                      </p>
                    )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setPaymentStep('checkout')}
                    style={{ justifyContent: 'center', padding: '0.75rem', background: '#ec4899', border: 'none' }}
                  >
                    💳 Ejecutar Cobro en Pasarela
                  </button>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => handleSendReminder(paymentModalTenant.id, paymentModalTenant.dueno_email)}
                    disabled={isSendingEmail}
                    style={{ justifyContent: 'center', padding: '0.75rem' }}
                  >
                    {isSendingEmail ? '↻ Conectando con Servidor de Gmail...' : '✉️ Enviar Correo de Factura y Recordatorio'}
                  </button>
                </div>
              </>
            )}

            {paymentStep === 'checkout' && (
              <>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#ec4899' }}>Checkout de Suscripción</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                  Simulador de Tarjeta de Crédito (Vista de pago para {paymentModalTenant.dueno_nombre})
                </p>
                <form onSubmit={executeRealPayment}>
                  <div className="payment-card-visual">
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                       <span style={{fontWeight: 'bold', letterSpacing: '1px'}}>Credit Card</span>
                       <span>🌐 Logo</span>
                    </div>
                    <div className="form-group" style={{ marginBottom: '0'}}>
                      <input required placeholder="0000 0000 0000 0000" pattern="[0-9]{16}" maxLength="16" style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.4)', borderRadius: 0, padding: '0.5rem 0', fontSize: '1.2rem', letterSpacing: '3px' }}/>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                       <div className="form-group" style={{flex: 1}}>
                         <label style={{fontSize: '0.7rem'}}>Exp (MM/YY)</label>
                         <input required placeholder="12/26" maxLength="5" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.4rem'}} />
                       </div>
                       <div className="form-group" style={{flex: 1}}>
                         <label style={{fontSize: '0.7rem'}}>CVC</label>
                         <input required placeholder="123" maxLength="4" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.4rem'}} />
                       </div>
                    </div>
                  </div>

                  <div className="form-group" style={{marginTop: '1.5rem'}}>
                    <label>Nombre del Titular</label>
                    <input required defaultValue={paymentModalTenant.dueno_nombre} />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={isProcessingPayment}
                    style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center', background: '#ec4899', padding: '1rem', fontSize: '1.1rem' }}
                  >
                    {isProcessingPayment ? '↻ Procesando Transacción...' : `Pagar $${getCost(paymentModalTenant.plan)}.00 MXN`}
                  </button>
                  <button type="button" className="btn btn-outline" style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center'}} onClick={() => setPaymentStep('menu')}>
                    Cancelar
                  </button>
                </form>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
