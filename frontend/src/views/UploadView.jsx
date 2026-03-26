import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const API = ''; // Empty means relative to same host
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

const STEP_LABELS = {
  uploading: 'Enviando arquivo...',
  extracting: 'Extraindo texto do PDF...',
  extracted: 'Texto extraído com sucesso',
  analyzing: 'Enviando para GPT-4o API...',
  saving: 'Salvando análise no banco...',
  completed: 'Análise concluída!',
  error: 'Erro durante a análise',
};

export default function UploadView() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const pollRef = useRef(null);

  const startPolling = useCallback((pitchId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/pitch/${pitchId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.status === 'completed' && data.analysisId) {
          clearInterval(pollRef.current);
          setStep('completed');
          setProgress(100);
          setTimeout(() => navigate(`/analysis/${data.analysisId}`), 800);
        } else if (data.status === 'error') {
          clearInterval(pollRef.current);
          setUploading(false);
          setError('Erro durante o processamento do PDF.');
        } else {
          // Update progress based on actual DB status
          if (data.status === 'processing') {
            setStep('analyzing');
            setProgress(prev => prev < 90 ? prev + 5 : prev);
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 3000);
  }, [navigate]);

  const connectWs = useCallback((pitchId) => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.pitchId !== pitchId) return;
        setProgress(data.progress || 0);
        setStep(data.step || '');

        if (data.step === 'completed' || data.analysisId) {
          if (pollRef.current) clearInterval(pollRef.current);
          ws.close();
          setTimeout(() => navigate(`/analysis/${data.analysisId}`), 1000);
        }
        if (data.step === 'error') {
          if (pollRef.current) clearInterval(pollRef.current);
          ws.close();
          setUploading(false);
          setError(data.error || 'Erro desconhecido durante a análise.');
        }
      };

      ws.onerror = () => {
        console.warn('WebSocket failed, falling back to polling.');
        startPolling(pitchId);
      };

      ws.onclose = () => {
        // Only poll if not successful yet
        if (step !== 'completed' && uploading) {
           startPolling(pitchId);
        }
      };
    } catch (e) {
      startPolling(pitchId);
    }
  }, [navigate, startPolling, step, uploading]);

  const handleFile = (f) => {
    setError('');
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Apenas arquivos PDF são aceitos.');
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setError('O arquivo excede o limite de 100MB.');
      return;
    }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setProgress(5);
    setStep('uploading');

    try {
      let reqBody;
      let reqHeaders = {};

      // If Supabase is configured, upload directly to circumvent Vercel 4.5MB limit
      if (supabase && file.size > 4 * 1024 * 1024) { // Only bypass if > 4MB (Vercel limit)
        const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
        
        const { data, error: uploadError } = await supabase.storage
          .from('pitches')
          .upload(safeName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw new Error('Falha ao enviar arquivo para o Supabase: ' + uploadError.message);
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage.from('pitches').getPublicUrl(safeName);

        reqBody = JSON.stringify({ fileUrl: publicUrl, fileName: file.name });
        reqHeaders = { 'Content-Type': 'application/json' };
      } else {
        // Fallback to traditional FormData upload if small enough or no Supabase
        const formData = new FormData();
        formData.append('pdf', file);
        reqBody = formData;
      }

      const res = await fetch(`${API}/api/pitch/upload`, {
        method: 'POST',
        headers: reqHeaders,
        body: reqBody,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao iniciar processamento do upload.');
      }

      const { pitchId } = await res.json();
      setProgress(10);
      connectWs(pitchId);
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  return (
    <div className="stack stack-xl">
      {/* Header */}
      <div>
        <div className="label mb-1">Analisador de Pitch</div>
        <h1 className="page-title">Envie seu Pitch de Vendas</h1>
        <p className="text-secondary mt-1" style={{ maxWidth: 560 }}>
          Faça o upload do seu PDF e receba um diagnóstico completo com pontos fortes,
          falhas críticas e plano de ação priorizado — gerado pelo GPT-4o.
        </p>
      </div>

      {/* Upload Zone */}
      {!uploading ? (
        <div className="stack stack-md">
          <div
            id="upload-zone"
            className={`upload-zone${dragOver ? ' drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <div className="upload-icon">📄</div>
            {file ? (
              <div className="stack stack-sm" style={{ alignItems: 'center' }}>
                <p className="font-bold" style={{ color: 'var(--accent-light)' }}>{file.name}</p>
                <p className="text-sm text-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                <button
                  className="btn btn-secondary btn-sm mt-1"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setError(''); }}
                >
                  Trocar arquivo
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 }}>
                  Arraste seu PDF aqui
                </h3>
                <p className="text-secondary text-sm">ou clique para selecionar o arquivo</p>
                <p className="text-muted text-xs mt-1">Apenas PDF • Máx. 100MB</p>
              </>
            )}
          </div>

          {error && (
            <div className="alert alert-danger">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            id="analyze-btn"
            className="btn btn-primary btn-lg"
            disabled={!file}
            onClick={handleSubmit}
            style={{ opacity: file ? 1 : 0.5, alignSelf: 'flex-start' }}
          >
            🚀 Analisar Pitch
          </button>
        </div>
      ) : (
        /* Processing State */
        <div className="card" style={{ maxWidth: 540 }}>
          <div className="stack stack-lg" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div className="spinner" style={{ width: 48, height: 48 }} />
            <div className="stack stack-sm" style={{ width: '100%' }}>
              <div className="row row-between">
                <span className="text-sm text-secondary">
                  {STEP_LABELS[step] || 'Processando...'}
                </span>
                <span className="text-sm font-bold text-accent">{progress}%</span>
              </div>
              <div className="progress-bar-wrapper">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <p className="text-xs text-muted">
              O GPT-4o está lendo e analisando seu pitch. Isso pode levar de 20 a 60 segundos.
            </p>
          </div>
        </div>
      )}

      {/* Info Cards */}
      {!uploading && (
        <div className="grid-3">
          {[
            { icon: '🗺️', title: 'Mapa da Estrutura', desc: 'Página a página, identificamos cada bloco do seu pitch' },
            { icon: '⚠️', title: 'Análise Crítica', desc: 'Erros de digitação, sequência e entregáveis sem valor' },
            { icon: '🎯', title: 'Plano de Ação', desc: 'Top 5 prioridades ordenadas por impacto na conversão' },
          ].map((c) => (
            <div key={c.title} className="card">
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{c.icon}</div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>{c.title}</h3>
              <p className="text-sm text-muted">{c.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
