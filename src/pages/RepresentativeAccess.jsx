import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const normalizeSlug = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '')
  .split('/')[0]
  .split('.')[0]
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

export default function RepresentativeAccess() {
  const [slug, setSlug] = useState('');
  const navigate = useNavigate();

  const handleContinue = (e) => {
    e.preventDefault();
    const cleaned = normalizeSlug(slug);
    if (!cleaned || cleaned.length < 3) {
      toast.error('Ingresa un slug de liga valido.');
      return;
    }
    navigate(`/representative/${cleaned}/login`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020202', color: '#fff', display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <form onSubmit={handleContinue} className="glass-panel" style={{ width: '100%', maxWidth: '430px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.12)' }}>
        <h2 style={{ marginTop: 0 }}>Acceso representante</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
          Escribe el codigo de tu liga para ir al inicio de sesion.
        </p>
        <input
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="Ej: pesadosfc"
          style={{ width: '100%', padding: '0.82rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(0,0,0,0.32)', color: '#fff' }}
        />
        <button
          type="submit"
          style={{ marginTop: '0.9rem', width: '100%', padding: '0.84rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
        >
          Continuar a login
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{ marginTop: '0.55rem', width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#cbd5e1', fontWeight: 700, cursor: 'pointer' }}
        >
          Volver al portal
        </button>
      </form>
    </div>
  );
}
