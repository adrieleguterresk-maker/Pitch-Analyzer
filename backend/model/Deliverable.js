const pool = require('../config/database');

class Deliverable {
  static async createMany(analysisId, deliverablesList) {
    if (!Array.isArray(deliverablesList) || deliverablesList.length === 0) return [];

    const results = [];
    for (const d of deliverablesList) {
      const result = await pool.query(
        `INSERT INTO deliverables
           (analysis_id, page_number, name, has_individual_value, perceived_value, is_blank, stacking_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          analysisId,
          d.pageNumber || null,
          d.name || null,
          !d.valueIsBlank,
          d.perceivedValue || null,
          d.valueIsBlank || false,
          d.stackingPosition || null,
        ]
      );
      results.push(result.rows[0]);
    }
    return results;
  }

  static async findByAnalysisId(analysisId) {
    const result = await pool.query(
      'SELECT * FROM deliverables WHERE analysis_id = $1 ORDER BY stacking_order ASC',
      [analysisId]
    );
    return result.rows;
  }
}

module.exports = Deliverable;
