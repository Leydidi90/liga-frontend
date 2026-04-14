import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function OrganizerLogin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/organizer/${slug}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // Guardar token específico para esta liga
      localStorage.setItem(`tenant_token_${slug}`, data.token);
      toast.success(`Bienvenido a ${data.nombre_liga}`);
      navigate(`/organizer/${slug}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at top left, #1e1b4b, #000)', padding: '2rem' }}>
      <div className="glass-panel popup-animation" style={{ width: '100%', maxWidth: '450px', padding: '3rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ width: '70px', height: '70px', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.5rem', boxShadow: '0 0 20px rgba(236, 72, 153, 0.4)' }}>
          🛡️
        </div>
        <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem' }}>Match Center Login</h2>
        <p style={{ color: '#9ca3af', marginBottom: '2.5rem' }}>Introduce la contraseña oficial para gestionar la liga <strong>{slug}</strong></p>

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.85rem', marginBottom: '0.6rem', fontWeight: 'bold' }}>CONTRASEÑA DEL ORGANIZADOR</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" 
              style={{ width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', outline: 'none', transition: 'all 0.3s' }}
              onFocus={e => e.target.style.borderColor = '#ec4899'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', background: 'linear-gradient(90deg, #ec4899, #8b5cf6)', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 5px 15px rgba(236, 72, 153, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {loading ? 'Verificando...' : 'Entrar a la Oficina →'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            ¿Olvidaste la contraseña? <br/>
            Contacta con el soporte técnico de LigaMaster.
          </p>
        </div>
      </div>
    </div>
  );
}
