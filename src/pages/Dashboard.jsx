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
  const [deleteConfirmTenant, setDeleteConfirmTenant] = useState(null);
  const [paymentStep, setPaymentStep] = useState('menu'); // 'menu' | 'checkout'
  const [formData, setFormData] = useState({ 
      nombre_liga: '', 
      subdominio_o_slug: '', 
      plan: 'Bronce',
      dueno_nombre: '',
      dueno_email: '',
      password: ''
  });

  const getAuthHeaders = (extraHeaders = {}) => {
    const token = localStorage.getItem('ligamaster_token');
    return {
      ...extraHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tenants`, {
        headers: getAuthHeaders()
      });
      if (res.status === 401 || res.status === 403) {
        toast.error('Tu sesión expiró. Inicia sesión de nuevo.');
        localStorage.removeItem('ligamaster_token');
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      setTenants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setTenants([]);
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
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
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
    // Simular un delay de API bancaria (3 segundos para mayor realismo)
    setTimeout(async () => {
       try {
         const res = await fetch(`${API_URL}/api/tenants/${paymentModalTenant.id}/payment`, {
           method: 'POST',
           headers: getAuthHeaders()
         });
         if (!res.ok) throw new Error("Error en el procesador de pagos");
         
         await fetchTenants(); // Recargar datos
         setIsProcessingPayment(false);
         setPaymentStep('success'); // Mostrar pantalla de éxito
         toast.success(`Transacción aprobada satisfactoriamente.`, { duration: 4000 });
       } catch (err) {
         console.error(err);
         toast.error("La transacción fue rechazada por el banco emisor.");
         setIsProcessingPayment(false);
       }
    }, 3000);
  };

  const handleSendReminder = async (id, email) => {
    setIsSendingEmail(true);
    try {
      const res = await fetch(`${API_URL}/api/tenants/${id}/send-reminder`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message, { duration: 4000 });
    } catch (err) {
      toast.error(`Error enviando correo: ${err.message}`, { duration: 5000 });
    }
    setIsSendingEmail(false);
    setPaymentModalTenant(null);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/tenants/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Error al eliminar ligas');
      setTenants(tenants.filter(t => t.id !== id));
      toast.success('Liga eliminada permanentemente');
      setDeleteConfirmTenant(null);
    } catch (err) {
      toast.error(err.message);
    }
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
                  {(() => {
                    const isExpired = new Date(t.fecha_vencimiento) < new Date();
                    if (!t.estatus_pago) return <span className="badge inactive">Suspendido</span>;
                    if (isExpired) return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>Expirado</span>;
                    return <span className="badge active">Activo</span>;
                  })()}
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
                   <button 
                     className="btn btn-sm" 
                     onClick={() => setDeleteConfirmTenant(t)}
                     style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                     title="DAR DE BAJA LIGA"
                   >
                     🗑️
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
                <label>Nombre del Dueño / Organizador</label>
                <input required value={formData.dueno_nombre} onChange={e => setFormData({...formData, dueno_nombre: e.target.value})} placeholder="Ej: Juan Pérez" />
              </div>
              <div className="form-group">
                <label>Correo Electrónico (Para facturas y avisos)</label>
                <input required type="email" value={formData.dueno_email} onChange={e => setFormData({...formData, dueno_email: e.target.value})} placeholder="ejemplo@correo.com" />
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
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#ec4899' }}>Pasarela de Pago Segura</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                  Simulador de Transacción Local (Vista segura para {paymentModalTenant.dueno_nombre})
                </p>
                <form onSubmit={executeRealPayment}>
                  {/* Tarjeta Visual Mejorada */}
                  <div className="payment-card-visual" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', padding: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.3)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center'}}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '2px'}}>
                          <span style={{fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.5)'}}>Credit Card</span>
                          <span style={{fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px'}}>LIGAMASTER PLATINUM</span>
                       </div>
                       <div style={{ width: '45px', height: '30px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          <div style={{ display: 'flex', gap: '-5px'}}>
                             <div style={{width: '20px', height: '20px', borderRadius: '50%', background: '#ff5f00', opacity: 0.8}}></div>
                             <div style={{width: '20px', height: '20px', borderRadius: '50%', background: '#eb001b', opacity: 0.8, marginLeft: '-10px'}}></div>
                          </div>
                       </div>
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: '1.5rem'}}>
                      <input required placeholder="**** **** **** ****" pattern="[0-9]{16}" maxLength="16" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.8rem', fontSize: '1.4rem', letterSpacing: '5px', textAlign: 'center', width: '100%', color: '#fff' }}/>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1.5rem'}}>
                       <div className="form-group" style={{flex: 2}}>
                         <label style={{fontSize: '0.6rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '4px'}}>Titular de la tarjeta</label>
                         <input required defaultValue={paymentModalTenant.dueno_nombre} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '0.3rem 0', borderRadius: 0, fontSize: '0.9rem'}} />
                       </div>
                       <div className="form-group" style={{flex: 1}}>
                         <label style={{fontSize: '0.6rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '4px'}}>Venc (MM/YY)</label>
                         <input required placeholder="12/28" maxLength="5" style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '0.3rem 0', borderRadius: 0, fontSize: '0.9rem'}} />
                       </div>
                       <div className="form-group" style={{flex: 0.8}}>
                         <label style={{fontSize: '0.6rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '4px'}}>CVC</label>
                         <input required placeholder="***" maxLength="3" type="password" style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '0.3rem 0', borderRadius: 0, fontSize: '1.1rem'}} />
                       </div>
                    </div>
                  </div>

                  {/* Resumen de cobro */}
                  <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem'}}>Suscripción Plan {paymentModalTenant.plan}</span>
                        <span style={{ fontWeight: 'bold'}}>${getCost(paymentModalTenant.plan)}.00 MXN</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span>I.V.A (Incluido)</span>
                        <span>$0.00</span>
                     </div>
                     <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '0.8rem', paddingTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: '#fff'}}>Total a pagar</span>
                        <span style={{ fontWeight: '800', fontSize: '1.3rem', color: '#ec4899'}}>${getCost(paymentModalTenant.plan)}.00 MXN</span>
                     </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={isProcessingPayment}
                    style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center', background: 'linear-gradient(135deg, #ec4899, #be185d)', padding: '1.1rem', fontSize: '1.1rem', borderRadius: '14px', boxShadow: '0 10px 25px rgba(236, 72, 153, 0.4)' }}
                  >
                    {isProcessingPayment ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '10px'}}>
                         <div className="spinner-mini"></div> Autorizando Transacción...
                      </span>
                    ) : `Confirmar y Pagar Ahora`}
                  </button>
                  
                  <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    🔒 Encriptación SSL de 256 bits activa.
                  </p>

                  {!isProcessingPayment && (
                    <button type="button" className="btn btn-outline" style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center', border: 'none', color: 'var(--text-muted)'}} onClick={() => setPaymentStep('menu')}>
                      Regresar
                    </button>
                  )}
                </form>
              </>
            )}

            {paymentStep === 'success' && (
              <div style={{ textAlign: 'center', padding: '1rem', animation: 'fadeIn 0.5s ease' }}>
                 <div style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '2px solid #10b981', boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)' }}>
                    <span style={{ fontSize: '2.5rem' }}>✅</span>
                 </div>
                 <h2 style={{ marginBottom: '0.5rem', color: '#fff' }}>¡Pago Exitoso!</h2>
                 <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                    La suscripción de <strong>{paymentModalTenant.nombre_liga}</strong> ha sido actualizada correctamente.
                 </p>
                 
                 <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
                    <p style={{ margin: 0, color: '#60a5fa', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                       📧 Confirmación enviada
                    </p>
                    <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
                       Se ha enviado un correo automático y el comprobante a: {paymentModalTenant.dueno_email}
                    </p>
                 </div>

                 <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}
                  onClick={() => { setPaymentModalTenant(null); setPaymentStep('menu'); }}
                 >
                    Finalizar y Continuar
                 </button>
              </div>
            )}

          </div>
        </div>
      )}

      {deleteConfirmTenant && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content popup-animation" style={{ maxWidth: '450px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ width: '70px', height: '70px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '2px solid rgba(239, 68, 68, 0.2)' }}>
                <span style={{ fontSize: '2rem' }}>⚠️</span>
              </div>
              <h3 style={{ color: '#fff', marginBottom: '1rem' }}>¿Eliminar Liga Definitivamente?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '2rem' }}>
                Estás a punto de dar de baja la liga <strong style={{color: '#fff'}}>{deleteConfirmTenant.nombre_liga}</strong>.<br/><br/>
                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Esta acción es irreversible</span> y borrará todos los equipos, partidos y torneos asociados.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ flex: 1, justifyContent: 'center' }} 
                  onClick={() => setDeleteConfirmTenant(null)}
                >
                  Cancelar
                </button>
                <button 
                  className="btn" 
                  style={{ flex: 1, justifyContent: 'center', background: '#ef4444', color: '#fff', border: 'none' }} 
                  onClick={() => handleDelete(deleteConfirmTenant.id)}
                >
                  Sí, Eliminar Todo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
