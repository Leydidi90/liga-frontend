import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API_URL from '../api';

export default function ArbitroLogin() {
  const navigate = useNavigate();
  const [matricula, setMatricula] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/arbitro/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión.');
      localStorage.setItem('arb_token', data.token);
      const ligas = Array.isArray(data.ligas) ? data.ligas : [];
      localStorage.setItem('arb_ligas', JSON.stringify(ligas));
      if (ligas.length > 0) localStorage.setItem('arb_slug', ligas[0].slug);
      toast.success(ligas.length > 1 ? `Tienes ${ligas.length} ligas. Selecciona una en el panel.` : 'Sesión iniciada correctamente.');
      navigate('/arbitro');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020202', color: '#fff', display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <form onSubmit={handleSubmit} className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.12)' }}>
        <h2 style={{ marginTop: 0 }}>Acceso árbitro</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Ingresa con tu matrícula de árbitro.</p>
        <input
          type="text"
          required
          value={matricula}
          onChange={(e) => setMatricula(e.target.value)}
          placeholder="Matrícula"
          style={{ width: '100%', padding: '0.8rem', marginBottom: '0.9rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg,#0ea5e9,#22d3ee)', color: '#022', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {loading ? 'Ingresando...' : 'Iniciar sesión'}
        </button>
        <p style={{ marginTop: '0.7rem', color: '#64748b', fontSize: '0.78rem' }}>
          Solo necesitas tu matrícula. Si no estás en el padrón de árbitros de ninguna liga, no podrás acceder.
        </p>
        <div style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'flex-end', fontSize: '0.85rem' }}>
          <Link to="/" style={{ color: '#7dd3fc' }}>Volver al portal</Link>
        </div>
      </form>
    </div>
  );
}
