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

        process.stdout.write(`input log: ---- ${errorLog} ----`);

        const completion = await client.chat.completions.create({
            model: 'gpt-4o', // Use a suitable model
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that summarizes error logs.'
                },
                { role: 'user', content: `Summarize the following error log and give me the root cause of the error (the most specific one which is most likely the root cause of why the build is failing). Investigate and try to find the root cause. If there are multiple errors, give me the root cause of EACH error, don't skip any. Don't give me info about the on-push-to-repo.sh script, only the error log of the project. Format in plain text, it's for a telegram message. Don't use emojis. If you see docker run scripts, ignore them. Ignore all things related to the docker scripts, these are not the root cause. Try to find it based on the log. This is the error log:\n${errorLog}. Do not use markdown unless telegram accepts it.` }
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
