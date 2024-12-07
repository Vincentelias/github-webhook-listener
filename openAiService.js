const OpenAI = require('openai');

require('dotenv').config();

// Initialize OpenAI API client

/**
 * Summarizes a large string using OpenAI's GPT model.
 * @param {string} errorLog - The error log to be summarized.
 * @returns {Promise<string>} - A promise that resolves to the summary of the error log.
 */
async function summarizeErrorLog(errorLog) {
    try {

        const client = new OpenAI({
            apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
        });

        const completion = await client.chat.completions.create({
            model: 'gpt-4o', // Use a suitable model
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that summarizes error logs.'
                },
                { role: 'user', content: `Summarize the following error log and give me the root cause of the error and how to solve it. Format in plain text, it's for a telegram message. Use emojis to clarify:\n\n${errorLog}` }
            ]
        });

        process.stdout.write(`${getParisTimePrefix()} Summarized log: ${JSON.stringify(completion.choices[0].message)}`);
        return completion.choices[0].message;
    } catch (error) {
        console.error('Error summarizing the log:', error);
        throw new Error('Failed to summarize the error log');
    }
}

module.exports = { summarizeErrorLog };
