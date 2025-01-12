require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { exec } = require('child_process');
const axios = require('axios');
const { summarizeErrorLog } = require('./openAiService');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware to parse JSON
app.use(bodyParser.json());

// GitHub Webhook Secret
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const PROJECTS_FOLDER = process.env.PROJECTS_FOLDER

// Add these environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const getParisTimePrefix = () => {
    return `📅 ${new Date().toLocaleString('en-GB', {
        timeZone: 'Europe/Paris',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }).replace(',', '').toLowerCase()}`;
};

// ` Function to verify GitHub webhook signature
const verifySignature = (req) => {
    const signature = req.headers['x-hub-signature'];
    const hash = `sha1=${crypto.createHmac('sha1', GITHUB_WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex')}`;
    return signature === hash;
};

const sendTelegramMessage = async (message) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message
        });
    } catch (error) {
        console.error(`Message to be sent: BEGIN MESSAGE TO BE SENT\n\n${message}\n\nEND MESSAGE TO BE SENT`)
        console.error(`${getParisTimePrefix()} Failed to send Telegram notification:`, error.message);
    }
};

const constructTelegramMessage = (prefix, repoName, summary) => {
    const timePrefix = getParisTimePrefix();
    let message = `${prefix} ${repoName}\n\n${timePrefix}`;
    if (summary) {
        message = `${prefix} ${repoName}\n\n🧠 Ai Summary:\n${summary}\n\n${timePrefix}`;
    }
    return message;
};

const summarizeAndSendMessage = async (prefix, repoName, log) => {
    const lastCharsOfLog = log.slice(-20000);
    let summarizedMessage = '';

    try {
        summarizedMessage = await summarizeErrorLog(lastCharsOfLog);
    } catch (error) {
        console.error('Failed to summarize log:', error);
    }

    const message = constructTelegramMessage(prefix, repoName, summarizedMessage);
    await sendTelegramMessage(message);
};

const sendTelegramErrorMessage = async (repoName, error) => {
    await summarizeAndSendMessage('❌ Error deploying', repoName, error.toString());
};

// Webhook endpoint
app.post('/webhook', (req, res) => {
    process.stdout.write(`${getParisTimePrefix()} Received call from Github\n`);
    if (!verifySignature(req)) {
        const errorMsg = `🚫 Unauthorized webhook call - Unable to verify signature\n\n${getParisTimePrefix()}`;
        process.stdout.write(`${getParisTimePrefix()} Unable to verify signature, make sure your github webhook secret is set correctly\n`);
        sendTelegramMessage(errorMsg);
        return res.status(401).send('Unauthorized');
    }

    process.stdout.write(`${getParisTimePrefix()} Successfully verified signature\n`);

    const repoName = req.body.repository.name;
    const scriptToExecute = `${PROJECTS_FOLDER}/${repoName}/on-push-to-repo.sh`;

    // Add notification when starting deployment
    sendTelegramMessage(`🚀 Starting deployment for ${repoName}\n\n${getParisTimePrefix()}`);
    process.stdout.write(`${getParisTimePrefix()} Executing script in project folder\n`);

    exec(scriptToExecute, async (error, stdout, stderr) => {
        if (error) {
            // Write the error to the std error
            process.stderr.write(`${getParisTimePrefix()} exec error: ${error}\n`);
            await sendTelegramErrorMessage(repoName, error.toString() + stdout.toString());
        } else {
            await sendTelegramMessage(`✅ Successfully deployed ${repoName}\n\n${getParisTimePrefix()}`);
        }


        // Write the stdout to the std output
        process.stdout.write(`${getParisTimePrefix()} exec stdout: ${stdout}\n`);

        // Handle stderr
        if (stderr) {
            process.stderr.write(`${getParisTimePrefix()} stderr: ${stderr.slice(-10000)}\n`);

            if (stderr && stderr.length > 20) {
                await summarizeAndSendMessage('⚠️ Script execute but with errors', repoName, stderr);
            }
        }
    });
    res.status(200).send('Webhook received');
});

// Start the server
app.listen(PORT, () => {
    process.stdout.write(`${getParisTimePrefix()} Server is running on port ${PORT}\n`);
});