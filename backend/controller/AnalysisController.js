const Pitch = require('../model/Pitch');
const Analysis = require('../model/Analysis');
const Deliverable = require('../model/Deliverable');
const PdfService = require('../services/PdfService');
const GptService = require('../services/GptService');

/**
 * Broadcasts a progress event to all connected WebSocket clients
 * watching the given pitchId.
 */
function broadcast(wsClients, pitchId, payload) {
  if (!wsClients) return;
  const message = JSON.stringify({ pitchId, ...payload });
  wsClients.forEach((ws) => {
    try {
      if (ws.readyState === 1) ws.send(message);
    } catch (_) {}
  });
}

class AnalysisController {
  /**
   * Orchestrates the full analysis pipeline for a given pitch.
   * Called asynchronously after upload.
   * @param {string} pitchId
   * @param {Buffer} pdfBuffer
   * @param {Set} wsClients - active WebSocket connections
   */
  static async runAnalysis(pitchId, pdfBuffer, wsClients) {
    try {
      // Step 1: Mark as processing
      await Pitch.updateStatus(pitchId, 'processing');
      broadcast(wsClients, pitchId, { step: 'extracting', progress: 10 });

      // Step 2: Extract text from PDF
      const { text: rawText, numPages: totalPages } = await PdfService.extractText(pdfBuffer);
      await Pitch.updateAfterExtraction(pitchId, {
        totalPages,
        rawText,
      });
      broadcast(wsClients, pitchId, { step: 'extracted', progress: 30 });

      // Step 3: Send to GPT API
      broadcast(wsClients, pitchId, { step: 'analyzing', progress: 40 });
      const analysisData = await GptService.analyzePitch(rawText);
      broadcast(wsClients, pitchId, { step: 'saving', progress: 80 });

      // Step 5: Save Analysis record
      const scores = analysisData.scores || {};
      const overallScore = scores.overall ?? null;

      const analysis = await Analysis.create({
        pitchId,
        structureMap: analysisData.structureMap || [],
        strengths: analysisData.strengths || [],
        weaknesses: analysisData.weaknesses || [],
        typoErrors: analysisData.typoErrors || [],
        sequenceErrors: analysisData.sequenceErrors || [],
        deliverablesAnalysis: analysisData.deliverablesAnalysis || {},
        scores,
        overallScore,
        actionPlan: analysisData.actionPlan || [],
        missingBlocks: analysisData.missingBlocks || [],
      });

      // Step 6: Save individual deliverables
      const deliverablesList =
        analysisData.deliverablesAnalysis?.deliverablesList || [];
      await Deliverable.createMany(analysis.id, deliverablesList);

      // Step 7: Mark pitch as completed
      await Pitch.updateStatus(pitchId, 'completed');
      broadcast(wsClients, pitchId, {
        step: 'completed',
        progress: 100,
        analysisId: analysis.id,
      });
    } catch (err) {
      console.error(`AnalysisController.runAnalysis [${pitchId}] error:`, err.message);
      await Pitch.updateStatus(pitchId, 'error');
      broadcast(wsClients, pitchId, {
        step: 'error',
        progress: 0,
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * POST /api/analysis/run/:pitchId
   * Can be called manually to re-trigger analysis.
   */
  static async triggerAnalysis(req, res) {
    try {
      const { pitchId } = req.params;
      const pitch = await Pitch.findById(pitchId);
      if (!pitch) return res.status(404).json({ error: 'Pitch não encontrado.' });

      const StorageService = require('../services/StorageService');
      const pdfBuffer = StorageService.read(pitch.file_url);
      const wsClients = req.app.get('wsClients') || null;

      // In serverless, we might want to wait for the analysis to avoid process killing,
      // but to keep the UI responsive, we'll try to run it and let the client poll for results.
      // Note: This is an edge case in Vercel. Standard Web Service is better for long tasks.
      AnalysisController.runAnalysis(pitchId, pdfBuffer, wsClients).catch(err => {
        console.error('Async analysis failed:', err.message);
      });

      return res.json({ pitchId, status: 'processing', message: 'Análise iniciada. Por favor, aguarde...' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = AnalysisController;
