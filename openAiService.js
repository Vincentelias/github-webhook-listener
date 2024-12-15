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
                {
                    role: 'user',
                    content: `
                        Summarize the following error log and give me the root cause of the error as concise as possible.
                        Ignore and do not show me warnings or other problems. If there is a root cause, only the root cause 
                        (the most specific one which is most likely the root cause of why the build is failing). 
                        Investigate and try to find the root cause. 
                        If there are multiple errors (which are actually causing the build to fail), give me the root cause of EACH error, don't skip any. 
                        Don't give me info about the on-push-to-repo.sh script, only the error log of the project.
                        Send the message in PLAIN TEXT FORMAT, NO MARKDOWN, it's for a telegram message. Don't use emojis. 
                        If you see docker run scripts, ignore them. 
                        Ignore all things related to the docker scripts, these are not the root cause.
                        Do everything in a concise way, as short as possible without giving me extra data or information which I don't need.
                        I am an experienced programmer, so if you can just explain to me the issue that's enough.
                        Try to find it based on the log This is the error log:
                        ${errorLog}`
                }
            ]
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error summarizing the log:', error);
        throw new Error('Failed to summarize the error log');
    }
}

module.exports = { summarizeErrorLog };
