import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SuspendedService from './pages/SuspendedService';
import ValidationPortal from './pages/ValidationPortal';
import Login from './pages/Login';
import OrganizerDashboard from './pages/OrganizerDashboard';
import OrganizerLogin from './pages/OrganizerLogin';
import PublicLeague from './pages/PublicLeague';
import OrganizerAccess from './pages/OrganizerAccess';
import { Toaster } from 'react-hot-toast';

// ProtectedRoute Component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('ligamaster_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppLayout({ children }) {
  const location = useLocation();

  const handleLogout = () => {
     localStorage.removeItem('ligamaster_token');
     window.location.href = '/login';
  };

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div>
          <h1>LigaMaster</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>SuperAdmin</p>
        </div>
        <div className="nav-links">
          <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
            📍 Dashboard
          </Link>
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
             🔍 Ver Portal Público
          </Link>
        </div>
        <button 
          onClick={handleLogout} 
          style={{marginTop: 'auto', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#ef4444', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.3s'}}
          onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
          onMouseOut={(e) => e.target.style.background = 'transparent'}
        >
          Cerrar Sesión
        </button>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
      <Routes>
        <Route path="/" element={<ValidationPortal />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/suspended" element={<SuspendedService />} />
        <Route path="/organizer/access" element={<OrganizerAccess />} />
        
        {/* Rutas de Clientes (Organizador y Público) */}
        <Route path="/organizer/:slug/login" element={<OrganizerLogin />} />
        <Route path="/organizer/:slug" element={<OrganizerDashboard />} />
        <Route path="/liga/:slug" element={<PublicLeague />} />
      </Routes>
    </Router>
  );
}

export default App;
