const Analysis = require('../model/Analysis');
const Deliverable = require('../model/Deliverable');
const Pitch = require('../model/Pitch');
const PdfService = require('../services/PdfService');

class ReportController {
  /**
   * GET /api/report/:analysisId
   * Returns the full analysis with pitch metadata and deliverables.
   */
  static async getReport(req, res) {
    try {
      const { analysisId } = req.params;
      const analysis = await Analysis.findById(analysisId);
      if (!analysis) return res.status(404).json({ error: 'Análise não encontrada.' });

      const pitch = await Pitch.findById(analysis.pitch_id);
      const deliverables = await Deliverable.findByAnalysisId(analysisId);

      return res.json({
        analysis: {
          id: analysis.id,
          pitchId: analysis.pitch_id,
          createdAt: analysis.created_at,
          structureMap: analysis.structure_map,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          typoErrors: analysis.typo_errors,
          sequenceErrors: analysis.sequence_errors,
          deliverablesAnalysis: analysis.deliverables_analysis,
          scores: analysis.scores,
          overallScore: parseFloat(analysis.overall_score),
          actionPlan: analysis.action_plan,
          missingBlocks: analysis.missing_blocks,
        },
        pitch: {
          id: pitch.id,
          fileName: pitch.file_name,
          uploadedAt: pitch.uploaded_at,
          totalPages: pitch.total_pages,
          status: pitch.status,
        },
        deliverables,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/report
   * Returns all analyses with basic pitch info (for history view).
   */
  static async listAll(req, res) {
    try {
      const rows = await Analysis.findAllWithPitch();
      return res.json(
        rows.map((r) => ({
          id: r.id,
          pitchId: r.pitch_id,
          fileName: r.file_name,
          uploadedAt: r.uploaded_at,
          overallScore: r.overall_score ? parseFloat(r.overall_score) : null,
          status: r.status,
          createdAt: r.created_at,
        }))
      );
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/report/:analysisId/pdf
   * Generates and returns a professional PDF of the analysis.
   */
  static async generatePdf(req, res) {
    try {
      const { analysisId } = req.params;
      const analysis = await Analysis.findById(analysisId);
      if (!analysis) return res.status(404).json({ error: 'Análise não encontrada.' });

      const pitch = await Pitch.findById(analysis.pitch_id);
      const deliverables = await Deliverable.findByAnalysisId(analysisId);

      const pdfBuffer = await PdfService.generate({
        analysis: {
          id:                  analysis.id,
          pitchId:             analysis.pitch_id,
          createdAt:           analysis.created_at,
          overallScore:        parseFloat(analysis.overall_score),
          scores:              analysis.scores,
          structureMap:        analysis.structure_map,
          strengths:           analysis.strengths,
          weaknesses:          analysis.weaknesses,
          typoErrors:          analysis.typo_errors,
          sequenceErrors:      analysis.sequence_errors,
          deliverablesAnalysis:analysis.deliverables_analysis,
          actionPlan:          analysis.action_plan,
          missingBlocks:       analysis.missing_blocks,
        },
        pitch: {
          id:          pitch.id,
          fileName:    pitch.file_name,
          uploadedAt:  pitch.uploaded_at,
          totalPages:  pitch.total_pages,
          status:      pitch.status,
        },
        deliverables,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=analise-pitch-${analysisId.slice(0, 8)}.pdf`);
      return res.send(pdfBuffer);
    } catch (err) {
      console.error('Pdf Generation Error:', err);
      return res.status(500).json({ error: 'Erro ao gerar PDF: ' + err.message });
    }
  }
}

module.exports = ReportController;
