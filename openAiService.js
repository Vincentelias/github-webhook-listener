const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

// Initialize OpenAI API client
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * Summarizes a large string using OpenAI's GPT model.
 * @param {string} errorLog - The error log to be summarized.
 * @returns {Promise<string>} - A promise that resolves to the summary of the error log.
 */
async function summarizeErrorLog(errorLog) {
    try {
        const response = await openai.createCompletion({
            model: 'gpt-4o', // Use a suitable model
            prompt: `Summarize the following error log and give me the root cause of the error and how to solve it. Format in plain text, it's for a telegram message. Use emojis to clarify:\n\n${errorLog}`,
        });

        return response.data.choices[0].text.trim();
    } catch (error) {
        console.error('Error summarizing the log:', error);
        throw new Error('Failed to summarize the error log');
    }
}

module.exports = { summarizeErrorLog };
