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
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET; // Set this in your Dockerfile or as an env variable
const PROJECTS_FOLDER = process.env.PROJECTS_FOLDER

// Function to verify GitHub webhook signature
const verifySignature = (req) => {
    const signature = req.headers['x-hub-signature'];
    console.log('webhook secret', GITHUB_WEBHOOK_SECRET)
    const hash = `sha1=${crypto.createHmac('sha1', GITHUB_WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex')}`;
    return signature === hash;
};

// Webhook endpoint
app.post('/webhook', (req, res) => {
    if (!verifySignature(req)) {
        return res.status(401).send('Unauthorized');
    }

    const repoName = req.body.repository.name; // Get the repository name from the payload
    const scriptToExecute = `${PROJECTS_FOLDER}/${repoName}/on-push-to-repo.sh`; // Path to your update script

    exec(scriptToExecute, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).send('Execution error');
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        res.status(200).send('Webhook received and script executed');
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});