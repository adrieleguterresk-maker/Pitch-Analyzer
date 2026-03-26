import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:3001';

function scoreColor(score) {
  if (score >= 7) return 'var(--success)';
  if (score >= 5) return 'var(--warning)';
  return 'var(--danger)';
}

export default function HistoryView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sortDir, setSortDir] = useState('desc');
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/report`)
      .then((r) => r.json())
      .then((d) => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleReanalyze = async (pitchId) => {
    if (!pitchId) return;
    await fetch(`${API}/api/analysis/run/${pitchId}`, { method: 'POST' });
    navigate('/');
  };

  const filtered = items
    .filter((i) => !filter || i.fileName?.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      const scoreDiff = (b.overallScore || 0) - (a.overallScore || 0);
      return sortDir === 'desc' ? scoreDiff : -scoreDiff;
    });

  return (
    <div className="stack stack-xl">
      <div>
        <div className="label mb-1">Histórico</div>
        <h1 className="page-title">Análises Anteriores</h1>
        <p className="text-secondary mt-1">Consulte e reanalize pitches já processados.</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1rem' }}>
        <div className="row row-md" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Filtrar por nome do arquivo..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              background: 'var(--bg-700)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
            }}
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          >
            Nota {sortDir === 'desc' ? '↓' : '↑'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={load}>
            🔄 Atualizar
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>
            + Novo Upload
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="empty-state">
          <div className="spinner" />
          <h3>Carregando histórico...</h3>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3>Nenhuma análise encontrada</h3>
          <p>Faça upload de um pitch para começar.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Analisar Pitch</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Data de Upload</th>
                  <th>Data da Análise</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Nota Geral</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {item.fileName}
                    </td>
                    <td className="text-sm">
                      {item.uploadedAt
                        ? new Date(item.uploadedAt).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="text-sm">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString('pt-BR')
                        : '—'}
                    </td>
                    <td>
                      <span className={`badge ${item.status === 'completed' ? 'badge-success' : item.status === 'error' ? 'badge-danger' : 'badge-warning'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.overallScore != null ? (
                        <span style={{
                          fontSize: '1.1rem',
                          fontWeight: 800,
                          color: scoreColor(item.overallScore),
                        }}>
                          {Number(item.overallScore).toFixed(1)}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="row row-sm">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/analysis/${item.id}`)}
                        >
                          Ver Relatório
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)', border: '1px solid rgba(99,102,241,0.3)' }}
                          onClick={() => handleReanalyze(item.pitchId)}
                        >
                          🔁 Reanalisar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="row row-between text-sm text-muted">
          <span>{filtered.length} análise(s)</span>
          {filtered.length > 0 && (
            <span>
              Média geral:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {(filtered.reduce((acc, i) => acc + (i.overallScore || 0), 0) / filtered.length).toFixed(1)}
              </strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
