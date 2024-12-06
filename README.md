# Github Webhook Server

A simple Node.js server that listens for Github webhook calls and executes a script in the corresponding project folder. Perfect for automated deployments on your own server. Includes Telegram notifications for deployment status updates.

## Features

- Validates Github webhook signatures
- Executes deployment scripts
- Sends deployment notifications via Telegram (success, errors, starts)
- Easy to configure and use

## How it works

When Github...

## Table of Contents

- [How it works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Github webhook configuration](#github-webhook-configuration)
- [Nginx configuration](#nginx-configuration)
- [Creating a shell script in your repo for on push events](#creating-a-shell-script-in-your-repo-for-on-push-events)

## How it works

When a `push` event happens, the listener will execute a script called on-push-to-repo.sh in your corresponding project folder to pull from git and rebuild your project (you have to create this script yourself)

## Prerequisites

- Node.js (v14 or later)
- npm (Node Package Manager)
- Access to a public IP or domain where the webhook listener will be hosted
- A GitHub repository with webhooks enabled

## Installation

1. Clone this repository to your local machine or server:

   ```bash
   git clone https://github.com/vincentelias/github-webhook-listener.git
   cd github-webhook-listener
   ```

2. Install the dependencies

   ```bash
   npm install
   ```

3. Copy .env.example and replace the values. You can choose a password, we will use this same password later on to configure our github webhook. The projects folder is the root folder where all of your projects/repos are stored.

   ```.env
   GITHUB_SECRET=a_very_strong_password
   PROJECTS_FOLDER=/opt/projects
   PORT=4000
   # Optional: Telegram notifications
   TELEGRAM_BOT_TOKEN=your_bot_token    # Get from @BotFather
   TELEGRAM_CHAT_ID=-123456789          # Group chat ID(s), comma-separated for multiple groups
   ```

   ### Telegram Setup (Optional)

   To receive deployment notifications in Telegram:

   1. Create a bot:

      - Message @BotFather on Telegram
      - Send `/newbot`
      - Choose a name and username
      - Save the bot token for `TELEGRAM_BOT_TOKEN`

   2. Get group chat ID:
      - Create a Telegram group
      - Add your bot to the group
      - Make the bot an administrator
      - Send any message in the group
      - Visit `https://api.telegram.org/bot<YourBOTToken>/getUpdates`
      - Copy the negative number from `"chat":{"id":-123456789}` for `TELEGRAM_CHAT_ID`

   You'll receive notifications for:

   - 🚀 Deployment starts
   - ✅ Successful deployments
   - ❌ Deployment errors
   - 🚫 Unauthorized webhook calls

4. Use pm2 to run and auto-restart the service
   ```bash
   npm install -g pm2
   pm2 start app.js --name github-webhook-listener
   pm2 startup
   pm2 save
   ```
   You should now be able to see the webhook running when executing the following command
   ```bash
   pm2 status
   ```

## Github webhook configuration

Go to your GitHub repository.
Navigate to
Settings
->
Webhooks
->
Add webhook.

- Enter your server's IP or domain followed by
  /webhook
  , for example:
  http://your-server-ip:4000/webhook

- Use application/json
- Set the secret to the one you configured in your .env
- Don't change any other settings

## Nginx configuration

Add a server block to your nginx configuration to expose the webhook

```nginx
server {
    listen 80;
    server_name your-server-ip;

    location /webhook {
        proxy_pass http://your-server-ip:4000/webhook;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Make sure to restart nginx

## Creating a shell script in your repo for on push events

Navigate to one of your projects for which you want to configure on push events

```bash
    cd /opt/projects/example-website
```

Create a shell script on-push-to-repo.sh in your project which contains all the steps to pull the new code and build the project. An example might look this:

```bash
    #!/bin/bash

    # Navigate to the project directory
    cd /opt/projects/example-website

    # Pull the latest changes from the repo
    git pull origin main

    # Build and restart the services (if using Docker)
    docker compose up -d --build
```

Make the script executable

```bash
    chmod +x /path/to/your/project/on-push-to-repo.sh
```

Now, each time you push to the main branch, the script in your repo should be executed.

## Troubleshooting

If the script is not executed, troubleshoot in the following order

- Execute the command `pm2 logs github-webhook-listener`
- If you don't see any logs, it means github was not able to reach your server, there is probably something wrong with your nginx configuration
- If you do see logs, look at the specific error message and troubleshoot from there
