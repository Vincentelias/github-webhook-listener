require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { exec } = require('child_process');
const axios = require('axios');

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

// Add this helper function at the top level
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

// Add this helper function
const sendTelegramMessage = async (message) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error(`[${getParisTimePrefix()}] Failed to send Telegram notification:`, error.message);
    }
};

// Webhook endpoint
app.post('/webhook', (req, res) => {
    process.stdout.write(`[${getParisTimePrefix()}] Received call from Github\n`);
    if (!verifySignature(req)) {
        const errorMsg = `🚫 Unauthorized webhook call - Unable to verify signature\n\nTime: ${getParisTimePrefix()}`;
        process.stdout.write(`[${getParisTimePrefix()}] Unable to verify signature, make sure your github webhook secret is set correctly\n`);
        sendTelegramMessage(errorMsg);
        return res.status(401).send('Unauthorized');
    }

    process.stdout.write(`[${getParisTimePrefix()}] Successfully verified signature\n`);

    const repoName = req.body.repository.name;
    const scriptToExecute = `${PROJECTS_FOLDER}/${repoName}/on-push-to-repo.sh`;

    // Add notification when starting deployment
    sendTelegramMessage(`🚀 Starting deployment for ${repoName}\n\n${getParisTimePrefix()}`);

    process.stdout.write(`[${getParisTimePrefix()}] Executing script in project folder\n`);
    exec(scriptToExecute, async (error, stdout, stderr) => {
        if (error) {
            console.error(`[${getParisTimePrefix()}] exec error: ${error}`);

            // Get the last 500 lines of stdout
            const stdoutLines = stdout.split('\n');
            const lastLinesOfLog = stdoutLines.slice(-500).join('\n');

            await sendTelegramMessage(`❌ Error deploying ${repoName}\n\nError: ${error}\n\nLast 500 lines of stdout:\n${lastLinesOfLog}\n\nTime: ${getParisTimePrefix()}`);
        } else {
            await sendTelegramMessage(`✅ Successfully deployed ${repoName}\n\${getParisTimePrefix()}`);
        }
        process.stdout.write(`[${getParisTimePrefix()}] stdout: ${stdout}`);
        if (stderr) {
            console.error(`[${getParisTimePrefix()}] stderr: ${stderr}`);
            if (stderr.toLowerCase().includes('error') || stderr.toLowerCase().includes('fatal') || stderr.toLowerCase().includes('warning')) {
                await sendTelegramMessage(`⚠️ Script execution warning for ${repoName}\n\nDetails: ${stderr}\n\n${getParisTimePrefix()}`);
            }
        }
    });
    res.status(200).send('Webhook received');
});

// Start the server
app.listen(PORT, () => {
    process.stdout.write(`[${getParisTimePrefix()}] Server is running on port ${PORT}\n`);
});