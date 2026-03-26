import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
// jsPDF and html2canvas removed - now using backend Puppeteer for premium PDFs

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const API = ''; // Empty means relative to same host

const SCORE_LABELS = {
  authorityAndCredibility: 'Autoridade & Credibilidade',
  valueProposition: 'Proposta de Valor',
  socialProof: 'Prova Social',
  structureAndSequence: 'Estrutura & Sequência',
  deliverablesAndStacking: 'Entregáveis & Empilhamento',
  bonus: 'Bônus',
  pricePresentation: 'Apresentação do Preço',
  emotionalClosing: 'Encerramento Emocional',
};

const STATUS_ICON = {
  present_good: '✅',
  present_incomplete: '⚠️',
  absent: '❌',
};

const STATUS_BADGE = {
  present_good: 'badge-success',
  present_incomplete: 'badge-warning',
  absent: 'badge-danger',
};

const STATUS_TEXT = {
  present_good: 'Completo',
  present_incomplete: 'Incompleto',
  absent: 'Ausente',
};

const IMPACT_BADGE = {
  alto: 'badge-danger',
  medio: 'badge-warning',
  baixo: 'badge-info',
};

export default function AnalysisView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reportRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/report/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [id]);

  const exportPdf = async () => {
    // Agora usamos o backend para gerar um PDF premium com texto real e design profissional
    window.location.href = `${API}/api/report/${id}/pdf`;
  };

  if (loading) return (
    <div className="empty-state">
      <div className="spinner" />
      <h3>Carregando análise...</h3>
    </div>
  );

  if (error || !data) return (
    <div className="empty-state">
      <div className="empty-state-icon">😕</div>
      <h3>Análise não encontrada</h3>
      <p>{error || 'Verifique o ID da análise.'}</p>
      <button className="btn btn-secondary" onClick={() => navigate('/')}>← Voltar</button>
    </div>
  );

  const { analysis, pitch } = data;
  const scores = analysis.scores || {};
  const radarLabels = Object.keys(SCORE_LABELS).map((k) => SCORE_LABELS[k]);
  const radarValues = Object.keys(SCORE_LABELS).map((k) => scores[k] || 0);

  const radarData = {
    labels: radarLabels,
    datasets: [{
      label: 'Pontuação',
      data: radarValues,
      backgroundColor: 'rgba(99,102,241,0.15)',
      borderColor: '#6366f1',
      pointBackgroundColor: '#818cf8',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#6366f1',
      borderWidth: 2,
    }],
  };

  const radarOptions = {
    scales: {
      r: {
        min: 0,
        max: 10,
        ticks: { stepSize: 2, color: '#64748b', backdropColor: 'transparent', font: { size: 10 } },
        grid: { color: 'rgba(99,102,241,0.15)' },
        angleLines: { color: 'rgba(99,102,241,0.1)' },
        pointLabels: { color: '#94a3b8', font: { size: 10, weight: '500' } },
      },
    },
    plugins: { legend: { display: false } },
  };

  const hasCriticalFailure = analysis.deliverablesAnalysis?.criticalFailure;

  return (
    <div className="stack stack-xl" ref={reportRef}>

      {/* Header */}
      <div className="row row-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="label mb-1">Relatório de Análise</div>
          <h1 className="page-title" style={{ fontSize: '1.6rem' }}>{pitch.fileName?.replace(/\.pdf$/i, '')}</h1>
          <p className="text-sm text-muted mt-1">
            Analisado em {new Date(analysis.createdAt).toLocaleString('pt-BR')} •{' '}
            {pitch.totalPages} páginas identificadas
          </p>
        </div>
        <div className="row row-md">
          <div className="score-ring">
            <div className="score-number">{(analysis.overallScore || 0).toFixed(1)}</div>
            <span className="label">Nota Geral /10</span>
          </div>
          <button className="btn btn-primary" onClick={exportPdf}>📥 Exportar PDF</button>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>← Novo Upload</button>
        </div>
      </div>

      {/* Critical Failure Banner */}
      {hasCriticalFailure && (
        <div className="alert alert-danger">
          <span style={{ fontSize: '1.2rem' }}>❌</span>
          <div>
            <strong>FALHA CRÍTICA — Entregáveis</strong>
            <p className="text-sm mt-1">{analysis.deliverablesAnalysis.criticalFailureReason}</p>
          </div>
        </div>
      )}

      {/* Score Cards */}
      <div>
        <h2 className="section-title">Pontuações por Dimensão</h2>
        <div className="grid-4">
          {Object.entries(SCORE_LABELS).map(([key, label]) => {
            const val = scores[key] || 0;
            const color = val >= 7 ? 'var(--success)' : val >= 5 ? 'var(--warning)' : 'var(--danger)';
            return (
              <div key={key} className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{val}</div>
                <div className="text-xs text-muted mt-1">{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Plan — full width */}
      <div className="card">
        <h2 className="section-title">Top 5 Prioridades de Ação</h2>
        <div className="grid-2" style={{ gap: '1.5rem' }}>
          {(analysis.actionPlan || []).slice(0, 5).map((item) => (
            <div key={item.priority} className="row row-md" style={{ alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, minWidth: 28,
                background: 'var(--accent-glow)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-light)',
              }}>
                {item.priority}
              </div>
              <div>
                <div className="row row-sm" style={{ marginBottom: 2 }}>
                  <span className="font-bold text-sm">{item.title}</span>
                  <span className={`badge ${IMPACT_BADGE[item.impact] || 'badge-neutral'}`}>
                    {item.impact}
                  </span>
                </div>
                <p className="text-xs text-muted">{item.description}</p>
                {item.pageReference > 0 && (
                  <p className="text-xs text-accent">Página {item.pageReference}</p>
                )}
              </div>
            </div>
          ))}
          {(!analysis.actionPlan || analysis.actionPlan.length === 0) && (
            <p className="text-muted text-sm">Nenhuma ação identificada.</p>
          )}
        </div>
      </div>


      <div className="card">
        <h2 className="section-title">Mapa da Estrutura — Página a Página</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Página</th>
                <th>Bloco Identificado</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {(analysis.structureMap || []).map((row, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>#{row.pageNumber}</td>
                  <td>{row.blockIdentified}</td>
                  <td><span className="text-xs text-accent">{row.blockType}</span></td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[row.status] || 'badge-neutral'}`}>
                      {STATUS_ICON[row.status]} {STATUS_TEXT[row.status] || row.status}
                    </span>
                  </td>
                  <td className="text-xs">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Missing Blocks */}
      {analysis.missingBlocks?.length > 0 && (
        <div className="card">
          <h2 className="section-title">❌ Blocos Ausentes</h2>
          <div className="stack stack-md">
            {analysis.missingBlocks.map((b, i) => (
              <div key={i} className="alert alert-warning">
                <span>⚠️</span>
                <div>
                  <strong>{b.blockType}</strong>
                  <p className="text-sm mt-1"><span style={{ opacity: 0.7 }}>Impacto: </span>{b.impact}</p>
                  <p className="text-sm"><span style={{ opacity: 0.7 }}>Como corrigir: </span>{b.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid-2">
        <div className="card">
          <h2 className="section-title">✅ Pontos Fortes</h2>
          <div className="stack stack-md">
            {(analysis.strengths || []).map((s, i) => (
              <div key={i} style={{ borderLeft: '3px solid var(--success)', paddingLeft: '0.75rem' }}>
                <div className="font-bold text-sm">{s.title} <span className="text-xs text-muted">• página {s.pageReference}</span></div>
                <p className="text-sm text-secondary mt-1">{s.description}</p>
              </div>
            ))}
            {(!analysis.strengths || analysis.strengths.length === 0) && (
              <p className="text-muted text-sm">Nenhum ponto forte identificado.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">⚠️ Pontos Fracos</h2>
          <div className="stack stack-md">
            {(analysis.weaknesses || []).map((w, i) => (
              <div key={i} style={{ borderLeft: '3px solid var(--warning)', paddingLeft: '0.75rem' }}>
                <div className="font-bold text-sm">{w.title} <span className="text-xs text-muted">• página {w.pageReference}</span></div>
                <p className="text-sm text-secondary mt-1">{w.description}</p>
                {w.recommendation && (
                  <p className="text-xs text-accent mt-1">→ {w.recommendation}</p>
                )}
              </div>
            ))}
            {(!analysis.weaknesses || analysis.weaknesses.length === 0) && (
              <p className="text-muted text-sm">Nenhum ponto fraco crítico identificado.</p>
            )}
          </div>
        </div>
      </div>

      {/* Deliverables — Critical Section */}
      <div className="card" style={{ border: hasCriticalFailure ? '1px solid rgba(239,68,68,0.4)' : undefined }}>
        <div className="row row-md row-between mb-2" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Análise dos Entregáveis {hasCriticalFailure && <span style={{ color: 'var(--danger)' }}>❌</span>}
          </h2>
          <div className="row row-sm">
            <span className={`badge ${analysis.deliverablesAnalysis?.hasDeliverablesBlock ? 'badge-success' : 'badge-danger'}`}>
              {analysis.deliverablesAnalysis?.hasDeliverablesBlock ? '✅ Bloco presente' : '❌ Bloco ausente'}
            </span>
            <span className={`badge ${!analysis.deliverablesAnalysis?.hasBlankValues ? 'badge-success' : 'badge-danger'}`}>
              {analysis.deliverablesAnalysis?.hasBlankValues ? '❌ Valores em branco' : '✅ Valores preenchidos'}
            </span>
            <span className={`badge ${analysis.deliverablesAnalysis?.stackingIsCorrect ? 'badge-success' : 'badge-warning'}`}>
              {analysis.deliverablesAnalysis?.stackingIsCorrect ? '✅ Empilhamento correto' : '⚠️ Empilhamento incorreto'}
            </span>
          </div>
        </div>

        {(analysis.deliverablesAnalysis?.deliverablesList || []).length > 0 && (
          <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Página</th>
                  <th>Entregável</th>
                  <th>Valor Percebido</th>
                  <th>Valor em Branco?</th>
                </tr>
              </thead>
              <tbody>
                {analysis.deliverablesAnalysis.deliverablesList.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: 'var(--accent-light)' }}>#{d.stackingPosition}</td>
                    <td>Página {d.pageNumber}</td>
                    <td style={{ color: 'var(--text-primary)' }}>{d.name}</td>
                    <td style={{ color: d.valueIsBlank ? 'var(--danger)' : 'var(--success)' }}>
                      {d.perceivedValue || '—'}
                    </td>
                    <td>
                      <span className={`badge ${d.valueIsBlank ? 'badge-danger' : 'badge-success'}`}>
                        {d.valueIsBlank ? '❌ Sim' : '✅ Não'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(analysis.deliverablesAnalysis?.recommendations || []).length > 0 && (
          <div className="stack stack-sm">
            <div className="label">Recomendações</div>
            {analysis.deliverablesAnalysis.recommendations.map((r, i) => (
              <p key={i} className="text-sm text-secondary">• {r}</p>
            ))}
          </div>
        )}
      </div>

      {/* Typo Errors */}
      {(analysis.typoErrors || []).length > 0 && (
        <div className="card">
          <h2 className="section-title">Erros de Digitação e Gramática</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Página</th>
                <th>Tipo</th>
                <th>Texto Original</th>
                <th>Correção</th>
              </tr>
            </thead>
            <tbody>
              {analysis.typoErrors.map((e, i) => (
                <tr key={i}>
                  <td>#{e.pageNumber}</td>
                  <td><span className="badge badge-warning">{e.errorType}</span></td>
                  <td style={{ color: 'var(--danger)', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                    {e.originalText}
                  </td>
                  <td style={{ color: 'var(--success)', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                    {e.correction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sequence Errors */}
      {(analysis.sequenceErrors || []).length > 0 && (
        <div className="card">
          <h2 className="section-title">Erros de Sequência</h2>
          <div className="stack stack-md">
            {analysis.sequenceErrors.map((e, i) => (
              <div key={i} className="alert alert-info">
                <span>⚠️</span>
                <div className="stack stack-sm">
                  <p className="text-sm font-bold">{e.description}</p>
                  <p className="text-xs">
                    <span style={{ opacity: 0.7 }}>Ordem atual: </span>
                    <code style={{ color: 'var(--warning)' }}>{e.currentOrder}</code>
                  </p>
                  <p className="text-xs">
                    <span style={{ opacity: 0.7 }}>Ordem recomendada: </span>
                    <code style={{ color: 'var(--success)' }}>{e.recommendedOrder}</code>
                  </p>
                  <p className="text-xs text-muted">{e.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
