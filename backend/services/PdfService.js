const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
let puppeteer;
try {
  // Use puppeteer-core only if chromium is available (Vercel)
  // Otherwise try standard puppeteer (Render/Local)
  puppeteer = require('puppeteer-core');
} catch (e) {
  puppeteer = require('puppeteer');
}
const chromium = require('@sparticuz/chromium');

class PdfService {
  /**
   * Extrai o texto de um buffer de PDF
   */
  static async extractText(buffer) {
    try {
      if (!buffer || buffer.length === 0) throw new Error('Buffer vazio recebido para extração.');
      const data = await pdfParse(buffer);
      if (!data || !data.text) throw new Error('Não foi possível ler texto deste PDF.');
      return {
        text: data.text,
        numPages: data.numpages || 1,
      };
    } catch (err) {
      console.error('PdfService.extractText error:', err.message);
      throw new Error('Falha ao extrair texto do PDF. O arquivo pode estar corrompido, protegido por senha, ou ser apenas imagens.');
    }
  }
  static async generate(data) {
    const { analysis, pitch } = data;
    
    let browser;
    try {
      // Configure launch options for Vercel vs Render vs Local
      const isVercel = !!process.env.VERCEL;
      const isRender = !!process.env.RENDER || fs.existsSync('/opt/render'); // Heuristic for Render
      
      const launchOptions = {
        args: isVercel ? chromium.args : ['--disable-setuid-sandbox', '--no-sandbox', '--no-zygote'],
        defaultViewport: isVercel ? chromium.defaultViewport : { width: 1280, height: 720 },
        executablePath: isVercel 
          ? await chromium.executablePath() 
          : (process.platform === 'win32' 
              ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' 
              : '/usr/bin/google-chrome'), // Path in Dockerfile
        headless: isVercel ? chromium.headless : 'new',
      };

      browser = await puppeteer.launch(launchOptions);

      const page = await browser.newPage();
      const html = this.buildHtml(analysis, pitch);
      await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '48px', bottom: '55px', left: '0px', right: '0px' },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-family:Inter,sans-serif;font-size:10px;width:100%;padding:0 40px;display:flex;justify-content:space-between;color:#94a3b8;box-sizing:border-box;">
            <span>Sales Pitch Analyzer — Relatório Confidencial</span>
            <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
          </div>`,
      });
      return pdf;
    } finally {
      if (browser) await browser.close();
    }
  }

  // ─── Score bar ────────────────────────────────────────────────────────
  static scoreBar(val) {
    const pct = (val / 10) * 100;
    const col = val >= 7 ? '#10b981' : val >= 5 ? '#f59e0b' : '#ef4444';
    return `
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="flex:1;background:#e2e8f0;border-radius:100px;height:8px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${col};border-radius:100px;"></div>
        </div>
        <span style="font-weight:700;color:${col};min-width:28px;text-align:right;">${val}</span>
      </div>`;
  }

  static scoreColor(val) {
    return val >= 7 ? '#10b981' : val >= 5 ? '#f59e0b' : '#ef4444';
  }

  static badgeHtml(status) {
    const map = {
      present_good:      { bg: '#dcfce7', color: '#166534', label: '✓ Completo' },
      present_incomplete:{ bg: '#fef9c3', color: '#854d0e', label: '⚠ Incompleto' },
      absent:            { bg: '#fee2e2', color: '#991b1b', label: '✗ Ausente' },
    };
    const s = map[status] || { bg: '#e2e8f0', color: '#475569', label: status };
    return `<span style="background:${s.bg};color:${s.color};padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600;white-space:nowrap;">${s.label}</span>`;
  }

  static impactBadge(impact) {
    const map = {
      alto:  { bg: '#fee2e2', color: '#991b1b' },
      medio: { bg: '#fef9c3', color: '#854d0e' },
      baixo: { bg: '#dbeafe', color: '#1e40af' },
    };
    const s = map[(impact||'').toLowerCase()] || { bg: '#e2e8f0', color: '#475569' };
    return `<span style="background:${s.bg};color:${s.color};padding:3px 8px;border-radius:100px;font-size:11px;font-weight:600;text-transform:capitalize;">${impact||'—'}</span>`;
  }

  static label(key) {
    const m = {
      authorityAndCredibility:  'Autoridade & Credibilidade',
      valueProposition:          'Proposta de Valor',
      socialProof:               'Prova Social',
      structureAndSequence:      'Estrutura & Sequência',
      deliverablesAndStacking:   'Entregáveis & Empilhamento',
      bonus:                     'Bônus',
      pricePresentation:         'Apresentação do Preço',
      emotionalClosing:          'Encerramento Emocional',
    };
    return m[key] || key;
  }

  // ─── Main HTML ────────────────────────────────────────────────────────
  static buildHtml(analysis, pitch) {
    const score      = parseFloat(analysis.overallScore || 0).toFixed(1);
    const date       = new Date(analysis.createdAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
    const scores     = analysis.scores || {};
    const da         = analysis.deliverablesAnalysis || {};
    const hasCritical = da.criticalFailure;

    /* ── Section helper */
    const section = (emoji, title, content) => `
      <div class="section">
        <h2 class="sec-title"><span class="sec-icon">${emoji}</span>${title}</h2>
        ${content}
      </div>`;

    /* ── Score cards */
    const scoreCards = Object.entries(scores).map(([k, v]) => `
      <div class="score-card">
        <div class="score-val" style="color:${this.scoreColor(v)}">${v}</div>
        <div class="score-key">${this.label(k)}</div>
        ${this.scoreBar(v)}
      </div>`).join('');

    /* ── Action plan */
    const actionRows = (analysis.actionPlan || []).map(item => `
      <div class="action-row">
        <div class="action-num">${item.priority}</div>
        <div class="action-body">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="action-title">${item.title}</span>
            ${this.impactBadge(item.impact)}
            ${item.pageReference > 0 ? `<span style="color:#6366f1;font-size:12px;">Pág. ${item.pageReference}</span>` : ''}
          </div>
          <p class="action-desc">${item.description}</p>
        </div>
      </div>`).join('') || '<p class="empty">Nenhuma ação identificada.</p>';

    /* ── Structure map table */
    const structRows = (analysis.structureMap || []).map(row => `
      <tr>
        <td style="font-weight:700;color:#4f46e5;">#${row.pageNumber}</td>
        <td>${row.blockIdentified}</td>
        <td style="color:#6366f1;font-size:12px;">${row.blockType}</td>
        <td>${this.badgeHtml(row.status)}</td>
        <td style="color:#64748b;font-size:12px;">${row.notes || '—'}</td>
      </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">Sem dados de estrutura.</td></tr>';

    /* ── Missing blocks */
    const missingBlocks = (analysis.missingBlocks || []).map(b => `
      <div class="alert-warn">
        <span class="alert-icon">⚠</span>
        <div>
          <div class="alert-title">${b.blockType}</div>
          <p class="alert-sub"><strong>Impacto:</strong> ${b.impact}</p>
          <p class="alert-sub"><strong>Como corrigir:</strong> ${b.recommendation}</p>
        </div>
      </div>`).join('');

    /* ── Strengths */
    const strengths = (analysis.strengths || []).map(s => `
      <div class="split-item" style="border-left-color:#10b981;">
        <div class="split-title">${s.title} <span class="split-page">• pág. ${s.pageReference}</span></div>
        <p class="split-desc">${s.description}</p>
      </div>`).join('') || '<p class="empty">Nenhum ponto forte identificado.</p>';

    /* ── Weaknesses */
    const weaknesses = (analysis.weaknesses || []).map(w => `
      <div class="split-item" style="border-left-color:#ef4444;">
        <div class="split-title">${w.title} <span class="split-page">• pág. ${w.pageReference}</span></div>
        <p class="split-desc">${w.description}</p>
        ${w.recommendation ? `<p class="split-tip">💡 ${w.recommendation}</p>` : ''}
      </div>`).join('') || '<p class="empty">Nenhum ponto fraco crítico identificado.</p>';

    /* ── Deliverables */
    const deliverables = (da.deliverablesList || []).map(d => `
      <tr>
        <td style="font-weight:700;color:#6366f1;">#${d.stackingPosition}</td>
        <td>Pág. ${d.pageNumber}</td>
        <td style="color:#1e293b;">${d.name}</td>
        <td style="color:${d.valueIsBlank ? '#ef4444' : '#10b981'};">${d.perceivedValue || '—'}</td>
        <td>${d.valueIsBlank
          ? '<span style="background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:100px;font-size:11px;">✗ Sim</span>'
          : '<span style="background:#dcfce7;color:#166534;padding:3px 8px;border-radius:100px;font-size:11px;">✓ Não</span>'}</td>
      </tr>`).join('');

    const delivBadge = (ok, okLabel, failLabel) =>
      `<span class="${ok ? 'dbadge-ok' : 'dbadge-fail'}">${ok ? '✓ ' + okLabel : '✗ ' + failLabel}</span>`;

    /* ── Typo errors */
    const typoRows = (analysis.typoErrors || []).map(e => `
      <tr>
        <td>#${e.pageNumber}</td>
        <td><span style="background:#fef9c3;color:#854d0e;padding:3px 8px;border-radius:100px;font-size:11px;">${e.errorType}</span></td>
        <td style="font-family:monospace;color:#ef4444;">${e.originalText}</td>
        <td style="font-family:monospace;color:#10b981;">${e.correction}</td>
      </tr>`).join('');

    /* ── Sequence errors */
    const seqErrors = (analysis.sequenceErrors || []).map(e => `
      <div class="alert-info">
        <span class="alert-icon">⚠️</span>
        <div>
          <p class="alert-title">${e.description}</p>
          <p class="alert-sub">Ordem atual: <code style="color:#f59e0b;">${e.currentOrder}</code></p>
          <p class="alert-sub">Recomendada: <code style="color:#10b981;">${e.recommendedOrder}</code></p>
          <p class="alert-sub" style="color:#94a3b8;">${e.impact}</p>
        </div>
      </div>`).join('');

    return `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', sans-serif;
    color: #1e293b;
    background: #fff;
    font-size: 13px;
    line-height: 1.6;
  }

  /* ── Cover ── */
  .cover {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 60px 40px;
    page-break-after: always;
    color: #fff;
  }
  .cover-logo {
    width: 72px; height: 72px;
    background: rgba(255,255,255,0.15);
    border-radius: 20px;
    display: flex; align-items: center; justify-content: center;
    font-size: 36px; margin-bottom: 48px;
  }
  .cover-label {
    font-size: 12px; font-weight: 600; letter-spacing: 4px;
    text-transform: uppercase; color: rgba(255,255,255,0.6); margin-bottom: 16px;
  }
  .cover-title {
    font-size: 38px; font-weight: 800; letter-spacing: -1px;
    line-height: 1.2; max-width: 560px; margin-bottom: 12px;
  }
  .cover-sub { font-size: 16px; color: rgba(255,255,255,0.7); margin-bottom: 60px; }
  .cover-score-ring {
    width: 180px; height: 180px;
    border: 6px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    margin-bottom: 60px;
  }
  .cover-score-val { font-size: 64px; font-weight: 800; color: #a5f3fc; line-height: 1; }
  .cover-score-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.6); }
  .cover-meta {
    border-top: 1px solid rgba(255,255,255,0.15);
    padding-top: 32px;
    width: 100%;
    max-width: 480px;
    font-size: 13px;
    color: rgba(255,255,255,0.6);
  }
  .cover-meta-item { margin-bottom: 4px; }
  .cover-meta-item strong { color: #fff; }

  /* ── Content ── */
  .content { padding: 48px 64px; }

  /* ── Sections ── */
  .section {
    margin-bottom: 40px;
    page-break-inside: avoid;
  }
  .sec-title {
    font-size: 18px; font-weight: 700;
    display: flex; align-items: center; gap: 10px;
    padding-bottom: 12px;
    border-bottom: 2px solid #e2e8f0;
    margin-bottom: 20px; color: #1e293b;
  }
  .sec-icon { font-size: 20px; }

  /* ── Score grid ── */
  .score-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
  .score-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
  }
  .score-val { font-size: 30px; font-weight: 800; margin-bottom: 4px; }
  .score-key { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 10px; }

  /* ── Action plan ── */
  .action-row {
    display: flex; gap: 16px;
    padding: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    margin-bottom: 12px;
    background: #f8fafc;
  }
  .action-num {
    width: 32px; height: 32px; min-width: 32px;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    color: #fff; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px;
  }
  .action-title { font-weight: 700; font-size: 14px; }
  .action-desc { color: #64748b; font-size: 12px; margin-top: 6px; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left; padding: 10px 12px;
    font-size: 11px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.08em; color: #64748b;
    background: #f1f5f9;
    border-bottom: 2px solid #e2e8f0;
  }
  th:first-child { border-radius: 8px 0 0 0; }
  th:last-child  { border-radius: 0 8px 0 0; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #fafafa; }

  /* ── Alerts ── */
  .alert-warn, .alert-info, .alert-crit {
    border-radius: 10px;
    padding: 14px 16px;
    display: flex; gap: 12px;
    margin-bottom: 10px;
    align-items: flex-start;
  }
  .alert-warn { background: #fffbeb; border: 1px solid #fde68a; }
  .alert-info { background: #eff6ff; border: 1px solid #bfdbfe; }
  .alert-crit { background: #fef2f2; border: 1px solid #fecaca; }
  .alert-icon { font-size: 18px; min-width: 22px; }
  .alert-title { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
  .alert-sub { font-size: 12px; color: #64748b; margin-top: 2px; }

  /* ── Strengths/Weaknesses ── */
  .split-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .split-col { }
  .split-col-title { font-size: 15px; font-weight: 700; margin-bottom: 14px; color: #1e293b; }
  .split-item {
    border-left: 4px solid;
    padding-left: 12px;
    margin-bottom: 14px;
  }
  .split-title { font-weight: 700; font-size: 13px; }
  .split-page { font-weight: 400; color: #94a3b8; font-size: 11px; }
  .split-desc { color: #64748b; font-size: 12px; margin-top: 4px; }
  .split-tip { color: #6366f1; font-size: 12px; margin-top: 4px; }

  /* ── Deliverables badges ── */
  .dbadges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  .dbadge-ok   { background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; }
  .dbadge-fail { background: #fee2e2; color: '#991b1b'; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; }
  .dbadge-warn { background: #fef9c3; color: #854d0e; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; }

  /* ── Misc ── */
  .empty { color: #94a3b8; font-style: italic; font-size: 13px; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<!-- ══ CAPA ══════════════════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-logo">PA</div>
  <div class="cover-label">Relatório de Análise de Pitch</div>
  <div class="cover-title">${(pitch.fileName || '').replace(/\.pdf$/i, '')}</div>
  <div class="cover-sub">Diagnóstico Estratégico & Plano de Ação</div>
  <div class="cover-score-ring">
    <div class="cover-score-val">${score}</div>
    <div class="cover-score-lbl">Nota Geral / 10</div>
  </div>
</div>

<!-- ══ CONTEÚDO ══════════════════════════════════════════════════ -->
<div class="content">

  ${hasCritical ? `
  <div class="alert-crit section">
    <span class="alert-icon">❌</span>
    <div>
      <div class="alert-title">FALHA CRÍTICA — Entregáveis</div>
      <p class="alert-sub">${da.criticalFailureReason || ''}</p>
    </div>
  </div>` : ''}

  <!-- Pontuações -->
  ${section('', 'Pontuações por Dimensão', `
    <div class="score-grid">${scoreCards}</div>`)}

  <!-- Mapa da Estrutura -->
  ${section('', 'Mapa da Estrutura — Página a Página', `
    <table>
      <thead><tr><th>Pág.</th><th>Bloco Identificado</th><th>Tipo</th><th>Status</th><th>Observação</th></tr></thead>
      <tbody>${structRows}</tbody>
    </table>`)}

  <!-- Blocos Ausentes -->
  ${(analysis.missingBlocks || []).length > 0 ? section('❌', 'Blocos Ausentes', missingBlocks) : ''}

  <!-- Plano de Ação (nova página) -->
  <div class="page-break">
  ${section('', 'Plano de Ação Prioritário', `<div>${actionRows}</div>`)}
  </div>

  <!-- Pontos Fortes & Fracos -->
  ${section('', 'Pontos Fortes & Pontos Fracos', `
    <div class="split-grid">
      <div class="split-col">
        <div class="split-col-title" style="color:#10b981;">✅ Pontos Fortes</div>
        ${strengths}
      </div>
      <div class="split-col">
        <div class="split-col-title" style="color:#ef4444;">⚠️ Pontos Fracos</div>
        ${weaknesses}
      </div>
    </div>`)}

  <!-- Entregáveis (nova página) -->
  <div class="page-break">
  ${section('', 'Análise dos Entregáveis', `
    <div class="dbadges">
      ${delivBadge(da.hasDeliverablesBlock, 'Bloco presente', 'Bloco ausente')}
      ${delivBadge(!da.hasBlankValues, 'Valores preenchidos', 'Valores em branco')}
      ${da.stackingIsCorrect
          ? '<span class="dbadge-ok">✓ Empilhamento correto</span>'
          : '<span class="dbadge-warn">⚠ Empilhamento incorreto</span>'}
    </div>
    ${(da.deliverablesList || []).length > 0 ? `
    <table>
      <thead><tr><th>Pos.</th><th>Pág.</th><th>Entregável</th><th>Valor Percebido</th><th>Em Branco?</th></tr></thead>
      <tbody>${deliverables}</tbody>
    </table>` : ''}
    ${(da.recommendations || []).length > 0 ? `
    <div style="margin-top:16px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:8px;">Recomendações</div>
      ${(da.recommendations).map(r => `<p style="font-size:12px;color:#334155;margin-bottom:4px;">• ${r}</p>`).join('')}
    </div>` : ''}
  `)}
  </div>

  <!-- Erros de Digitação -->
  ${(analysis.typoErrors || []).length > 0 ? section('', 'Erros de Digitação e Gramática', `
    <table>
      <thead><tr><th>Pág.</th><th>Tipo</th><th>Texto Original</th><th>Correção</th></tr></thead>
      <tbody>${typoRows}</tbody>
    </table>`) : ''}

  <!-- Erros de Sequência -->
  ${(analysis.sequenceErrors || []).length > 0 ? section('', 'Erros de Sequência', `<div>${seqErrors}</div>`) : ''}

</div>
</body>
</html>`;
  }
}

module.exports = PdfService;
