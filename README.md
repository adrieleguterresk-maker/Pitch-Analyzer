# 🎯 Pitch Analyzer

Sistema para análise de pitches de vendas em PDF usando Claude AI (Anthropic).

## Estrutura

```
análise de pitch/
├── backend/     ← Node.js + Express + PostgreSQL
└── frontend/    ← React + Vite
```

---

## ⚙️ Configuração do Backend

### 1. Instale as dependências
```bash
cd backend
npm install
```

### 2. Configure o ambiente
```bash
cp .env.example .env
```
Edite `.env` e preencha:
- `ANTHROPIC_API_KEY` — sua chave da API Anthropic
- `DATABASE_URL` — ex: `postgresql://user:senha@localhost:5432/pitch_analyzer`
- `CLAUDE_MODEL` — ex: `claude-opus-4-5` (padrão)

### 3. Crie o banco de dados e rode a migration
```bash
psql -U <seu_usuario> -d <seu_banco> -f schema.sql
```

### 4. Inicie o servidor
```bash
npm run dev
# Servidor: http://localhost:3001
```

---

## 🖥️ Configuração do Frontend

```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

---

## 📡 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/pitch/upload` | Upload de PDF (multipart/form-data, campo `pdf`) |
| `GET` | `/api/pitch/:id/status` | Status do processamento |
| `GET` | `/api/pitch` | Lista todos os pitches |
| `POST` | `/api/analysis/run/:pitchId` | Re-triggered análise manualmente |
| `GET` | `/api/report` | Lista todas as análises (para histórico) |
| `GET` | `/api/report/:analysisId` | Relatório completo de uma análise |
| `WS` | `ws://localhost:3001` | Progresso em tempo real |

---

## 🔄 Fluxo Principal

1. Usuário arrasta PDF → `POST /api/pitch/upload`
2. Backend salva o arquivo e cria registro `pending`
3. Pipeline assíncrono: extrai texto → converte base64 → envia para Claude
4. Claude retorna JSON estruturado → salva em `analyses` + `deliverables`
5. Progresso enviado via WebSocket ao frontend
6. Frontend redireciona para `/analysis/:id` com o relatório completo

---

## 📦 Dependências Principais

**Backend:** `express`, `@anthropic-ai/sdk`, `pdf-parse`, `pg`, `multer`, `ws`, `puppeteer`  
**Frontend:** `react`, `react-router-dom`, `chart.js`, `react-chartjs-2`, `jspdf`, `html2canvas`
