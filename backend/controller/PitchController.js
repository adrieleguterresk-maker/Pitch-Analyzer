const multer = require('multer');
const path = require('path');
const Pitch = require('../model/Pitch');
const StorageService = require('../services/StorageService');
const AnalysisController = require('./AnalysisController');

const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 20) * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são aceitos.'));
    }
  },
});

class PitchController {
  static uploadMiddleware() {
    return upload.single('pdf');
  }

  /**
   * POST /api/pitch/upload
   * Accepts multipart/form-data (req.file) or application/json (req.body.fileUrl, req.body.fileName)
   */
  static async handleUpload(req, res) {
    try {
      let originalname, buffer, finalFileUrl;

      // Case 1: Direct Supabase Upload (bypassing Vercel 4.5MB limit)
      if (req.body && req.body.fileUrl) {
        originalname = req.body.fileName || 'ArquivodeVendas.pdf';
        finalFileUrl = req.body.fileUrl; // Keep the remote URL
        
        // Fetch the file buffer from the remote URL to process it
        const remoteRes = await fetch(finalFileUrl);
        if (!remoteRes.ok) throw new Error('Não foi possível baixar o arquivo do Supabase.');
        const arrayBuffer = await remoteRes.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } 
      // Case 2: Traditional FormData Upload (files < 4.5MB)
      else if (req.file) {
        originalname = req.file.originalname;
        buffer = req.file.buffer;
        
        // Fix encoding for filenames with accents
        originalname = Buffer.from(originalname, 'latin1').toString('utf8').normalize('NFC');
        
        // Save file to temporary disk
        const { fileUrl } = StorageService.save(buffer, originalname);
        finalFileUrl = fileUrl;
      } else {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      // Create pitch record
      const pitch = await Pitch.create({ fileName: originalname, fileUrl: finalFileUrl });

      // Kick off async analysis (non-blocking)
      const wsClients = req.app.get('wsClients') || null;
      
      AnalysisController.runAnalysis(pitch.id, buffer, wsClients).catch((err) => {
        console.error('Analysis pipeline error:', err.message);
        Pitch.updateStatus(pitch.id, 'error');
      });

      return res.status(201).json({ pitchId: pitch.id, status: 'pending' });
    } catch (err) {
      console.error('PitchController.handleUpload error:', err);
      return res.status(500).json({ error: err.message || 'Erro no servidor ao processar o upload.' });
    }
  }

  /**
   * GET /api/pitch/:id/status
   */
  static async getStatus(req, res) {
    try {
      const pitch = await Pitch.findById(req.params.id);
      if (!pitch) return res.status(404).json({ error: 'Pitch não encontrado.' });

      return res.json({ pitchId: pitch.id, status: pitch.status });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /api/pitch
   */
  static async listAll(req, res) {
    try {
      const pitches = await Pitch.findAll();
      return res.json(pitches);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Multer error handler middleware
   */
  static handleUploadError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: `Arquivo muito grande. Máximo: ${process.env.MAX_FILE_SIZE_MB || 100}MB.` });
      }
      return res.status(400).json({ error: `Multer error: ${err.message}` });
    }
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message });
    }
    next();
  }
}

module.exports = PitchController;
