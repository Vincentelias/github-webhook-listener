# GitHub Webhook Listener

This is a simple GitHub Webhook Listener built with Node.js that listens for webhook events from a GitHub repository. When a push event occurs, it executes a specified shell script to automate tasks, such as pulling the latest code and rebuilding Docker containers. This is a simple alternative for complex CI/CD pipelines. With this setup, you can simply push to the main branch and deploy to production!

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
    ```
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
- Execute the command ```pm2 logs github-webhook-listener```
- If you don't see any logs, it means github was not able to reach your server, there is probably something wrong with your nginx configuration
- If you do see logs, look at the specific error message and troubleshoot from there