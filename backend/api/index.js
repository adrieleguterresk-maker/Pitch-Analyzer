require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const PitchController = require('../controller/PitchController');
const AnalysisController = require('../controller/AnalysisController');
const ReportController = require('../controller/ReportController');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: true, // Allow all for serverless ease, or use process.env.FRONTEND_URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

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
app.get('/api/health', (req, res) => res.json({ status: 'ok', environment: 'vercel' }));

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Erro interno do servidor.', details: err.message });
});

module.exports = app;
