require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const PitchController = require('./controller/PitchController');
const AnalysisController = require('./controller/AnalysisController');
const ReportController = require('./controller/ReportController');

const app = express();
const server = http.createServer(app);

// ─── WebSocket Setup ──────────────────────────────────────────────────────────
const wss = new WebSocket.Server({ server });
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
});

app.set('wsClients', wsClients);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '110mb' }));
app.use(express.urlencoded({ limit: '110mb', extended: true }));
app.use('/uploads', express.static(path.resolve('./uploads')));

// ─── Routes ───────────────────────────────────────────────────────────────────

// Pitch routes
app.post(
  '/api/pitch/upload',
  PitchController.uploadMiddleware(),
  PitchController.handleUploadError,
  PitchController.handleUpload
);
app.get('/api/pitch/:id/status', PitchController.getStatus);
app.get('/api/pitch', PitchController.listAll);

// Analysis routes
app.post('/api/analysis/run/:pitchId', AnalysisController.triggerAnalysis);

// Report routes
app.get('/api/report', ReportController.listAll);
app.get('/api/report/:analysisId', ReportController.getReport);
app.get('/api/report/:analysisId/pdf', ReportController.generatePdf);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ WebSocket ready on ws://localhost:${PORT}`);
});
