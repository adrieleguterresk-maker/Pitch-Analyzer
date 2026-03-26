const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

// Use /tmp for Vercel, or local ./uploads for dev
const isVercel = !!process.env.VERCEL;
const UPLOAD_DIR = isVercel ? os.tmpdir() : path.resolve(process.env.UPLOAD_DIR || './uploads');

// Ensure upload directory exists (not needed for /tmp but good for local)
if (!isVercel && !fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

class StorageService {
  /**
   * Saves a file buffer to disk and returns a relative URL path.
   */
  static save(buffer, fileName) {
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    fs.writeFileSync(filePath, buffer);
    return {
      filePath,
      fileUrl: isVercel ? `/tmp/${safeName}` : `/uploads/${safeName}`,
    };
  }

  /**
   * Reads a file from disk and returns its buffer.
   * @param {string} fileUrl - relative URL like /uploads/xxx.pdf
   * @returns {Buffer}
   */
  static read(fileUrl) {
    const safeName = path.basename(fileUrl);
    const filePath = path.join(UPLOAD_DIR, safeName);
    return fs.readFileSync(filePath);
  }

  /**
   * Deletes a file from disk.
   * @param {string} fileUrl
   */
  static delete(fileUrl) {
    try {
      const safeName = path.basename(fileUrl);
      const filePath = path.join(UPLOAD_DIR, safeName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      console.error('StorageService.delete error:', err.message);
    }
  }
}

module.exports = StorageService;
