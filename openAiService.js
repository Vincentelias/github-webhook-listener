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
                { role: 'user', content: `Summarize the following error log and give me the root cause of the error. If there are multiple errors, give me the root cause of each error, don't skip any. Don't give me info about the on-push-to-repo.sh script, only the error log of the project. Format in plain text, it's for a telegram message. Use emojis to clarify:\n\n${errorLog}. Do not use markdown unless telegram accepts it.` }
            ]
        });

        process.stdout.write(`Summarized log: ${JSON.stringify(completion.choices[0].message.content)}`);
        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error summarizing the log:', error);
        throw new Error('Failed to summarize the error log');
    }
}

module.exports = { summarizeErrorLog };
