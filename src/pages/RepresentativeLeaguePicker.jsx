import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API_URL from '../api';

export default function RepresentativeLeaguePicker() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ligas, setLigas] = useState([]);
  const [torneosPorLiga, setTorneosPorLiga] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/ligas`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setLigas(list);

        const stats = {};
        await Promise.all(
          list.map(async (liga) => {
            try {
              const torneosRes = await fetch(`${API_URL}/api/organizer/${liga.subdominio_o_slug}/torneos`);
              const torneosData = await torneosRes.json();
              const torneos = Array.isArray(torneosData) ? torneosData : [];
              const abiertos = torneos.filter((t) => String(t.estatus || '').toLowerCase() === 'activo').length;
              stats[liga.subdominio_o_slug] = { total: torneos.length, abiertos };
            } catch {
              stats[liga.subdominio_o_slug] = { total: 0, abiertos: 0 };
            }
          })
        );
        setTorneosPorLiga(stats);
      } catch {
        toast.error('No se pudieron cargar las ligas disponibles.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#020202', color: '#fff', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>Ligas disponibles para inscripción</h2>
            <p style={{ marginTop: '0.35rem', color: '#94a3b8' }}>
              Elige una liga y continúa con el registro de tu equipo y jugadores.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to="/" style={{ color: '#93c5fd' }}>Portal público</Link>
            <button onClick={() => navigate(-1)} style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#cbd5e1', borderRadius: '8px', padding: '0.35rem 0.7rem', cursor: 'pointer' }}>
              Volver
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: '1.2rem', color: '#94a3b8' }}>Cargando ligas...</div>
        ) : (
          <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '0.85rem' }}>
            {ligas.map((liga) => {
              const stats = torneosPorLiga[liga.subdominio_o_slug] || { total: 0, abiertos: 0 };
              return (
                <div key={liga.id} className="glass-panel" style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.9rem' }}>
                  <strong style={{ fontSize: '1.03rem' }}>{liga.nombre_liga}</strong>
                  <div style={{ marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.88rem' }}>
                    Código: <code>{liga.subdominio_o_slug}</code>
                  </div>
                  <div style={{ marginTop: '0.4rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                    Torneos: {stats.total} · Abiertos: {stats.abiertos}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/inscripcion/${liga.subdominio_o_slug}`)}
                    style={{ marginTop: '0.7rem', width: '100%', border: 'none', borderRadius: '10px', padding: '0.7rem', background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Inscribirme en esta liga
                  </button>
                </div>
              );
            })}
            {ligas.length === 0 && (
              <div style={{ color: '#94a3b8' }}>No hay ligas públicas disponibles por ahora.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
