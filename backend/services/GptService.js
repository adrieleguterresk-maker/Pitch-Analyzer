const OpenAI = require('openai');
const { SYSTEM_PROMPT, ANALYSIS_PROMPT } = require('../config/prompts');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class GptService {
  /**
   * Sends the extracted text (or potentially vision/document) to GPT for analysis.
   * @param {string} rawText - extracted text from the PDF
   * @returns {Object} parsed JSON analysis result
   */
  static async analyzePitch(rawText) {
    const model = process.env.GPT_MODEL || 'gpt-4o';

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${ANALYSIS_PROMPT}\n\nTEXTO DO PITCH EXTRAÍDO:\n${rawText}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    });

    const output = response.choices[0].message.content;

    try {
      return JSON.parse(output);
    } catch (err) {
      console.error('Failed to parse GPT response as JSON:', output);
      throw new Error('GPT returned invalid JSON: ' + err.message);
    }
  }
}

module.exports = GptService;
