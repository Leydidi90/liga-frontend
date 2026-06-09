import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import API_URL from '../api';

export default function RepresentativeLogin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/organizer/${slug}/representative/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión.');
      localStorage.setItem(`rep_token_${slug}`, data.token);
      toast.success('Sesión iniciada correctamente.');
      navigate(`/representative/${slug}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020202', color: '#fff', display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <form onSubmit={handleSubmit} className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.12)' }}>
        <h2 style={{ marginTop: 0 }}>Login Representante</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Liga: {slug}</p>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo representante"
          style={{ width: '100%', padding: '0.8rem', marginBottom: '0.7rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          style={{ width: '100%', padding: '0.8rem', marginBottom: '0.9rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: '#fff' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {loading ? 'Ingresando...' : 'Iniciar sesión'}
        </button>
        <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <Link to={`/inscripcion/${slug}`} style={{ color: '#93c5fd' }}>Ir a inscripción</Link>
          <Link to="/" style={{ color: '#93c5fd' }}>Volver al portal</Link>
        </div>
      </form>
    </div>
  );
}
