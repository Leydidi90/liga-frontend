import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API_URL from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fallo de autenticación');
      }

      // Guardar el token en localStorage
      localStorage.setItem('ligamaster_token', data.token);
      // Redirigir al inicio (Dashboard protegido)
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
      
      <div className="login-glass-panel">
        <div className="login-header">
          <div className="logo-icon">👑</div>
          <h2 className="login-title">LigaMaster</h2>
          <p className="login-subtitle">SuperAdmin SaaS Portal</p>
        </div>

        {error && <div className="login-error-badge">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Usuario Administrativo</label>
            <input 
              type="text" 
              required 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Ej: admin"
              autoFocus
            />
          </div>
          
          <div className="form-group" style={{marginTop: '1.2rem'}}>
            <label>Contraseña de Acceso</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isLoading}
            style={{ width: '100%', marginTop: '2.5rem', justifyContent: 'center', padding: '1rem', fontSize: '1.1rem' }}
          >
            {isLoading ? 'Autenticando...' : 'Iniciar Sesión'}
          </button>
        </form>
        
        <div className="login-footer">
          Conexión Segura Cifrada (JWT)
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem'}}>¿Eres Jugador, Aficionado u Organizador?</p>
          <Link to="/" className="btn btn-outline" style={{ justifyContent: 'center', width: '100%', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
            🌐 Ir al Portal Público
          </Link>
        </div>
      </div>
    </div>
  );
}
