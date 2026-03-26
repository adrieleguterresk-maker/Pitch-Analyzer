const fs = require('fs');
const path = require('path');
require('dotenv').config();

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

class StorageService {
  /**
   * Saves a file buffer to disk and returns a relative URL path.
   * @param {Buffer} buffer - file content
   * @param {string} fileName - sanitized file name
   * @returns {{ filePath: string, fileUrl: string }}
   */
  static save(buffer, fileName) {
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    fs.writeFileSync(filePath, buffer);
    return {
      filePath,
      fileUrl: `/uploads/${safeName}`,
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
