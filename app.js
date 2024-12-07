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
        console.error(`${getParisTimePrefix()} Failed to send Telegram notification:`, error.message);
    }
};

// Function to remove ANSI escape codes
const stripAnsiCodes = (str) => {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
};

// Modify the sendTelegramErrorMessage function
const sendTelegramErrorMessage = async (repoName, error, stdout) => {
    // Strip ANSI codes from error and stdout
    const cleanError = stripAnsiCodes(error.toString());
    const cleanStdout = stripAnsiCodes(stdout.toString());

    // Split the error message into lines and get the last 40 lines
    const errorLines = cleanError.split('\n');
    const lastLinesOfError = errorLines.slice(-20).join('\n');

    // Split the stdout into lines and get the last 20 lines
    const stdoutLines = cleanStdout.split('\n');
    const lastLinesOfStdout = stdoutLines.slice(-30).join('\n');

    // Construct the error message
    const errorMessage = `❌ Error deploying ${repoName}\n\nError: ${lastLinesOfError}\n\nLast 20 lines of stdout:\n${lastLinesOfStdout}\n\n${getParisTimePrefix()}`;

    await sendTelegramMessage(errorMessage);
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
            await sendTelegramErrorMessage(repoName, error, stdout);
        } else {
            await sendTelegramMessage(`✅ Successfully deployed ${repoName}\n\n${getParisTimePrefix()}`);
        }


        // Write the stdout to the std output
        process.stdout.write(`${getParisTimePrefix()} exec stdout: ${stdout}\n`);

        // Handle stderr
        if (stderr) {
            const stderrLines = stderr.split('\n');
            const lastLinesOfStderr = stderrLines.slice(-20).join('\n');

            console.error(`${getParisTimePrefix()} stderr: ${lastLinesOfStderr}`);
            if (stderr.toLowerCase().includes('error') || stderr.toLowerCase().includes('fatal') || stderr.toLowerCase().includes('warning')) {
                await sendTelegramMessage(`⚠️ Script execution warning for ${repoName}\n\nDetails: ${lastLinesOfStderr}\n\n${getParisTimePrefix()}`);
            }
        }
    });
    res.status(200).send('Webhook received');
});

// Start the server
app.listen(PORT, () => {
    process.stdout.write(`${getParisTimePrefix()} Server is running on port ${PORT}\n`);
});