# 🎯 Pitch Analyzer

Sistema premium para análise de pitches de vendas em PDF usando OpenAI GPT-4o e geração de relatórios profissionais em PDF.

## 🚀 Tecnologias

- **Frontend:** React, Vite, Chart.js, Tailwind-like CSS
- **Backend:** Node.js, Express, Puppeteer (PDF Export)
- **Banco de Dados:** PostgreSQL (Supabase)
- **AI:** OpenAI Engine (GPT-4o)

## 📁 Estrutura

```
análise de pitch/
├── backend/     ← API Node.js + Express
└── frontend/    ← Dashboard React + Vite
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
- `OPENAI_API_KEY` — Sua chave da OpenAI
- `DATABASE_URL` — Sua URL do PostgreSQL (ex: Supabase)
- `GPT_MODEL` — Padrão: `gpt-4o`

### 3. Banco de Dados
O schema está em `backend/schema.sql`. Importe-o no seu banco de dados.

### 4. Inicie o servidor
```bash
npm run dev
# Servidor rodando em: http://localhost:3001
```

---

## 🖥️ Configuração do Frontend

```bash
cd frontend
npm install
npm run dev
# Dashboard em: http://localhost:5173
```

---

## 📡 Recursos Principais

- ✅ **Upload de PDF:** Extração automática de conteúdo.
- ✅ **Análise Estratégica:** Diagnóstico baseado em frames de vendas de alta conversão.
- ✅ **Dashboard Interativo:** Visualização de indicadores e plano de ação.
- ✅ **Exportação em PDF:** Gerador de relatórios fidedignos e profissionais.
- ✅ **Dark/Light Mode:** Interface premium com toggle de tema.

---

## 📦 Dependências Principais

**Backend:** `express`, `openai`, `pdf-parse`, `pg`, `multer`, `puppeteer`  
**Frontend:** `react`, `react-router-dom`, `chart.js`, `react-chartjs-2`
