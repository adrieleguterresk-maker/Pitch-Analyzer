const pool = require('../config/database');

class Pitch {
  static async create({ fileName, fileUrl }) {
    const result = await pool.query(
      `INSERT INTO pitches (file_name, file_url, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [fileName, fileUrl]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM pitches WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findAll() {
    const result = await pool.query(
      'SELECT * FROM pitches ORDER BY uploaded_at DESC'
    );
    return result.rows;
  }

  static async updateStatus(id, status) {
    const result = await pool.query(
      `UPDATE pitches SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return result.rows[0];
  }

  static async updateAfterExtraction(id, { totalPages, rawText }) {
    const result = await pool.query(
      `UPDATE pitches SET total_pages = $1, raw_text = $2 WHERE id = $3 RETURNING *`,
      [totalPages, rawText, id]
    );
    return result.rows[0];
  }
}

module.exports = Pitch;
