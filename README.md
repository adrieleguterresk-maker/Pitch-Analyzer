## 🌍 Deploy no Vercel (Novo!)

O projeto agora está **100% pronto para a Vercel** em um único repositório!

1.  **Conecte o GitHub**: Importe o repositório na Vercel.
2.  **Configurações Automáticas**: O arquivo `vercel.json` na raiz já cuida de tudo:
    -   Frontend é construído automaticamente.
    -   Backend vira funções serverless na rota `/api`.
3.  **Variáveis de Ambiente**: No painel da Vercel, adicione:
    -   `OPENAI_API_KEY`
    -   `DATABASE_URL` (Sua URL do Supabase)
    -   `GPT_MODEL` (ex: `gpt-4o`)

---

## 📁 Estrutura Monorepo

```
análise de pitch/
├── backend/     ← API Serverless (Puppeteer + AI)
├── frontend/    ← Dashboard React (Vite)
└── vercel.json  ← Configuração de Roteamento
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
