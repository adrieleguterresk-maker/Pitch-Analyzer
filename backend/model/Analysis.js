const pool = require('../config/database');

class Analysis {
  static async create({
    pitchId,
    structureMap,
    strengths,
    weaknesses,
    typoErrors,
    sequenceErrors,
    deliverablesAnalysis,
    scores,
    overallScore,
    actionPlan,
    missingBlocks,
  }) {
    const result = await pool.query(
      `INSERT INTO analyses
        (pitch_id, structure_map, strengths, weaknesses, typo_errors, sequence_errors,
         deliverables_analysis, scores, overall_score, action_plan, missing_blocks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        pitchId,
        JSON.stringify(structureMap),
        JSON.stringify(strengths),
        JSON.stringify(weaknesses),
        JSON.stringify(typoErrors),
        JSON.stringify(sequenceErrors),
        JSON.stringify(deliverablesAnalysis),
        JSON.stringify(scores),
        overallScore,
        JSON.stringify(actionPlan),
        JSON.stringify(missingBlocks),
      ]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM analyses WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByPitchId(pitchId) {
    const result = await pool.query(
      'SELECT * FROM analyses WHERE pitch_id = $1 ORDER BY created_at DESC LIMIT 1',
      [pitchId]
    );
    return result.rows[0] || null;
  }

  static async findAllWithPitch() {
    const result = await pool.query(`
      SELECT a.*, p.file_name, p.uploaded_at, p.status
      FROM analyses a
      JOIN pitches p ON p.id = a.pitch_id
      ORDER BY a.created_at DESC
    `);
    return result.rows;
  }
}

module.exports = Analysis;
