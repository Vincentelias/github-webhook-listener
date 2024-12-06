require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware to parse JSON
app.use(bodyParser.json());

// GitHub Webhook Secret
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const PROJECTS_FOLDER = process.env.PROJECTS_FOLDER

// Add this helper function at the top level
const getParisTimePrefix = () => {
    return new Date().toLocaleString('en-GB', {
        timeZone: 'Europe/Paris',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }).replace(',', '').toLowerCase();
};

// Function to verify GitHub webhook signature
const verifySignature = (req) => {
    const signature = req.headers['x-hub-signature'];
    const hash = `sha1=${crypto.createHmac('sha1', GITHUB_WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex')}`;
    return signature === hash;
};

// Webhook endpoint
app.post('/webhook', (req, res) => {
    process.stdout.write(`[${getParisTimePrefix()}] Received call from Github\n`);
    if (!verifySignature(req)) {
        process.stdout.write(`[${getParisTimePrefix()}] Unable to verify signature, make sure your github webhook secret is set correctly\n`);
        return res.status(401).send('Unauthorized');
    }

    process.stdout.write(`[${getParisTimePrefix()}] Successfully verified signature\n`);

    const repoName = req.body.repository.name;
    const scriptToExecute = `${PROJECTS_FOLDER}/${repoName}/on-push-to-repo.sh`;

    process.stdout.write(`[${getParisTimePrefix()}] Executing script in project folder\n`);
    exec(scriptToExecute, (error, stdout, stderr) => {
        if (error) {
            console.error(`[${getParisTimePrefix()}] exec error: ${error}`);
        }
        process.stdout.write(`[${getParisTimePrefix()}] stdout: ${stdout}`);
        console.error(`[${getParisTimePrefix()}] stderr: ${stderr}`);
    });
    res.status(200).send('Webhook received');
});

// Start the server
app.listen(PORT, () => {
    process.stdout.write(`[${getParisTimePrefix()}] Server is running on port ${PORT}\n`);
});