# Next.js Application Production Deployment Guide

This guide details the steps required to provision, secure, and deploy the TradeGPT Next.js application on an **Utho Cloud Virtual Machine** running **Ubuntu 22.04 LTS** (in the Mumbai region).

---

## 1. Initial Server Setup & Packages

Once your Utho instance is booted up and your public SSH key is installed, connect to the server via terminal:

```bash
ssh root@<YOUR_SERVER_IP>
```

Update your system packages and install prerequisites:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget build-essential
```

---

## 2. Install Node.js, PM2, and Nginx

### Install Node.js (v20 LTS)
Configure the NodeSource repository and install Node.js:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify the installation:
```bash
node -v   # Should show v20.x.x
npm -v    # Should show v10.x.x
```

### Install PM2 (Process Manager)
Install PM2 globally to run the Next.js production server in the background and survive reboots:

```bash
sudo npm install -g pm2
```

### Install Nginx (Web Server / Reverse Proxy)
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 3. Clone the Codebase

### Generate SSH Key on Server for GitHub Access
To securely clone the repository, generate an SSH key on your Utho server:

```bash
ssh-keygen -t ed25519 -C "server@tradegpt"
```
Press Enter to accept all default paths and leave the passphrase empty.

Print your server's new public key:
```bash
cat ~/.ssh/id_ed25519.pub
```

Copy the output key and add it to your GitHub repository under **Settings > Deploy Keys > Add Deploy Key** (give it read-only access).

### Clone to Web Directory
Create the deployment directory and clone the code:

```bash
sudo mkdir -p /var/www/tradegpt
sudo chown -R $USER:$USER /var/www/tradegpt
git clone git@github.com:hxmmxd/tradinggtp.git /var/www/tradegpt
```

---

## 4. Configure Production Environment

Navigate to the project directory:
```bash
cd /var/www/tradegpt
```

Create a production environment variables file:
```bash
cp .env.local .env.production
```

Open `.env.production` in your preferred editor (e.g. `nano .env.production`) and update all production database credentials, API keys, and service secrets.

---

## 5. Build & Launch Application

Run a clean installation of dependencies (including build packages) and compile the Next.js optimized production bundle:

```bash
npm ci --production=false
npm run build
```

Start the application under the PM2 process manager:
```bash
pm2 start npm --name "tradegpt" -- run start
```

Configure PM2 to automatically restart the application when the server reboots:
```bash
pm2 startup
```
*Note: PM2 will output a systemd command. Copy and paste that exact command into the terminal to run it as root.*

Save the running PM2 processes list:
```bash
pm2 save
```

---

## 6. Configure Nginx Reverse Proxy

Create an Nginx configuration file for your domain:

```bash
sudo nano /etc/nginx/sites-available/tradegpt
```

Paste the following server block configuration (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Gzip Compression
    gzip on;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/tradegpt /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default   # Remove default welcome site
sudo nginx -t                              # Check config syntax
sudo systemctl restart nginx
```

---

## 7. Secure with SSL (Let's Encrypt HTTPS)

Install Certbot for automated SSL configuration:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Request and install the SSL certificate:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Follow the interactive prompts to register your email and automatically redirect HTTP traffic to secure HTTPS.

---

## 8. Continuous Deployment Rollouts

To deploy any future updates from your local workspace, push your changes to GitHub, then log into your Utho server and run:

```bash
cd /var/www/tradegpt
./scripts/deploy.sh
```
This script will automatically pull the code, install any new dependencies, rebuild the production bundle, and perform a zero-downtime reload of the running Next.js server.
